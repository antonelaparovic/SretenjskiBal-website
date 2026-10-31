// Datumi u testu i u skripti računaju se u istoj zoni kao tabela.
process.env.TZ = 'Europe/Ljubljana';

import { beforeEach, describe, expect, it } from 'vitest';
import { FakeSheet, Formula, GasEnv, loadAppsScript } from './helpers/gas-fakes.js';

function reservation(overrides: Record<string, unknown> = {}) {
  return {
    requestId: crypto.randomUUID(),
    fullName: 'Ana Anić',
    email: 'ana@primer.si',
    phone: '+386 40 123 456',
    tickets: [{ ticketType: 'SVECANA', count: 2 }],
    invoice: { needed: false },
    diet: '',
    dietConsent: false,
    privacyPolicyVersion: '2026-10-27',
    note: 'Sedimo sa porodicom Petrović.',
    source: 'PREPORUKA',
    sourceOther: '',
    locale: 'sr',
    pageUrl: '/rezervacija',
    utm: { source: 'facebook', campaign: 'bal2027' },
    website: '',
    elapsedMs: 30000,
    ...overrides,
  };
}

function daysFromToday(n: number): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 10, 0);
}

describe('Apps Script (Code.gs)', () => {
  let gas: GasEnv;
  let res: FakeSheet;
  let settings: FakeSheet;
  let H: string[];
  let COL: Record<string, string>;

  const post = (body: object) => JSON.parse((gas.ctx.doPost({ postData: { contents: JSON.stringify(body) } }) as { content: string }).content);
  const create = (r: object, captcha = 'ok-token') => post({ action: 'create', reservation: r, captcha });
  const contact = (m: object, captcha = 'ok-token') => post({ action: 'contact', contact: m, captcha });
  const message = (overrides: Record<string, unknown> = {}) => ({
    firstName: 'Marko',
    lastName: 'Marković',
    email: 'Marko@Primer.si',
    topic: 'PARTNERSTVO',
    message: 'Zainteresovani smo za partnerstvo na balu.',
    consent: true,
    website: '',
    elapsedMs: 20000,
    ...overrides,
  });
  const cell = (row: number, key: string) => res.data[row - 1][H.indexOf(COL[key])];
  const setSetting = (key: string, value: unknown) => {
    const row = settings.data.find((r) => r[0] === key);
    if (row) row[1] = value;
    else settings.data.push([key, value, '']);
  };
  /** Red rezervacije kao da ga je osoba zadužena za karte dopunila u tabeli. */
  const addRow = (fields: Record<string, unknown>) => {
    res.data.push(H.map((h) => {
      const key = Object.keys(COL).find((k) => COL[k] === h)!;
      return key in fields ? fields[key] : '';
    }));
    return res.data.length;
  };

  beforeEach(() => {
    gas = loadAppsScript();
    H = gas.get<string[]>('HEADERS');
    COL = gas.get<Record<string, string>>('COL');
    res = new FakeSheet('Rezervacije');
    res.data.push([...H]);
    settings = new FakeSheet('Podešavanja');
    settings.data.push(['Podešavanje', 'Vrednost', 'Opis']);
    for (const [k, v] of gas.get<[string, unknown][]>('SETTINGS')) settings.data.push([k, v, '']);
    setSetting('BOOKING_OPEN', true);
    setSetting('PAYEE', 'Kulturni centar Sretenje, Maribor');
    setSetting('IBAN', 'SI56 0000 0000 0000 000');
    setSetting('BIC', '');
    setSetting('BANK', '');
    gas.sheets.set('Rezervacije', res);
    gas.sheets.set('Podešavanja', settings);
  });

  describe('web app', () => {
    it('nepoznata akcija ili neispravan zahtev', () => {
      expect(post({ action: 'brisanje' })).toEqual({ ok: false, code: 'BAD_REQUEST' });
      expect(JSON.parse(gas.ctx.doPost({ postData: { contents: 'nije json' } }).content)).toEqual({ ok: false, code: 'BAD_REQUEST' });
    });

    it('vraća status iz taba Podešavanja (bez ključa — sajt ga čita direktno)', () => {
      expect(post({ action: 'status' })).toEqual({ ok: true, open: true });
      setSetting('BOOKING_OPEN', false);
      expect(post({ action: 'status' })).toEqual({ ok: true, open: false });
    });

    it('bez taba Podešavanja rezervacije su zatvorene', () => {
      gas.sheets.delete('Podešavanja');
      expect(post({ action: 'status' }).open).toBe(false);
      expect(create(reservation())).toEqual({ ok: false, code: 'BOOKING_CLOSED' });
    });
  });

  describe('nova rezervacija', () => {
    it('upisuje jedan red sa svim podacima i dodeljuje broj 27001', () => {
      const out = create(reservation({ invoice: { needed: true, companyName: 'Firma d.o.o.', companyAddress: 'Glavni trg 1, Maribor', companyCountry: 'SI', taxId: 'SI12345678', vatPayer: true } }));
      expect(out).toMatchObject({ ok: true, duplicate: false, reservationNumber: '27001', adminMailSent: true, guestMailSent: true });
      expect(res.data).toHaveLength(2);
      expect(cell(2, 'number')).toBe('27001');
      expect(cell(2, 'status')).toBe('NOVA');
      expect(cell(2, 'createdAt')).toBeInstanceOf(Date);
      expect(cell(2, 'ticketType')).toBe('Svečana');
      expect(cell(2, 'ticketCount')).toBe(2);
      expect(H).not.toContain('Imena gostiju');
      expect(cell(2, 'invoice')).toBe('DA');
      expect(cell(2, 'company')).toBe('Naziv: Firma d.o.o.\nSedež: Glavni trg 1, Maribor\nDržava: Slovenija\nDavčna številka / ID za DDV: SI12345678\nObveznik DDV: DA');
      expect(cell(2, 'source')).toBe('Preporuka prijatelja');
      expect(cell(2, 'locale')).toBe('sr');
      expect(cell(2, 'utm')).toBe('utm_source=facebook; utm_campaign=bal2027');
      expect(cell(2, 'systemNote')).toContain('Obaveštenje organizatoru poslato. Potvrda gostu poslata.');
    });

    it('dodeljuje uzastopne brojeve', () => {
      expect(create(reservation()).reservationNumber).toBe('27001');
      expect(create(reservation()).reservationNumber).toBe('27002');
      expect(create(reservation()).reservationNumber).toBe('27003');
    });

    it('nastavlja od najvećeg broja koji već postoji u tabeli', () => {
      addRow({ number: '27005', status: 'PLAĆENO' });
      addRow({ number: 27002 }); // broj upisan kao broj, ne tekst
      expect(create(reservation()).reservationNumber).toBe('27006');
    });

    it('ne koristi ponovo broj obrisanog poslednjeg reda', () => {
      create(reservation());
      create(reservation());
      res.data.pop(); // neko obriše red 27002
      expect(create(reservation()).reservationNumber).toBe('27003');
    });

    it('godina bala se podešava na jednom mestu (BALL_YEAR)', () => {
      create(reservation());
      setSetting('BALL_YEAR', 2028);
      expect(create(reservation()).reservationNumber).toBe('28001');
    });

    it('isti zahtev poslat ponovo vraća isti broj, bez novog reda i mejlova', () => {
      const r = reservation();
      const first = create(r);
      const mails = gas.outbox.length;
      const again = create(r);
      expect(again).toEqual({ ok: true, duplicate: true, reservationNumber: first.reservationNumber });
      expect(res.data).toHaveLength(2);
      expect(gas.outbox).toHaveLength(mails);
    });

    it('kad su rezervacije zatvorene ništa se ne upisuje', () => {
      setSetting('BOOKING_OPEN', false);
      expect(create(reservation())).toEqual({ ok: false, code: 'BOOKING_CLOSED' });
      expect(res.data).toHaveLength(1);
      expect(gas.outbox).toHaveLength(0);
    });

    it('proverava podatke i u skripti', () => {
      expect(create(reservation({ tickets: [] })).fields).toEqual(['tickets']);
      expect(create(reservation({ tickets: [{ ticketType: 'GALERIJA', count: 0 }] })).fields).toEqual(['tickets.0.count']);
      expect(create(reservation({ tickets: [{ ticketType: 'GALERIJA', count: 1.5 }] })).fields).toEqual(['tickets.0.count']);
      expect(create(reservation({ tickets: [{ ticketType: 'VIP', count: 1 }] })).fields).toEqual(['tickets.0.ticketType']);
      expect(create(reservation({ tickets: [{ ticketType: 'GALERIJA', count: 1 }, { ticketType: 'GALERIJA', count: 1 }] })).fields).toEqual(['tickets.1.ticketType']);
      expect(create(reservation({ tickets: [{ ticketType: 'GALERIJA', count: 101 }] })).fields).toEqual(['tickets']);
      expect(create(reservation({ invoice: { needed: true, companyName: 'Firma' } })).fields).toEqual(['invoice.companyAddress', 'invoice.companyCountry', 'invoice.taxId']);
      expect(create(reservation({ email: 'nije-mejl' })).fields).toContain('email');
      expect(create(reservation({ source: 'NESTO' })).fields).toContain('source');
      expect(res.data).toHaveLength(1);
    });

    it('ostali gosti se upisuju na početak napomene, a nepotpun gost se odbija', () => {
      create(reservation({
        tickets: [{ ticketType: 'GALERIJA', count: 2 }],
        guests: [{ firstName: 'Maja', lastName: 'Anić', email: 'MAJA@primer.si', phone: '+386 41 222 333' }],
      }));
      expect(cell(2, 'note')).toBe('Gost 2: Maja Anić, maja@primer.si, +386 41 222 333\nSedimo sa porodicom Petrović.');
      const bad = create(reservation({ guests: [{ firstName: 'Maja', lastName: '', email: 'x', phone: '1' }] }));
      expect(bad.fields).toEqual(['guests.0']);
    });

    it('unos koji liči na formulu ostaje običan tekst', () => {
      create(reservation({ fullName: '=HYPERLINK("http://zlo.example","klik")', note: '@SUM(A1:A9)', diet: '-2+3', dietConsent: true }));
      const row = res.data[1];
      expect(row.some((c) => c instanceof Formula)).toBe(false);
      expect(cell(2, 'fullName')).toBe('=HYPERLINK("http://zlo.example","klik")');
      expect(cell(2, 'phone')).toBe('+386 40 123 456');
      expect(cell(2, 'note')).toBe('@SUM(A1:A9)');
      expect(cell(2, 'diet')).toBe('-2+3');
    });

    it('mešoviti tipovi karata (za kasnije proširenje) se vide u redu', () => {
      create(reservation({ tickets: [{ ticketType: 'SVECANA', count: 2 }, { ticketType: 'GALERIJA', count: 1 }] }));
      expect(cell(2, 'ticketType')).toBe('Svečana ×2, Galerija ×1');
      expect(cell(2, 'ticketCount')).toBe(3);
      expect(cell(2, 'amount')).toBe(350);
    });

    it('iznos za uplatu se predlaže po cenama iz podešavanja', () => {
      create(reservation()); // 2 × Svečana
      create(reservation({ tickets: [{ ticketType: 'GALERIJA', count: 3 }] }));
      expect([cell(2, 'amount'), cell(3, 'amount')]).toEqual([280, 210]);
      expect(gas.outbox.find((m) => m.subject.endsWith('27001') && m.to === 'info@kcsretenje.si')!.body).toContain('Iznos (po cenama iz podešavanja): 280,00 EUR');
      setSetting('PRICE_GALERIJA', 95);
      create(reservation({ tickets: [{ ticketType: 'GALERIJA', count: 1 }] }));
      expect(cell(4, 'amount')).toBe(95);
      setSetting('PRICE_GALERIJA', '');
      expect(create(reservation({ tickets: [{ ticketType: 'GALERIJA', count: 1 }] }))).toMatchObject({ ok: true });
      expect(cell(5, 'amount')).toBe('');
    });

    it('naziv tipa karte: u tabeli na srpskom, u mejlu gostu preveden', () => {
      const gallery = [{ ticketType: 'GALERIJA', count: 2 }];
      const gala = [{ ticketType: 'SVECANA', count: 1 }];
      create(reservation({ tickets: gala, locale: 'sl', email: 'sl@primer.si' }));
      create(reservation({ tickets: gallery, locale: 'en', email: 'en@primer.si' }));
      expect(cell(2, 'ticketType')).toBe('Svečana');
      expect(cell(3, 'ticketType')).toBe('Galerija');
      expect(gas.outbox.find((m) => m.to === 'sl@primer.si')!.body).toContain('Vrsta vstopnice: Svečana vstopnica');
      expect(gas.outbox.find((m) => m.to === 'en@primer.si')!.body).toContain('Ticket type: Gallery');
    });

    it('ishrana: posebna kolona, istaknuta u mejlu organizatoru i potvrđena gostu', () => {
      create(reservation({ diet: 'Jedna osoba bez glutena, jedna vegetarijanska.', dietConsent: true }));
      expect(cell(2, 'diet')).toBe('Jedna osoba bez glutena, jedna vegetarijanska.');
      const admin = gas.outbox.find((m) => m.to === 'info@kcsretenje.si')!;
      expect(admin.subject).toBe('Nova rezervacija za Sretenjski bal — 27001 · posebna ishrana');
      expect(admin.body).toContain('ISHRANA I ALERGIJE: Jedna osoba bez glutena, jedna vegetarijanska.');
      expect(gas.outbox.find((m) => m.to === 'ana@primer.si')!.body).toContain('Alergije: Jedna osoba bez glutena');
    });

    it('nova kolona se sama dodaje u tabelu postavljenu starijom verzijom skripte', () => {
      res.data[0] = res.data[0].filter((h) => h !== 'Ishrana i alergije');
      res.data[0].push('Imena gostiju');
      expect(create(reservation({ diet: 'Vegansko', dietConsent: true }))).toMatchObject({ ok: true });
      expect(res.data[0].slice(-2)).toEqual(['Imena gostiju', 'Ishrana i alergije']);
      expect(res.data[1][res.data[0].indexOf('Ishrana i alergije')]).toBe('Vegansko');
    });

    it('šalje obaveštenje organizatoru sa svim podacima i linkom ka tabeli', () => {
      create(reservation());
      const admin = gas.outbox.find((m) => m.to === 'info@kcsretenje.si')!;
      expect(admin.subject).toBe('Nova rezervacija za Sretenjski bal — 27001');
      expect(admin.replyTo).toBe('ana@primer.si');
      for (const s of ['27001', 'Ana Anić', 'ana@primer.si', '+386 40 123 456', 'Svečana', 'ISHRANA I ALERGIJE: —', 'Faktura na firmu: NE', 'Sedimo sa porodicom Petrović.', 'Preporuka prijatelja', 'Jezik forme: sr', 'https://docs.google.com/spreadsheets/d/test#gid=123']) {
        expect(admin.body).toContain(s);
      }
    });

    it('potvrda gostu je na jeziku forme i sadrži broj i rok od 3 dana', () => {
      create(reservation());
      create(reservation({ locale: 'sl', email: 'sl@primer.si' }));
      create(reservation({ locale: 'en', email: 'en@primer.si', tickets: [{ ticketType: 'GALERIJA', count: 2 }] }));
      const sr = gas.outbox.find((m) => m.to === 'ana@primer.si')!;
      expect(sr.subject).toBe('Ulaznice za prvi Sretenjski bal — rezervacija 27001');
      expect(sr.body).toContain('Poštovani/a Ana Anić,');
      expect(sr.htmlBody).toContain('cid:sblogo');
      expect(Object.keys(sr.inlineImages as object)).toEqual(['sblogo']);
      expect(sr.body).toContain('Javićemo Vam se u roku od 3 dana sa detaljima za uplatu.');
      expect(sr.body).toContain('Gosti: Ana Anić');
      expect(sr.body).toContain('Napomena: Sedimo sa porodicom Petrović.');
      expect(sr.body).toContain('27001');
      expect(sr.replyTo).toBe('info@kcsretenje.si');
      expect(gas.outbox.find((m) => m.to === 'sl@primer.si')!.body).toContain('V 3 dneh Vam bomo poslali podatke za plačilo.');
      const en = gas.outbox.find((m) => m.to === 'en@primer.si')!;
      expect(en.body).toContain('We will contact you within 3 days with the payment details.');
      expect(en.body).toContain('Ticket type: Gallery');
    });

    it('potvrda rezervacije navodi sve goste i napomenu bez redova o gostima', () => {
      create(reservation({
        tickets: [{ ticketType: 'GALERIJA', count: 2 }],
        guests: [{ firstName: 'Maja', lastName: 'Anić', email: 'maja@primer.si', phone: '+386 41 222 333' }],
      }));
      const mail = gas.outbox.find((m) => m.to === 'ana@primer.si')!;
      expect(mail.body).toContain('Gosti:\nAna Anić\nMaja Anić');
      expect(mail.body).toContain('Napomena: Sedimo sa porodicom Petrović.');
      expect(mail.body).not.toContain('maja@primer.si');
      expect(mail.htmlBody).toContain('Ana Anić<br>Maja Anić');
    });

    it('mejlovi idu sa info@ kad je alias podešen u Gmailu, inače sa glavne adrese naloga', () => {
      create(reservation());
      expect(gas.outbox.every((m) => m.from === undefined && m.name === 'Sretenjski bal')).toBe(true);
      gas.outbox.length = 0;
      gas.aliases = ['Info@kcsretenje.si'];
      gas.get('senderAliasesCache_ = null'); // aliasi se čitaju jednom po izvršavanju skripte
      create(reservation());
      expect(gas.outbox.map((m) => m.from)).toEqual(['info@kcsretenje.si', 'info@kcsretenje.si']);
      expect(gas.outbox[0].replyTo).toBe('ana@primer.si'); // organizatoru: odgovor ide gostu
      expect(gas.outbox[1].replyTo).toBe('info@kcsretenje.si'); // gostu: odgovor ide organizaciji
    });

    it('obaveštenje poslato u sopstveno sanduče (info@ → info@) premešta se u Inbox kao nepročitano', () => {
      gas.aliases = ['info@kcsretenje.si'];
      gas.get('senderAliasesCache_ = null');
      create(reservation()); // ADMIN_EMAIL = info@kcsretenje.si
      expect(gas.inboxMoves).toEqual([
        ['moveToInbox', 'in:sent subject:"Nova rezervacija za Sretenjski bal — 27001" newer_than:1d'],
        ['markUnread', 'in:sent subject:"Nova rezervacija za Sretenjski bal — 27001" newer_than:1d'],
      ]);
      gas.inboxMoves.length = 0;
      setSetting('ADMIN_EMAIL', 'karte@primer.si'); // tuđe sanduče: ništa se ne premešta
      create(reservation({ email: 'drugi@primer.si' }));
      expect(gas.inboxMoves).toEqual([]);
    });

    it('HTML mejla ne izvršava unos korisnika', () => {
      create(reservation({ note: '<script>alert(1)</script> & "x"' }));
      const admin = gas.outbox.find((m) => m.to === 'info@kcsretenje.si')!;
      expect(admin.htmlBody).not.toContain('<script>');
    });

    it('ako mejl ne prođe, rezervacija ostaje sačuvana i uspešna', () => {
      gas.failMail = () => true;
      const out = create(reservation());
      expect(out).toMatchObject({ ok: true, reservationNumber: '27001', adminMailSent: false, guestMailSent: false });
      expect(res.data).toHaveLength(2);
      expect(cell(2, 'systemNote')).toContain('Obaveštenje organizatoru NIJE poslato');
    });

    it('potvrda gostu može da se isključi', () => {
      setSetting('GUEST_EMAILS', false);
      expect(create(reservation())).toMatchObject({ adminMailSent: true, guestMailSent: false });
      expect(gas.outbox.map((m) => m.to)).toEqual(['info@kcsretenje.si']);
    });

    it('jasna greška kad tab Rezervacije nije podešen', () => {
      gas.sheets.delete('Rezervacije');
      expect(create(reservation())).toEqual({ ok: false, code: 'SERVER_ERROR' });
    });
  });

  describe('zaštita (skripta je javna)', () => {
    it('bez ispravne Turnstile provere nema upisa', () => {
      expect(create(reservation(), '')).toEqual({ ok: false, code: 'CAPTCHA_FAILED' });
      expect(create(reservation(), 'lazni-token')).toEqual({ ok: false, code: 'CAPTCHA_FAILED' });
      expect(res.data).toHaveLength(1);
      expect(gas.outbox).toHaveLength(0);
    });

    it('koristi TURNSTILE_SECRET iz Svojstava skripte, a dok ga nema Cloudflareov probni ključ', () => {
      create(reservation());
      expect(gas.captchaCalls.at(-1)).toEqual(['ok-token', '1x0000000000000000000000000000000AA']);
      gas.props.set('TURNSTILE_SECRET', 'pravi-kljuc');
      create(reservation());
      expect(gas.captchaCalls.at(-1)).toEqual(['ok-token', 'pravi-kljuc']);
    });

    it('botovi: skriveno polje ili prebrzo slanje', () => {
      expect(create(reservation({ website: 'http://spam' }))).toEqual({ ok: false, code: 'REJECTED' });
      expect(create(reservation({ elapsedMs: 900 }))).toEqual({ ok: false, code: 'REJECTED' });
      expect(gas.captchaCalls).toHaveLength(0);
      expect(res.data).toHaveLength(1);
    });

    it('najviše 20 slanja u minuti za ceo sajt', () => {
      const results = Array.from({ length: 22 }, () => create(reservation()));
      expect(results.filter((r) => r.ok)).toHaveLength(20);
      expect(results.at(-1)).toEqual({ ok: false, code: 'BUSY' });
    });

    it('faktura: podaci firme i poreski broj po državi (Slovenija, EU, izvan EU)', () => {
      const firm = (inv: object) => reservation({ invoice: { needed: true, companyName: 'Firma d.o.o.', companyAddress: 'Glavni trg 1, Maribor', ...inv } });
      expect(create(firm({ companyCountry: 'SI', taxId: 'SI12345678', vatPayer: true }))).toMatchObject({ ok: true });
      expect(cell(2, 'company')).toContain('Davčna številka / ID za DDV: SI12345678');
      expect(cell(2, 'company')).toContain('Obveznik DDV: DA');
      expect(create(firm({ companyCountry: 'SI', taxId: '1234', vatPayer: false })).fields).toEqual(['invoice.taxId']);
      expect(create(firm({ companyCountry: 'SI', taxId: '12345678' })).fields).toEqual(['invoice.vatPayer']);
      expect(create(firm({ companyCountry: 'EU', taxId: 'HR12345678901' }))).toMatchObject({ ok: true });
      expect(create(firm({ companyCountry: 'EU', taxId: 'SI12345678' })).fields).toEqual(['invoice.taxId']);
      expect(create(firm({ companyCountry: 'OTHER', taxId: 'EIN 12-3456789' }))).toMatchObject({ ok: true });
      expect(create(firm({ companyCountry: 'XX', taxId: '123' })).fields).toContain('invoice.companyCountry');
    });

    it('ishrana bez izričite saglasnosti i bez verzije politike privatnosti se ne prima', () => {
      expect(create(reservation({ diet: 'Bez glutena', dietConsent: false })).fields).toEqual(['dietConsent']);
      expect(create(reservation({ privacyPolicyVersion: '' })).fields).toEqual(['privacyPolicyVersion']);
      expect(create(reservation({ diet: 'Bez glutena', dietConsent: true }))).toMatchObject({ ok: true });
      expect(cell(2, 'consent')).toContain('ishrana: izričita saglasnost data');
    });

    it('stroga provera podataka', () => {
      expect(create(reservation({ phone: '+386' })).fields).toContain('phone');
      expect(create(reservation({ phone: 'zovi me' })).fields).toContain('phone');
      expect(create(reservation({ note: 'x'.repeat(2001) })).fields).toContain('note');
      expect(create(reservation({ diet: 'x'.repeat(1001) })).fields).toContain('diet');
      expect(create(reservation({ diet: 5 })).fields).toContain('diet');
      expect(create(reservation({ utm: ['a'] })).fields).toContain('utm');
      expect(create(reservation({ requestId: 'x' })).fields).toContain('requestId');
      expect(gas.captchaCalls).toHaveLength(0); // neispravni podaci ne troše proveru
    });
  });

  describe('kontakt forma', () => {
    it('upisuje poruku u tab Poruke i šalje je organizatoru; odgovor ide pošiljaocu', () => {
      expect(contact(message())).toEqual({ ok: true });
      const rows = gas.sheets.get('Poruke')!.data;
      expect(rows[0]).toEqual(gas.get('MESSAGE_HEADERS'));
      expect(rows[1].slice(1)).toEqual(['Marko', 'Marković', 'marko@primer.si', 'Partnerstvo i sponzorstvo', 'Zainteresovani smo za partnerstvo na balu.', 'DA']);
      const mail = gas.outbox[0];
      expect(mail.to).toBe('info@kcsretenje.si');
      expect(mail.replyTo).toBe('marko@primer.si');
      expect(mail.subject).toBe('Sajt · Partnerstvo i sponzorstvo · Marko Marković');
    });

    it('ako mejl ne prođe, poruka ostaje u tabeli i slanje je uspešno', () => {
      gas.failMail = () => true;
      expect(contact(message())).toEqual({ ok: true });
      expect(gas.sheets.get('Poruke')!.data[1].at(-1)).toBe('NE');
    });

    it('provera podataka, saglasnosti, botova i Turnstilea', () => {
      expect(contact(message({ message: 'kratko' })).fields).toEqual(['message']);
      expect(contact(message({ consent: false })).fields).toEqual(['consent']);
      expect(contact(message({ topic: 'NESTO' })).fields).toEqual(['topic']);
      expect(contact(message({ email: 'nije-mejl' })).fields).toEqual(['email']);
      expect(contact(message({ website: 'x' }))).toEqual({ ok: false, code: 'REJECTED' });
      expect(contact(message(), 'lazni')).toEqual({ ok: false, code: 'CAPTCHA_FAILED' });
      expect(gas.outbox).toHaveLength(0);
      expect(gas.sheets.has('Poruke')).toBe(false);
    });

    it('formule iz poruke ostaju običan tekst', () => {
      contact(message({ firstName: '=IMPORTXML("x")', message: '=HYPERLINK("http://zlo")  i još teksta' }));
      expect(gas.sheets.get('Poruke')!.data[1].some((c) => c instanceof Formula)).toBe(false);
    });
  });

  describe('Podesi tabelu', () => {
    it('prazna tabela: pravi tabove, kolone redom iz COL i podrazumevana podešavanja', () => {
      gas.sheets.clear();
      gas.props.clear();
      gas.ctx.setup();
      expect(gas.sheets.get('Rezervacije')!.data[0]).toEqual(H);
      expect(H.slice(0, 8)).toEqual(['Broj rezervacije', 'Status rezervacije', 'Ime i prezime kontakt osobe', 'Tip karte', 'Broj karata', 'Iznos za uplatu', 'Ishrana i alergije', 'Napomena']);
      const keys = gas.sheets.get('Podešavanja')!.data.map((r) => r[0]);
      expect(keys).toEqual(expect.arrayContaining(['BOOKING_OPEN', 'PRICE_GALERIJA', 'IBAN']));
      expect(keys).not.toContain('MAX_TICKETS');
      expect(gas.sheets.get('Statistika')!.data.length).toBeGreaterThan(10);
      expect(gas.props.has('API_SECRET')).toBe(false);
      expect(gas.sheets.get('Poruke')!.data[0]).toEqual(gas.get('MESSAGE_HEADERS'));
      expect(gas.props.get('SPREADSHEET_ID')).toBe('test-spreadsheet-id');
    });

    it('vraća polja za štikliranje u Podešavanjima i zadržava vrednost', () => {
      setSetting('BOOKING_OPEN', 'TRUE'); // kvačica izgubljena, u ćeliji ostao tekst
      setSetting('GUEST_EMAILS', '');
      gas.ctx.setup();
      const value = (key: string) => settings.data.find((r) => r[0] === key)![1];
      expect(value('BOOKING_OPEN')).toBe(true);
      expect(value('GUEST_EMAILS')).toBe(true); // prazno → podrazumevano
      expect(post({ action: 'status' })).toEqual({ ok: true, open: true });
      setSetting('BOOKING_OPEN', 'ne');
      gas.ctx.setup();
      expect(value('BOOKING_OPEN')).toBe(false);
    });

    it('postojeća tabela: kolone se preuređuju zajedno sa podacima, ništa se ne gubi', () => {
      // Stari raspored: obrnut redosled, stara kolona „Imena gostiju" i bez kolone za ishranu.
      const old = [...H].reverse().filter((h) => h !== 'Ishrana i alergije');
      old.splice(3, 0, 'Imena gostiju');
      res.data = [old];
      const row = old.map((h) => (h === 'Imena gostiju' ? 'Ana, Marko' : `vrednost: ${h}`));
      res.data.push([...row]);
      gas.ctx.setup();
      expect(res.data[0]).toEqual([...H, 'Imena gostiju']);
      H.forEach((h, i) => expect(res.data[1][i]).toBe(h === 'Ishrana i alergije' ? '' : `vrednost: ${h}`));
      expect(res.data[1][H.length]).toBe('Ana, Marko');
      // Posle preuređenja sve i dalje radi.
      expect(create(reservation({ diet: 'Vegansko', dietConsent: true }))).toMatchObject({ ok: true });
      expect(cell(3, 'diet')).toBe('Vegansko');
    });
  });

  describe('instrukcije za uplatu i potvrda uplate', () => {
    it('ne šalje instrukcije bez iznosa ili podataka za uplatu', () => {
      addRow({ number: '27001', status: 'NOVA', email: 'ana@primer.si', fullName: 'Ana', locale: 'sr', ticketType: 'Galerija', ticketCount: 2 });
      expect(() => gas.ctx.sendPaymentInstructionsFor_('27001')).toThrow(/Iznos za uplatu/);
      res.data[1][H.indexOf(COL.amount)] = 130;
      setSetting('IBAN', '');
      expect(() => gas.ctx.sendPaymentInstructionsFor_('27001')).toThrow(/PAYEE i IBAN/);
      expect(gas.outbox).toHaveLength(0);
    });

    it('privremene TODO vrednosti iz početnih podešavanja nikad ne idu gostu', () => {
      const defaults = Object.fromEntries(gas.get<[string, unknown][]>('SETTINGS'));
      for (const k of ['PAYEE', 'IBAN', 'BIC', 'BANK']) expect(String(defaults[k])).toContain('TODO');
      for (const k of ['PAYEE', 'IBAN', 'BIC', 'BANK']) setSetting(k, defaults[k]);
      const row = addRow({ number: '27001', status: 'NOVA', email: 'ana@primer.si', fullName: 'Ana', locale: 'sr', amount: 130 });
      expect(() => gas.ctx.sendPaymentInstructionsFor_('27001')).toThrow(/TODO za: PAYEE, IBAN, BIC, BANK/);
      setSetting('PAYEE', 'Kulturni centar Sretenje');
      setSetting('IBAN', 'SI56 1234');
      expect(() => gas.ctx.sendPaymentInstructionsFor_('27001')).toThrow(/TODO za: BIC, BANK/);
      expect(gas.outbox).toHaveLength(0);
      expect(cell(row, 'status')).toBe('NOVA');
      setSetting('BIC', '');
      setSetting('BANK', '');
      gas.ctx.sendPaymentInstructionsFor_('27001');
      expect(gas.outbox[0].body).not.toMatch(/todo/i);
    });

    it('podsetnik bez pravih podataka za uplatu izostavlja primaoca i IBAN', () => {
      setSetting('IBAN', 'TODO: SI56 0000');
      addRow({ number: '27001', status: 'ČEKA NA UPLATU', email: 'ana@primer.si', fullName: 'Ana', locale: 'sr', ticketType: 'Galerija', ticketCount: 2, instructionsAt: daysFromToday(-8), deadline: daysFromToday(-1) });
      gas.ctx.dailyCheck();
      const reminder = gas.outbox.find((m) => m.to === 'ana@primer.si')!;
      expect(reminder.body).not.toMatch(/todo|IBAN|Primalac|Iznos za uplatu/i);
      expect(reminder.body).toContain('Svrha uplate: Sretenjski bal 27001');
    });

    it('šalje instrukcije, upisuje rok od 7 dana i status ČEKA NA UPLATU', () => {
      const row = addRow({ number: '27001', status: 'NOVA', email: 'ana@primer.si', fullName: 'Ana', locale: 'sr', ticketType: 'Galerija', ticketCount: 2, amount: 130 });
      gas.ctx.sendPaymentInstructionsFor_('27001');
      const mail = gas.outbox[0];
      expect(mail.subject).toBe('Sretenjski bal — instrukcije za uplatu, rezervacija 27001');
      expect(mail.body).toContain('Iznos za uplatu: 130,00 EUR');
      expect(mail.body).toContain('Svrha uplate: Sretenjski bal 27001');
      expect(mail.body).toContain('IBAN: SI56 0000 0000 0000 000');
      expect(cell(row, 'status')).toBe('ČEKA NA UPLATU');
      expect(cell(row, 'instructionsAt')).toBeInstanceOf(Date);
      const deadline = cell(row, 'deadline') as Date;
      const expected = daysFromToday(7);
      expect([deadline.getFullYear(), deadline.getMonth(), deadline.getDate()]).toEqual([expected.getFullYear(), expected.getMonth(), expected.getDate()]);
    });

    it('ne šalje instrukcije za plaćene, istekle i otkazane', () => {
      const rows = { '27001': 'PLAĆENO', '27002': 'ISTEKLO', '27003': 'OTKAZANO' };
      for (const [number, status] of Object.entries(rows)) addRow({ number, status, email: 'a@b.si', amount: 100 });
      for (const n of Object.keys(rows)) expect(() => gas.ctx.sendPaymentInstructionsFor_(n)).toThrow(/ne šalju/);
      expect(gas.outbox).toHaveLength(0);
    });

    it('potvrda uplate samo za PLAĆENO i samo jednom', () => {
      const row = addRow({ number: '27001', status: 'ČEKA NA UPLATU', email: 'ana@primer.si', fullName: 'Ana', locale: 'sl', ticketType: 'Galerija', ticketCount: 2 });
      expect(() => gas.ctx.sendPaymentConfirmationFor_('27001')).toThrow(/PLAĆENO/);
      res.data[row - 1][H.indexOf(COL.status)] = 'PLAĆENO';
      gas.ctx.sendPaymentConfirmationFor_('27001');
      expect(gas.outbox).toHaveLength(1);
      expect(gas.outbox[0].subject).toBe('Vaše vstopnice za prvi Sretenjski bal — rezervacija 27001');
      expect(cell(row, 'paymentConfirmedAt')).toBeInstanceOf(Date);
      expect(cell(row, 'paidAt')).toBeInstanceOf(Date);
      expect(() => gas.ctx.sendPaymentConfirmationFor_('27001')).toThrow(/već poslata/);
      expect(gas.outbox).toHaveLength(1);
    });

    describe('tab Gosti, ulaznice i skeniranje na ulazu', () => {
      const guests = () => gas.sheets.get('Gosti')!.data;
      const G = () => gas.get<Record<string, number>>('G');
      const paid = (overrides: Record<string, unknown> = {}) =>
        addRow({
          number: '27006', status: 'PLAĆENO', email: 'antonela@primer.si', phone: '+386 40 111 222', fullName: 'Antonela Parović', locale: 'sr',
          ticketType: 'Galerija', ticketCount: 3, source: 'Preporuka prijatelja',
          note: 'Gost 2: Maja Anić, maja@primer.si, +386 41 222 333\nSedimo zajedno.',
          ...overrides,
        });
      const scan = (code: unknown, pin = '482913') => post({ action: 'checkin', pin, code, device: 'Ulaz 1' });
      const codeOf = (row: number) => String(guests()[row][G().code]);

      beforeEach(() => setSetting('SCANNER_PIN', '482913'));

      it('nova rezervacija upisuje po jedan red za svakog gosta, sa zajedničkim podacima i statusom iz taba Rezervacije', () => {
        create(reservation({
          firstName: 'Ana', lastName: 'Anić',
          tickets: [{ ticketType: 'GALERIJA', count: 2 }],
          guests: [{ firstName: 'Maja', lastName: 'Marić', email: 'MAJA@primer.si', phone: '+386 41 222 333' }],
          diet: 'Maja — bez glutena', dietConsent: true,
        }));
        const g = guests();
        expect(g[0]).toEqual(gas.get<string[]>('GUEST_HEADERS'));
        expect(g.slice(1).map((r) => r.slice(0, 6))).toEqual([
          ['27001', 'Nosilac', 'Ana', 'Anić', 'ana@primer.si', '+386 40 123 456'],
          ['27001', 'Gost 2', 'Maja', 'Marić', 'maja@primer.si', '+386 41 222 333'],
        ]);
        for (const row of g.slice(1)) {
          expect(row.slice(7, 11)).toEqual(['Galerija', 'Preporuka prijatelja', 'Maja — bez glutena', 'Sedimo sa porodicom Petrović.']);
          expect((row[G().status] as Formula).text).toContain('MATCH("Status rezervacije"');
        }
        expect((g[2][G().status] as Formula).text).toContain('$A3');
      });

      it('uz potvrdu uplate šalje po jedan QR kod za svakog gosta i upisuje kod u red gosta', () => {
        paid();
        gas.ctx.sendPaymentConfirmationFor_('27006');
        const mail = gas.outbox[0];
        expect(mail.subject).toBe('Vaše ulaznice za prvi Sretenjski bal — rezervacija 27006');
        expect(Object.keys(mail.inlineImages!).sort()).toEqual(['qr1', 'qr2', 'qr3', 'sblogo']);
        expect((mail.inlineImages!.qr1 as { type: string }).type).toBe('image/gif');
        expect(mail.body).toContain('Ulaznica 1 od 3 — Antonela Parović (Galerija)');
        expect(mail.body).toContain('Ulaznica 2 od 3 — Maja Anić (Galerija)');
        expect(mail.body).toContain('Ulaznica 3 od 3 — Gost 3 · Antonela Parović (Galerija)');
        expect(mail.body).not.toContain('ulaznice#');
        expect(mail.body).not.toContain('odgovorite na ovaj mejl');
        // Stara rezervacija bez redova u tabu Gosti: dopunjena iz taba Rezervacije, a treći gost dodat kao „Gost 3".
        expect(guests().slice(1).map((r) => r.slice(0, 6))).toEqual([
          ['27006', 'Nosilac', 'Antonela', 'Parović', 'antonela@primer.si', '+386 40 111 222'],
          ['27006', 'Gost 2', 'Maja', 'Anić', 'maja@primer.si', '+386 41 222 333'],
          ['27006', 'Gost 3', 'Gost 3', '', '', ''],
        ]);
        expect(codeOf(1)).toMatch(/^27006-1-[0-9A-HJKMNP-TV-Z]{8}$/);
        expect(codeOf(3)).toMatch(/^27006-3-/);
      });

      it('ispravka imena u tabu Gosti ide na ulaznicu; ponovno slanje ne pravi nove redove i daje iste kodove', () => {
        const row = paid({ locale: 'en' });
        gas.ctx.sendPaymentConfirmationFor_('27006');
        const first = codeOf(3);
        guests()[3][G().first] = 'Marko';
        guests()[3][G().last] = 'Marković';
        res.data[row - 1][H.indexOf(COL.paymentConfirmedAt)] = '';
        gas.ctx.sendPaymentConfirmationFor_('27006');
        expect(guests()).toHaveLength(4);
        expect(codeOf(3)).toBe(first);
        expect(gas.outbox[1].body).toContain('Ticket 3 of 3 — Marko Marković (Gallery)');
      });

      it('na ulazu: prvi put propušta, drugi put javlja da je ulaznica iskorišćena', () => {
        paid();
        gas.ctx.sendPaymentConfirmationFor_('27006');
        const code = codeOf(2);
        const first = scan('SB:' + code);
        expect(first).toMatchObject({ ok: true, result: 'OK', name: 'Maja Anić', type: 'Galerija', number: '27006', index: 2, stats: { entered: 1, total: 3 } });
        expect(guests()[2][G().enteredAt]).toBeInstanceOf(Date);
        expect(guests()[2][G().scannedBy]).toBe('Ulaz 1');
        const second = scan(code.toLowerCase());
        expect(second).toMatchObject({ ok: true, result: 'USED', name: 'Maja Anić', scannedBy: 'Ulaz 1' });
        expect(second.enteredAt).toMatch(/^\d\d:\d\d$/);
      });

      it('odbija prepravljen ili izmišljen kod, neizdatu ulaznicu i neplaćenu rezervaciju', () => {
        const row = paid();
        gas.ctx.sendPaymentConfirmationFor_('27006');
        const code = codeOf(1);
        const forged = code.slice(0, -1) + (code.endsWith('A') ? 'B' : 'A');
        expect(scan(forged).result).toBe('INVALID');
        expect(scan('27006-9-AAAAAAAA').result).toBe('INVALID');
        expect(scan('https://primer.si').result).toBe('INVALID');
        expect(scan(gas.ctx.ticketCode_('27006', 4)).result).toBe('UNKNOWN');
        res.data[row - 1][H.indexOf(COL.status)] = 'OTKAZANO';
        expect(scan(code)).toMatchObject({ result: 'NOT_PAID', status: 'OTKAZANO' });
        expect(guests()[1][G().enteredAt]).toBe('');
      });

      it('PIN: bez PIN-a skeniranje je isključeno, pogrešan PIN se odbija, a posle mnogo pokušaja zaključava', () => {
        setSetting('SCANNER_PIN', '');
        expect(scan(null)).toEqual({ ok: false, code: 'SCANNER_OFF' });
        setSetting('SCANNER_PIN', '482913');
        expect(scan(null)).toEqual({ ok: true, stats: { entered: 0, total: 0 } });
        for (let i = 0; i < 15; i++) expect(scan(null, '000000')).toEqual({ ok: false, code: 'BAD_PIN' });
        expect(scan(null)).toEqual({ ok: false, code: 'LOCKED' });
      });
    });

    it('pronalazi pravi red i kad je tabela u međuvremenu sortirana', () => {
      addRow({ number: '27001', status: 'PLAĆENO', email: 'a@primer.si', fullName: 'A', locale: 'sr' });
      addRow({ number: '27002', status: 'PLAĆENO', email: 'b@primer.si', fullName: 'B', locale: 'sr' });
      res.data.splice(1, 2, res.data[2], res.data[1]); // 27002 je sada iznad 27001
      gas.ctx.sendPaymentConfirmationFor_('27001');
      expect(gas.outbox[0].to).toBe('a@primer.si');
      expect(cell(3, 'number')).toBe('27001');
      expect(cell(3, 'paymentConfirmedAt')).toBeInstanceOf(Date);
      expect(cell(2, 'paymentConfirmedAt')).toBe('');
    });
  });

  describe('dnevna provera rokova', () => {
    const base = { email: 'gost@primer.si', fullName: 'Gost', locale: 'sr', ticketType: 'Svečana', ticketCount: 2, amount: 150 };

    it('podsetnik posle roka, isticanje posle perioda tolerancije, ništa za ostale', () => {
      const due = addRow({ ...base, number: '27001', status: 'ČEKA NA UPLATU', instructionsAt: daysFromToday(-8), deadline: daysFromToday(-1) });
      const today = addRow({ ...base, number: '27002', status: 'ČEKA NA UPLATU', instructionsAt: daysFromToday(-7), deadline: daysFromToday(0) });
      const noInstr = addRow({ ...base, number: '27003', status: 'ČEKA NA UPLATU', deadline: daysFromToday(-5) });
      const paid = addRow({ ...base, number: '27004', status: 'PLAĆENO', instructionsAt: daysFromToday(-10), deadline: daysFromToday(-3) });
      const cancelled = addRow({ ...base, number: '27005', status: 'OTKAZANO', instructionsAt: daysFromToday(-10), deadline: daysFromToday(-3) });
      const paidNoStatus = addRow({ ...base, number: '27006', status: 'ČEKA NA UPLATU', instructionsAt: daysFromToday(-10), deadline: daysFromToday(-3), paidAt: daysFromToday(-1) });
      const expire = addRow({ ...base, number: '27007', status: 'PODSETNIK POSLAT', instructionsAt: daysFromToday(-12), deadline: daysFromToday(-4), reminderAt: daysFromToday(-3) });
      const graceLeft = addRow({ ...base, number: '27008', status: 'PODSETNIK POSLAT', instructionsAt: daysFromToday(-11), deadline: daysFromToday(-3), reminderAt: daysFromToday(-2) });
      const remindedNoDate = addRow({ ...base, number: '27009', status: 'PODSETNIK POSLAT', deadline: daysFromToday(-9) });
      const textDeadline = addRow({ ...base, number: '27010', status: 'ČEKA NA UPLATU', instructionsAt: '01.01.2020', deadline: '02.01.2020' });

      const report = gas.ctx.dailyCheck();

      expect([...report.reminded]).toEqual(['27001', '27010']);
      expect([...report.expired]).toEqual(['27007']);
      expect(report.problems.join('\n')).toContain('27003');
      expect(report.problems.join('\n')).toContain('27009');

      expect(cell(due, 'status')).toBe('PODSETNIK POSLAT');
      expect(cell(due, 'reminderAt')).toBeInstanceOf(Date);
      expect(cell(textDeadline, 'status')).toBe('PODSETNIK POSLAT');
      expect(cell(expire, 'status')).toBe('ISTEKLO');
      expect(cell(expire, 'closedAt')).toBeInstanceOf(Date);
      expect(cell(today, 'status')).toBe('ČEKA NA UPLATU');
      expect(cell(noInstr, 'status')).toBe('ČEKA NA UPLATU');
      expect(cell(paid, 'status')).toBe('PLAĆENO');
      expect(cell(cancelled, 'status')).toBe('OTKAZANO');
      expect(cell(paidNoStatus, 'status')).toBe('ČEKA NA UPLATU');
      expect(cell(graceLeft, 'status')).toBe('PODSETNIK POSLAT');
      expect(cell(remindedNoDate, 'status')).toBe('PODSETNIK POSLAT');

      const reminders = gas.outbox.filter((m) => m.subject.includes('podsetnik za uplatu'));
      expect(reminders.map((m) => m.subject)).toEqual([
        'Sretenjski bal — podsetnik za uplatu, rezervacija 27001',
        'Sretenjski bal — podsetnik za uplatu, rezervacija 27010',
      ]);
      expect(reminders[0].body).toContain('samo odgovorite na ovaj mejl');
      expect(gas.outbox.some((m) => m.to === 'info@kcsretenje.si' && m.subject.includes('provera rokova'))).toBe(true);
    });

    it('isti podsetnik se ne šalje dvaput', () => {
      addRow({ ...base, number: '27001', status: 'ČEKA NA UPLATU', instructionsAt: daysFromToday(-8), deadline: daysFromToday(-1) });
      gas.ctx.dailyCheck();
      gas.ctx.dailyCheck();
      expect(gas.outbox.filter((m) => m.to === 'gost@primer.si')).toHaveLength(1);
    });

    it('ako podsetnik ne prođe, status se ne menja i mesto se ne oslobađa', () => {
      const row = addRow({ ...base, number: '27001', status: 'ČEKA NA UPLATU', instructionsAt: daysFromToday(-8), deadline: daysFromToday(-1) });
      gas.failMail = (m) => m.to === 'gost@primer.si';
      const report = gas.ctx.dailyCheck();
      expect(report.reminded).toHaveLength(0);
      expect(report.problems.join()).toContain('podsetnik NIJE poslat');
      expect(cell(row, 'status')).toBe('ČEKA NA UPLATU');
      expect(cell(row, 'reminderAt')).toBe('');
      gas.ctx.dailyCheck();
      expect(cell(row, 'status')).toBe('ČEKA NA UPLATU');
    });

    it('period tolerancije se čita iz podešavanja', () => {
      const row = addRow({ ...base, number: '27001', status: 'PODSETNIK POSLAT', reminderAt: daysFromToday(-3) });
      setSetting('GRACE_DAYS', 5);
      gas.ctx.dailyCheck();
      expect(cell(row, 'status')).toBe('PODSETNIK POSLAT');
      setSetting('GRACE_DAYS', 2);
      gas.ctx.dailyCheck();
      expect(cell(row, 'status')).toBe('ISTEKLO');
    });

    it('podsetnik navodi poslednji dan za uplatu prema periodu tolerancije', () => {
      addRow({ ...base, number: '27001', status: 'ČEKA NA UPLATU', instructionsAt: daysFromToday(-8), deadline: daysFromToday(-1) });
      gas.ctx.dailyCheck();
      const last = daysFromToday(2);
      const text = `${String(last.getDate()).padStart(2, '0')}.${String(last.getMonth() + 1).padStart(2, '0')}.${last.getFullYear()}`;
      expect(gas.outbox.find((m) => m.to === 'gost@primer.si')!.body).toContain(`do ${text}, rezervacija ističe`);
    });
  });
});

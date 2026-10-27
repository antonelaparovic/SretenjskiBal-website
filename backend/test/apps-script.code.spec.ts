// Datumi u testu i u skripti računaju se u istoj zoni kao tabela.
process.env.TZ = 'Europe/Ljubljana';

import { beforeEach, describe, expect, it } from 'vitest';
import { FakeSheet, Formula, GasEnv, loadAppsScript } from './helpers/gas-fakes.js';

const SECRET = 'x'.repeat(64);

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
  const create = (r: object) => post({ secret: SECRET, action: 'create', reservation: r });
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
    gas.props.set('API_SECRET', SECRET);
  });

  describe('web app', () => {
    it('odbija pogrešan ili prazan ključ', () => {
      expect(post({ secret: 'pogresan', action: 'status' })).toEqual({ ok: false, code: 'UNAUTHORIZED' });
      expect(post({ action: 'status' })).toEqual({ ok: false, code: 'UNAUTHORIZED' });
    });

    it('vraća status iz taba Podešavanja', () => {
      expect(post({ secret: SECRET, action: 'status' })).toEqual({ ok: true, open: true });
      setSetting('BOOKING_OPEN', false);
      expect(post({ secret: SECRET, action: 'status' })).toEqual({ ok: true, open: false });
    });

    it('bez taba Podešavanja rezervacije su zatvorene', () => {
      gas.sheets.delete('Podešavanja');
      expect(post({ secret: SECRET, action: 'status' }).open).toBe(false);
      expect(create(reservation())).toEqual({ ok: false, code: 'BOOKING_CLOSED' });
    });
  });

  describe('nova rezervacija', () => {
    it('upisuje jedan red sa svim podacima i dodeljuje broj 27001', () => {
      const out = create(reservation({ invoice: { needed: true, companyName: 'Firma d.o.o.', companyAddress: 'Glavni trg 1, Maribor', taxId: 'SI12345678' } }));
      expect(out).toMatchObject({ ok: true, duplicate: false, reservationNumber: '27001', adminMailSent: true, guestMailSent: true });
      expect(res.data).toHaveLength(2);
      expect(cell(2, 'number')).toBe('27001');
      expect(cell(2, 'status')).toBe('NOVA');
      expect(cell(2, 'createdAt')).toBeInstanceOf(Date);
      expect(cell(2, 'ticketType')).toBe('Svečana');
      expect(cell(2, 'ticketCount')).toBe(2);
      expect(H).not.toContain('Imena gostiju');
      expect(cell(2, 'invoice')).toBe('DA');
      expect(cell(2, 'company')).toBe('Naziv: Firma d.o.o.\nAdresa: Glavni trg 1, Maribor\nPoreski broj: SI12345678');
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
      expect(create(reservation({ invoice: { needed: true, companyName: 'Firma' } })).fields).toEqual(['invoice.companyAddress', 'invoice.taxId']);
      expect(create(reservation({ email: 'nije-mejl' })).fields).toContain('email');
      expect(create(reservation({ source: 'NESTO' })).fields).toContain('source');
      expect(res.data).toHaveLength(1);
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
      expect(gas.outbox.find((m) => m.subject.endsWith('27001') && m.to === 'fbozic7@gmail.com')!.body).toContain('Iznos (po cenama iz podešavanja): 280,00 EUR');
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
      const admin = gas.outbox.find((m) => m.to === 'fbozic7@gmail.com')!;
      expect(admin.subject).toBe('Nova rezervacija za Sretenjski bal — 27001 · posebna ishrana');
      expect(admin.body).toContain('ISHRANA I ALERGIJE: Jedna osoba bez glutena, jedna vegetarijanska.');
      expect(gas.outbox.find((m) => m.to === 'ana@primer.si')!.body).toContain('Ishrana i alergije: Jedna osoba bez glutena');
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
      const admin = gas.outbox.find((m) => m.to === 'fbozic7@gmail.com')!;
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
      expect(sr.subject).toBe('Sretenjski bal — rezervacija 27001 je evidentirana');
      expect(sr.body).toContain('Javićemo vam se u roku od 3 dana sa detaljima za uplatu.');
      expect(sr.body).toContain('Sretenjski bal 27001');
      expect(sr.replyTo).toBe('fbozic7@gmail.com');
      expect(gas.outbox.find((m) => m.to === 'sl@primer.si')!.body).toContain('V 3 dneh vam bomo poslali podatke za plačilo.');
      const en = gas.outbox.find((m) => m.to === 'en@primer.si')!;
      expect(en.body).toContain('We will contact you within 3 days with the payment details.');
      expect(en.body).toContain('Ticket type: Gallery');
    });

    it('HTML mejla ne izvršava unos korisnika', () => {
      create(reservation({ note: '<script>alert(1)</script> & "x"' }));
      const admin = gas.outbox.find((m) => m.to === 'fbozic7@gmail.com')!;
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
      expect(gas.outbox.map((m) => m.to)).toEqual(['fbozic7@gmail.com']);
    });

    it('jasna greška kad tab Rezervacije nije podešen', () => {
      gas.sheets.delete('Rezervacije');
      expect(create(reservation())).toEqual({ ok: false, code: 'SERVER_ERROR' });
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
      expect(gas.props.get('API_SECRET')).toHaveLength(64);
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
      expect(gas.outbox[0].subject).toBe('Sretenjski bal — plačilo za rezervacijo 27001 je evidentirano');
      expect(cell(row, 'paymentConfirmedAt')).toBeInstanceOf(Date);
      expect(cell(row, 'paidAt')).toBeInstanceOf(Date);
      expect(() => gas.ctx.sendPaymentConfirmationFor_('27001')).toThrow(/već poslata/);
      expect(gas.outbox).toHaveLength(1);
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
      expect(gas.outbox.some((m) => m.to === 'fbozic7@gmail.com' && m.subject.includes('provera rokova'))).toBe(true);
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

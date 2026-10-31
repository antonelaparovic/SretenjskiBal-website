/**
 * Sretenjski bal — rezervacije karata.
 * Google Apps Script vezan za tabelu „Bal rezervacije" (Proširenja → Apps Script).
 *
 * Šta radi:
 *  - prima rezervacije direktno sa sajta (doPost), dodeljuje broj (npr. 27001) i upisuje jedan red po rezervaciji
 *  - šalje obaveštenje organizatoru i potvrdu gostu
 *  - prima poruke iz kontakt forme (tab „Poruke" + mejl organizatoru)
 *  - meni „Sretenjski bal": instrukcije za uplatu, potvrda uplate, ručna provera rokova
 *  - dnevna provera rokova: podsetnik posle roka za uplatu, ISTEKLO posle perioda tolerancije
 *  - tab „Gosti": jedan red po gostu (nosilac rezervacije + ostali gosti), grupisano i obojeno po rezervaciji
 *  - ulaznice: uz potvrdu uplate gost dobija po jedan QR kod za svakog gosta (upisuje se u tab „Gosti"),
 *    a na ulazu se kodovi skeniraju stranicom /ulaz na sajtu (akcija „checkin", zaštićena PIN-om)
 *
 * Projekat ima dva fajla: Code.gs (ovaj) i QrCode.gs (biblioteka za crtanje QR kodova).
 *
 * Sajt je statički i šalje direktno ovoj skripti, pa je skripta javna: svaka rezervacija i poruka
 * prolazi Cloudflare Turnstile proveru („da li je čovek"), proveru podataka i ograničenje broja slanja.
 *
 * Uputstvo za postavljanje: docs/REZERVACIJE.md u repozitorijumu sajta.
 * Lične podatke ne upisujemo u log (console) — samo brojeve rezervacija.
 */

const SHEET_RESERVATIONS = 'Rezervacije';
const SHEET_SETTINGS = 'Podešavanja';
const SHEET_STATS = 'Statistika';
const SHEET_MESSAGES = 'Poruke';
const SHEET_GUESTS = 'Gosti';
const TIME_ZONE = 'Europe/Ljubljana';

const STATUS = {
  NEW: 'NOVA',
  AWAITING: 'ČEKA NA UPLATU',
  REMINDED: 'PODSETNIK POSLAT',
  PAID: 'PLAĆENO',
  EXPIRED: 'ISTEKLO',
  CANCELLED: 'OTKAZANO',
};

/**
 * Kolone taba „Rezervacije", redom kojim se prikazuju (po grupama iz COLUMN_GROUPS).
 * Skripta ih traži po nazivu — nazive ne menjati; redosled „Podesi tabelu" sama sređuje.
 */
const COL = {
  // Rezervacija
  number: 'Broj rezervacije',
  status: 'Status rezervacije',
  fullName: 'Ime i prezime kontakt osobe',
  ticketType: 'Tip karte',
  ticketCount: 'Broj karata',
  amount: 'Iznos za uplatu',
  diet: 'Ishrana i alergije',
  note: 'Napomena',
  createdAt: 'Datum i vreme prijave',
  email: 'E-mail',
  phone: 'Telefon',
  // Uplata
  instructionsAt: 'Datum slanja instrukcija za uplatu',
  deadline: 'Rok za uplatu',
  reminderAt: 'Datum slanja podsetnika',
  paidAt: 'Datum evidentirane uplate',
  paymentConfirmedAt: 'Datum slanja potvrde uplate',
  closedAt: 'Datum isteka/otkazivanja',
  adminNote: 'Administrativna napomena',
  // Faktura i izvor
  invoice: 'Faktura na firmu',
  company: 'Podaci firme',
  source: 'Izvor prijave',
  sourceOther: 'Dodatak za izvor prijave',
  locale: 'Jezik prijave',
  // Tehnički podaci
  pageUrl: 'Stranica prijave',
  utm: 'UTM parametri',
  systemNote: 'Sistemska napomena',
  consent: 'Saglasnost',
  requestId: 'Jedinstveni identifikator zahteva',
};

/** Grupe kolona: boja zaglavlja; tehnički podaci su skupljeni (otvaraju se klikom na „+" iznad kolona). */
const COLUMN_GROUPS = [
  { color: '#5a1723', keys: ['number', 'status', 'fullName', 'ticketType', 'ticketCount', 'amount', 'diet', 'note', 'createdAt', 'email', 'phone'] },
  { color: '#26352c', keys: ['instructionsAt', 'deadline', 'reminderAt', 'paidAt', 'paymentConfirmedAt', 'closedAt', 'adminNote'] },
  { color: '#7a6438', keys: ['invoice', 'company', 'source', 'sourceOther', 'locale'] },
  { color: '#5b4f48', keys: ['pageUrl', 'utm', 'systemNote', 'consent', 'requestId'], collapsed: true },
];

/** Objašnjenja koja se vide kad se pređe mišem preko zaglavlja. */
const HEADER_NOTES = {
  status: 'Menja se iz padajuće liste. PLAĆENO postavljate vi kad uplatu vidite na izvodu.',
  amount: 'Upisuje se automatski po cenama iz taba Podešavanja. Možete ga promeniti pre slanja instrukcija (npr. popust).',
  diet: 'Posebna ishrana i alergije koje je gost naveo. Filtrirajte ovu kolonu za spisak za kuhinju.',
  note: 'Napomena gosta: za koga kupuje karte, želje u vezi sa sedenjem i slično.',
  instructionsAt: 'Upisuje se automatski kad iz menija pošaljete instrukcije za uplatu.',
  deadline: 'Upisuje se automatski pri slanju instrukcija (danas + broj dana iz Podešavanja). Crveno = rok je prošao.',
  reminderAt: 'Upisuje dnevna provera rokova kad pošalje podsetnik.',
  paidAt: 'Datum kad je uplata viđena na izvodu. Ako ostane prazno, upisuje se pri slanju potvrde uplate.',
  paymentConfirmedAt: 'Upisuje se kad iz menija pošaljete potvrdu uplate. Obrišite ga samo ako potvrdu treba poslati ponovo.',
  adminNote: 'Slobodno polje za ekipu — skripta ga nikad ne menja.',
  systemNote: 'Upisuje skripta (npr. da li su mejlovi poslati).',
  consent: 'Dokaz o obaveštavanju i saglasnosti: verzija politike privatnosti koju je gost video i, ako je naveo ishranu, izričita saglasnost za podatke o zdravlju (član 9 GDPR). Ne brisati dok se rezervacija čuva.',
};

const HEADERS = Object.keys(COL).map(function (k) { return COL[k]; });
const DATE_KEYS = ['instructionsAt', 'deadline', 'reminderAt', 'paidAt', 'paymentConfirmedAt', 'closedAt'];

/** Šifre su iste kao na sajtu i u backendu; nazivi su ono što se vidi u tabeli. */
const TICKET_TYPES = { SVECANA: 'Svečana', GALERIJA: 'Galerija' };
const SOURCES = {
  PREPORUKA: 'Preporuka prijatelja',
  DRUSTVENE_MREZE: 'Društvene mreže',
  RANIJI_DOLAZAK: 'Raniji dolazak na bal',
  SAJT: 'Sajt',
  EMAIL: 'E-mail',
  DRUGO: 'Drugo',
};
const LOCALES = ['sr', 'sl', 'en'];
/** Tehnička zaštita od zloupotrebe forme (nije prodajno ograničenje). */
const MAX_TICKETS_PER_RESERVATION = 100;
/** Isti uslov kao na sajtu: cifre, razmaci, + ( ) / . - i najmanje 6 cifara. */
const PHONE_RE = /^(?=(?:\D*\d){6})[+0-9 ()\/.-]{6,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Ovu formu čovek ne popuni brže — verovatno bot. */
const MIN_FILL_MS = 4000;
/** Najviše slanja (rezervacije + poruke) u jednom minutu za ceo sajt — čuva dnevni limit mejlova od zloupotrebe. */
const MAX_SUBMISSIONS_PER_MINUTE = 20;

/** Teme kontakt forme (šifre su iste kao na sajtu). */
const CONTACT_TOPICS = {
  OPSTE: 'Opšti upit',
  PARTNERSTVO: 'Partnerstvo i sponzorstvo',
  KARTE: 'Rezervacije',
  MEDIJI: 'Mediji',
  SARADNJA: 'Saradnja i nastup',
};
const MESSAGE_HEADERS = ['Datum i vreme', 'Ime', 'Prezime', 'E-mail', 'Tema', 'Poruka', 'Mejl poslat'];

/**
 * Cloudflare Turnstile. Pravi tajni ključ se upisuje u Svojstva skripte kao TURNSTILE_SECRET.
 * Dok ga nema, koristi se Cloudflareov probni ključ koji uvek propušta — zaštita od botova tada nije uključena.
 */
const TURNSTILE_TEST_SECRET = '1x0000000000000000000000000000000AA';
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** [ključ, početna vrednost, opis] — upisuje se u tab „Podešavanja" pri prvom pokretanju. */
const SETTINGS = [
  ['BOOKING_OPEN', false, 'Označeno = sajt prima nove rezervacije. Isključite kad se mesta popune — već upisane rezervacije ostaju.'],
  ['BALL_YEAR', '27', 'Dve cifre godine bala, početak broja rezervacije (27 → 27001, 27002…). Promenite pred sledeći bal.'],
  ['PRICE_SVECANA', 140, 'Cena karte Svečana (EUR). Iznos za uplatu se upisuje automatski kao predlog — pre slanja instrukcija možete ga promeniti.'],
  ['PRICE_GALERIJA', 70, 'Cena karte Galerija (EUR).'],
  ['PAYMENT_DAYS', 7, 'Rok za uplatu u danima, računa se od dana slanja instrukcija za uplatu.'],
  ['GRACE_DAYS', 2, 'Koliko dana posle podsetnika gost još može da plati. Sledećeg dana neplaćena rezervacija prelazi u ISTEKLO.'],
  ['ADMIN_EMAIL', 'info@kcsretenje.si', 'Adresa na koju stižu obaveštenja o novim rezervacijama i dnevni izveštaj o rokovima.'],
  ['REPLY_TO', 'info@kcsretenje.si', 'Adresa na koju gosti odgovaraju na automatske mejlove.'],
  ['SENDER_NAME', 'Sretenjski bal', 'Ime pošiljaoca u mejlovima.'],
  ['SENDER_EMAIL', 'info@kcsretenje.si', 'Adresa sa koje idu mejlovi. Mora biti dodata u Gmailu naloga pod kojim radi skripta (Podešavanja → Nalozi → Pošalji poštu kao); dok nije, mejlovi idu sa glavne adrese tog naloga. Prazno = glavna adresa.'],
  ['GUEST_EMAILS', true, 'Označeno = gost odmah dobija mejl da je rezervacija evidentirana.'],
  ['CURRENCY', 'EUR', 'Valuta iznosa za uplatu.'],
  // TODO: privremene vrednosti dok ne stignu pravi podaci za uplatu. Dok u nekoj od njih piše „TODO",
  // instrukcije za uplatu se ne šalju, a podsetnik ih izostavlja — gost nikad ne dobija izmišljen račun.
  ['PAYEE', 'TODO: Kulturni centar Sretenje, [ulica i broj], 2000 Maribor', 'Primalac uplate (naziv i adresa) — obavezno za slanje instrukcija za uplatu.'],
  ['IBAN', 'TODO: SI56 0000 0000 0000 000', 'Broj računa (IBAN) — obavezno za slanje instrukcija za uplatu.'],
  ['BIC', 'TODO: BIC/SWIFT banke', 'BIC/SWIFT (opciono — obrišite ako nije potreban).'],
  ['BANK', 'TODO: naziv banke', 'Naziv banke (opciono — obrišite ako nije potreban).'],
  ['PAYMENT_NOTE', '', 'Dodatna rečenica u instrukcijama za uplatu (opciono).'],
  ['SCANNER_PIN', '', 'PIN za stranicu za skeniranje ulaznica na ulazu (sretenjskibal.si/ulaz), najmanje 6 cifara. Dok je prazno, skeniranje je isključeno. Recite ga samo ljudima na ulazu.'],
];

// ─────────────────────────────────────────────────────────────────────────────
// Web app — poziva ga sajt direktno iz browsera (POST, telo je JSON poslat kao običan tekst)
// ─────────────────────────────────────────────────────────────────────────────

function doGet() {
  return json_({ ok: true, service: 'sretenjski-bal-rezervacije' });
}

function doPost(e) {
  let req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, code: 'BAD_REQUEST' });
  }
  if (!req || typeof req !== 'object') return json_({ ok: false, code: 'BAD_REQUEST' });
  try {
    if (req.action === 'status') return json_(getStatus_());
    if (req.action === 'create') return json_(createReservation_(req.reservation || {}, req.captcha));
    if (req.action === 'contact') return json_(sendContact_(req.contact || {}, req.captcha));
    if (req.action === 'checkin') return json_(checkin_(req));
    return json_({ ok: false, code: 'BAD_REQUEST' });
  } catch (err) {
    console.error('doPost greška: ' + err.message);
    return json_({ ok: false, code: 'SERVER_ERROR' });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Provera „da li je čovek" kod Cloudflarea. Svaki token važi samo jednom. */
function verifyCaptcha_(token) {
  if (typeof token !== 'string' || !token || token.length > 2048) return false;
  const secret = PropertiesService.getScriptProperties().getProperty('TURNSTILE_SECRET') || TURNSTILE_TEST_SECRET;
  try {
    const res = UrlFetchApp.fetch(TURNSTILE_VERIFY_URL, {
      method: 'post',
      payload: { secret: secret, response: token },
      muteHttpExceptions: true,
    });
    return JSON.parse(res.getContentText()).success === true;
  } catch (err) {
    console.error('Turnstile provera nije uspela: ' + err.message);
    return false;
  }
}

/** Skriveno polje popunjeno ili forma poslata prebrzo — bot. */
function looksLikeBot_(input) {
  const elapsed = Number(input.elapsedMs);
  return Boolean(input.website) || (input.elapsedMs !== undefined && (!isFinite(elapsed) || elapsed < MIN_FILL_MS));
}

/** Ograničenje broja slanja u minuti za ceo sajt (skripta ne vidi IP adresu posetioca). */
function tooManySubmissions_() {
  const cache = CacheService.getScriptCache();
  const key = 'submissions:' + Math.floor(Date.now() / 60000);
  const count = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(count), 120);
  return count > MAX_SUBMISSIONS_PER_MINUTE;
}

/** Zajedničke provere pre svakog slanja; vraća grešku ili null. */
function guardSubmission_(input, captcha) {
  if (looksLikeBot_(input)) return { ok: false, code: 'REJECTED' };
  if (tooManySubmissions_()) return { ok: false, code: 'BUSY' };
  if (!verifyCaptcha_(captcha)) return { ok: false, code: 'CAPTCHA_FAILED' };
  return null;
}

function getStatus_() {
  const s = readSettings_();
  return { ok: true, open: s.bookingOpen };
}

// ─────────────────────────────────────────────────────────────────────────────
// Nova rezervacija
// ─────────────────────────────────────────────────────────────────────────────

function createReservation_(input, captcha) {
  const settings = readSettings_();
  if (!settings.bookingOpen) return { ok: false, code: 'BOOKING_CLOSED' };
  const invalid = validateReservation_(input);
  if (invalid.length) return { ok: false, code: 'INVALID', fields: invalid };
  const blocked = guardSubmission_(input, captcha);
  if (blocked) return blocked;

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, code: 'BUSY' };
  let record;
  try {
    const t = openTable_();
    // Isti zahtev poslat ponovo (npr. posle mrežne greške) — vraćamo već dodeljen broj, bez novog reda i mejlova.
    const existing = t.rows.filter(function (row) {
      return String(row[t.idx[COL.requestId]]).trim() === input.requestId;
    })[0];
    if (existing) {
      return { ok: true, duplicate: true, reservationNumber: String(existing[t.idx[COL.number]]).trim() };
    }
    record = buildRecord_(input, nextNumber_(t, settings.ballYear), new Date(), settings);
    appendRecord_(t, record);
    try {
      appendGuestRows_(guestRowsFromInput_(record, input, guestsSheet_().getLastRow() + 1));
    } catch (err) {
      // Rezervacija je upisana; gosti se mogu dopuniti menijem „Podesi tabelu".
      console.error('Rezervacija ' + record.number + ': redovi u tabu Gosti nisu upisani.');
    }
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  // Rezervacija je trajno upisana. Greška u slanju mejla je ne poništava.
  const result = { ok: true, duplicate: false, reservationNumber: record.number, adminMailSent: false, guestMailSent: false };
  const notes = [];
  try {
    sendAdminNotification_(record, settings);
    result.adminMailSent = true;
    notes.push('Obaveštenje organizatoru poslato.');
  } catch (err) {
    console.error('Rezervacija ' + record.number + ': obaveštenje organizatoru nije poslato.');
    notes.push('Obaveštenje organizatoru NIJE poslato: ' + err.message);
  }
  if (settings.guestEmails) {
    try {
      sendGuestMail_('received', record, settings);
      result.guestMailSent = true;
      notes.push('Potvrda gostu poslata.');
    } catch (err) {
      console.error('Rezervacija ' + record.number + ': potvrda gostu nije poslata.');
      notes.push('Potvrda gostu NIJE poslata: ' + err.message);
    }
  }
  try {
    updateReservation_(record.number, function () {
      return { systemNote: stamp_() + ' ' + notes.join(' ') };
    });
  } catch (err) {
    console.error('Rezervacija ' + record.number + ': sistemska napomena nije upisana.');
  }
  return result;
}

/** „Gost 2: Ime Prezime, e-adresa, telefon" — jedan red po gostu, upisuje se na početak napomene. */
function guestLines_(guests) {
  return (Array.isArray(guests) ? guests : []).map(function (g, i) {
    return 'Gost ' + (i + 2) + ': ' + clean_(g.firstName) + ' ' + clean_(g.lastName) + ', ' + clean_(g.email).toLowerCase() + ', ' + clean_(g.phone);
  });
}

function str_(v, min, max) {
  return typeof v === 'string' && v.trim().length >= min && v.trim().length <= max;
}

function optionalStr_(v, max) {
  return v === undefined || v === null || (typeof v === 'string' && v.length <= max);
}

/** Sajt proverava isto u browseru, ali skripta je javna, pa sve proverava ponovo. Vraća listu neispravnih polja. */
function validateReservation_(r) {
  const bad = [];
  const str = str_;
  if (!str(r.requestId, 8, 64) || !/^[A-Za-z0-9-]+$/.test(r.requestId)) bad.push('requestId');
  if (!str(r.fullName, 2, 120)) bad.push('fullName');
  if (!optionalStr_(r.firstName, 60)) bad.push('firstName');
  if (!optionalStr_(r.lastName, 60)) bad.push('lastName');
  if (!str(r.email, 3, 254) || !EMAIL_RE.test(String(r.email).trim())) bad.push('email');
  if (!str(r.phone, 6, 30) || !PHONE_RE.test(String(r.phone).trim())) bad.push('phone');
  const tickets = Array.isArray(r.tickets) ? r.tickets : [];
  const seen = {};
  let total = 0;
  tickets.forEach(function (t, i) {
    if (!t || !TICKET_TYPES[t.ticketType] || seen[t.ticketType]) bad.push('tickets.' + i + '.ticketType');
    if (!t || !(Number.isInteger(t.count) && t.count >= 1)) bad.push('tickets.' + i + '.count');
    if (t) { seen[t.ticketType] = true; total += Number(t.count) || 0; }
  });
  if (!tickets.length || total > MAX_TICKETS_PER_RESERVATION) bad.push('tickets');
  if (!optionalStr_(r.diet, 1000)) bad.push('diet');
  // Ishrana i alergije su podaci o zdravlju: bez izričite saglasnosti se ne upisuju.
  if (typeof r.diet === 'string' && r.diet.trim() && r.dietConsent !== true) bad.push('dietConsent');
  if (!str(r.privacyPolicyVersion, 1, 20)) bad.push('privacyPolicyVersion');
  if (!optionalStr_(r.note, 2000)) bad.push('note');
  // Ostali gosti (broj ulaznica − 1): ime, prezime, e-adresa i telefon svakog.
  if (r.guests !== undefined) {
    if (!Array.isArray(r.guests) || r.guests.length > MAX_TICKETS_PER_RESERVATION) bad.push('guests');
    else r.guests.forEach(function (g, i) {
      if (!g || !str(g.firstName, 1, 60) || !str(g.lastName, 1, 60) || !str(g.email, 3, 254) || !EMAIL_RE.test(String(g.email).trim()) ||
        !str(g.phone, 6, 30) || !PHONE_RE.test(String(g.phone).trim())) bad.push('guests.' + i);
    });
  }
  if (!optionalStr_(r.sourceOther, 200)) bad.push('sourceOther');
  if (!optionalStr_(r.pageUrl, 500)) bad.push('pageUrl');
  if (r.utm !== undefined && (typeof r.utm !== 'object' || r.utm === null || Array.isArray(r.utm))) bad.push('utm');
  const inv = r.invoice || {};
  if (inv.needed === true) {
    if (!str(inv.companyName, 2, 200)) bad.push('invoice.companyName');
    if (!str(inv.companyAddress, 2, 300)) bad.push('invoice.companyAddress');
    if (COMPANY_COUNTRIES_.indexOf(inv.companyCountry) < 0) bad.push('invoice.companyCountry');
    if (!isValidTaxId_(inv.companyCountry, inv.taxId)) bad.push('invoice.taxId');
    if (inv.companyCountry === 'SI' && typeof inv.vatPayer !== 'boolean') bad.push('invoice.vatPayer');
  }
  if (!SOURCES[r.source]) bad.push('source');
  if (LOCALES.indexOf(r.locale) < 0) bad.push('locale');
  return bad;
}

// ─────────────────────────────────────────────────────────────────────────────
// Kontakt forma
// ─────────────────────────────────────────────────────────────────────────────

/** Poruka se upisuje u tab „Poruke" (da se ne izgubi) i šalje organizatoru; „Odgovori" ide pošiljaocu. */
function sendContact_(m, captcha) {
  const bad = [];
  if (!str_(m.firstName, 1, 80)) bad.push('firstName');
  if (!str_(m.lastName, 1, 80)) bad.push('lastName');
  if (!str_(m.email, 3, 254) || !EMAIL_RE.test(String(m.email).trim())) bad.push('email');
  if (!CONTACT_TOPICS[m.topic]) bad.push('topic');
  if (!str_(m.message, 10, 4000)) bad.push('message');
  if (m.consent !== true) bad.push('consent');
  if (bad.length) return { ok: false, code: 'INVALID', fields: bad };
  const blocked = guardSubmission_(m, captcha);
  if (blocked) return blocked;

  const settings = readSettings_();
  const msg = {
    at: new Date(),
    firstName: clean_(m.firstName),
    lastName: clean_(m.lastName),
    email: clean_(m.email).toLowerCase(),
    topic: CONTACT_TOPICS[m.topic],
    message: clean_(m.message, true),
  };

  let row = -1;
  try {
    const sheet = messagesSheet_();
    sheet.appendRow([msg.at, msg.firstName, msg.lastName, msg.email, msg.topic, msg.message, 'NE'].map(safeCell_));
    row = sheet.getLastRow();
  } catch (err) {
    console.error('Poruka nije upisana u tabelu: ' + err.message);
  }

  let sent = false;
  try {
    sendMail_(settings, {
      to: settings.adminEmail,
      subject: 'Sajt · ' + msg.topic + ' · ' + msg.firstName + ' ' + msg.lastName,
      body: msg.firstName + ' ' + msg.lastName + ' <' + msg.email + '>\nTema: ' + msg.topic + '\nPrimljeno: ' + stamp_() + '\n\n' + msg.message,
      replyTo: msg.email,
    });
    sent = true;
    if (row > 0) spreadsheet_().getSheetByName(SHEET_MESSAGES).getRange(row, MESSAGE_HEADERS.length).setValue('DA');
  } catch (err) {
    console.error('Poruka iz kontakt forme nije poslata mejlom.');
  }

  // Ako nema ni upisa ni mejla, posetilac mora da zna da poruka nije stigla.
  if (row < 0 && !sent) return { ok: false, code: 'SERVER_ERROR' };
  return { ok: true };
}

function messagesSheet_() {
  const ss = spreadsheet_();
  let sheet = ss.getSheetByName(SHEET_MESSAGES);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_MESSAGES);
    sheet.appendRow(MESSAGE_HEADERS);
  }
  return sheet;
}

/**
 * Sledeći broj za godinu bala: veći od najvećeg broja u tabeli i od zapamćenog brojača
 * (brojač sprečava ponovnu upotrebu broja ako se poslednji red obriše). Poziva se samo pod zaključavanjem.
 */
function nextNumber_(t, ballYear) {
  const props = PropertiesService.getScriptProperties();
  const key = 'COUNTER_' + ballYear;
  let max = Number(props.getProperty(key)) || 0;
  t.rows.forEach(function (row) {
    const n = String(row[t.idx[COL.number]]).trim();
    if (/^\d{5,}$/.test(n) && n.indexOf(ballYear) === 0) max = Math.max(max, Number(n.slice(2)));
  });
  const next = max + 1;
  props.setProperty(key, String(next));
  return ballYear + String(next).padStart(3, '0');
}

const COMPANY_COUNTRIES_ = ['SI', 'EU', 'OTHER'];
const COMPANY_COUNTRY_LABELS_ = { SI: 'Slovenija', EU: 'Druga država EU', OTHER: 'Izvan EU' };

/** Ista pravila kao u formi za rezervaciju na sajtu (format poreskog broja po državi firme). */
function isValidTaxId_(country, taxId) {
  const raw = typeof taxId === 'string' ? taxId : '';
  const v = raw.replace(/[\s.-]/g, '').toUpperCase();
  if (country === 'SI') return /^(SI)?\d{8}$/.test(v);
  if (country === 'EU') return /^[A-Z]{2}[0-9A-Z+*]{2,12}$/.test(v) && v.indexOf('SI') !== 0;
  return raw.trim().length >= 2 && raw.trim().length <= 40;
}

/** Podaci firme za fakturu, u jednoj ćeliji. Napomena o DDV-u pomaže knjigovođi da odmah vidi o kakvom je obračunu reč. */
function companyDetails_(inv) {
  const country = inv.companyCountry;
  const taxLabel = country === 'SI' ? 'Davčna številka / ID za DDV' : country === 'EU' ? 'ID za DDV' : 'Poreski broj';
  const lines = [
    'Naziv: ' + clean_(inv.companyName),
    'Sedež: ' + clean_(inv.companyAddress),
    'Država: ' + (COMPANY_COUNTRY_LABELS_[country] || ''),
    taxLabel + ': ' + clean_(inv.taxId).toUpperCase(),
  ];
  if (country === 'SI') lines.push('Obveznik DDV: ' + (inv.vatPayer === true ? 'DA' : 'NE'));
  if (country === 'EU') lines.push('Obračun: reverse charge (0 % DDV) ako je ID za DDV važeći u VIES');
  if (country === 'OTHER') lines.push('Obračun: izvan EU, proveriti sa računovođom');
  return lines.join('\n');
}

function buildRecord_(r, number, now, settings) {
  const inv = r.invoice || {};
  const utm = r.utm || {};
  return {
    number: number,
    createdAt: now,
    status: STATUS.NEW,
    fullName: clean_(r.fullName),
    email: clean_(r.email).toLowerCase(),
    phone: clean_(r.phone),
    ticketType: ticketSummary_(r.tickets),
    ticketCount: r.tickets.reduce(function (sum, t) { return sum + t.count; }, 0),
    amount: suggestedAmount_(r.tickets, settings.prices),
    invoice: inv.needed === true ? 'DA' : 'NE',
    company: inv.needed === true
      ? companyDetails_(inv)
      : '',
    diet: clean_(r.diet || '', true),
    note: guestLines_(r.guests).concat([clean_(r.note || '', true)]).filter(Boolean).join('\n'),
    source: SOURCES[r.source],
    sourceOther: r.source === 'DRUGO' ? clean_(r.sourceOther || '') : '',
    locale: r.locale,
    pageUrl: clean_(r.pageUrl || '').slice(0, 500),
    utm: Object.keys(utm).filter(function (k) { return utm[k]; }).map(function (k) { return 'utm_' + k + '=' + clean_(String(utm[k])).slice(0, 100); }).join('; '),
    consent: 'Politika privatnosti v' + clean_(r.privacyPolicyVersion) + (String(r.diet || '').trim() ? '; ishrana: izričita saglasnost data' : '; ishrana: nije navedena'),
    requestId: r.requestId,
  };
}

/** „Svečana" ili, kad se kasnije budu kombinovali tipovi, „Svečana ×2, Galerija ×1". */
function ticketSummary_(tickets) {
  if (tickets.length === 1) return TICKET_TYPES[tickets[0].ticketType];
  return tickets.map(function (t) { return TICKET_TYPES[t.ticketType] + ' ×' + t.count; }).join(', ');
}

/** Običan tekst: bez HTML-a i kontrolnih znakova. */
function clean_(v, multiline) {
  let s = String(v == null ? '' : v).replace(/<[^>]*>/g, '');
  s = multiline
    ? s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\r\n?/g, '\n')
    : s.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ');
  return s.trim();
}

/** Tekst koji počinje sa = + - @ tabela bi protumačila kao formulu — apostrof ga čuva kao običan tekst. */
function safeCell_(v) {
  if (typeof v !== 'string') return v;
  return /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tabela
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tabela za koju je skripta vezana. Kad web aplikacija nema „aktivnu" tabelu, koristi ID koji je
 * „Podesi tabelu" zapamtila — zato i kopija tabele (npr. na drugom nalogu) radi sa svojom tabelom.
 */
function spreadsheet_() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Skripta ne zna koju tabelu koristi. U tabeli pokrenite meni Sretenjski bal → Podesi tabelu.');
  return SpreadsheetApp.openById(id);
}

function openTable_() {
  const sheet = spreadsheet_().getSheetByName(SHEET_RESERVATIONS);
  if (!sheet) throw new Error('Nema taba „' + SHEET_RESERVATIONS + '". Pokrenite meni Sretenjski bal → Podesi tabelu.');
  addMissingColumns_(sheet);
  const values = sheet.getDataRange().getValues();
  const header = (values[0] || []).map(function (h) { return String(h).trim(); });
  const idx = {};
  header.forEach(function (h, i) { if (h && !(h in idx)) idx[h] = i; });
  return { sheet: sheet, header: header, idx: idx, rows: values.slice(1) };
}

/** Nova kolona (npr. posle izmene skripte) dodaje se na kraj zaglavlja; postojeće se ne diraju. */
function addMissingColumns_(sheet) {
  const lastCol = sheet.getLastColumn();
  const existing = lastCol ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h).trim(); }) : [];
  const missing = HEADERS.filter(function (h) { return existing.indexOf(h) < 0; });
  if (missing.length) sheet.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
}

function rowToObj_(t, row) {
  const o = {};
  Object.keys(COL).forEach(function (k) { o[k] = row[t.idx[COL[k]]]; });
  return o;
}

/** Broj reda u tabeli (od 1) za broj rezervacije, ili -1. */
function findRow_(t, number) {
  for (let i = 0; i < t.rows.length; i++) {
    if (String(t.rows[i][t.idx[COL.number]]).trim() === String(number)) return i + 2;
  }
  return -1;
}

function appendRecord_(t, record) {
  const byHeader = {};
  Object.keys(record).forEach(function (k) { byHeader[COL[k]] = record[k]; });
  t.sheet.appendRow(t.header.map(function (h) { return h in byHeader ? safeCell_(byHeader[h]) : ''; }));
}

function writeFields_(t, rowNumber, fields) {
  Object.keys(fields).forEach(function (k) {
    t.sheet.getRange(rowNumber, t.idx[COL[k]] + 1).setValue(safeCell_(fields[k]));
  });
}

/**
 * Bezbedna izmena jednog reda: pod zaključavanjem ponovo pronalazi red po broju rezervacije
 * (red se mogao pomeriti ako je neko sortirao tabelu). fn(rezervacija) vraća polja za upis ili null.
 */
function updateReservation_(number, fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('Tabela je zauzeta, pokušajte ponovo.');
  try {
    const t = openTable_();
    const rowNumber = findRow_(t, number);
    if (rowNumber < 0) throw new Error('Rezervacija ' + number + ' nije pronađena.');
    const r = rowToObj_(t, t.rows[rowNumber - 2]);
    const fields = fn(r);
    if (fields) writeFields_(t, rowNumber, fields);
    return r;
  } finally {
    lock.releaseLock();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Podešavanja
// ─────────────────────────────────────────────────────────────────────────────

function readSettings_() {
  const raw = {};
  const sheet = spreadsheet_().getSheetByName(SHEET_SETTINGS);
  if (sheet) {
    sheet.getDataRange().getValues().slice(1).forEach(function (row) {
      const key = String(row[0]).trim();
      if (key) raw[key] = row[1];
    });
  }
  return normalizeSettings_(raw);
}

function normalizeSettings_(raw) {
  const def = {};
  SETTINGS.forEach(function (s) { def[s[0]] = s[1]; });
  const get = function (k) { return raw[k] === undefined || raw[k] === '' || raw[k] === null ? def[k] : raw[k]; };
  // Podaci za uplatu: obrisano polje ostaje prazno (početna vrednost važi samo kad red ne postoji).
  const text = function (k) { return String(raw[k] === undefined || raw[k] === null ? def[k] : raw[k]).trim(); };
  const int = function (k, min, max) {
    const n = parseInt(get(k), 10);
    return isNaN(n) ? def[k] : Math.min(max, Math.max(min, n));
  };
  const digits = String(get('BALL_YEAR')).replace(/\D/g, '');
  return {
    // Bez taba „Podešavanja" rezervacije su zatvorene — bezbedno podrazumevano stanje.
    bookingOpen: raw.BOOKING_OPEN === undefined ? false : toBool_(raw.BOOKING_OPEN),
    ballYear: digits.length >= 2 ? digits.slice(-2) : String(def.BALL_YEAR),
    prices: prices_(raw, def),
    paymentDays: int('PAYMENT_DAYS', 1, 60),
    graceDays: int('GRACE_DAYS', 0, 60),
    adminEmail: String(get('ADMIN_EMAIL')).trim(),
    replyTo: String(get('REPLY_TO')).trim(),
    senderName: String(get('SENDER_NAME')).trim(),
    senderEmail: text('SENDER_EMAIL').toLowerCase(),
    guestEmails: toBool_(get('GUEST_EMAILS')),
    currency: String(get('CURRENCY')).trim(),
    payee: text('PAYEE'),
    iban: text('IBAN'),
    bic: text('BIC'),
    bank: text('BANK'),
    paymentNote: text('PAYMENT_NOTE'),
    scannerPin: text('SCANNER_PIN'),
  };
}

/** Cena po šifri tipa karte iz redova PRICE_<ŠIFRA>; 0 = cena nije podešena. */
function prices_(raw, def) {
  const out = {};
  Object.keys(TICKET_TYPES).forEach(function (code) {
    const k = 'PRICE_' + code;
    const v = raw[k] === undefined || raw[k] === null ? def[k] : raw[k];
    const n = Number(String(v).replace(',', '.'));
    out[code] = n > 0 ? n : 0;
  });
  return out;
}

/** Predlog iznosa po cenama iz podešavanja, ili '' ako za neki tip cena nije podešena. */
function suggestedAmount_(tickets, prices) {
  let sum = 0;
  for (let i = 0; i < tickets.length; i++) {
    const p = prices[tickets[i].ticketType];
    if (!(p > 0)) return '';
    sum += p * tickets[i].count;
  }
  return sum;
}

function toBool_(v) {
  if (v === true || v === 1) return true;
  return ['true', 'da', 'yes', '1', 'x', 'otvoreno'].indexOf(String(v).trim().toLowerCase()) >= 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Datumi
// ─────────────────────────────────────────────────────────────────────────────

function sheetTimeZone_() {
  try {
    return spreadsheet_().getSpreadsheetTimeZone() || TIME_ZONE;
  } catch (err) {
    return TIME_ZONE;
  }
}

/** Datum iz ćelije: pravi datum ili tekst „25.11.2026" / „2026-11-25". Inače null. */
function parseDate_(v) {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  const s = String(v == null ? '' : v).trim();
  let m = /^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\.?$/.exec(s);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return null;
}

/** 'yyyy-MM-dd' u vremenskoj zoni tabele — poredimo dane, ne sate. */
function dayKey_(date, tz) {
  return Utilities.formatDate(date, tz, 'yyyy-MM-dd');
}

function addDaysKey_(key, days) {
  const p = key.split('-').map(Number);
  const d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + days));
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
}

/** 'yyyy-MM-dd' → '25.11.2026' */
function formatKey_(key) {
  const p = key.split('-');
  return p[2] + '.' + p[1] + '.' + p[0];
}

function stamp_() {
  return Utilities.formatDate(new Date(), sheetTimeZone_(), 'dd.MM.yyyy HH:mm');
}

/** Datum od kog važi rok: današnji dan + n dana, kao datum (ponoć) u vremenskoj zoni skripte. */
function dateFromKey_(key) {
  const p = key.split('-').map(Number);
  return new Date(p[0], p[1] - 1, p[2]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Rokovi: podsetnik i isticanje
// ─────────────────────────────────────────────────────────────────────────────

function isPaid_(r) {
  return normStatus_(r.status) === STATUS.PAID || parseDate_(r.paidAt) !== null;
}

function normStatus_(s) {
  return String(s == null ? '' : s).trim().toUpperCase();
}

/**
 * Šta dnevna provera treba da uradi sa rezervacijom: { action: 'REMIND' | 'EXPIRE' | null, problem }.
 *  - REMIND: status ČEKA NA UPLATU, instrukcije poslate, rok unet i prošao, podsetnik još nije slat.
 *  - EXPIRE: status PODSETNIK POSLAT, podsetnik zaista poslat i prošao je ceo period tolerancije.
 * Plaćene, otkazane, istekle i rezervacije bez roka se nikad ne diraju.
 */
function decideAction_(r, todayKey, graceDays, tz) {
  const status = normStatus_(r.status);
  if (isPaid_(r) || status === STATUS.EXPIRED || status === STATUS.CANCELLED) return { action: null };

  if (status === STATUS.AWAITING) {
    if (parseDate_(r.reminderAt)) return { action: null };
    const sentAt = parseDate_(r.instructionsAt);
    const deadline = parseDate_(r.deadline);
    if (!sentAt || !deadline) {
      return { action: null, problem: 'status je ČEKA NA UPLATU, ali nedostaje datum slanja instrukcija ili rok za uplatu — podsetnik se ne šalje automatski.' };
    }
    if (todayKey <= dayKey_(deadline, tz)) return { action: null };
    if (!String(r.email || '').trim()) return { action: null, problem: 'rok je prošao, ali nema e-mail adrese za podsetnik.' };
    return { action: 'REMIND' };
  }

  if (status === STATUS.REMINDED) {
    const remindedAt = parseDate_(r.reminderAt);
    if (!remindedAt) {
      return { action: null, problem: 'status je PODSETNIK POSLAT, ali datum slanja podsetnika nije upisan — rezervacija ne ističe automatski.' };
    }
    // Gost može da plati zaključno sa danom podsetnik + period tolerancije; ističe sledećeg dana.
    if (todayKey > addDaysKey_(dayKey_(remindedAt, tz), graceDays)) return { action: 'EXPIRE' };
  }
  return { action: null };
}

/** Pokreće se svakog jutra (okidač iz menija „Uključi dnevnu proveru rokova"), a može i ručno iz menija. */
function dailyCheck() {
  const settings = readSettings_();
  const tz = sheetTimeZone_();
  const today = dayKey_(new Date(), tz);
  const report = { reminded: [], expired: [], problems: [] };

  const t = openTable_();
  t.rows.forEach(function (row) {
    const r = rowToObj_(t, row);
    const number = String(r.number == null ? '' : r.number).trim();
    if (!number) return;
    const d = decideAction_(r, today, settings.graceDays, tz);
    if (d.problem) report.problems.push(number + ': ' + d.problem);
    if (d.action) processDeadline_(number, d.action, settings, tz, today, report);
  });

  if (report.reminded.length || report.expired.length || report.problems.length) {
    try {
      sendAdminDigest_(report, settings);
    } catch (err) {
      console.error('Dnevni izveštaj nije poslat: ' + err.message);
    }
  }
  console.log('Provera rokova: podsetnika ' + report.reminded.length + ', isteklo ' + report.expired.length + ', upozorenja ' + report.problems.length);
  return report;
}

function processDeadline_(number, action, settings, tz, today, report) {
  try {
    updateReservation_(number, function (r) {
      // Ponovna provera pod zaključavanjem — sprečava dupli podsetnik ako se provera pokrene dvaput.
      if (decideAction_(r, today, settings.graceDays, tz).action !== action) return null;
      if (action === 'REMIND') {
        try {
          sendGuestMail_('reminder', r, settings, { expiresOn: formatKey_(addDaysKey_(today, settings.graceDays)) });
        } catch (err) {
          // Bez poslatog podsetnika status se ne menja, pa mesto ne može da se oslobodi.
          report.problems.push(number + ': podsetnik NIJE poslat (' + err.message + '), status nije menjan.');
          return null;
        }
        report.reminded.push(number);
        return { reminderAt: new Date(), status: STATUS.REMINDED };
      }
      report.expired.push(number);
      return {
        status: STATUS.EXPIRED,
        closedAt: new Date(),
        systemNote: stamp_() + ' Isteklo automatski — uplata nije evidentirana ' + settings.graceDays + ' dana posle podsetnika.',
      };
    });
  } catch (err) {
    report.problems.push(number + ': ' + err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Instrukcije za uplatu i potvrda uplate (pokreće osoba zadužena za karte iz menija)
// ─────────────────────────────────────────────────────────────────────────────

/** Zašto instrukcije ne mogu da se pošalju, ili null. */
function instructionsBlocker_(r, settings) {
  const status = normStatus_(r.status);
  if (status === STATUS.PAID || [STATUS.EXPIRED, STATUS.CANCELLED].indexOf(status) >= 0) {
    return 'Rezervacija ima status ' + status + ' — instrukcije se ne šalju.';
  }
  if (isPaid_(r)) {
    return 'U koloni „' + COL.paidAt + '" već postoji datum, pa se rezervacija vodi kao plaćena — instrukcije se ne šalju. ' +
      'Ako uplata nije stigla, obrišite taj datum (i datum u koloni „' + COL.paymentConfirmedAt + '"), pa pokušajte ponovo.';
  }
  if (!(Number(r.amount) > 0)) return 'Upišite iznos u kolonu „' + COL.amount + '".';
  if (!settings.payee || !settings.iban) return 'U tabu „' + SHEET_SETTINGS + '" popunite PAYEE i IBAN.';
  const todo = paymentTodo_(settings);
  if (todo.length) return 'U tabu „' + SHEET_SETTINGS + '" još piše TODO za: ' + todo.join(', ') + '. Upišite prave podatke za uplatu (ili obrišite opciona polja).';
  if (!String(r.email || '').trim()) return 'Rezervacija nema e-mail adresu.';
  return null;
}

/** Podešavanja za uplatu u kojima još stoji privremena vrednost sa „TODO". */
function paymentTodo_(settings) {
  const keys = { PAYEE: settings.payee, IBAN: settings.iban, BIC: settings.bic, BANK: settings.bank, PAYMENT_NOTE: settings.paymentNote };
  return Object.keys(keys).filter(function (k) { return /todo/i.test(keys[k]); });
}

/** Podaci za uplatu su pravi i potpuni — tek tada idu u mejl gostu. */
function paymentDetailsReady_(settings) {
  return Boolean(settings.payee && settings.iban) && paymentTodo_(settings).length === 0;
}

/** Šalje instrukcije i upisuje datum slanja, rok i status ČEKA NA UPLATU. */
function sendPaymentInstructionsFor_(number) {
  const settings = readSettings_();
  const tz = sheetTimeZone_();
  let deadlineText = '';
  updateReservation_(number, function (r) {
    const blocker = instructionsBlocker_(r, settings);
    if (blocker) throw new Error(blocker);
    const existing = parseDate_(r.deadline);
    const deadline = existing || dateFromKey_(addDaysKey_(dayKey_(new Date(), tz), settings.paymentDays));
    deadlineText = Utilities.formatDate(deadline, tz, 'dd.MM.yyyy');
    sendGuestMail_('instructions', r, settings, { deadline: deadlineText });
    const fields = { instructionsAt: new Date(), deadline: deadline };
    if (normStatus_(r.status) !== STATUS.REMINDED) fields.status = STATUS.AWAITING;
    return fields;
  });
  return deadlineText;
}

/** Šalje potvrdu uplate samo za PLAĆENO i samo jednom (datum slanja se upisuje). */
function sendPaymentConfirmationFor_(number) {
  const settings = readSettings_();
  updateReservation_(number, function (r) {
    if (normStatus_(r.status) !== STATUS.PAID) throw new Error('Prvo promenite status u ' + STATUS.PAID + '.');
    if (parseDate_(r.paymentConfirmedAt)) throw new Error('Potvrda uplate je već poslata. Da biste je poslali ponovo, obrišite datum u koloni „' + COL.paymentConfirmedAt + '".');
    if (!String(r.email || '').trim()) throw new Error('Rezervacija nema e-mail adresu.');
    const tickets = issueTickets_(r);
    sendGuestMail_('paid', r, settings, { tickets: tickets });
    const fields = { paymentConfirmedAt: new Date() };
    if (!parseDate_(r.paidAt)) fields.paidAt = new Date();
    return fields;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mejlovi
// ─────────────────────────────────────────────────────────────────────────────

const MAIL = {
  sr: {
    greeting: function (n) { return 'Poštovani/a ' + n + ','; },
    signoff: ['Srdačan pozdrav,', 'Kulturni centar Sretenje'],
    tickets: { label: 'Ulaznica', of: 'od', code: 'Kod' },
    labels: { number: 'Broj rezervacije', ticketType: 'Tip ulaznice', ticketCount: 'Broj ulaznica', guests: 'Gosti', note: 'Napomena', diet: 'Alergije', amount: 'Iznos za uplatu', deadline: 'Rok za uplatu', payee: 'Primalac', iban: 'IBAN', bic: 'BIC/SWIFT', bank: 'Banka', purpose: 'Svrha uplate' },
    received: {
      subject: function (n) { return 'Ulaznice za prvi Sretenjski bal — rezervacija ' + n; },
      title: 'Ulaznice za prvi Sretenjski bal',
      intro: ['Zahvaljujemo Vam na rezervaciji ulaznica za prvi Sretenjski bal. Vaša rezervacija je evidentirana pod brojem:'],
      outro: function () {
        return [
          'Javićemo Vam se u roku od 3 dana sa detaljima za uplatu.',
        ];
      },
    },
    instructions: {
      subject: function (n) { return 'Sretenjski bal — instrukcije za uplatu, rezervacija ' + n; },
      intro: ['Pregledali smo Vašu rezervaciju. U nastavku su iznos i podaci za uplatu.'],
      outro: function (n, x) {
        return [
          'Molimo Vas da uplatu izvršite najkasnije do ' + x.deadline + ' i da u svrsi uplate obavezno navedete „Sretenjski bal ' + n + '", kako bismo uplatu povezali sa Vašom rezervacijom.',
          'Kada uplatu evidentiramo na izvodu, poslaćemo Vam potvrdu.',
        ];
      },
    },
    reminder: {
      subject: function (n) { return 'Sretenjski bal — podsetnik za uplatu, rezervacija ' + n; },
      intro: ['Ljubazno Vas podsećamo da uplatu za Vašu rezervaciju još nismo evidentirali, a rok za uplatu je istekao.'],
      outro: function (n, x) {
        return [
          'Ako uplata ne bude evidentirana do ' + x.expiresOn + ', rezervacija ističe i mesta se oslobađaju.',
          'Ako ste uplatu već izvršili, a ona još nije vidljiva na našem izvodu, samo odgovorite na ovaj mejl — proverićemo i javiti Vam se.',
          'U svrsi uplate navedite „Sretenjski bal ' + n + '".',
        ];
      },
    },
    paid: {
      subject: function (n) { return 'Vaše ulaznice za prvi Sretenjski bal — rezervacija ' + n; },
      title: 'Vaše ulaznice za prvi Sretenjski bal',
      intro: [
        'Potvrđujemo da je uplata za Vašu rezervaciju evidentirana. Hvala Vam!',
        'U nastavku su Vaše ulaznice, po jedna za svakog gosta. Na ulazu je dovoljno pokazati QR kod sa telefona; svaki kod važi za jedan ulazak.',
      ],
      outro: function () { return ['Radujemo se Vašem dolasku na Sretenjski bal.']; },
    },
  },
  sl: {
    greeting: function (n) { return 'Spoštovani/-a ' + n + ','; },
    signoff: ['Lep pozdrav,', 'Kulturni center Sretenje'],
    tickets: { label: 'Vstopnica', of: 'od', code: 'Koda' },
    labels: { number: 'Številka rezervacije', ticketType: 'Vrsta vstopnice', ticketCount: 'Število vstopnic', guests: 'Gostje', note: 'Opomba', diet: 'Alergije', amount: 'Znesek za plačilo', deadline: 'Rok plačila', payee: 'Prejemnik', iban: 'IBAN', bic: 'BIC/SWIFT', bank: 'Banka', purpose: 'Namen plačila' },
    received: {
      subject: function (n) { return 'Vstopnice za prvi Sretenjski bal — rezervacija ' + n; },
      title: 'Vstopnice za prvi Sretenjski bal',
      intro: ['Zahvaljujemo se Vam za rezervacijo vstopnic za prvi Sretenjski bal. Vaša rezervacija je evidentirana pod številko:'],
      outro: function () {
        return [
          'V 3 dneh Vam bomo poslali podatke za plačilo.',
        ];
      },
    },
    instructions: {
      subject: function (n) { return 'Sretenjski bal — navodila za plačilo, rezervacija ' + n; },
      intro: ['Pregledali smo Vašo rezervacijo. Spodaj sta znesek in podatki za plačilo.'],
      outro: function (n, x) {
        return [
          'Prosimo, da plačilo izvedete najpozneje do ' + x.deadline + ' in v namenu plačila obvezno navedete »Sretenjski bal ' + n + '«, da ga bomo lahko povezali z vašo rezervacijo.',
          'Ko bo plačilo vidno na izpisku, Vam bomo poslali potrditev.',
        ];
      },
    },
    reminder: {
      subject: function (n) { return 'Sretenjski bal — opomnik za plačilo, rezervacija ' + n; },
      intro: ['Prijazno Vas opominjamo, da plačila za Vašo rezervacijo še nismo prejeli, rok plačila pa je potekel.'],
      outro: function (n, x) {
        return [
          'Če plačilo do ' + x.expiresOn + ' ne bo evidentirano, rezervacija poteče in mesta se sprostijo.',
          'Če ste plačilo že izvedli, vendar še ni vidno na našem izpisku, preprosto odgovorite na to sporočilo — preverili bomo in se Vam oglasili.',
          'V namen plačila navedite »Sretenjski bal ' + n + '«.',
        ];
      },
    },
    paid: {
      subject: function (n) { return 'Vaše vstopnice za prvi Sretenjski bal — rezervacija ' + n; },
      title: 'Vaše vstopnice za prvi Sretenjski bal',
      intro: [
        'Potrjujemo, da je plačilo za Vašo rezervacijo evidentirano. Hvala!',
        'Spodaj so Vaše vstopnice, po ena za vsakega gosta. Ob vstopu zadošča, da pokažete QR kodo na telefonu; vsaka koda velja za en vstop.',
      ],
      outro: function () { return ['Veselimo se Vašega obiska na Sretenjskem balu.']; },
    },
  },
  en: {
    greeting: function (n) { return 'Dear ' + n + ','; },
    signoff: ['Kind regards,', 'Kulturni centar Sretenje'],
    tickets: { label: 'Ticket', of: 'of', code: 'Code' },
    labels: { number: 'Reservation number', ticketType: 'Ticket type', ticketCount: 'Number of tickets', guests: 'Guests', note: 'Note', diet: 'Allergies', amount: 'Amount due', deadline: 'Payment deadline', payee: 'Payee', iban: 'IBAN', bic: 'BIC/SWIFT', bank: 'Bank', purpose: 'Payment reference' },
    received: {
      subject: function (n) { return 'Tickets for the first Sretenjski bal — reservation ' + n; },
      title: 'Tickets for the first Sretenjski bal',
      intro: ['Thank you for reserving tickets for the first Sretenjski bal. Your reservation has been recorded under the number:'],
      outro: function () {
        return [
          'We will contact you within 3 days with the payment details.',
        ];
      },
    },
    instructions: {
      subject: function (n) { return 'Sretenjski bal — payment instructions, reservation ' + n; },
      intro: ['We have reviewed your reservation. The amount and payment details are below.'],
      outro: function (n, x) {
        return [
          'Please make the payment by ' + x.deadline + ' and be sure to use the payment reference "Sretenjski bal ' + n + '" so we can match it to your reservation.',
          'Once the payment appears on our bank statement, we will send you a confirmation.',
        ];
      },
    },
    reminder: {
      subject: function (n) { return 'Sretenjski bal — payment reminder, reservation ' + n; },
      intro: ['This is a friendly reminder that we have not yet recorded the payment for your reservation, and the payment deadline has passed.'],
      outro: function (n, x) {
        return [
          'If the payment is not recorded by ' + x.expiresOn + ', the reservation will expire and the seats will be released.',
          'If you have already paid but the payment is not yet visible on our bank statement, simply reply to this email — we will check and get back to you.',
          'Please use the payment reference "Sretenjski bal ' + n + '".',
        ];
      },
    },
    paid: {
      subject: function (n) { return 'Your tickets for the first Sretenjski bal — reservation ' + n; },
      title: 'Your tickets for the first Sretenjski bal',
      intro: [
        'We confirm that the payment for your reservation has been recorded. Thank you!',
        'Below are your tickets, one for each guest. At the entrance, simply show the QR code on your phone; each code is valid for one entry.',
      ],
      outro: function () { return ['We look forward to welcoming you at Sretenjski bal.']; },
    },
  },
};

/** Nazivi tipova karata u mejlovima gostima (u tabeli su uvek na srpskom). */
const TICKET_TYPE_TRANSLATIONS = {
  sl: { Svečana: 'Svečana vstopnica' },
  en: { Svečana: 'Gala', Galerija: 'Gallery' },
};

function localizeTickets_(text, lang) {
  const map = TICKET_TYPE_TRANSLATIONS[lang] || {};
  return Object.keys(map).reduce(function (s, k) { return s.split(k).join(map[k]); }, String(text || ''));
}

function formatAmount_(v, currency, lang) {
  const s = Number(v).toFixed(2);
  return lang === 'en' ? currency + ' ' + s : s.replace('.', ',') + ' ' + currency;
}

/** Mejl gostu na jeziku na kom je popunio formu. kind: received | instructions | reminder | paid */
function sendGuestMail_(kind, r, settings, extra) {
  const lang = MAIL[r.locale] ? r.locale : 'sr';
  const m = MAIL[lang];
  const k = m[kind];
  const n = String(r.number).trim();
  const x = extra || {};
  const details = [
    [m.labels.ticketType, localizeTickets_(r.ticketType, lang)],
    [m.labels.ticketCount, String(r.ticketCount)],
  ];
  if (kind === 'received') {
    details.push([m.labels.guests, guestList_(r).join('\n')]);
    if (String(r.diet || '').trim()) details.push([m.labels.diet, String(r.diet)]);
    const note = guestNote_(r.note);
    if (note) details.push([m.labels.note, note]);
  }
  if (kind === 'instructions' || kind === 'reminder') {
    if (Number(r.amount) > 0) details.push([m.labels.amount, formatAmount_(r.amount, settings.currency, lang)]);
    if (kind === 'instructions') details.push([m.labels.deadline, x.deadline]);
    // Podsetnik može da ide i kad su instrukcije poslate ručno — bez pravih podataka za uplatu izostavljamo ih.
    if (paymentDetailsReady_(settings)) {
      details.push([m.labels.payee, settings.payee], [m.labels.iban, settings.iban]);
      if (settings.bic) details.push([m.labels.bic, settings.bic]);
      if (settings.bank) details.push([m.labels.bank, settings.bank]);
    }
    details.push([m.labels.purpose, 'Sretenjski bal ' + n]);
  }
  const outro = k.outro(n, x);
  if (kind === 'instructions' && settings.paymentNote) outro.splice(1, 0, settings.paymentNote);

  const tickets = kind === 'paid' && x.tickets && x.tickets.length ? x.tickets : null;
  const mail = renderMail_({
    title: k.title,
    greeting: m.greeting(String(r.fullName).trim()),
    intro: kind === 'paid' && !tickets ? k.intro.slice(0, 1) : k.intro,
    highlight: [m.labels.number, n],
    details: details,
    tickets: tickets ? ticketMailBlocks_(tickets, lang, m.tickets) : null,
    outro: outro,
    signoff: m.signoff,
  });
  sendMail_(settings, {
    to: String(r.email).trim(),
    subject: k.subject(n),
    body: mail.text,
    htmlBody: mail.html,
    replyTo: settings.replyTo,
    inlineImages: tickets ? ticketQrImages_(tickets) : null,
  });
}

function sendAdminNotification_(r, settings) {
  const ss = spreadsheet_();
  const sheet = ss.getSheetByName(SHEET_RESERVATIONS);
  const link = ss.getUrl() + (sheet ? '#gid=' + sheet.getSheetId() : '');
  const tz = sheetTimeZone_();
  const details = [
    ['Vreme prijave', Utilities.formatDate(r.createdAt, tz, 'dd.MM.yyyy HH:mm')],
    ['Ime i prezime', r.fullName],
    ['E-mail', r.email],
    ['Telefon', r.phone],
    ['Tip karte', r.ticketType],
    ['Broj karata', String(r.ticketCount)],
    ['ISHRANA I ALERGIJE', r.diet || '—'],
    ['Iznos (po cenama iz podešavanja)', r.amount ? formatAmount_(r.amount, settings.currency, 'sr') : 'cena nije podešena — upišite iznos u tabelu'],
    ['Faktura na firmu', r.invoice],
  ];
  if (r.company) details.push(['Podaci firme', r.company]);
  details.push(
    ['Napomena', r.note || '—'],
    ['Izvor prijave', r.source + (r.sourceOther ? ' — ' + r.sourceOther : '')],
    ['Jezik forme', r.locale],
  );
  if (r.utm) details.push(['UTM', r.utm]);

  const mail = renderMail_({
    greeting: 'Nova rezervacija sa sajta.',
    intro: [],
    highlight: ['Broj rezervacije', r.number],
    details: details,
    outro: ['Sledeći korak: proverite iznos u tabeli (po potrebi ga promenite), pa iz menija „Sretenjski bal" pošaljite instrukcije za uplatu.', 'Tabela: ' + link],
    signoff: [],
  });
  sendMail_(settings, {
    to: settings.adminEmail,
    subject: 'Nova rezervacija za Sretenjski bal — ' + r.number + (r.diet ? ' · posebna ishrana' : ''),
    body: mail.text,
    htmlBody: mail.html,
    replyTo: r.email, // „Odgovori" ide direktno gostu
  });
}

function sendAdminDigest_(report, settings) {
  const lines = [];
  if (report.reminded.length) lines.push('Poslat podsetnik (status → ' + STATUS.REMINDED + '): ' + report.reminded.join(', '));
  if (report.expired.length) lines.push('Isteklo, mesta oslobođena (status → ' + STATUS.EXPIRED + '): ' + report.expired.join(', '));
  if (report.problems.length) lines.push('Potrebna provera:\n- ' + report.problems.join('\n- '));
  lines.push('Tabela: ' + spreadsheet_().getUrl());
  sendMail_(settings, {
    to: settings.adminEmail,
    subject: 'Sretenjski bal — provera rokova: ' + report.reminded.length + ' podsetnik(a), ' + report.expired.length + ' isteklo',
    body: lines.join('\n\n'),
  });
}

/**
 * Šalje mejl. Ako je SENDER_EMAIL (npr. info@kcsretenje.si) dodat kao „Pošalji poštu kao" u Gmailu naloga
 * pod kojim radi skripta, mejl ide sa te adrese (GmailApp); inače sa glavne adrese naloga (MailApp).
 * Ime pošiljaoca je uvek SENDER_NAME. Vraća adresu sa koje je mejl poslat.
 */
function sendMail_(settings, m) {
  const options = { name: settings.senderName };
  if (m.replyTo) options.replyTo = m.replyTo;
  if (m.htmlBody) options.htmlBody = m.htmlBody;
  if (m.htmlBody && m.htmlBody.indexOf('cid:' + MAIL_LOGO_CID) >= 0) options.inlineImages = mailLogo_();
  if (m.inlineImages) options.inlineImages = Object.assign(options.inlineImages || {}, m.inlineImages);
  let from;
  if (settings.senderEmail && senderAliases_().indexOf(settings.senderEmail) >= 0) {
    options.from = settings.senderEmail;
    GmailApp.sendEmail(m.to, m.subject, m.body, options);
    from = settings.senderEmail;
  } else {
    MailApp.sendEmail(Object.assign({ to: m.to, subject: m.subject, body: m.body }, options));
    from = Session.getEffectiveUser().getEmail() || 'glavna adresa naloga';
  }
  if (sentToOwnMailbox_(m.to)) moveSentToInbox_(m.subject);
  return from;
}

/** Da li je primalac sanduče naloga pod kojim radi skripta (njegova glavna adresa ili alias, npr. info@). */
function sentToOwnMailbox_(to) {
  const own = senderAliases_().concat([String(Session.getEffectiveUser().getEmail() || '').toLowerCase()]);
  return String(to).split(',').some(function (addr) { return own.indexOf(addr.trim().toLowerCase()) >= 0; });
}

/**
 * Gmail mejl poslat samom sebi (npr. sa info@ na info@) ostavlja samo u „Poslato".
 * Premeštamo ga u Inbox i označavamo kao nepročitan, da ekipa vidi novu rezervaciju ili poruku.
 */
function moveSentToInbox_(subject) {
  try {
    const query = 'in:sent subject:"' + String(subject).replace(/"/g, '') + '" newer_than:1d';
    const thread = GmailApp.search(query, 0, 1)[0];
    if (thread) {
      thread.moveToInbox();
      thread.markUnread();
    }
  } catch (err) {
    console.error('Mejl nije premešten u Inbox: ' + err.message);
  }
}

let senderAliasesCache_ = null;
function senderAliases_() {
  if (senderAliasesCache_ === null) {
    try {
      senderAliasesCache_ = GmailApp.getAliases().map(function (a) { return String(a).toLowerCase(); });
    } catch (err) {
      console.error('Gmail aliasi nisu dostupni: ' + err.message);
      senderAliasesCache_ = [];
    }
  }
  return senderAliasesCache_;
}

/** Logo (zlatni monogram SB, PNG 200×142) ugrađen u mejl kao slika u prilogu, da se vidi i bez spoljnog linka. */
const MAIL_LOGO_CID = 'sblogo';
const MAIL_LOGO_PNG_BASE64 = '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';

function mailLogo_() {
  const o = {};
  o[MAIL_LOGO_CID] = Utilities.newBlob(Utilities.base64Decode(MAIL_LOGO_PNG_BASE64), 'image/png', 'sretenjski-bal.png');
  return o;
}

/** Isti sadržaj kao običan tekst i kao HTML u bojama sajta (bordo zaglavlje sa logom). */
function renderMail_(m) {
  const text = (m.title ? [m.title, ''] : []).concat([m.greeting, ''])
    .concat(m.intro.length ? m.intro.concat(['']) : [])
    .concat([m.highlight[0] + ': ' + m.highlight[1], ''])
    .concat(m.details.map(function (d) { return d[0] + ':' + (String(d[1]).indexOf('\n') >= 0 ? '\n' : ' ') + d[1]; }))
    .concat([''])
    .concat(m.tickets ? m.tickets.map(function (t) { return t.text; }).concat(['']) : [])
    .concat(m.outro)
    .concat(m.signoff.length ? [''].concat(m.signoff) : [])
    .join('\n');

  const esc = function (s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '<br>');
  };
  const p = function (s) { return '<p style="margin:0 0 14px">' + esc(s) + '</p>'; };
  const rows = m.details.map(function (d) {
    return '<tr><td style="padding:6px 16px 6px 0;color:#5b4f48;vertical-align:top;white-space:nowrap">' + esc(d[0]) +
      '</td><td style="padding:6px 0;vertical-align:top">' + esc(d[1]) + '</td></tr>';
  }).join('');
  // Tamni režim na telefonu: aplikacije za mejl inače same „obrnu" boje (bordo → roze). Oznaka color-scheme
  // to zabranjuje (Apple Mail, Outlook), a pozadina zadata i kao slika-gradijent ostaje ista i u Gmailu.
  const bg = function (c) { return 'background-color:' + c + ';background-image:linear-gradient(' + c + ',' + c + ');'; };
  const html =
    '<!DOCTYPE html><html lang="sr"><head><meta charset="utf-8">' +
    '<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">' +
    '<style>:root{color-scheme:light only;supported-color-schemes:light only}</style></head>' +
    '<body style="margin:0;padding:0;' + bg('#eee7da') + '">' +
    '<div style="' + bg('#eee7da') + 'padding:24px 12px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#171413">' +
    '<div style="max-width:560px;margin:0 auto;' + bg('#f6f1e8') + '">' +
    '<div style="' + bg('#5a1723') + 'padding:28px 28px 22px;text-align:center;border-bottom:2px solid #b49a63">' +
    '<img src="cid:' + MAIL_LOGO_CID + '" width="100" height="71" alt="Sretenjski bal" style="display:block;margin:0 auto 12px;border:0;width:100px;height:71px">' +
    '<p style="margin:0;font-family:Georgia,serif;font-size:13px;letter-spacing:.32em;text-transform:uppercase;color:#d3bb82">Sretenjski bal</p>' +
    '</div>' +
    '<div style="padding:32px 28px">' +
    (m.title ? '<p style="margin:0 0 22px;font-family:Georgia,serif;font-size:24px;line-height:1.3;color:#5a1723">' + esc(m.title) + '</p>' : '') +
    p(m.greeting) + m.intro.map(p).join('') +
    '<p style="margin:20px 0 4px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#5a1723">' + esc(m.highlight[0]) + '</p>' +
    '<p style="margin:0 0 20px;font-family:Georgia,serif;font-size:36px;color:#5a1723">' + esc(m.highlight[1]) + '</p>' +
    '<table style="border-collapse:collapse;margin:0 0 20px;border-top:1px solid #b49a63;width:100%">' + rows + '</table>' +
    (m.tickets ? m.tickets.map(function (t) { return t.html; }).join('') : '') +
    m.outro.map(p).join('') +
    (m.signoff.length ? '<p style="margin:24px 0 0">' + m.signoff.map(esc).join('<br>') + '</p>' : '') +
    '</div></div></div></body></html>';
  return { text: text, html: html };
}

// ─────────────────────────────────────────────────────────────────────────────
// Ulaznice i QR kodovi
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tab „Gosti" — jedan red po gostu: prvo nosilac rezervacije, pa ostali gosti, svi pod istim brojem rezervacije.
 * Imena i kontakte gostiju ovde možete ispraviti (ulaznice se prave iz ovog taba). Status se menja samo u
 * tabu „Rezervacije", a ovde se prikazuje sam (formula). Skripta kolone traži po redosledu — ne premeštati ih.
 */
const GUEST_HEADERS = [
  'Broj rezervacije', 'Gost', 'Ime', 'Prezime', 'E-mail', 'Telefon', 'Status rezervacije', 'Tip ulaznice',
  'Kako je saznao/la za bal', 'Alergije', 'Napomena', 'Kod ulaznice', 'Ulazak', 'Skenirao',
];
const G = { number: 0, role: 1, first: 2, last: 3, email: 4, phone: 5, status: 6, type: 7, source: 8, diet: 9, note: 10, code: 11, enteredAt: 12, scannedBy: 13 };
const GUEST_HOLDER = 'Nosilac';
/** Kolone koje dobijaju boju rezervacije (Broj … Telefon). */
const GUEST_COLORED_COLS = 6;
/** Početak sadržaja QR koda, da skener prepozna da je kod naš. */
const TICKET_QR_PREFIX = 'SB:';
/** Crockford base32 — bez slova koja liče na cifre (I, L, O, U), pa se kod lako prepisuje i ručno. */
const BASE32_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
/** Posle ovoliko pogrešnih PIN-ova u 10 minuta skeniranje se privremeno zaključava. */
const MAX_PIN_FAILURES = 15;

/**
 * Tajni ključ kojim se potpisuju kodovi ulaznica (Svojstva skripte → TICKET_SECRET). Pravi se sam pri prvoj ulaznici.
 * NE BRISATI i NE MENJATI posle slanja prvih ulaznica — već poslati QR kodovi bi prestali da važe.
 */
function ticketSecret_() {
  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty('TICKET_SECRET');
  if (!secret) {
    secret = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty('TICKET_SECRET', secret);
  }
  return secret;
}

function base32_(bytes, length) {
  let bits = 0;
  let value = 0;
  let out = '';
  for (let i = 0; i < bytes.length && out.length < length; i++) {
    value = (value << 8) | (bytes[i] & 0xff);
    bits += 8;
    while (bits >= 5 && out.length < length) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
    value &= (1 << bits) - 1;
  }
  return out;
}

/** Kod ulaznice, npr. 27006-2-K7QH3M9P: broj rezervacije, redni broj gosta i potpis koji se ne može pogoditi. */
function ticketCode_(number, index) {
  const base = String(number).trim() + '-' + index;
  return base + '-' + base32_(Utilities.computeHmacSha256Signature(base, ticketSecret_()), 8);
}

/** Kod iz skenera ili ručnog unosa → { code, number, index } ako je potpis ispravan, inače null. */
function parseTicketCode_(raw) {
  let s = String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
  if (s.indexOf(TICKET_QR_PREFIX) === 0) s = s.slice(TICKET_QR_PREFIX.length);
  const m = /^(\d{4,6})-(\d{1,3})-([0-9A-Z]{8})$/.exec(s);
  if (!m) return null;
  const sig = m[3].replace(/O/g, '0').replace(/[IL]/g, '1');
  const expected = ticketCode_(m[1], Number(m[2]));
  if (expected !== m[1] + '-' + Number(m[2]) + '-' + sig) return null;
  return { code: expected, number: m[1], index: Number(m[2]) };
}

/** „Svečana" ×2 → ['Svečana', 'Svečana']; „Svečana ×2, Galerija ×1" → po jedan tip za svaku ulaznicu. */
function ticketTypesFor_(ticketType, count) {
  const text = String(ticketType || '').trim();
  const out = [];
  if (text.indexOf('×') >= 0) {
    text.split(',').forEach(function (part) {
      const m = /^\s*(.+?)\s*×\s*(\d+)\s*$/.exec(part);
      if (m) for (let i = 0; i < Number(m[2]); i++) out.push(m[1]);
    });
  }
  while (out.length < count) out.push(text.indexOf('×') >= 0 ? '' : text);
  return out.slice(0, count);
}

/** Imena ostalih gostiju iz napomene („Gost 2: Ime Prezime, e-adresa, telefon"). */
function guestNamesFromNote_(note) {
  const names = {};
  String(note || '').split('\n').forEach(function (line) {
    const m = /^Gost (\d+): ([^,]+),/.exec(line.trim());
    if (m) names[Number(m[1])] = m[2].trim();
  });
  return names;
}

/** Imena gostiju redom: kontakt osoba, pa ostali iz forme (za potvrdu rezervacije). */
function guestList_(r) {
  const names = guestNamesFromNote_(r.note);
  const list = [String(r.fullName || '').trim()];
  Object.keys(names).map(Number).sort(function (a, b) { return a - b; }).forEach(function (i) { list.push(names[i]); });
  return list.filter(Boolean);
}

/** Napomena gosta bez redova „Gost N: …" koje skripta dodaje na početak. */
function guestNote_(note) {
  return String(note || '').split('\n').filter(function (line) { return !/^Gost \d+: /.test(line.trim()); }).join('\n').trim();
}

/** „Ana Marija Anić" → ['Ana Marija', 'Anić'] (za stare rezervacije u kojima je ime upisano zajedno). */
function splitName_(full) {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return [parts[0] || '', ''];
  return [parts.slice(0, -1).join(' '), parts[parts.length - 1]];
}

/** Status rezervacije u tabu „Gosti": uvek onaj iz taba „Rezervacije" (red nosioca), ne kuca se ručno. */
function guestStatusFormula_(row) {
  const res = "'" + SHEET_RESERVATIONS + "'!";
  const col = function (header) { return 'MATCH("' + header + '", ' + res + '$1:$1, 0)'; };
  return '=IFERROR(INDEX(' + res + '$A:$ZZ, MATCH($A' + row + ', INDEX(' + res + '$A:$ZZ, 0, ' + col(COL.number) + '), 0), ' +
    col(COL.status) + '), "")';
}

function guestsSheet_() {
  const ss = spreadsheet_();
  let sheet = ss.getSheetByName(SHEET_GUESTS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_GUESTS);
    sheet.getRange(1, 1, 1, GUEST_HEADERS.length).setValues([GUEST_HEADERS]).setFontWeight('bold').setBackground('#5a1723').setFontColor('#f6f1e8');
    sheet.getRange(1, G.status + 1).setNote('Popunjava se samo iz taba „Rezervacije". Status menjajte tamo, u redu rezervacije.');
    sheet.getRange(1, G.code + 1).setNote('Upisuje se kad se pošalje potvrda uplate (sa QR kodovima). Ne menjati.');
    sheet.getRange(1, G.enteredAt + 1).setNote('Vreme kad je ulaznica skenirana na ulazu. Obrišite ga da bi ulaznica ponovo važila.');
    sheet.setFrozenRows(1);
    sheet.setFrozenColumns(4);
    [110, 80, 130, 140, 220, 140, 150, 110, 170, 220, 260, 170, 130, 130].forEach(function (w, i) { sheet.setColumnWidth(i + 1, w); });
    // Svaka rezervacija u svojoj boji (naizmenično dve nijanse), nosilac podebljan, status sivom pozadinom (ne menja se ovde).
    const rows = sheet.getMaxRows();
    const colored = sheet.getRange(2, 1, rows - 1, GUEST_COLORED_COLS);
    const all = sheet.getRange(2, 1, rows - 1, GUEST_HEADERS.length);
    sheet.setConditionalFormatRules([
      SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND($A2<>"", ISODD(COUNTUNIQUE($A$2:$A2)))').setBackground('#f3e3e6').setRanges([colored]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND($A2<>"", ISEVEN(COUNTUNIQUE($A$2:$A2)))').setBackground('#f6efe2').setRanges([colored]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$B2="' + GUEST_HOLDER + '"').setBold(true).setRanges([all]).build(),
    ]);
    sheet.getRange(2, G.status + 1, rows - 1, 1).setBackground('#ececec').setFontColor('#5b4f48');
  }
  return sheet;
}

/** Redovi taba „Gosti" za jednu rezervaciju (nosilac i gosti), iz podataka sa forme. */
function guestRowsFromInput_(record, input, startRow) {
  const shared = function (role, first, last, email, phone) {
    return [record.number, role, first, last, email, phone, null, record.ticketType, record.source + (record.sourceOther ? ' — ' + record.sourceOther : ''),
      record.diet, guestNote_(record.note), '', '', ''];
  };
  const holder = input.firstName && input.lastName ? [clean_(input.firstName), clean_(input.lastName)] : splitName_(record.fullName);
  const rows = [shared(GUEST_HOLDER, holder[0], holder[1], record.email, record.phone)];
  (Array.isArray(input.guests) ? input.guests : []).forEach(function (g, i) {
    rows.push(shared('Gost ' + (i + 2), clean_(g.firstName), clean_(g.lastName), clean_(g.email).toLowerCase(), clean_(g.phone)));
  });
  return finishGuestRows_(rows, startRow);
}

/** Bezbedne vrednosti ćelija + formula za status u svakom redu. */
function finishGuestRows_(rows, startRow) {
  return rows.map(function (row, i) {
    return row.map(function (v, c) { return c === G.status ? guestStatusFormula_(startRow + i) : safeCell_(v); });
  });
}

function appendGuestRows_(rows) {
  if (!rows.length) return;
  const sheet = guestsSheet_();
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, GUEST_HEADERS.length).setValues(rows);
}

/**
 * Rezervacije koje još nemaju redove u tabu „Gosti" (npr. napravljene pre ove verzije skripte) dodaje
 * iz taba „Rezervacije": nosilac + gosti iz napomene („Gost 2: Ime Prezime, e-adresa, telefon").
 */
function backfillGuests_() {
  const sheet = guestsSheet_();
  const have = {};
  sheet.getDataRange().getValues().slice(1).forEach(function (row) { have[String(row[G.number]).trim()] = true; });
  const t = openTable_();
  let added = 0;
  t.rows.forEach(function (row) {
    const r = rowToObj_(t, row);
    const number = String(r.number || '').trim();
    if (!number || have[number]) return;
    const record = { number: number, ticketType: r.ticketType, source: r.source || '', sourceOther: r.sourceOther || '', diet: r.diet || '', note: r.note || '' };
    const holder = splitName_(r.fullName);
    const rows = [[number, GUEST_HOLDER, holder[0], holder[1], String(r.email || ''), String(r.phone || '')]];
    String(r.note || '').split('\n').forEach(function (line) {
      const m = /^Gost (\d+): ([^,]+), ([^,]+), (.+)$/.exec(line.trim());
      if (m) {
        const name = splitName_(m[2]);
        rows.push([number, 'Gost ' + m[1], name[0], name[1], m[3].trim(), m[4].trim()]);
      }
    });
    const full = rows.map(function (x) {
      return x.concat([null, record.ticketType, record.source + (record.sourceOther ? ' — ' + record.sourceOther : ''), record.diet, guestNote_(record.note), '', '', '']);
    });
    appendGuestRows_(finishGuestRows_(full, sheet.getLastRow() + 1));
    added++;
  });
  return added;
}

/** Redovi gostiju jedne rezervacije: [{ row (broj reda u tabeli), values }], redom kako su upisani. */
function guestRowsFor_(sheet, number) {
  const out = [];
  sheet.getDataRange().getValues().forEach(function (v, i) {
    if (i > 0 && String(v[G.number]).trim() === String(number).trim()) out.push({ row: i + 1, values: v });
  });
  return out;
}

function guestName_(v, holder) {
  const name = (String(v[G.first] || '').trim() + ' ' + String(v[G.last] || '').trim()).trim();
  return name || 'Gost · ' + holder;
}

/**
 * Ulaznice za rezervaciju iz taba „Gosti": po jedna za svaki red (redom), koliko je kupljeno ulaznica.
 * Ako gostiju ima manje nego ulaznica, dodaju se redovi „Gost N" koje kasnije možete dopuniti.
 * Kod ulaznice se upisuje u red gosta. Ponovno slanje daje iste kodove. Pozivati pod zaključavanjem.
 */
function issueTickets_(r) {
  const number = String(r.number).trim();
  const count = Math.max(1, parseInt(r.ticketCount, 10) || 1);
  const types = ticketTypesFor_(r.ticketType, count);
  const holder = String(r.fullName || '').trim();
  const sheet = guestsSheet_();
  let rows = guestRowsFor_(sheet, number);
  if (!rows.length) {
    backfillGuests_();
    rows = guestRowsFor_(sheet, number);
  }
  if (rows.length < count) {
    const missing = [];
    for (let i = rows.length + 1; i <= count; i++) {
      missing.push([number, 'Gost ' + i, 'Gost ' + i, '', '', '', null, r.ticketType, '', '', '', '', '', '']);
    }
    appendGuestRows_(finishGuestRows_(missing, sheet.getLastRow() + 1));
    rows = guestRowsFor_(sheet, number);
  }
  return rows.slice(0, count).map(function (g, i) {
    const index = i + 1;
    const code = ticketCode_(number, index);
    if (String(g.values[G.code]).trim() !== code) sheet.getRange(g.row, G.code + 1).setValue(code);
    const first = String(g.values[G.first] || '').trim();
    const placeholder = /^Gost \d+$/.test(first) && !String(g.values[G.last] || '').trim();
    return {
      index: index,
      count: count,
      number: number,
      code: code,
      name: placeholder ? first + ' · ' + holder : guestName_(g.values, holder),
      type: types[i] || String(g.values[G.type] || ''),
    };
  });
}

/** QR slika (GIF) za ulaznicu; sadržaj je „SB:" + kod. */
function ticketQrBlob_(code, name) {
  const qr = qrcode(0, 'M');
  qr.addData(TICKET_QR_PREFIX + code);
  qr.make();
  const dataUrl = qr.createDataURL(8, 32);
  return Utilities.newBlob(Utilities.base64Decode(dataUrl.split(',')[1]), 'image/gif', name);
}

function ticketQrImages_(tickets) {
  const o = {};
  tickets.forEach(function (t) { o['qr' + t.index] = ticketQrBlob_(t.code, 'ulaznica-' + t.code + '.gif'); });
  return o;
}

/** Ulaznice u mejlu: kartica sa imenom, tipom i QR kodom za svakog gosta. */
function ticketMailBlocks_(tickets, lang, labels) {
  const esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  return tickets.map(function (t) {
    const head = labels.label + ' ' + t.index + ' ' + labels.of + ' ' + t.count;
    const type = localizeTickets_(t.type, lang);
    return {
      text: head + ' — ' + t.name + (type ? ' (' + type + ')' : '') + ' — ' + labels.code + ': ' + t.code,
      html:
        '<table role="presentation" style="width:100%;border-collapse:separate;margin:0 0 18px;border:1px solid #c9a96b;outline:1px solid #c9a96b;outline-offset:3px;background-color:#ffffff;background-image:linear-gradient(#ffffff,#ffffff)">' +
        '<tr><td style="padding:22px 20px 18px;text-align:center">' +
        '<p style="margin:0 0 6px;font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:#a07a35">' + esc(head) + '</p>' +
        '<p style="margin:0 0 4px;font-family:Georgia,serif;font-size:22px;line-height:1.25;color:#5a1723">' + esc(t.name) + '</p>' +
        (type ? '<p style="margin:0 0 14px;font-family:Georgia,serif;font-style:italic;font-size:15px;color:#a07a35">' + esc(type) + '</p>' : '') +
        '<img src="cid:qr' + t.index + '" width="200" height="200" alt="QR ' + esc(t.code) + '" style="display:block;margin:0 auto;border:0;width:200px;height:200px">' +
        '<p style="margin:10px 0 0;font-family:Menlo,Consolas,monospace;font-size:13px;letter-spacing:.08em;color:#5b4f48">' + esc(t.code) + '</p>' +
        '</td></tr></table>',
    };
  });
}

/** Broj ulaznica i ulazaka, za zaglavlje stranice za skeniranje. */
function ticketStats_(values) {
  let entered = 0;
  let total = 0;
  for (let i = 1; i < values.length; i++) {
    if (!String(values[i][G.code] || '').trim()) continue;
    total++;
    if (values[i][G.enteredAt]) entered++;
  }
  return { entered: entered, total: total };
}

function pinLocked_() {
  return Number(CacheService.getScriptCache().get('pinFailures') || 0) >= MAX_PIN_FAILURES;
}

function pinFailed_() {
  const cache = CacheService.getScriptCache();
  cache.put('pinFailures', String(Number(cache.get('pinFailures') || 0) + 1), 600);
}

/**
 * Skeniranje na ulazu. Bez koda samo proverava PIN (prijava na stranicu /ulaz).
 * result: OK (ulaz dozvoljen, upisano vreme) | USED (već ušao) | NOT_PAID (rezervacija nije plaćena ili je otkazana)
 *         | UNKNOWN (kod je ispravan, ali ulaznica nije izdata) | INVALID (kod nije naš ili je prepravljen)
 */
function checkin_(req) {
  const settings = readSettings_();
  if (!settings.scannerPin) return { ok: false, code: 'SCANNER_OFF' };
  if (pinLocked_()) return { ok: false, code: 'LOCKED' };
  if (String(req.pin || '').trim() !== settings.scannerPin) {
    pinFailed_();
    return { ok: false, code: 'BAD_PIN' };
  }
  const scannedBy = clean_(String(req.device || '')).slice(0, 40) || 'ulaz';
  const sheet = guestsSheet_();
  if (!req.code) return { ok: true, stats: ticketStats_(sheet.getDataRange().getValues()) };

  const parsed = parseTicketCode_(req.code);
  if (!parsed) return { ok: true, result: 'INVALID', stats: ticketStats_(sheet.getDataRange().getValues()) };

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, code: 'BUSY' };
  try {
    const values = sheet.getDataRange().getValues();
    let row = -1;
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][G.code]).trim() === parsed.code) { row = i; break; }
    }
    const base = { ok: true, code: parsed.code, number: parsed.number, index: parsed.index };
    if (row < 0) return Object.assign(base, { result: 'UNKNOWN', stats: ticketStats_(values) });
    const v = values[row];
    const info = Object.assign(base, { name: guestName_(v, ''), type: String(v[G.type]) });

    const t = openTable_();
    const resRow = findRow_(t, parsed.number);
    const status = resRow > 0 ? normStatus_(rowToObj_(t, t.rows[resRow - 2]).status) : '';
    if (status !== STATUS.PAID) return Object.assign(info, { result: 'NOT_PAID', status: status || 'NEPOZNATA', stats: ticketStats_(values) });

    const tz = sheetTimeZone_();
    const already = parseDate_(v[G.enteredAt]);
    if (already) {
      return Object.assign(info, {
        result: 'USED',
        enteredAt: Utilities.formatDate(already, tz, 'HH:mm'),
        scannedBy: String(v[G.scannedBy] || ''),
        stats: ticketStats_(values),
      });
    }
    const now = new Date();
    sheet.getRange(row + 1, G.enteredAt + 1, 1, 2).setValues([[now, safeCell_(scannedBy)]]);
    values[row][G.enteredAt] = now;
    return Object.assign(info, { result: 'OK', enteredAt: Utilities.formatDate(now, tz, 'HH:mm'), stats: ticketStats_(values) });
  } finally {
    lock.releaseLock();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Meni u tabeli
// ─────────────────────────────────────────────────────────────────────────────

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Sretenjski bal')
    .addItem('Pošalji instrukcije za uplatu (izabrani red)', 'menuSendPaymentInstructions')
    .addItem('Pošalji potvrdu uplate (izabrani red)', 'menuSendPaymentConfirmation')
    .addSeparator()
    .addItem('Proveri rokove sada', 'menuDailyCheck')
    .addSeparator()
    .addItem('Podesi tabelu (prvo pokretanje)', 'setup')
    .addItem('Uključi dnevnu proveru rokova', 'installTriggers')
    .addItem('Pošalji probni mejl organizatoru', 'sendTestEmail')
    .addToUi();
}

/** Broj rezervacije iz izabranog reda taba „Rezervacije", ili null (uz poruku). */
function selectedReservation_() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSheet();
  if (sheet.getName() !== SHEET_RESERVATIONS) {
    ui.alert('Otvorite tab „' + SHEET_RESERVATIONS + '" i kliknite na bilo koju ćeliju u redu rezervacije.');
    return null;
  }
  const rowNumber = sheet.getActiveRange().getRow();
  const t = openTable_();
  if (rowNumber < 2 || rowNumber - 2 >= t.rows.length) {
    ui.alert('Kliknite na red sa rezervacijom (ne na zaglavlje).');
    return null;
  }
  const r = rowToObj_(t, t.rows[rowNumber - 2]);
  if (!String(r.number).trim()) {
    ui.alert('U izabranom redu nema broja rezervacije.');
    return null;
  }
  return r;
}

function menuSendPaymentInstructions() {
  const ui = SpreadsheetApp.getUi();
  const r = selectedReservation_();
  if (!r) return;
  const settings = readSettings_();
  const blocker = instructionsBlocker_(r, settings);
  if (blocker) return ui.alert(blocker);
  const n = String(r.number).trim();
  const already = parseDate_(r.instructionsAt);
  const deadline = parseDate_(r.deadline);
  const question =
    (already ? 'PAŽNJA: instrukcije su već poslate ' + Utilities.formatDate(already, sheetTimeZone_(), 'dd.MM.yyyy') + '.\n\n' : '') +
    'Poslati instrukcije za uplatu?\n\n' +
    'Rezervacija: ' + n + '\nGost: ' + r.fullName + ' <' + r.email + '>\n' +
    'Iznos: ' + formatAmount_(r.amount, settings.currency, 'sr') + '\n' +
    'Rok: ' + (deadline ? Utilities.formatDate(deadline, sheetTimeZone_(), 'dd.MM.yyyy') + ' (iz tabele)' : settings.paymentDays + ' dana od danas') + '\n' +
    'Jezik mejla: ' + r.locale;
  if (ui.alert('Instrukcije za uplatu', question, ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  try {
    const deadlineText = sendPaymentInstructionsFor_(n);
    ui.alert('Instrukcije su poslate. Rok za uplatu: ' + deadlineText + '. Status: ' + STATUS.AWAITING + '.');
  } catch (err) {
    ui.alert('Instrukcije NISU poslate: ' + err.message);
  }
}

function menuSendPaymentConfirmation() {
  const ui = SpreadsheetApp.getUi();
  const r = selectedReservation_();
  if (!r) return;
  const n = String(r.number).trim();
  if (normStatus_(r.status) !== STATUS.PAID) return ui.alert('Prvo proverite uplatu na izvodu i promenite status u ' + STATUS.PAID + '.');
  if (parseDate_(r.paymentConfirmedAt)) return ui.alert('Potvrda uplate za ' + n + ' je već poslata.');
  if (ui.alert('Potvrda uplate', 'Poslati gostu potvrdu da je uplata evidentirana?\n\nRezervacija: ' + n + '\nGost: ' + r.fullName + ' <' + r.email + '>', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  try {
    sendPaymentConfirmationFor_(n);
    ui.alert('Potvrda uplate je poslata.');
  } catch (err) {
    ui.alert('Potvrda NIJE poslata: ' + err.message);
  }
}

function menuDailyCheck() {
  const r = dailyCheck();
  SpreadsheetApp.getUi().alert(
    'Provera rokova je završena.\n\nPoslato podsetnika: ' + r.reminded.length + '\nIsteklo: ' + r.expired.length +
    (r.problems.length ? '\n\nPotrebna provera:\n- ' + r.problems.join('\n- ') : ''),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Podešavanje tabele (bezbedno za ponovno pokretanje: ništa ne briše i ne preimenuje)
// ─────────────────────────────────────────────────────────────────────────────

function setup() {
  const ss = spreadsheet_();
  const notes = [];
  if (ss.getSpreadsheetTimeZone() !== TIME_ZONE) {
    ss.setSpreadsheetTimeZone(TIME_ZONE);
    notes.push('Vremenska zona tabele podešena na ' + TIME_ZONE + '.');
  }
  setupReservationsSheet_(ss);
  setupSettingsSheet_(ss);
  setupStatsSheet_(ss);
  setupMessagesSheet_(ss);
  const backfilled = backfillGuests_();
  if (backfilled) notes.push('U tab „Gosti" dodato rezervacija iz ranije: ' + backfilled + '.');

  const props = PropertiesService.getScriptProperties();
  props.setProperty('SPREADSHEET_ID', ss.getId());
  props.deleteProperty('API_SECRET'); // ostatak ranije verzije (sajt više ne koristi tajni ključ)
  if (!props.getProperty('TURNSTILE_SECRET')) {
    notes.push('PAŽNJA: zaštita od botova još nije uključena — upišite TURNSTILE_SECRET u Svojstva skripte (docs/REZERVACIJE.md).');
  }
  SpreadsheetApp.getUi().alert(
    'Tabela je podešena.\n\n' + (notes.length ? notes.join('\n') + '\n\n' : '') +
    'Sledeći koraci (docs/REZERVACIJE.md):\n1. Primeni → Nova primena → Web aplikacija (prvi put) ili nova verzija postojeće\n2. Meni → Uključi dnevnu proveru rokova\n3. Adresu web aplikacije upišite u sajt (frontend/src/app/core/config/app.constants.ts)',
  );
}

function setupMessagesSheet_(ss) {
  const sheet = messagesSheet_();
  sheet.getRange(1, 1, 1, MESSAGE_HEADERS.length).setFontWeight('bold').setBackground('#5a1723').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.getRange(2, 1, Math.max(sheet.getMaxRows() - 1, 1), 1).setNumberFormat('dd.mm.yyyy hh:mm');
  [140, 120, 140, 210, 170, 480, 90].forEach(function (w, i) { sheet.setColumnWidth(i + 1, w); });
}

function setupReservationsSheet_(ss) {
  let sheet = ss.getSheetByName(SHEET_RESERVATIONS);
  if (!sheet) sheet = ss.insertSheet(SHEET_RESERVATIONS);
  addMissingColumns_(sheet);

  // Filter se pravi iznova jer se kolone premeštaju (uključeni filteri se tada isključe).
  if (sheet.getFilter()) sheet.getFilter().remove();
  reorderColumns_(sheet);

  const t = openTable_();
  const width = t.header.length;
  const maxRows = Math.max(sheet.getMaxRows(), 1000);
  if (sheet.getMaxRows() < maxRows) sheet.insertRowsAfter(sheet.getMaxRows(), maxRows - sheet.getMaxRows());
  const col = function (key) { return t.idx[COL[key]] + 1; };
  const body = function (key) { return sheet.getRange(2, col(key), maxRows - 1, 1); };
  const all = sheet.getRange(2, 1, maxRows - 1, width);

  // Zaglavlje: boja po grupi, objašnjenja na prelazu mišem. Kolone koje skripta ne poznaje ostaju sive.
  const header = sheet.getRange(1, 1, 1, width);
  header.setFontWeight('bold').setFontColor('#ffffff').setBackground('#8a817a').setWrap(true)
    .setVerticalAlignment('middle').setHorizontalAlignment('center');
  COLUMN_GROUPS.forEach(function (g) {
    g.keys.forEach(function (k) { sheet.getRange(1, col(k)).setBackground(g.color); });
  });
  Object.keys(HEADER_NOTES).forEach(function (k) { sheet.getRange(1, col(k)).setNote(HEADER_NOTES[k]); });
  sheet.setRowHeight(1, 52);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(3); // broj, status, ime — uvek vidljivi
  sheet.setTabColor('#5a1723');

  // Telo: naizmenično osenčeni redovi, tekst se ne razvlači preko više redova (osim ishrane).
  sheet.getBandings().forEach(function (b) { b.remove(); });
  all.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false)
    .setFirstRowColor('#ffffff').setSecondRowColor('#f7f3ec');
  all.setVerticalAlignment('middle').setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
  body('diet').setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
  ['number', 'status', 'ticketCount', 'createdAt', 'invoice', 'locale'].concat(DATE_KEYS).forEach(function (k) {
    body(k).setHorizontalAlignment('center');
  });
  body('number').setNumberFormat('@').setFontWeight('bold');
  body('phone').setNumberFormat('@');
  body('createdAt').setNumberFormat('dd.mm.yyyy hh:mm');
  body('amount').setNumberFormat('#,##0.00 "€"');
  sheet.getRange(1, 1, maxRows, width).createFilter();

  body('status').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(Object.keys(STATUS).map(function (k) { return STATUS[k]; }), true).setAllowInvalid(false).build(),
  );
  body('amount').setDataValidation(
    SpreadsheetApp.newDataValidation().requireNumberGreaterThanOrEqualTo(0).setAllowInvalid(false).setHelpText('Iznos u evrima, npr. 130 ili 130,50').build(),
  );
  DATE_KEYS.forEach(function (k) {
    body(k).setNumberFormat('dd.mm.yyyy').setDataValidation(
      SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).setHelpText('Datum, npr. 25.11.2026 (dvoklik otvara kalendar)').build(),
    );
  });

  // Uslovno bojenje (tab pripada skripti, pa se pravila postavljaju iznova). Prvo pravilo koje važi za ćeliju pobeđuje.
  const L = function (key) { return columnLetter_(col(key)); };
  const S = '$' + L('status') + '2';
  const rule = function () { return SpreadsheetApp.newConditionalFormatRule(); };
  const rules = [
    [STATUS.NEW, '#dbe7f5', '#1d3b5c'],
    [STATUS.AWAITING, '#fdf0c8', '#6b4e00'],
    [STATUS.REMINDED, '#fbd9b5', '#7a3a00'],
    [STATUS.PAID, '#d4ecd5', '#1f5126'],
    [STATUS.EXPIRED, '#e4e0dc', '#5b4f48'],
    [STATUS.CANCELLED, '#e4e0dc', '#7a1f1f'],
  ].map(function (c) {
    return rule().whenTextEqualTo(c[0]).setBackground(c[1]).setFontColor(c[2]).setBold(true).setRanges([body('status')]).build();
  });
  // Rok za uplatu je prošao, a uplata nije evidentirana.
  rules.push(rule().whenFormulaSatisfied(
    '=AND($' + L('deadline') + '2<>"", $' + L('deadline') + '2<TODAY(), OR(' + S + '="' + STATUS.AWAITING + '", ' + S + '="' + STATUS.REMINDED + '"))',
  ).setFontColor('#9b1c1c').setBold(true).setRanges([body('deadline')]).build());
  // Iznos nedostaje (cena za tip karte nije podešena) — mora se upisati pre slanja instrukcija.
  rules.push(rule().whenFormulaSatisfied('=AND(' + S + '="' + STATUS.NEW + '", $' + L('amount') + '2="", $' + L('number') + '2<>"")')
    .setBackground('#f8d7d7').setRanges([body('amount')]).build());
  // Posebna ishrana je istaknuta.
  rules.push(rule().whenCellNotEmpty().setBackground('#fdf0c8').setFontColor('#6b4e00').setBold(true).setRanges([body('diet')]).build());
  // Istekle i otkazane rezervacije su sive.
  rules.push(rule().whenFormulaSatisfied('=OR(' + S + '="' + STATUS.EXPIRED + '", ' + S + '="' + STATUS.CANCELLED + '")')
    .setFontColor('#9a8f87').setRanges([all]).build());
  sheet.setConditionalFormatRules(rules);

  const widths = {
    number: 95, status: 150, fullName: 190, ticketType: 150, ticketCount: 70, amount: 100, diet: 220, note: 240,
    createdAt: 125, email: 210, phone: 130, instructionsAt: 115, deadline: 100, reminderAt: 115, paidAt: 115,
    paymentConfirmedAt: 115, closedAt: 115, adminNote: 220, invoice: 75, company: 200, source: 160, sourceOther: 160,
    locale: 70, pageUrl: 140, utm: 160, systemNote: 260, requestId: 120,
  };
  Object.keys(widths).forEach(function (k) { sheet.setColumnWidth(col(k), widths[k]); });

  // Tehnički podaci su skupljeni u grupu; „+" iznad kolona ih otvara.
  COLUMN_GROUPS.filter(function (g) { return g.collapsed; }).forEach(function (g) {
    const first = col(g.keys[0]);
    if (sheet.getColumnGroupDepth(first) === 0) sheet.getRange(1, first, 1, g.keys.length).shiftColumnGroupDepth(1);
    sheet.getColumnGroup(first, 1).collapse();
  });
}

/**
 * Premešta kolone u redosled iz COL (podaci se premeštaju zajedno sa kolonom, ništa se ne briše).
 * Kolone koje skripta ne poznaje (npr. dodate ručno) ostaju desno od njenih.
 */
function reorderColumns_(sheet) {
  for (let target = 0; target < HEADERS.length; target++) {
    const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
    const from = header.indexOf(HEADERS[target]);
    if (from > target) sheet.moveColumns(sheet.getRange(1, from + 1, 1, 1), target + 1);
  }
}

function columnLetter_(n) {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function setupSettingsSheet_(ss) {
  let sheet = ss.getSheetByName(SHEET_SETTINGS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_SETTINGS);
    sheet.getRange(1, 1, 1, 3).setValues([['Podešavanje', 'Vrednost', 'Opis']]).setFontWeight('bold').setBackground('#5a1723').setFontColor('#f6f1e8');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 160);
    sheet.setColumnWidth(2, 240);
    sheet.setColumnWidth(3, 560);
  }
  const keys = sheet.getDataRange().getValues().map(function (r) { return String(r[0]).trim(); });
  SETTINGS.forEach(function (s) {
    if (keys.indexOf(s[0]) >= 0) return; // postojeće vrednosti se ne diraju
    sheet.appendRow([s[0], s[1], s[2]]);
    if (typeof s[1] === 'boolean') sheet.getRange(sheet.getLastRow(), 2).insertCheckboxes();
    if (s[0] === 'BALL_YEAR') sheet.getRange(sheet.getLastRow(), 2).setNumberFormat('@').setValue(s[1]);
  });
  sheet.getRange(2, 3, Math.max(sheet.getLastRow() - 1, 1), 1).setWrap(true);

  // Polja za štikliranje (BOOKING_OPEN, GUEST_EMAILS) se uvek vraćaju, uz zadržavanje upisane vrednosti
  // (npr. ako je neko u ćeliju otkucao TRUE/DA ili obrisao kvačicu).
  const rows = sheet.getDataRange().getValues();
  SETTINGS.filter(function (st) { return typeof st[1] === 'boolean'; }).forEach(function (st) {
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() !== st[0]) continue;
      const cell = sheet.getRange(i + 1, 2);
      const value = rows[i][1] === '' || rows[i][1] === null ? st[1] : toBool_(rows[i][1]);
      cell.insertCheckboxes();
      cell.setValue(value);
    }
  });

  // Vrednosti koje još sadrže „TODO" označene su žuto, da se vidi šta treba popuniti.
  const values = sheet.getRange(2, 2, Math.max(sheet.getLastRow() - 1, 1), 1);
  const keep = sheet.getConditionalFormatRules().filter(function (rule) {
    return !rule.getRanges().some(function (rg) { return rg.getColumn() === 2; });
  });
  sheet.setConditionalFormatRules(keep.concat([
    SpreadsheetApp.newConditionalFormatRule().whenTextContains('TODO').setBackground('#fdf0c8').setFontColor('#6b4e00').setRanges([values]).build(),
  ]));
}

/** Tab „Statistika" pripada skripti i pravi se iznova pri svakom pokretanju podešavanja. */
function setupStatsSheet_(ss) {
  let sheet = ss.getSheetByName(SHEET_STATS);
  if (!sheet) sheet = ss.insertSheet(SHEET_STATS);
  sheet.clear();
  const t = openTable_();
  const letter = function (key) { return columnLetter_(t.idx[COL[key]] + 1); };
  const R = function (key) { return "'" + SHEET_RESERVATIONS + "'!" + letter(key) + '2:' + letter(key); };
  const active = ', ' + R('status') + ', "<>' + STATUS.EXPIRED + '", ' + R('status') + ', "<>' + STATUS.CANCELLED + '"';
  const rows = [
    ['Pokazatelj', 'Vrednost'],
    ['Broj prijava (sve rezervacije)', '=COUNTA(' + R('number') + ')'],
    ['Ukupno rezervisanih karata (sve prijave)', '=SUM(' + R('ticketCount') + ')'],
    ['Aktivne karte (bez isteklih i otkazanih)', '=SUMIFS(' + R('ticketCount') + active + ')'],
    ['', ''],
    ['Status: ' + STATUS.NEW, '=COUNTIF(' + R('status') + ', "' + STATUS.NEW + '")'],
    ['Status: ' + STATUS.AWAITING, '=COUNTIF(' + R('status') + ', "' + STATUS.AWAITING + '")'],
    ['Status: ' + STATUS.REMINDED, '=COUNTIF(' + R('status') + ', "' + STATUS.REMINDED + '")'],
    ['Status: ' + STATUS.PAID, '=COUNTIF(' + R('status') + ', "' + STATUS.PAID + '")'],
    ['Status: ' + STATUS.EXPIRED, '=COUNTIF(' + R('status') + ', "' + STATUS.EXPIRED + '")'],
    ['Status: ' + STATUS.CANCELLED, '=COUNTIF(' + R('status') + ', "' + STATUS.CANCELLED + '")'],
    ['Procenat plaćenih rezervacija', '=IFERROR(COUNTIF(' + R('status') + ', "' + STATUS.PAID + '") / COUNTA(' + R('number') + '), 0)'],
    ['Plaćene karte', '=SUMIF(' + R('status') + ', "' + STATUS.PAID + '", ' + R('ticketCount') + ')'],
    ['Evidentirane uplate (iznos)', '=SUMIF(' + R('status') + ', "' + STATUS.PAID + '", ' + R('amount') + ')'],
    ['Prosečan broj dana od prijave do uplate', '=IFERROR(AVERAGE(FILTER(INT(' + R('paidAt') + ') - INT(' + R('createdAt') + '), ' + R('paidAt') + ' <> "")), "—")'],
    ['', ''],
  ];
  Object.keys(TICKET_TYPES).forEach(function (k) {
    rows.push(['Karte — ' + TICKET_TYPES[k] + ' (aktivne)', '=SUMIFS(' + R('ticketCount') + ', ' + R('ticketType') + ', "' + TICKET_TYPES[k] + '"' + active + ')']);
  });
  rows.push(['', '']);
  Object.keys(SOURCES).forEach(function (k) {
    rows.push(['Izvor — ' + SOURCES[k], '=COUNTIF(' + R('source') + ', "' + SOURCES[k] + '")']);
  });
  rows.push(['', '']);
  LOCALES.forEach(function (l) { rows.push(['Jezik forme — ' + l, '=COUNTIF(' + R('locale') + ', "' + l + '")']); });
  rows.push(['', ''], ['Zahtevi za fakturu na firmu', '=COUNTIF(' + R('invoice') + ', "DA")']);
  rows.push(['Rezervacije sa posebnom ishranom', '=COUNTIF(' + R('diet') + ', "?*")']);

  sheet.getRange(1, 1, rows.length, 2).setValues(rows);
  sheet.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#5a1723').setFontColor('#f6f1e8');
  sheet.getRange(12, 2).setNumberFormat('0%');
  sheet.getRange(14, 2).setNumberFormat('#,##0.00');
  sheet.getRange(15, 2).setNumberFormat('0.0');
  sheet.setColumnWidth(1, 340);
  sheet.setColumnWidth(2, 140);
  sheet.setFrozenRows(1);
}

function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (tr) {
    if (tr.getHandlerFunction() === 'dailyCheck') ScriptApp.deleteTrigger(tr);
  });
  ScriptApp.newTrigger('dailyCheck').timeBased().everyDays(1).atHour(9).inTimezone(TIME_ZONE).create();
  SpreadsheetApp.getUi().alert('Dnevna provera rokova je uključena — pokreće se svakog dana između 9 i 10 časova.');
}

function sendTestEmail() {
  const s = readSettings_();
  const from = sendMail_(s, {
    to: s.adminEmail,
    subject: 'Sretenjski bal — probni mejl',
    body: 'Slanje mejlova iz tabele radi. Preostalo slanja danas: ' + MailApp.getRemainingDailyQuota(),
  });
  SpreadsheetApp.getUi().alert(
    'Probni mejl je poslat na ' + s.adminEmail + '.\nPošiljalac: ' + from +
    (s.senderEmail && from !== s.senderEmail
      ? '\n\nPAŽNJA: ' + s.senderEmail + ' još nije dodat u Gmailu ovog naloga (Podešavanja → Nalozi → Pošalji poštu kao), pa mejlovi idu sa glavne adrese.'
      : '') +
    '\nPreostalo slanja danas: ' + MailApp.getRemainingDailyQuota(),
  );
}

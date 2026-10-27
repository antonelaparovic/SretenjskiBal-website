/**
 * Sav promenljiv sadržaj sajta na jednom mestu.
 * Kad se nešto promeni (program, cene, mesto, partneri) — izmeni ovde i ponovo objavi sajt.
 */
import {
  EventInfo,
  Performer,
  ProgramItem,
  Sponsor,
  TicketType,
} from '../models/content.models';

export const EVENT: EventInfo = {
  year: 2027,
  title: 'Sretenjski bal',
  tagline: 'Kultura koja spaja.',
  /** 18:30 po srednjoevropskom vremenu. */
  startsAt: '2027-02-13T18:30:00+01:00',
  city: 'Maribor',
  /** Upisati kad mesto bude potvrđeno; do tada sajt prikazuje „uskoro". */
  venueName: null,
  venueAddress: null,
  mapUrl: null,
  /** COMING_SOON → „Prodaja uskoro počinje", OPEN → dugmad „Rezerviši ulaznicu", SOLD_OUT → „Rasprodato". */
  // Prodaja je otvorena; zatvara se u tabeli (tab Podešavanja, BOOKING_OPEN) ili ovde vraćanjem na 'COMING_SOON'.
  salesStatus: 'OPEN',
};

/**
 * Fotografija u heru (početna).
 * Kad dobijete fotografiju Narodnog doma za koju imate dozvolu:
 *   1) stavite je u frontend/public/images/ (npr. hero-narodni-dom.jpg, najmanje 2400 px širine),
 *   2) upišite putanju u src, npr. '/images/hero-narodni-dom.jpg',
 *   3) upišite autora u credit (prikazuje se diskretno u uglu).
 * Fotografija se automatski tonira u bordo, pa ne mora da bude „u boji sajta".
 * Dok je src null, hero je čist bordo sa lukovima iz znaka.
 */
export const HERO_IMAGE: { src: string | null; alt: string; credit: string | null } = {
  src: null,
  alt: 'Narodni dom u Mariboru',
  credit: null,
};

/** Okvirna satnica — biće potvrđena. */
export const PROGRAM: ProgramItem[] = [
  { time: '18:30', title: 'Dolazak gostiju' },
  { time: '19:30', title: 'Svečano otvaranje' },
  { time: '20:00', title: 'Muzički program' },
  { time: '21:00', title: 'Prvi ples' },
  { time: '23:30', title: 'Poseban program' },
  { time: '00:00', title: 'Ponoćno kolo' },
];

/** priceCents: 0 znači da cena još nije određena (prikazuje se „Cena uskoro"). */
/**
 * Isti tipovi kao u formi za rezervaciju (/rezervacija); forma odavde uzima i cene.
 * Kad se cena menja, promeniti je i u Google tabeli (tab Podešavanja, PRICE_…).
 */
// TODO: opisi za Svečanu i Galeriju (šta je uključeno) — kad budu poznati.
export const TICKETS: TicketType[] = [
  { code: 'SVECANA', name: 'Svečana', priceCents: 14000, ctaUrl: '/rezervacija', soldOut: false },
  { code: 'GALERIJA', name: 'Galerija', priceCents: 7000, ctaUrl: '/rezervacija', soldOut: false },
];

/**
 * Partneri. Logo staviti u public/partners/ (SVG ili PNG) i upisati putanju, npr. '/partners/firma.svg'.
 * Dok je lista prazna, sajt prikazuje poziv „Postanite partner".
 */
export const SPONSORS: Sponsor[] = [];

/**
 * Izvođači — prikazuju se na početnoj kao karusel, redom kako su ovde upisani (prvi = glavni izvođač).
 * Portret staviti u frontend/public/images/izvodjaci/ i upisati putanju u photo.
 * Dok je lista prazna, sekcija prikazuje „Imena izvođača objavljujemo uskoro."
 * Primer:
 *   { name: 'Ime Prezime', role: 'sopran', photo: '/images/izvodjaci/ime-prezime.jpg' },
 */
export const PERFORMERS: Performer[] = [];

/**
 * Fotografija Narodnog doma za stranicu Balska tradicija (fasada ili stepenište, bez ljudi, meko predvečerje).
 * 1) stavite fajl u frontend/public/images/ (npr. narodni-dom.jpg, najmanje 2000 px širine),
 * 2) upišite putanju u src i autora/licencu u credit (npr. 'Foto: Ime Prezime, CC BY-SA 4.0').
 * Fotografija se automatski tonira u bordo. Dok je src null, traka sa slikom se ne prikazuje.
 */
export const BALL_TRADITION_IMAGE: { src: string | null; alt: string; credit: string | null } = {
  src: '/images/narodni-dom-fasada.jpg',
  alt: 'Narodni dom u Mariboru',
  // TODO: potvrditi dozvolu za korišćenje fotografije (nd-mb.si) pre objave sajta.
  credit: 'Foto: Janez Klenovšek / Narodni dom Maribor',
};

/** Verzija teksta politike privatnosti. Menja se pri svakoj izmeni teksta; šalje se uz svaku formu kao dokaz šta je gost video. */
export const PRIVACY_POLICY_VERSION = '2026-10-28';

/**
 * Podaci o organizatoru (upravljaču podataka) za politiku privatnosti i podnožje.
 * Vrednosti u uglastim zagradama [UPISATI: …] su rezervisana mesta — ZAMENITI pre objave sajta.
 */
export const ORGANIZER = {
  name: 'Kulturni centar Sretenje',
  address: '[UPISATI: ulica i broj, poštanski broj, mesto]',
  registration: '[UPISATI: matična / davčna številka]',
  privacyEmail: '[UPISATI: e-adresa za pitanja o privatnosti]',
  hosting: '[UPISATI: pružalac hostinga sajta]',
  mailProvider: '[UPISATI: pružalac e-pošte (SMTP)]',
} as const;

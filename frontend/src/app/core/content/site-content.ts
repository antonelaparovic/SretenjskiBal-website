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
  venueName: 'Narodni dom Maribor',
  venueAddress: 'Ulica kneza Koclja 9, 2000 Maribor',
  mapUrl: 'https://www.google.com/maps/search/?api=1&query=Narodni+dom+Maribor',
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
/** Predlog programa — satnica i sadržaj se potvrđuju sa organizatorom. */
export const PROGRAM: ProgramItem[] = [
  { time: '18:30', title: 'Dolazak gostiju', description: 'Doček u foajeu Narodnog doma, piće dobrodošlice i fotografisanje.' },
  { time: '19:30', title: 'Svečano otvaranje', description: 'Pozdravne reči organizatora i zvanica, otvaranje prvog Sretenjskog bala.' },
  { time: '20:00', title: 'Kulturno-umetnički program', description: 'Nastupi umetnika iz Srbije i Slovenije u Velikoj dvorani.' },
  { time: '21:00', title: 'Prvi ples', description: 'Svečano otvaranje plesnog dela večeri.' },
  { time: '21:30', title: 'Svečana večera', description: 'Večera za gostima sa sedećim mestima; koktel posluženje na galeriji.' },
  { time: '22:30', title: 'Koncert grupe Galija', description: 'Glavni muzički program večeri.' },
  { time: '00:00', title: 'Ponoćno kolo', description: 'Zajedničko kolo i završni deo večeri.' },
];

/** priceCents: 0 znači da cena još nije određena (prikazuje se „Cena uskoro"). */
/**
 * Isti tipovi kao u formi za rezervaciju (/rezervacija); forma odavde uzima i cene.
 * Kad se cena menja, promeniti je i u Google tabeli (tab Podešavanja, PRICE_…).
 */
export const TICKETS: TicketType[] = [
  { code: 'SVECANA', name: 'Svečana',
    includes: [
      'Kulturno-umetnički program i koncert grupe Galija',
      'Svečana večera',
      'Neograničena konzumacija pića',
      'Sedeće mesto za stolom u Velikoj dvorani',
    ],
    priceCents: 14000, ctaUrl: '/rezervacija', soldOut: false },
  { code: 'GALERIJA', name: 'Galerija',
    includes: [
      'Kulturno-umetnički program i koncert grupe Galija',
      'Koktel posluženje i piće dobrodošlice',
      'Stajaće mesto na galeriji, sa pogledom na celokupan program',
      'Pristup Velikoj dvorani nakon završetka zvaničnog dela programa, od početka nastupa grupe Galija',
    ],
    priceCents: 7000, ctaUrl: '/rezervacija', soldOut: false },
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
  hosting: 'Cloudflare, Inc. (Cloudflare Workers)',
  mailProvider: 'Google Ireland Ltd. (Google Workspace / Gmail)',
} as const;

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
  { time: '18:00', title: $localize`Ulazak gostiju` },
  { time: '19:00', title: $localize`Himne i otvaranje`, description: $localize`Himne Srbije i Slovenije, a zatim izlazak voditelja i uvodna reč.` },
  { time: '19:30', title: $localize`Svečana večera` },
  { time: '19:50', until: '21:00', title: $localize`Kulturno-umetnički program` },
  { time: '21:20', until: '23:00', title: $localize`Koncert grupe Galija`, description: $localize`Glavni muzički program večeri i završetak bala.` },
];

/** priceCents: 0 znači da cena još nije određena (prikazuje se „Cena uskoro"). */
/**
 * Isti tipovi kao u formi za rezervaciju (/rezervacija); forma odavde uzima i cene.
 * Kad se cena menja, promeniti je i u Google tabeli (tab Podešavanja, PRICE_…).
 */
export const TICKETS: TicketType[] = [
  { code: 'SVECANA', name: $localize`Svečana`,
    includes: [
      $localize`Kulturno-umetnički program i koncert grupe Galija`,
      $localize`Svečana večera`,
      $localize`Neograničena konzumacija pića`,
      $localize`Sedeće mesto za stolom u Dvorani generala Maistra`,
    ],
    priceCents: 14000, ctaUrl: '/rezervacija', soldOut: false },
  { code: 'GALERIJA', name: $localize`Galerija`,
    includes: [
      $localize`Kulturno-umetnički program i koncert grupe Galija`,
      $localize`Koktel posluženje i piće dobrodošlice`,
      $localize`Stajaće mesto na galeriji, sa pogledom na celokupan program`,
      $localize`Pristup Dvorani generala Maistra nakon završetka zvaničnog dela programa, od početka nastupa grupe Galija`,
    ],
    priceCents: 7000, ctaUrl: '/rezervacija', soldOut: false },
];

/**
 * Partneri. Logo staviti u public/partners/ (SVG ili PNG) i upisati putanju, npr. '/partners/firma.svg'.
 * Dok je lista prazna, sajt prikazuje poziv „Postanite partner".
 */
export const SPONSORS: Sponsor[] = [];

/**
 * Izvođači — prvi sa featured: true je glavni gost (krupno), ostali idu u mrežu ispod, redom kako su upisani.
 * name: null znači da ime još nije objavljeno (prikazuje se „Uskoro"); kad ime bude poznato, upisati ga ovde.
 */
export const PERFORMERS: Performer[] = [
  { role: $localize`Glavni muzički gost`, name: 'Galija', featured: true },
  { role: $localize`Voditeljka programa`, name: 'Aleksandra Balmazović' },
  { role: $localize`Profesor književnosti i pisac`, name: 'Nenad Gugl' },
  { role: $localize`Glumac`, name: null },
  { role: $localize`Operska pevačica`, name: 'Anđela Nedeljković' },
  { role: $localize`Violinistkinja`, name: 'Sara Mitić i kvartet' },
  { role: $localize`Harmonikaš`, name: 'Mile' },
  { role: $localize`Folklor`, name: 'SKD Maribor' },
  { role: $localize`Hor`, name: null },
];

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
  /** Naziv u pravnim tekstovima i footeru (u registru: Kulturno društvo Kulturni center Sretenje). */
  legalName: 'Kulturni centar Sretenje',
  address: 'Zagrebška cesta 20, 2000 Maribor',
  registration: 'MŠ: 2949903000, DŠ: 41959787',
  /** Pitanja, kontakt forma i privatnost. */
  email: 'info@kcsretenje.si',
  privacyEmail: 'info@kcsretenje.si',
  hosting: 'Cloudflare, Inc. (Cloudflare Workers)',
  mailProvider: 'Google Ireland Ltd. (Google Workspace / Gmail)',
} as const;

/**
 * Sav promenljiv sadržaj sajta na jednom mestu.
 * Kad se nešto promeni (program, cene, mesto, partneri) — izmeni ovde i ponovo objavi sajt.
 */
import {
  EventInfo,
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
  /** COMING_SOON → „Prodaja uskoro počinje", OPEN → dugmad „Rezerviši kartu", SOLD_OUT → „Rasprodato". */
  salesStatus: 'COMING_SOON',
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
export const TICKETS: TicketType[] = [
  { name: 'Ulaznica', description: 'Pristup celoj večeri.', priceCents: 0, ctaUrl: null, soldOut: false },
  { name: 'Studentska ulaznica', description: 'Uz važeću studentsku ispravu.', priceCents: 0, ctaUrl: null, soldOut: false },
  { name: 'Mesto za stolom', description: 'Rezervacija sedenja uz večeru.', priceCents: 0, ctaUrl: null, soldOut: false },
];

/**
 * Partneri. Logo staviti u public/partners/ (SVG ili PNG) i upisati putanju, npr. '/partners/firma.svg'.
 * Dok je lista prazna, sajt prikazuje poziv „Postanite partner".
 */
export const SPONSORS: Sponsor[] = [];

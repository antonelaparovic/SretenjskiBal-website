export type SalesStatus = 'COMING_SOON' | 'OPEN' | 'SOLD_OUT';

export type SponsorTier = 'POKROVITELJ' | 'ZLATNI' | 'SREBRNI' | 'BRONZANI' | 'PRIJATELJ' | 'MEDIJSKI';

export interface EventInfo {
  year: number;
  title: string;
  tagline: string;
  startsAt: string;
  city: string;
  venueName: string | null;
  venueAddress: string | null;
  mapUrl: string | null;
  salesStatus: SalesStatus;
}

export interface ProgramItem {
  time: string;
  title: string;
  description?: string;
}

export interface TicketType {
  /** Šifra iz forme za rezervaciju — po njoj forma nalazi cenu. */
  code?: TicketTypeCode;
  name: string;
  description?: string;
  priceCents: number;
  /** Link za kupovinu kad prodaja počne: '/rezervacija' (forma na sajtu) ili spoljni prodavac. */
  ctaUrl: string | null;
  soldOut: boolean;
}

export interface Sponsor {
  name: string;
  tier: SponsorTier;
  logoUrl?: string;
  url?: string;
}

export interface Performer {
  name: string;
  /** Kratko: instrument, glas ili ansambl, npr. „sopran", „gudački kvartet". */
  role: string;
  /** Portret, npr. '/images/izvodjaci/ime-prezime.jpg' (uspravna fotografija, najmanje 800 px širine). */
  photo?: string;
}

export type ContactTopic = 'OPSTE' | 'PARTNERSTVO' | 'KARTE' | 'MEDIJI' | 'SARADNJA';

export interface ContactPayload {
  firstName: string;
  lastName: string;
  email: string;
  topic: ContactTopic;
  message: string;
  consent: boolean;
  /** Honeypot — mora ostati prazno. */
  website: string;
  /** Koliko je ms prošlo od prikaza forme do slanja (zaštita od botova). */
  elapsedMs: number;
}

/** Šifre tipova karata za rezervaciju — iste u backendu i u Google Apps Scriptu. */
export type TicketTypeCode = 'SVECANA' | 'GALERIJA';

export type ReservationSource = 'PREPORUKA' | 'DRUSTVENE_MREZE' | 'RANIJI_DOLAZAK' | 'SAJT' | 'EMAIL' | 'DRUGO';

export interface BookingStatus {
  open: boolean;
}

export interface ReservationPayload {
  /** Isti za ponovljena slanja iste rezervacije — backend tako sprečava duplikat. */
  requestId: string;
  fullName: string;
  email: string;
  phone: string;
  /** Karte glase na osobu koja rezerviše. Lista da bi se kasnije mogli kombinovati tipovi; za sada jedna stavka. */
  tickets: { ticketType: TicketTypeCode; count: number }[];
  invoice: { needed: boolean; companyName?: string; companyAddress?: string; taxId?: string };
  /** Posebna ishrana i alergije — posebna kolona u tabeli, zbog kuhinje. */
  diet: string;
  note: string;
  source: ReservationSource;
  sourceOther: string;
  locale: 'sr' | 'sl' | 'en';
  pageUrl: string;
  utm: Partial<Record<'source' | 'medium' | 'campaign' | 'term' | 'content', string>>;
  /** Honeypot — mora ostati prazno. */
  website: string;
  elapsedMs: number;
}

export interface ReservationResult {
  ok: true;
  reservationNumber: string;
  guestMailSent: boolean;
}

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
  /** Kraj termina (prikazuje se ispod početka). */
  until?: string;
  title: string;
  description?: string;
}

export interface TicketType {
  /** Šifra iz forme za rezervaciju — po njoj forma nalazi cenu. */
  code?: TicketTypeCode;
  name: string;
  description?: string;
  /** Šta je uključeno u ulaznicu (prikazuje se kao lista ispod naziva). */
  includes?: string[];
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
  /** Kategorija nastupa, npr. „Hor", „Baletski duo", „Recitacija". */
  role: string;
  /** Ime izvođača; null dok nije objavljeno (prikazuje se „Uskoro"). */
  name: string | null;
  /** Glavni gost večeri — prikazuje se krupno iznad ostalih. */
  featured?: boolean;
  /** Portret, npr. '/images/izvodjaci/ime-prezime.jpg' (neobavezno). */
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

/** Šifre tipova ulaznica za rezervaciju — iste u backendu i u Google Apps Scriptu. */
export type TicketTypeCode = 'SVECANA' | 'GALERIJA';

export type ReservationSource = 'PREPORUKA' | 'DRUSTVENE_MREZE' | 'RANIJI_DOLAZAK' | 'SAJT' | 'EMAIL' | 'DRUGO';

export interface BookingStatus {
  open: boolean;
}

export type CompanyCountry = 'SI' | 'EU' | 'OTHER';

export interface ReservationPayload {
  /** Ostali gosti (broj ulaznica − 1). */
  guests?: { firstName: string; lastName: string; email: string; phone: string }[];
  /** Isti za ponovljena slanja iste rezervacije — backend tako sprečava duplikat. */
  requestId: string;
  fullName: string;
  /** Ime i prezime nosioca posebno (tab „Gosti" u tabeli). */
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  /** Ulaznice glase na osobu koja rezerviše. Lista da bi se kasnije mogli kombinovati tipovi; za sada jedna stavka. */
  tickets: { ticketType: TicketTypeCode; count: number }[];
  invoice: {
    needed: boolean;
    companyName?: string;
    companyAddress?: string;
    /** SI = firma iz Slovenije, EU = druga država EU, OTHER = izvan EU. Od ovoga zavisi obračun DDV-a. */
    companyCountry?: CompanyCountry;
    /** Davčna številka (SI) odnosno ID za DDV (EU) / poreski broj (ostalo). */
    taxId?: string;
    /** Samo za slovenačke firme: da li je firma obveznik DDV-a (davčni zavezanec). */
    vatPayer?: boolean;
  };
  /** Posebna ishrana i alergije — posebna kolona u tabeli, zbog kuhinje. */
  diet: string;
  /** Izričita saglasnost za podatke o zdravlju (član 9 GDPR); true samo uz popunjenu ishranu. */
  dietConsent: boolean;
  /** Verzija politike privatnosti koju je gost video. */
  privacyPolicyVersion: string;
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

/** Odgovor skripte na skeniranje ulaznice (akcija „checkin"). */
export interface CheckinResult {
  ok: true;
  /** Bez rezultata = samo provera PIN-a. */
  result?: 'OK' | 'USED' | 'NOT_PAID' | 'UNKNOWN' | 'INVALID';
  code?: string;
  number?: string;
  index?: number;
  name?: string;
  type?: string;
  /** Status rezervacije kad nije plaćena (npr. OTKAZANO). */
  status?: string;
  /** Vreme ulaska (HH:mm): sada za OK, ranije za USED. */
  enteredAt?: string;
  scannedBy?: string;
  stats: { entered: number; total: number };
}

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
  name: string;
  description?: string;
  priceCents: number;
  /** Spoljni link za kupovinu (kad prodaja počne). */
  ctaUrl: string | null;
  soldOut: boolean;
}

export interface Sponsor {
  name: string;
  tier: SponsorTier;
  logoUrl?: string;
  url?: string;
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

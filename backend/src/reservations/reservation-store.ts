import type { CompanyCountry, Locale, ReservationSource, TicketTypeCode } from './reservation.dto.js';

/** Očišćena rezervacija koja se šalje u tabelu. */
export interface ReservationInput {
  requestId: string;
  fullName: string;
  email: string;
  phone: string;
  tickets: { ticketType: TicketTypeCode; count: number }[];
  invoice: {
    needed: boolean;
    companyName?: string;
    companyAddress?: string;
    companyCountry?: CompanyCountry;
    taxId?: string;
    vatPayer?: boolean;
  };
  diet: string;
  /** true samo ako je `diet` popunjen i gost je izričito pristao na obradu. */
  dietConsent: boolean;
  privacyPolicyVersion: string;
  note: string;
  source: ReservationSource;
  sourceOther: string;
  locale: Locale;
  pageUrl: string;
  utm: Record<string, string>;
}

export interface BookingStatus {
  open: boolean;
}

export type CreateResult =
  | { ok: true; reservationNumber: string; duplicate: boolean; adminMailSent: boolean; guestMailSent: boolean }
  | { ok: false; code: 'BOOKING_CLOSED' | 'INVALID'; fields?: string[] };

/** Gde se rezervacije trajno čuvaju (Google tabela preko Apps Scripta, ili lokalni fajl u razvoju). */
export interface ReservationStore {
  status(): Promise<BookingStatus>;
  create(input: ReservationInput): Promise<CreateResult>;
}

export const RESERVATION_STORE = Symbol('RESERVATION_STORE');

/** Skladište nije odgovorilo ili nije potvrdilo upis — rezervacija se NE sme prikazati kao uspešna. */
export class StoreUnavailableError extends Error {
  constructor(readonly reason: string) {
    super(`Skladište rezervacija nije dostupno (${reason}).`);
  }
}

/** Produkcija bez podešenog Apps Scripta: rezervacije su zatvorene, ništa se ne prima. */
export class UnconfiguredStore implements ReservationStore {
  status(): Promise<BookingStatus> {
    return Promise.resolve({ open: false });
  }

  create(): Promise<CreateResult> {
    return Promise.resolve({ ok: false, code: 'BOOKING_CLOSED' });
  }
}

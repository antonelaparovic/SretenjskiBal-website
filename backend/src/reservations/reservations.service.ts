import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { cleanText } from '../common/text.js';
import { CreateReservationDto, MAX_TICKETS_PER_RESERVATION } from './reservation.dto.js';
import {
  BookingStatus,
  RESERVATION_STORE,
  ReservationInput,
  type ReservationStore,
  StoreUnavailableError,
} from './reservation-store.js';

/** Ovu formu čovek ne popuni za manje od 4 sekunde — verovatno bot. */
const MIN_FILL_MS = 4000;

export interface ReservationCreated {
  ok: true;
  reservationNumber: string;
  guestMailSent: boolean;
}

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(@Inject(RESERVATION_STORE) private readonly store: ReservationStore) {}

  async status(): Promise<BookingStatus> {
    try {
      return await this.store.status();
    } catch (err) {
      if (err instanceof StoreUnavailableError) throw new ServiceUnavailableException({ code: 'UNAVAILABLE' });
      throw err;
    }
  }

  async create(dto: CreateReservationDto): Promise<ReservationCreated> {
    if (dto.website || (dto.elapsedMs !== undefined && dto.elapsedMs < MIN_FILL_MS)) {
      this.logger.warn('Odbijena sumnjiva rezervacija (skriveno polje ili prebrzo slanje).');
      throw new BadRequestException({ code: 'REJECTED' });
    }
    const types = dto.tickets.map((t) => t.ticketType);
    const total = dto.tickets.reduce((sum, t) => sum + t.count, 0);
    if (new Set(types).size !== types.length || total > MAX_TICKETS_PER_RESERVATION) {
      throw new BadRequestException({ code: 'INVALID', fields: ['tickets'] });
    }

    // Podaci o ishrani su podaci o zdravlju: bez izričite saglasnosti ih ne primamo.
    if (cleanText(dto.diet ?? '', { multiline: true }) && dto.dietConsent !== true) {
      throw new BadRequestException({ code: 'INVALID', fields: ['dietConsent'] });
    }

    let result;
    try {
      result = await this.store.create(this.toInput(dto));
    } catch (err) {
      if (err instanceof StoreUnavailableError) throw new ServiceUnavailableException({ code: 'UNAVAILABLE' });
      throw err;
    }

    if (!result.ok) {
      if (result.code === 'BOOKING_CLOSED') throw new ConflictException({ code: 'BOOKING_CLOSED' });
      // Samo nazivi polja, bez ličnih podataka. Ako se ovo javlja za ispravne podatke, skripta u tabeli je verovatno starija verzija.
      this.logger.warn(`Tabela je odbila rezervaciju, neispravna polja: ${(result.fields ?? []).join(', ') || 'nepoznato'}.`);
      throw new BadRequestException({ code: 'INVALID', fields: result.fields ?? [] });
    }
    this.logger.log(
      `Rezervacija ${result.reservationNumber} ${result.duplicate ? 'već postoji (ponovljen zahtev)' : 'evidentirana'}; ` +
        `obaveštenje: ${result.adminMailSent ? 'poslato' : 'nije poslato'}, potvrda gostu: ${result.guestMailSent ? 'poslata' : 'nije poslata'}.`,
    );
    return { ok: true, reservationNumber: result.reservationNumber, guestMailSent: result.guestMailSent };
  }

  private toInput(dto: CreateReservationDto): ReservationInput {
    const invoice = dto.invoice.needed
      ? {
          needed: true,
          companyName: cleanText(dto.invoice.companyName ?? ''),
          companyAddress: cleanText(dto.invoice.companyAddress ?? ''),
          taxId: cleanText(dto.invoice.taxId ?? ''),
        }
      : { needed: false };
    const utm: Record<string, string> = {};
    for (const [key, value] of Object.entries(dto.utm ?? {})) {
      if (typeof value === 'string' && value.trim()) utm[key] = cleanText(value);
    }
    return {
      requestId: dto.requestId,
      fullName: cleanText(dto.fullName),
      email: dto.email,
      phone: cleanText(dto.phone),
      tickets: dto.tickets.map((t) => ({ ticketType: t.ticketType, count: t.count })),
      invoice,
      diet: cleanText(dto.diet ?? '', { multiline: true }),
      dietConsent: dto.dietConsent === true && cleanText(dto.diet ?? '', { multiline: true }) !== '',
      privacyPolicyVersion: dto.privacyPolicyVersion,
      note: cleanText(dto.note ?? '', { multiline: true }),
      source: dto.source,
      sourceOther: dto.source === 'DRUGO' ? cleanText(dto.sourceOther ?? '') : '',
      locale: dto.locale,
      pageUrl: cleanText(dto.pageUrl ?? ''),
      utm,
    };
  }
}

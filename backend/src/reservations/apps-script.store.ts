import { Logger } from '@nestjs/common';
import {
  BookingStatus,
  CreateResult,
  ReservationInput,
  ReservationStore,
  StoreUnavailableError,
} from './reservation-store.js';

/** Koliko dugo važi poslednji odgovor „otvoreno/zatvoreno" (konačnu proveru svakako radi Apps Script pri upisu). */
const STATUS_CACHE_MS = 20_000;
/** Ponovni pokušaj samo kad je sigurno: zahtev nije stigao ili je tabela bila zauzeta (requestId sprečava duplikat). */
const RETRYABLE = new Set(['NETWORK', 'BUSY']);
const RETRY_DELAY_MS = 1500;

type ScriptResponse = { ok: boolean; code?: string; [key: string]: unknown };

/**
 * Google Apps Script web aplikacija vezana za tabelu „Bal rezervacije".
 * Poziva se sa servera (bez CORS-a), tajni ključ nikad ne ide u browser.
 * Apps Script na POST odgovara preusmerenjem na googleusercontent.com — fetch ga prati.
 */
export class AppsScriptStore implements ReservationStore {
  private readonly logger = new Logger(AppsScriptStore.name);
  private statusCache: { value: BookingStatus; until: number } | null = null;

  constructor(
    private readonly url: string,
    private readonly secret: string,
    private readonly timeoutMs: number,
    private readonly fetchFn: typeof fetch = fetch,
    private readonly retryDelayMs = RETRY_DELAY_MS,
  ) {}

  async status(): Promise<BookingStatus> {
    if (this.statusCache && this.statusCache.until > Date.now()) return this.statusCache.value;
    const res = await this.call({ action: 'status' });
    if (!res.ok) throw new StoreUnavailableError(String(res.code));
    const value = { open: res['open'] === true };
    this.statusCache = { value, until: Date.now() + STATUS_CACHE_MS };
    return value;
  }

  async create(reservation: ReservationInput): Promise<CreateResult> {
    const res = await this.call({ action: 'create', reservation });
    if (res.ok && typeof res['reservationNumber'] === 'string' && res['reservationNumber']) {
      return {
        ok: true,
        reservationNumber: res['reservationNumber'],
        duplicate: res['duplicate'] === true,
        adminMailSent: res['adminMailSent'] === true,
        guestMailSent: res['guestMailSent'] === true,
      };
    }
    if (res.code === 'BOOKING_CLOSED') {
      this.statusCache = null;
      return { ok: false, code: 'BOOKING_CLOSED' };
    }
    if (res.code === 'INVALID') {
      return { ok: false, code: 'INVALID', fields: Array.isArray(res['fields']) ? (res['fields'] as string[]) : [] };
    }
    if (res.code === 'UNAUTHORIZED') {
      this.logger.error('Apps Script odbija ključ — proveri da li je APPS_SCRIPT_SECRET isti kao u tabeli (meni → Prikaži ključ za sajt).');
    }
    throw new StoreUnavailableError(String(res.code ?? 'NO_CONFIRMATION'));
  }

  private async call(body: object, attempt = 1): Promise<ScriptResponse> {
    try {
      const res = await this.request(body);
      if (!res.ok && res.code === 'BUSY' && attempt < 2) throw new StoreUnavailableError('BUSY');
      return res;
    } catch (err) {
      const reason = err instanceof StoreUnavailableError ? err.reason : 'UNKNOWN';
      if (attempt < 2 && RETRYABLE.has(reason)) {
        await new Promise((r) => setTimeout(r, this.retryDelayMs));
        return this.call(body, attempt + 1);
      }
      this.logger.error(`Apps Script nije odgovorio ispravno: ${reason}`);
      throw err instanceof StoreUnavailableError ? err : new StoreUnavailableError(reason);
    }
  }

  private async request(body: object): Promise<ScriptResponse> {
    let res: Response;
    try {
      res = await this.fetchFn(this.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...body, secret: this.secret }),
        redirect: 'follow',
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      const name = (err as Error).name;
      // Posle isteka vremena upis je možda ipak uspeo — ne ponavljamo; korisnik ponavlja sa istim requestId.
      throw new StoreUnavailableError(name === 'TimeoutError' || name === 'AbortError' ? 'TIMEOUT' : 'NETWORK');
    }
    if (!res.ok) throw new StoreUnavailableError(`HTTP_${res.status}`);
    const text = await res.text();
    try {
      const data = JSON.parse(text) as ScriptResponse;
      if (typeof data?.ok !== 'boolean') throw new Error();
      return data;
    } catch {
      // Najčešće Google stranica za prijavu: web aplikacija nije objavljena sa pristupom „Bilo ko".
      throw new StoreUnavailableError('NOT_JSON');
    }
  }
}

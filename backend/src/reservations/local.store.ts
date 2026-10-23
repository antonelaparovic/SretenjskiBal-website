import { Logger } from '@nestjs/common';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { BookingStatus, CreateResult, ReservationInput, ReservationStore } from './reservation-store.js';

/**
 * Samo za lokalni razvoj (kad APPS_SCRIPT_URL nije podešen): rezervacije idu u lokalni fajl,
 * brojevi se dodeljuju isto kao u tabeli, a mejlovi se ne šalju.
 */
export class LocalReservationStore implements ReservationStore {
  private readonly logger = new Logger(LocalReservationStore.name);
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly file: string,
    private readonly ballYear = '27',
    private readonly open = true,
  ) {}

  status(): Promise<BookingStatus> {
    return Promise.resolve({ open: this.open });
  }

  create(input: ReservationInput): Promise<CreateResult> {
    // Jedan upis u isto vreme — isto kao zaključavanje u Apps Scriptu.
    const run = this.queue.then(() => this.createExclusive(input));
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async createExclusive(input: ReservationInput): Promise<CreateResult> {
    if (!this.open) return { ok: false, code: 'BOOKING_CLOSED' };
    const rows = await this.readAll();
    const existing = rows.find((r) => r.requestId === input.requestId);
    if (existing) {
      return { ok: true, reservationNumber: existing.reservationNumber, duplicate: true, adminMailSent: false, guestMailSent: false };
    }
    const last = rows
      .map((r) => r.reservationNumber)
      .filter((n) => n.startsWith(this.ballYear))
      .reduce((max, n) => Math.max(max, Number(n.slice(2))), 0);
    const reservationNumber = this.ballYear + String(last + 1).padStart(3, '0');
    await mkdir(dirname(this.file), { recursive: true });
    await appendFile(this.file, `${JSON.stringify({ reservationNumber, createdAt: new Date().toISOString(), ...input })}\n`, 'utf8');
    this.logger.log(`[lokalno] Rezervacija ${reservationNumber} upisana u ${this.file} (mejlovi se lokalno ne šalju).`);
    return { ok: true, reservationNumber, duplicate: false, adminMailSent: false, guestMailSent: false };
  }

  private async readAll(): Promise<{ reservationNumber: string; requestId: string }[]> {
    try {
      const text = await readFile(this.file, 'utf8');
      return text
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as { reservationNumber: string; requestId: string });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw err;
    }
  }
}

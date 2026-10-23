import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LocalReservationStore } from '../src/reservations/local.store.js';
import { ReservationInput } from '../src/reservations/reservation-store.js';

const input = (requestId: string) =>
  ({ requestId, tickets: [{ ticketType: 'BALKON', count: 1 }] }) as unknown as ReservationInput;

describe('LocalReservationStore (razvoj)', () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'rez-'));
    file = join(dir, 'rezervacije.jsonl');
  });
  afterEach(() => rm(dir, { recursive: true, force: true }));

  it('20 istovremenih rezervacija dobija 20 različitih uzastopnih brojeva', async () => {
    const s = new LocalReservationStore(file);
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => s.create(input(`req-${i}`))));
    const numbers = results.map((r) => (r.ok ? r.reservationNumber : '')).sort();
    expect(new Set(numbers).size).toBe(20);
    expect(numbers[0]).toBe('27001');
    expect(numbers[19]).toBe('27020');
    expect((await readFile(file, 'utf8')).trim().split('\n')).toHaveLength(20);
  });

  it('isti requestId — isti broj, bez novog upisa', async () => {
    const s = new LocalReservationStore(file);
    const [a, b] = await Promise.all([s.create(input('isti')), s.create(input('isti'))]);
    expect(a).toMatchObject({ reservationNumber: '27001', duplicate: false });
    expect(b).toMatchObject({ reservationNumber: '27001', duplicate: true });
    expect((await readFile(file, 'utf8')).trim().split('\n')).toHaveLength(1);
  });

  it('nastavlja numeraciju posle restarta', async () => {
    await new LocalReservationStore(file).create(input('a'));
    await expect(new LocalReservationStore(file).create(input('b'))).resolves.toMatchObject({ reservationNumber: '27002' });
  });

  it('zatvorene rezervacije', async () => {
    await expect(new LocalReservationStore(file, '27', false).create(input('a'))).resolves.toEqual({ ok: false, code: 'BOOKING_CLOSED' });
  });
});

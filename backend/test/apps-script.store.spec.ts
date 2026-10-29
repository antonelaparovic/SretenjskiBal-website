import { describe, expect, it, vi } from 'vitest';
import { AppsScriptStore } from '../src/reservations/apps-script.store.js';
import { ReservationInput, StoreUnavailableError } from '../src/reservations/reservation-store.js';

const URL = 'https://script.google.com/macros/s/test/exec';
const SECRET = 's'.repeat(64);
const input = { requestId: 'r-1' } as ReservationInput;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function store(...responses: (Response | Error)[]) {
  const fetchFn = vi.fn(async () => {
    const next = responses.shift();
    if (!next) throw new Error('nema više odgovora');
    if (next instanceof Error) throw next;
    return next;
  });
  return { s: new AppsScriptStore(URL, SECRET, 5000, fetchFn as unknown as typeof fetch, 1), fetchFn };
}

describe('AppsScriptStore', () => {
  it('šalje tajni ključ i rezervaciju serverski, prati preusmerenje', async () => {
    const { s, fetchFn } = store(json({ ok: true, reservationNumber: '27001', duplicate: false, adminMailSent: true, guestMailSent: true }));
    await expect(s.create(input)).resolves.toEqual({ ok: true, reservationNumber: '27001', duplicate: false, adminMailSent: true, guestMailSent: true });
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(URL);
    expect(init.redirect).toBe('follow');
    expect(JSON.parse(init.body as string)).toEqual({ action: 'create', reservation: input, secret: SECRET });
  });

  it('zatvorene rezervacije i neispravni podaci', async () => {
    await expect(store(json({ ok: false, code: 'BOOKING_CLOSED' })).s.create(input)).resolves.toEqual({ ok: false, code: 'BOOKING_CLOSED' });
    await expect(store(json({ ok: false, code: 'INVALID', fields: ['email'] })).s.create(input)).resolves.toEqual({ ok: false, code: 'INVALID', fields: ['email'] });
  });

  it.each([
    ['Google stranica za prijavu (HTML umesto JSON)', new Response('<html>Sign in</html>', { status: 200 })],
    ['HTTP greška', new Response('err', { status: 500 })],
    ['greška u skripti', json({ ok: false, code: 'SERVER_ERROR' })],
    ['pogrešan ključ', json({ ok: false, code: 'UNAUTHORIZED' })],
    ['uspeh bez broja rezervacije', json({ ok: true })],
  ])('bez potvrde upisa nema uspeha: %s', async (_n, response) => {
    await expect(store(response).s.create(input)).rejects.toBeInstanceOf(StoreUnavailableError);
  });

  it('isteklo vreme se ne ponavlja (upis je možda ipak uspeo)', async () => {
    const timeout = Object.assign(new Error('timeout'), { name: 'TimeoutError' });
    const { s, fetchFn } = store(timeout, json({ ok: true, reservationNumber: '27001' }));
    await expect(s.create(input)).rejects.toMatchObject({ reason: 'TIMEOUT' });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('mrežna greška i zauzeta tabela se ponavljaju jednom, sa istim zahtevom', async () => {
    const ok = { ok: true, reservationNumber: '27002' };
    const a = store(new TypeError('fetch failed'), json(ok));
    await expect(a.s.create(input)).resolves.toMatchObject({ reservationNumber: '27002' });
    expect(a.fetchFn).toHaveBeenCalledTimes(2);
    const bodies = a.fetchFn.mock.calls.map((c) => (c as unknown as [string, RequestInit])[1].body);
    expect(bodies[0]).toBe(bodies[1]);

    const b = store(json({ ok: false, code: 'BUSY' }), json(ok));
    await expect(b.s.create(input)).resolves.toMatchObject({ reservationNumber: '27002' });

    const c = store(json({ ok: false, code: 'BUSY' }), json({ ok: false, code: 'BUSY' }));
    await expect(c.s.create(input)).rejects.toBeInstanceOf(StoreUnavailableError);
  });

  it('status se kratko kešira, a zatvaranje pri upisu briše keš', async () => {
    const { s, fetchFn } = store(
      json({ ok: true, open: true }),
      json({ ok: false, code: 'BOOKING_CLOSED' }),
      json({ ok: true, open: false }),
    );
    await expect(s.status()).resolves.toEqual({ open: true });
    await expect(s.status()).resolves.toEqual({ open: true });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    await s.create(input);
    await expect(s.status()).resolves.toEqual({ open: false });
  });
});

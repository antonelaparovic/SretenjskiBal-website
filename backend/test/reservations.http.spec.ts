import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  BookingStatus,
  CreateResult,
  RESERVATION_STORE,
  ReservationInput,
  ReservationStore,
  StoreUnavailableError,
} from '../src/reservations/reservation-store.js';
import { ReservationsModule } from '../src/reservations/reservations.module.js';

/** Skladište kojim test upravlja: šta vraća i šta je primilo. */
class FakeStore implements ReservationStore {
  received: ReservationInput[] = [];
  next: CreateResult | Error = { ok: true, reservationNumber: '27001', duplicate: false, adminMailSent: true, guestMailSent: true };
  statusValue: BookingStatus | Error = { open: true };

  status() {
    return this.statusValue instanceof Error ? Promise.reject(this.statusValue) : Promise.resolve(this.statusValue);
  }

  create(input: ReservationInput) {
    this.received.push(input);
    return this.next instanceof Error ? Promise.reject(this.next) : Promise.resolve(this.next);
  }
}

function payload(overrides: Record<string, unknown> = {}) {
  return {
    requestId: '0b8e7f5e-3c1d-4a8e-9f2b-1d2c3b4a5f60',
    fullName: '  Ana Anić ',
    email: 'Ana@Primer.si',
    phone: '+386 40 123 456',
    tickets: [{ ticketType: 'SVECANA', count: 2 }],
    diet: ' <b>Bez glutena</b> ',
    dietConsent: true,
    privacyPolicyVersion: '2026-10-27',
    invoice: { needed: false, companyName: '', companyAddress: '', companyCountry: 'SI', taxId: '' },
    note: '',
    source: 'DRUGO',
    sourceOther: 'Plakat u gradu',
    locale: 'sl',
    pageUrl: '/rezervacija',
    utm: { source: 'instagram' },
    website: '',
    elapsedMs: 60_000,
    ...overrides,
  };
}

describe('HTTP /api/reservations', () => {
  let app: INestApplication;
  let base: string;
  const store = new FakeStore();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => ({ NODE_ENV: 'test' })] }),
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: 1000 }]),
        ReservationsModule,
      ],
    })
      .overrideProvider(RESERVATION_STORE)
      .useValue(store)
      .compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.listen(0);
    base = `${await app.getUrl()}/api/reservations`.replace('[::1]', 'localhost');
  });

  afterAll(() => app.close());

  beforeEach(() => {
    store.received = [];
    store.next = { ok: true, reservationNumber: '27001', duplicate: false, adminMailSent: true, guestMailSent: true };
    store.statusValue = { open: true };
  });

  const post = (body: unknown) =>
    fetch(base, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

  it('GET status', async () => {
    const res = await fetch(`${base}/status`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ open: true });
  });

  it('GET status kad tabela nije dostupna → 503', async () => {
    store.statusValue = new StoreUnavailableError('TIMEOUT');
    expect((await fetch(`${base}/status`)).status).toBe(503);
  });

  it('ispravna rezervacija → broj, očišćeni podaci', async () => {
    const res = await post(payload());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, reservationNumber: '27001', guestMailSent: true });
    const r = store.received[0];
    expect(r.fullName).toBe('Ana Anić');
    expect(r.email).toBe('ana@primer.si');
    expect(r.tickets).toEqual([{ ticketType: 'SVECANA', count: 2 }]);
    expect(r.diet).toBe('Bez glutena');
    expect(r.invoice).toEqual({ needed: false });
    expect(r.locale).toBe('sl');
    expect(r.sourceOther).toBe('Plakat u gradu');
    expect(r.utm).toEqual({ source: 'instagram' });
  });

  it('jedna karta i veliki broj karata (bez prodajnog ograničenja)', async () => {
    expect((await post(payload({ tickets: [{ ticketType: 'GALERIJA', count: 1 }] }))).status).toBe(200);
    expect((await post(payload({ tickets: [{ ticketType: 'GALERIJA', count: 40 }] }))).status).toBe(200);
    expect(store.received.map((r) => r.tickets[0].count)).toEqual([1, 40]);
  });

  it('oba tipa karata', async () => {
    for (const ticketType of ['SVECANA', 'GALERIJA']) {
      const res = await post(payload({ tickets: [{ ticketType, count: 1 }] }));
      expect(res.status).toBe(200);
    }
    expect(store.received.map((r) => r.tickets[0].ticketType)).toEqual(['SVECANA', 'GALERIJA']);
  });

  it('faktura na firmu zahteva podatke firme', async () => {
    expect((await post(payload({ invoice: { needed: true, companyName: 'Firma' } }))).status).toBe(400);
    const si = { needed: true, companyName: 'Firma d.o.o.', companyAddress: 'Glavni trg 1', companyCountry: 'SI', vatPayer: true };
    expect((await post(payload({ invoice: { ...si, taxId: '1234' } }))).status).toBe(400);
    expect((await post(payload({ invoice: { ...si, taxId: 'SI12345678', vatPayer: undefined } }))).status).toBe(400);
    expect((await post(payload({ invoice: { ...si, companyCountry: 'EU', taxId: 'SI12345678' } }))).status).toBe(400);
    expect((await post(payload({ invoice: { ...si, companyCountry: 'XX', taxId: 'SI12345678' } }))).status).toBe(400);
    const ok = await post(payload({ invoice: { ...si, taxId: 'si12345678' } }));
    expect(ok.status).toBe(200);
    expect(store.received[0].invoice).toEqual({ needed: true, companyName: 'Firma d.o.o.', companyAddress: 'Glavni trg 1', companyCountry: 'SI', taxId: 'SI12345678', vatPayer: true });
    const eu = await post(payload({ requestId: '5b0c1c7e-3c1b-4a39-9a55-0e1d7b9d3f10', invoice: { needed: true, companyName: 'Firma d.o.o.', companyAddress: 'Ilica 1, Zagreb', companyCountry: 'EU', taxId: 'HR12345678901', vatPayer: true } }));
    expect(eu.status).toBe(200);
    expect(store.received[1].invoice).toEqual({ needed: true, companyName: 'Firma d.o.o.', companyAddress: 'Ilica 1, Zagreb', companyCountry: 'EU', taxId: 'HR12345678901' });
  });

  it.each([
    ['neispravan e-mail', { email: 'ana@' }],
    ['bez telefona', { phone: '' }],
    ['telefon bez dovoljno cifara', { phone: '+386' }],
    ['bez imena', { fullName: '' }],
    ['bez karata', { tickets: [] }],
    ['0 karata', { tickets: [{ ticketType: 'GALERIJA', count: 0 }] }],
    ['neceo broj karata', { tickets: [{ ticketType: 'GALERIJA', count: 1.5 }] }],
    ['nepoznat tip karte', { tickets: [{ ticketType: 'VIP', count: 1 }] }],
    ['predugačka napomena o ishrani', { diet: 'x'.repeat(1001) }],
    ['ishrana bez izričite saglasnosti', { dietConsent: false }],
    ['bez verzije politike privatnosti', { privacyPolicyVersion: undefined }],
    ['nepoznat izvor', { source: 'TV' }],
    ['nepoznat jezik', { locale: 'de' }],
    ['bez requestId', { requestId: undefined }],
    ['nepoznato polje', { admin: true }],
  ])('400: %s', async (_name, overrides) => {
    const res = await post(payload(overrides));
    expect(res.status).toBe(400);
    expect(store.received).toHaveLength(0);
  });

  it('400 za ponovljen tip karte i preko tehničke granice od 100 karata', async () => {
    const dup = await post(payload({ tickets: [{ ticketType: 'GALERIJA', count: 1 }, { ticketType: 'GALERIJA', count: 2 }] }));
    expect(dup.status).toBe(400);
    expect(await dup.json()).toMatchObject({ code: 'INVALID', fields: ['tickets'] });
    const many = await post(payload({ tickets: [{ ticketType: 'GALERIJA', count: 60 }, { ticketType: 'SVECANA', count: 60 }] }));
    expect(many.status).toBe(400);
    expect(store.received).toHaveLength(0);
  });

  it('botovi: popunjeno skriveno polje ili prebrzo slanje', async () => {
    expect((await post(payload({ website: 'http://spam' }))).status).toBe(400);
    expect((await post(payload({ elapsedMs: 800 }))).status).toBe(400);
    expect(store.received).toHaveLength(0);
  });

  it('409 kad su rezervacije zatvorene', async () => {
    store.next = { ok: false, code: 'BOOKING_CLOSED' };
    const res = await post(payload());
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: 'BOOKING_CLOSED' });
  });

  it('503 kad tabela nije potvrdila upis — nikad lažni uspeh', async () => {
    store.next = new StoreUnavailableError('TIMEOUT');
    const res = await post(payload());
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ code: 'UNAVAILABLE' });
  });

  it('ponovljen zahtev vraća isti broj', async () => {
    store.next = { ok: true, reservationNumber: '27001', duplicate: true, adminMailSent: false, guestMailSent: false };
    const res = await post(payload());
    expect(await res.json()).toEqual({ ok: true, reservationNumber: '27001', guestMailSent: false });
  });
});

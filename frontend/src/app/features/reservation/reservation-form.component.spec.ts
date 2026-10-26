import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ReservationPayload } from '../../core/models/content.models';
import { ReservationFormComponent } from './reservation-form.component';

describe('ReservationFormComponent', () => {
  let fixture: ComponentFixture<ReservationFormComponent>;
  let http: HttpTestingController;
  let el: HTMLElement;

  const $ = <T extends Element = HTMLInputElement>(sel: string) => el.querySelector<T>(sel)!;
  const $$ = <T extends Element = HTMLInputElement>(sel: string) => [...el.querySelectorAll<T>(sel)];
  const render = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const type = async (sel: string | HTMLInputElement, value: string) => {
    const input = typeof sel === 'string' ? $(sel) : sel;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await render();
  };
  const choose = async (sel: string, index: number) => {
    const select = $<HTMLSelectElement>(sel);
    select.selectedIndex = index;
    select.dispatchEvent(new Event('change'));
    await render();
  };
  const click = async (sel: string | HTMLElement) => {
    (typeof sel === 'string' ? $<HTMLElement>(sel) : sel).click();
    await render();
  };
  const ticketRadios = () => $$('input[formcontrolname=ticketType]');
  const count = () => $('#ticketCount');
  const errors = () => $$('.field__error').map((e) => e.textContent!.trim());

  async function open(status: object = { open: true }) {
    await render();
    http.expectOne('/api/reservations/status').flush(status);
    await render();
  }

  async function fillValid() {
    await type('[formcontrolname=fullName]', 'Ana Anić');
    await type('[formcontrolname=email]', 'ana@primer.si');
    await type('[formcontrolname=phone]', '+386 40 123 456');
    await click(ticketRadios()[1]); // Galerija
    await type(count(), '2');
    await choose('[formcontrolname=source]', 2); // Društvene mreže
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReservationFormComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(ReservationFormComponent);
    http = TestBed.inject(HttpTestingController);
    el = fixture.nativeElement;
  });

  afterEach(() => http.verify());

  it('prikazuje formu kad su rezervacije otvorene: celine, bez polja za imena gostiju', async () => {
    await open();
    expect($('form')).toBeTruthy();
    expect($$('h2.legend').map((h) => h.textContent!.trim())).toEqual(['Vaši podaci', 'Ulaznice', 'Ishrana i napomene', 'Još malo']);
    expect(el.textContent).not.toContain('Gost 1');
    expect(el.textContent).toContain('Karte glase na vaše ime.');
    expect(el.textContent).toContain('Sva polja su obavezna, osim onih označenih kao opciona.');
    expect($('a[href="/privacy"]')).toBeTruthy();
  });

  it('kad su rezervacije zatvorene nema forme', async () => {
    await open({ open: false });
    expect($('form')).toBeNull();
    expect(el.textContent).toContain('Rezervacije trenutno nisu dostupne.');
  });

  it('kad backend nije dostupan nudi ponovni pokušaj', async () => {
    await render();
    http.expectOne('/api/reservations/status').flush(null, { status: 503, statusText: 'Unavailable' });
    await render();
    expect($('form')).toBeNull();
    await click('.notice button');
    http.expectOne('/api/reservations/status').flush({ open: true });
    await render();
    expect($('form')).toBeTruthy();
  });

  it('broj karata: dugmad − / +, bez gornjeg ograničenja u prodaji', async () => {
    await open();
    expect(count().value).toBe('1');
    const [minus, plus] = $$<HTMLButtonElement>('.stepper__btn');
    expect(minus.disabled).toBe(true);
    await click(plus);
    await click(plus);
    expect(count().value).toBe('3');
    await click(minus);
    expect(count().value).toBe('2');
    await type(count(), '25');
    expect(errors()).toEqual([]);
  });

  it('dva tipa karata kao kartice sa cenom', async () => {
    await open();
    const cards = $$('.ticket').map((c) => [c.querySelector('.ticket__name')!.textContent!.trim(), c.querySelector('.ticket__price')!.textContent!.replace(/\s+/g, ' ').trim()]);
    expect(cards).toEqual([
      ['Svečana', '140 €'],
      ['Galerija', '70 €'],
    ]);
  });

  it('okvirni iznos prati tip i broj karata', async () => {
    await open();
    expect($('.estimate')).toBeNull();
    await click(ticketRadios()[0]);
    expect($('.estimate__value').textContent).toContain('140');
    await type(count(), '3');
    expect($('.estimate__value').textContent).toContain('420');
    await click(ticketRadios()[1]);
    expect($('.estimate__value').textContent).toContain('210');
  });

  it('ne šalje formu bez obaveznih podataka i označava greške', async () => {
    await open();
    await type(count(), '0');
    await click('button[type=submit]');
    http.expectNone('/api/reservations');
    expect(errors()).toEqual([
      'Unesite ime i prezime.',
      'Unesite ispravnu email adresu.',
      'Unesite broj telefona, npr. +386 40 123 456.',
      'Izaberite tip karte.',
      'Unesite broj karata (ceo broj, najmanje 1).',
      'Izaberite jednu od ponuđenih mogućnosti.',
    ]);
    expect($('[formcontrolname=fullName]').getAttribute('aria-invalid')).toBe('true');
  });

  it('neispravna email adresa', async () => {
    await open();
    await type('[formcontrolname=email]', 'ana@');
    expect(errors()).toContain('Unesite ispravnu email adresu.');
  });

  it('faktura na firmu: dodatna polja se pojavljuju i obavezna su samo kad je izabrano Da', async () => {
    await open();
    expect($('[formcontrolname=taxId]')).toBeNull();
    await click($$('input[formcontrolname=invoiceNeeded]')[1]);
    expect($('[formcontrolname=name]')).toBeTruthy();
    await fillValid();
    await click('button[type=submit]');
    http.expectNone('/api/reservations');
    expect(errors()).toEqual(['Unesite naziv firme.', 'Unesite adresu firme.', 'Unesite poreski identifikacioni broj.']);
    await click($$('input[formcontrolname=invoiceNeeded]')[0]);
    expect($('[formcontrolname=name]')).toBeNull();
    await click('button[type=submit]');
    http.expectOne('/api/reservations').flush({ ok: true, reservationNumber: '27001', guestMailSent: false });
  });

  it('polje „Drugo" za izvor prijave', async () => {
    await open();
    expect($('[formcontrolname=sourceOther]')).toBeNull();
    await choose('[formcontrolname=source]', 6);
    expect($('[formcontrolname=sourceOther]')).toBeTruthy();
  });

  it('šalje ispravnu rezervaciju jednom, sa ishranom posebno, i prikazuje broj rezervacije', async () => {
    await open();
    await fillValid();
    await type('[formcontrolname=diet]', 'Jedna osoba bez glutena.');
    await type('[formcontrolname=note]', 'Kupujem i za sestru, Maju Anić.');
    await click('button[type=submit]');
    await click('button[type=submit]'); // drugi klik dok se šalje
    const req = http.expectOne('/api/reservations');
    const body = req.request.body as ReservationPayload;
    expect(body).toMatchObject({
      fullName: 'Ana Anić',
      email: 'ana@primer.si',
      phone: '+386 40 123 456',
      tickets: [{ ticketType: 'GALERIJA', count: 2 }],
      invoice: { needed: false },
      diet: 'Jedna osoba bez glutena.',
      note: 'Kupujem i za sestru, Maju Anić.',
      source: 'DRUSTVENE_MREZE',
      sourceOther: '',
      locale: 'sr',
      website: '',
    });
    expect(body).not.toHaveProperty('guests');
    expect(body.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect($<HTMLButtonElement>('button[type=submit]').disabled).toBe(true);
    expect($('button[type=submit]').textContent).toContain('Slanje rezervacije…');

    req.flush({ ok: true, reservationNumber: '27001', guestMailSent: true });
    await render();
    expect($('form')).toBeNull();
    expect($('.number__value').textContent).toBe('27001');
    expect(el.textContent).toContain('Javićemo vam se u roku od 3 dana sa detaljima za uplatu.');
    expect(el.textContent).toContain('Sretenjski bal 27001');
    expect($('.summary').textContent).toContain('Galerija');
    expect($('.summary').textContent).toContain('2');
    expect(el.textContent).toContain('ana@primer.si');
  });

  it('posle privremene greške podaci ostaju, a ponovno slanje koristi isti requestId', async () => {
    await open();
    await fillValid();
    await click('button[type=submit]');
    const first = http.expectOne('/api/reservations');
    first.flush({ code: 'UNAVAILABLE' }, { status: 503, statusText: 'Unavailable' });
    await render();
    expect($('.server-error').textContent).toContain('Rezervacija nije sačuvana');
    expect($('form')).toBeTruthy();
    expect($('[formcontrolname=fullName]').value).toBe('Ana Anić');
    expect(count().value).toBe('2');

    await click('button[type=submit]');
    const second = http.expectOne('/api/reservations');
    expect(second.request.body.requestId).toBe(first.request.body.requestId);
    second.flush({ ok: true, reservationNumber: '27001', guestMailSent: false });
    await render();
    expect($('.number__value').textContent).toBe('27001');
  });

  it('mrežna greška (backend nedostupan) ne prikazuje uspeh', async () => {
    await open();
    await fillValid();
    await click('button[type=submit]');
    http.expectOne('/api/reservations').error(new ProgressEvent('error'));
    await render();
    expect($('.number__value')).toBeNull();
    expect($('.server-error').textContent).toContain('Rezervacija nije sačuvana');
  });

  it('kad se rezervacije zatvore u međuvremenu, prikazuje jasnu poruku', async () => {
    await open();
    await fillValid();
    await click('button[type=submit]');
    http.expectOne('/api/reservations').flush({ code: 'BOOKING_CLOSED' }, { status: 409, statusText: 'Conflict' });
    await render();
    expect(el.textContent).toContain('Rezervacije trenutno nisu dostupne.');
    expect(el.textContent).toContain('vaša rezervacija nije evidentirana');
  });
});

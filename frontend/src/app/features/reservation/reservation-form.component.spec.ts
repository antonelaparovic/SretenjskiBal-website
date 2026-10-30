import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { APPS_SCRIPT_URL } from '../../core/config/app.constants';
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
  /** Zahtev ka Google skripti za datu akciju (status, create). */
  const script = (action: string) =>
    http.expectOne((r) => r.url === APPS_SCRIPT_URL && r.method === 'POST' && JSON.parse(r.body).action === action);
  const noScript = (action: string) =>
    http.expectNone((r) => r.url === APPS_SCRIPT_URL && JSON.parse(r.body).action === action);
  const reservationOf = (req: { request: { body: string } }) => JSON.parse(req.request.body).reservation as ReservationPayload;
  /** Lažni Cloudflare Turnstile: odmah daje token (ili ne, za test čekanja). */
  let captchaToken: string | null = 'test-token';
  const errors = () => $$('.field__error').map((e) => e.textContent!.trim());

  async function open(status: object = { open: true }) {
    await render();
    script('status').flush({ ok: true, ...status });
    await render();
  }

  async function fillValid() {
    await type('[formcontrolname=firstName]', 'Ana');
    await type('[formcontrolname=lastName]', 'Anić');
    await type('[formcontrolname=email]', 'ana@primer.si');
    await type('[formcontrolname=phone]', '+386 40 123 456');
    await click(ticketRadios()[1]); // Galerija
    await type(count(), '2');
    await type('.guest [formcontrolname=firstName]', 'Maja');
    await type('.guest [formcontrolname=lastName]', 'Anić');
    await type('.guest [formcontrolname=email]', 'maja@primer.si');
    await type('.guest [formcontrolname=phone]', '+386 41 222 333');
    await choose('[formcontrolname=source]', 2); // Društvene mreže
  }

  beforeEach(() => {
    captchaToken = 'test-token';
    // Kao pravi Turnstile: token stiže posle render() i ponovo posle svakog reset().
    let issue = () => {};
    window.turnstile = {
      render: (_el, opts) => {
        issue = () => captchaToken && (opts['callback'] as (t: string) => void)(captchaToken);
        issue();
        return 'widget-1';
      },
      reset: () => issue(),
      remove: () => {},
    };
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
    expect($('.guests')).toBeNull();
    expect(el.textContent).toContain('Ulaznice glase na Vaše ime.');
    expect(el.textContent).toContain('Sva polja su obavezna, osim označenih kao opciona.');
    expect($('a[href="/privacy"]')).toBeTruthy();
  });

  it('kad su rezervacije zatvorene nema forme', async () => {
    await open({ open: false });
    expect($('form')).toBeNull();
    expect(el.textContent).toContain('Rezervacije trenutno nisu dostupne.');
  });

  it('kad backend nije dostupan nudi ponovni pokušaj', async () => {
    await render();
    script('status').error(new ProgressEvent('error'));
    await render();
    expect($('form')).toBeNull();
    await click('.notice button');
    script('status').flush({ ok: true, open: true });
    await render();
    expect($('form')).toBeTruthy();
  });

  it('broj ulaznica: dugmad − / +, bez gornjeg ograničenja u prodaji', async () => {
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

  it('dva tipa ulaznica kao kartice sa cenom', async () => {
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
    noScript('create');
    expect(errors()).toEqual([
      'Unesite ime.',
      'Unesite prezime.',
      'Unesite ispravnu email adresu.',
      'Unesite broj telefona, npr. +386 40 123 456.',
      'Izaberite tip ulaznice.',
      'Unesite broj ulaznica (ceo broj, najmanje 1).',
      'Izaberite jednu od ponuđenih mogućnosti.',
    ]);
    expect($('[formcontrolname=firstName]').getAttribute('aria-invalid')).toBe('true');
  });

  it('za svaku ulaznicu preko prve traži ime i prezime gosta', async () => {
    await open();
    await type(count(), '3');
    expect($$('.guest').length).toBe(2);
    await click('button[type=submit]');
    expect(errors().filter((e) => e === 'Unesite ime gosta.').length).toBe(2);
    await type(count(), '2');
    expect($$('.guest').length).toBe(1);
    await type(count(), '1');
    expect($('.guests')).toBeNull();
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
    noScript('create');
    expect(errors()).toEqual(['Unesite naziv firme.', 'Unesite adresu firme.', 'Unesite poreski identifikacioni broj.', 'Izaberite jednu od ponuđenih mogućnosti.']);
    await click($$('input[formcontrolname=invoiceNeeded]')[0]);
    expect($('[formcontrolname=name]')).toBeNull();
    await click('button[type=submit]');
    script('create').flush({ ok: true, reservationNumber: '27001', guestMailSent: false });
  });

  it('ishrana bez izričite saglasnosti se ne šalje; bez ishrane saglasnost nije potrebna', async () => {
    await open();
    await fillValid();
    expect($('input[formcontrolname=dietConsent]')).toBeNull();
    await type('[formcontrolname=diet]', 'Bez glutena');
    expect($('input[formcontrolname=dietConsent]')).toBeTruthy();
    await click('button[type=submit]');
    noScript('create');
    expect(errors()).toContain('Bez saglasnosti ne možemo da primimo podatke o ishrani — uklonite ih ili potvrdite saglasnost.');
  });

  it('polje „Drugo" za izvor prijave', async () => {
    await open();
    expect($('[formcontrolname=sourceOther]')).toBeNull();
    await choose('[formcontrolname=source]', 3);
    expect($('[formcontrolname=sourceOther]')).toBeTruthy();
  });

  it('šalje ispravnu rezervaciju jednom, sa ishranom posebno, i prikazuje broj rezervacije', async () => {
    await open();
    await fillValid();
    await type('[formcontrolname=diet]', 'Jedna osoba bez glutena.');
    await click('input[formcontrolname=dietConsent]');
    await type('[formcontrolname=note]', 'Kupujem i za sestru, Maju Anić.');
    await click('button[type=submit]');
    await click('button[type=submit]'); // drugi klik dok se šalje
    const req = script('create');
    expect(req.request.headers.get('Content-Type')).toBe('text/plain;charset=utf-8');
    expect(JSON.parse(req.request.body).captcha).toBe('test-token');
    const body = reservationOf(req);
    expect(body).toMatchObject({
      fullName: 'Ana Anić',
      email: 'ana@primer.si',
      phone: '+386 40 123 456',
      tickets: [{ ticketType: 'GALERIJA', count: 2 }],
      invoice: { needed: false },
      diet: 'Jedna osoba bez glutena.',
      dietConsent: true,
      privacyPolicyVersion: '2026-10-28',
      note: 'Kupujem i za sestru, Maju Anić.',
      source: 'DRUSTVENE_MREZE',
      sourceOther: '',
      locale: 'sr',
      website: '',
    });
    expect(body.guests).toEqual([{ firstName: 'Maja', lastName: 'Anić', email: 'maja@primer.si', phone: '+386 41 222 333' }]);
    expect(body.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect($<HTMLButtonElement>('button[type=submit]').disabled).toBe(true);
    expect($('button[type=submit]').textContent).toContain('Slanje rezervacije…');

    req.flush({ ok: true, reservationNumber: '27001', guestMailSent: true });
    await render();
    expect($('form')).toBeNull();
    expect($('.number__value').textContent).toBe('27001');
    expect(el.textContent).toContain('Javićemo Vam se u roku od 3 dana sa detaljima za uplatu.');
    expect(el.textContent).not.toContain('svrsi uplate');
    expect($('.summary').textContent).toContain('Galerija');
    expect($('.summary').textContent).toContain('2');
    expect(el.textContent).toContain('ana@primer.si');
  });

  it('posle privremene greške podaci ostaju, a ponovno slanje koristi isti requestId', async () => {
    await open();
    await fillValid();
    await click('button[type=submit]');
    const first = script('create');
    first.flush({ ok: false, code: 'SERVER_ERROR' });
    await render();
    expect($('.server-error').textContent).toContain('Rezervacija nije sačuvana');
    expect($('form')).toBeTruthy();
    expect($('[formcontrolname=firstName]').value).toBe('Ana');
    expect($('[formcontrolname=lastName]').value).toBe('Anić');
    expect(count().value).toBe('2');

    await click('button[type=submit]');
    const second = script('create');
    expect(reservationOf(second).requestId).toBe(reservationOf(first).requestId);
    second.flush({ ok: true, reservationNumber: '27001', guestMailSent: false });
    await render();
    expect($('.number__value').textContent).toBe('27001');
  });

  it('mrežna greška (backend nedostupan) ne prikazuje uspeh', async () => {
    await open();
    await fillValid();
    await click('button[type=submit]');
    script('create').error(new ProgressEvent('error'));
    await render();
    expect($('.number__value')).toBeNull();
    expect($('.server-error').textContent).toContain('Rezervacija nije sačuvana');
  });

  it('kad se rezervacije zatvore u međuvremenu, prikazuje jasnu poruku', async () => {
    await open();
    await fillValid();
    await click('button[type=submit]');
    script('create').flush({ ok: false, code: 'BOOKING_CLOSED' });
    await render();
    expect(el.textContent).toContain('Rezervacije trenutno nisu dostupne.');
    expect(el.textContent).toContain('Vaša rezervacija nije evidentirana');
  });

  it('bez Turnstile tokena ne šalje i objašnjava da sačeka', async () => {
    captchaToken = null;
    await open();
    await fillValid();
    await click('button[type=submit]');
    noScript('create');
    expect($('.server-error').textContent).toContain('proveravamo da niste robot');
  });

  it('neuspela Turnstile provera i gužva: jasne poruke, podaci ostaju', async () => {
    await open();
    await fillValid();
    await click('button[type=submit]');
    script('create').flush({ ok: false, code: 'CAPTCHA_FAILED' });
    await render();
    expect($('.server-error').textContent).toContain('Provera da niste robot nije prošla');
    await click('button[type=submit]');
    script('create').flush({ ok: false, code: 'BUSY' });
    await render();
    expect($('.server-error').textContent).toContain('velika gužva');
    expect($('[formcontrolname=firstName]').value).toBe('Ana');
    expect($('[formcontrolname=lastName]').value).toBe('Anić');
  });
});

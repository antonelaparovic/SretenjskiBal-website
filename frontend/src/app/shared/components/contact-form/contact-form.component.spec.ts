import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { APPS_SCRIPT_URL, TURNSTILE_TEST_SITE_KEY } from '../../../core/config/app.constants';
import { turnstileSiteKey } from '../turnstile/turnstile.component';
import { ContactFormComponent } from './contact-form.component';

describe('ContactFormComponent', () => {
  let fixture: ComponentFixture<ContactFormComponent>;
  let http: HttpTestingController;
  let el: HTMLElement;

  const $ = <T extends Element = HTMLInputElement>(sel: string) => el.querySelector<T>(sel)!;
  const render = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const type = async (sel: string, value: string) => {
    const input = $(sel);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await render();
  };
  const contactReq = () =>
    http.expectOne((r) => r.url === APPS_SCRIPT_URL && JSON.parse(r.body).action === 'contact');

  async function fill() {
    await render();
    await type('[formcontrolname=firstName]', 'Marko');
    await type('[formcontrolname=lastName]', 'Marković');
    await type('[formcontrolname=email]', 'marko@primer.si');
    await type('[formcontrolname=message]', 'Zanima nas partnerstvo na balu.');
    $('[formcontrolname=consent]').click();
    await render();
  }

  beforeEach(() => {
    let issue = () => {};
    window.turnstile = {
      render: (_el, opts) => {
        issue = () => (opts['callback'] as (t: string) => void)('test-token');
        issue();
        return 'w';
      },
      reset: () => issue(),
      remove: () => {},
    };
    TestBed.configureTestingModule({
      imports: [ContactFormComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(ContactFormComponent);
    http = TestBed.inject(HttpTestingController);
    el = fixture.nativeElement;
  });

  afterEach(() => http.verify());

  it('šalje poruku direktno Google skripti, sa Turnstile tokenom', async () => {
    await fill();
    $<HTMLButtonElement>('button[type=submit]').click();
    await render();
    const req = contactReq();
    const body = JSON.parse(req.request.body);
    expect(body.captcha).toBe('test-token');
    expect(body.contact).toMatchObject({ firstName: 'Marko', lastName: 'Marković', email: 'marko@primer.si', topic: 'OPSTE', consent: true, website: '' });
    req.flush({ ok: true });
    await render();
    expect(el.textContent).toContain('Hvala na poruci.');
  });

  it('greška skripte ili mreže: poruka nije poslata, forma ostaje', async () => {
    await fill();
    $<HTMLButtonElement>('button[type=submit]').click();
    await render();
    contactReq().flush({ ok: false, code: 'SERVER_ERROR' });
    await render();
    expect($('.server-error').textContent).toContain('Poruka trenutno nije poslata');
    $<HTMLButtonElement>('button[type=submit]').click();
    await render();
    contactReq().error(new ProgressEvent('error'));
    await render();
    expect($('.server-error').textContent).toContain('Poruka trenutno nije poslata');
    expect($('[formcontrolname=firstName]').value).toBe('Marko');
  });

  it('lokalno i dok pravi ključ nije upisan koristi se Cloudflareov probni ključ', () => {
    expect(turnstileSiteKey('localhost')).toBe(TURNSTILE_TEST_SITE_KEY);
    expect(turnstileSiteKey('sretenjskibal.si')).toBe(TURNSTILE_TEST_SITE_KEY); // TURNSTILE_SITE_KEY je još prazan
  });
});

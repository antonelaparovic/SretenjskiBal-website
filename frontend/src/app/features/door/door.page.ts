import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Meta, Title } from '@angular/platform-browser';
import { CheckinResult } from '../../core/models/content.models';
import { FormsApiService, ScriptError } from '../../core/services/forms-api.service';

const STORAGE_KEY = 'sb-ulaz';
/** Posle uspešnog ulaza ekran se sam vraća na skeniranje. */
const OK_AUTO_CLOSE_MS = 2500;
/** Isti kod se ne šalje ponovo dok ne prođe ovoliko (kamera ga vidi više puta u sekundi). */
const SAME_CODE_PAUSE_MS = 15000;

type View = 'login' | 'scan';

interface Shown {
  kind: 'ok' | 'warn' | 'bad' | 'error';
  title: string;
  lines: string[];
}

/**
 * Skeniranje ulaznica na ulazu (samo za ljude na ulazu; nije u meniju i ne indeksira se).
 * PIN je u tabeli (Podešavanja → SCANNER_PIN); svaka provera ide u Google skriptu, koja upisuje vreme ulaska
 * u tab „Ulaznice", pa dva telefona mogu da skeniraju istovremeno bez duplog ulaza.
 * Tekstovi su samo na srpskom — stranicu koristi tim.
 */
@Component({
  selector: 'app-door-page',
  imports: [FormsModule],
  template: `
    <div class="door">
      @if (view() === 'login') {
        <form class="login" (ngSubmit)="login()">
          <img src="/brand/emblem.svg" alt="" width="384" height="275" class="logo" />
          <h1 class="title">Ulaz · skeniranje ulaznica</h1>
          <label class="field">
            <span class="field__label">PIN</span>
            <input class="field__control" name="pin" [(ngModel)]="pin" inputmode="numeric" autocomplete="off" required />
          </label>
          <label class="field">
            <span class="field__label">Ime ili mesto skeniranja</span>
            <input class="field__control" name="device" [(ngModel)]="device" placeholder="npr. Ulaz 1 — Marko" maxlength="40" />
          </label>
          @if (loginError()) { <p class="err" role="alert">{{ loginError() }}</p> }
          <button class="btn btn--primary" type="submit" [disabled]="busy()">{{ busy() ? 'Proveravam…' : 'Počni skeniranje' }}</button>
        </form>
      } @else {
        <header class="bar">
          <span class="count">Ušlo <strong>{{ stats().entered }}</strong> / {{ stats().total }}</span>
          <button type="button" class="link" (click)="logout()">Odjava</button>
        </header>

        <div class="camera">
          <video #video playsinline muted></video>
          <div class="aim" aria-hidden="true"></div>
          @if (cameraError()) { <p class="camera__msg">{{ cameraError() }}</p> }
        </div>

        <form class="manual" (ngSubmit)="checkManual()">
          <input class="field__control" name="manual" [(ngModel)]="manual" placeholder="Kod sa ulaznice, npr. 27006-2-K7QH3M9P" autocomplete="off" autocapitalize="characters" />
          <button class="btn btn--outline" type="submit" [disabled]="!manual.trim()">Proveri</button>
        </form>

        @if (busy()) {
          <div class="result result--busy" role="status"><p class="result__title">Proveravam…</p></div>
        } @else if (shown(); as s) {
          <button type="button" class="result" [class]="'result result--' + s.kind" (click)="next()" role="alert">
            <span class="result__title">{{ s.title }}</span>
            @for (l of s.lines; track $index) { <span class="result__line">{{ l }}</span> }
            <span class="result__next">Dodirnite za sledeći</span>
          </button>
        }
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .door { min-height: 100svh; display: flex; flex-direction: column; background: var(--c-wine); color: var(--c-ivory); }
    .login { display: flex; flex-direction: column; gap: 1.25rem; width: min(100% - 2rem, 24rem); margin: auto; padding: 3rem 0; }
    .logo { width: 88px; height: auto; align-self: center; }
    .title { margin: 0 0 0.5rem; text-align: center; font-family: var(--font-display); font-weight: 400; font-size: 1.75rem; }
    .field { display: flex; flex-direction: column; gap: 0.35rem; }
    .field__label { font-size: 0.6875rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--c-brass); }
    .field__control {
      min-height: 48px; padding: 0.7rem 0.85rem; border: 1px solid rgba(180, 154, 99, 0.5); border-radius: 0;
      background: rgba(0, 0, 0, 0.2); color: var(--c-ivory); font-size: 1.0625rem;
    }
    .field__control:focus-visible { outline: 2px solid var(--c-brass); outline-offset: 1px; }
    .err { margin: 0; color: #ff9a8a; }
    .btn--primary { background: var(--c-brass); color: var(--c-wine); }
    .btn--outline { border: 1px solid var(--c-brass); color: var(--c-ivory); background: transparent; }

    .bar { display: flex; justify-content: space-between; align-items: center; padding: 0.85rem 1rem; border-bottom: 1px solid rgba(180, 154, 99, 0.35); }
    .count { font-size: 1.0625rem; }
    .count strong { font-size: 1.375rem; color: #e3cf9c; }
    .link { background: none; border: 0; color: var(--c-brass); text-decoration: underline; font-size: 0.9375rem; cursor: pointer; }
    .camera { position: relative; flex: 1; min-height: 50svh; background: #000; overflow: hidden; }
    video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    .aim { position: absolute; left: 50%; top: 50%; width: min(64vw, 18rem); aspect-ratio: 1; transform: translate(-50%, -50%); border: 2px solid rgba(227, 207, 156, 0.85); box-shadow: 0 0 0 100vmax rgba(0, 0, 0, 0.35); }
    .camera__msg { position: absolute; inset: auto 1rem 1rem; margin: 0; padding: 0.85rem 1rem; background: rgba(0, 0, 0, 0.7); }
    .manual { display: flex; gap: 0.5rem; padding: 0.85rem 1rem calc(0.85rem + env(safe-area-inset-bottom)); }
    .manual .field__control { flex: 1; min-width: 0; font-size: 0.9375rem; }

    .result {
      position: fixed; inset: 0; z-index: 10; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem;
      width: 100%; padding: 2rem 1.5rem; border: 0; text-align: center; color: #fff; font: inherit; cursor: pointer;
    }
    .result--busy { background: rgba(30, 10, 14, 0.85); cursor: default; }
    .result--ok { background: #1f7a3d; }
    .result--warn { background: #b26a00; }
    .result--bad { background: #a3241b; }
    .result--error { background: #3b3b3b; }
    .result__title { margin: 0; font-size: clamp(1.75rem, 8vw, 2.75rem); font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; line-height: 1.1; }
    .result__line { font-size: clamp(1.125rem, 5vw, 1.5rem); }
    .result__line:first-of-type { font-weight: 600; font-size: clamp(1.375rem, 6.5vw, 2rem); }
    .result__next { margin-top: 1.5rem; font-size: 0.9375rem; opacity: 0.8; text-decoration: underline; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DoorPage {
  private readonly api = inject(FormsApiService);
  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');

  protected readonly view = signal<View>('login');
  protected readonly busy = signal(false);
  protected readonly loginError = signal('');
  protected readonly cameraError = signal('');
  protected readonly shown = signal<Shown | null>(null);
  protected readonly stats = signal({ entered: 0, total: 0 });
  protected pin = '';
  protected device = '';
  protected manual = '';

  private stream: MediaStream | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private autoClose: ReturnType<typeof setTimeout> | null = null;
  private lastCode = '';
  private lastCodeAt = 0;
  private decode: ((data: Uint8ClampedArray, w: number, h: number) => { data: string } | null) | null = null;

  constructor() {
    inject(Title).setTitle('Ulaz | Sretenjski bal');
    inject(Meta).updateTag({ name: 'robots', content: 'noindex, nofollow' });
    inject(DestroyRef).onDestroy(() => this.stopCamera());
    afterNextRender(() => {
      const saved = readSaved();
      if (saved) {
        this.pin = saved.pin;
        this.device = saved.device;
        this.login();
      }
    });
  }

  protected login(): void {
    if (!this.pin.trim() || this.busy()) return;
    this.busy.set(true);
    this.loginError.set('');
    this.api.checkin(this.pin.trim(), this.device.trim()).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.stats.set(r.stats);
        save({ pin: this.pin.trim(), device: this.device.trim() });
        this.view.set('scan');
        setTimeout(() => this.startCamera());
      },
      error: (e) => {
        this.busy.set(false);
        this.loginError.set(errorText(e));
        if (e instanceof ScriptError && e.code === 'BAD_PIN') forget();
      },
    });
  }

  protected logout(): void {
    forget();
    this.stopCamera();
    this.pin = '';
    this.shown.set(null);
    this.view.set('login');
  }

  protected checkManual(): void {
    const code = this.manual.trim();
    if (code) this.check(code);
  }

  protected next(): void {
    if (this.autoClose) clearTimeout(this.autoClose);
    this.shown.set(null);
    this.manual = '';
  }

  private check(code: string): void {
    if (this.busy()) return;
    this.lastCode = code;
    this.lastCodeAt = Date.now();
    this.busy.set(true);
    this.api.checkin(this.pin.trim(), this.device.trim(), code).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.stats.set(r.stats);
        this.show(describe(r));
      },
      error: (e) => {
        this.busy.set(false);
        if (e instanceof ScriptError && e.code === 'BAD_PIN') {
          this.logout();
          this.loginError.set('PIN je promenjen. Prijavite se ponovo.');
          return;
        }
        this.show({ kind: 'error', title: 'Provera nije uspela', lines: [errorText(e), 'Pokušajte ponovo ili proverite gosta na odštampanom spisku.'] });
      },
    });
  }

  private show(s: Shown): void {
    this.shown.set(s);
    navigator.vibrate?.(s.kind === 'ok' ? 80 : [200, 100, 200]);
    if (s.kind === 'ok') this.autoClose = setTimeout(() => this.next(), OK_AUTO_CLOSE_MS);
  }

  private async startCamera(): Promise<void> {
    this.cameraError.set('');
    try {
      const [{ default: jsQR }, stream] = await Promise.all([
        import('jsqr'),
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false }),
      ]);
      this.decode = (d, w, h) => jsQR(d, w, h, { inversionAttempts: 'dontInvert' });
      this.stream = stream;
      const video = this.video()?.nativeElement;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      this.loop();
    } catch {
      this.cameraError.set('Kamera nije dostupna. Dozvolite pristup kameri u browseru (ikonica pored adrese), ili unesite kod ručno ispod.');
    }
  }

  private stopCamera(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  private readonly canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;

  private loop(): void {
    this.timer = setTimeout(() => this.loop(), 150);
    const video = this.video()?.nativeElement;
    if (!video || !this.canvas || !this.decode || this.busy() || this.shown() || video.readyState < 2) return;
    const w = 640;
    const h = Math.round((video.videoHeight / video.videoWidth) * w) || 480;
    this.canvas.width = w;
    this.canvas.height = h;
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const found = this.decode(ctx.getImageData(0, 0, w, h).data, w, h);
    if (!found?.data) return;
    if (found.data === this.lastCode && Date.now() - this.lastCodeAt < SAME_CODE_PAUSE_MS) return;
    this.check(found.data);
  }
}

function describe(r: CheckinResult): Shown {
  const who = [r.name, [r.type, r.number ? `rezervacija ${r.number}` : ''].filter(Boolean).join(' · ')].filter(Boolean) as string[];
  switch (r.result) {
    case 'OK':
      return { kind: 'ok', title: 'Ulaz odobren', lines: who };
    case 'USED':
      return { kind: 'warn', title: 'Već iskorišćena', lines: [...who, `Ušao/la u ${r.enteredAt}${r.scannedBy ? ` (${r.scannedBy})` : ''}`] };
    case 'NOT_PAID':
      return { kind: 'bad', title: 'Rezervacija nije plaćena', lines: [...who, `Status u tabeli: ${r.status}`] };
    case 'UNKNOWN':
      return { kind: 'bad', title: 'Ulaznica nije izdata', lines: [`Kod ${r.code}`, 'Proverite rezervaciju u tabeli.'] };
    default:
      return { kind: 'bad', title: 'Nevažeća ulaznica', lines: ['Ovo nije ulaznica za Sretenjski bal ili je kod izmenjen.'] };
  }
}

function errorText(e: unknown): string {
  const code = e instanceof ScriptError ? e.code : 'NETWORK';
  switch (code) {
    case 'BAD_PIN':
      return 'Pogrešan PIN.';
    case 'LOCKED':
      return 'Previše pogrešnih pokušaja. Sačekajte 10 minuta.';
    case 'SCANNER_OFF':
      return 'Skeniranje nije uključeno: u tabeli (Podešavanja) nije upisan SCANNER_PIN.';
    case 'BUSY':
      return 'Tabela je trenutno zauzeta.';
    case 'NETWORK':
      return 'Nema veze sa serverom. Proverite internet.';
    default:
      return 'Greška na serveru.';
  }
}

function readSaved(): { pin: string; device: string } | null {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    return v && typeof v.pin === 'string' ? { pin: v.pin, device: String(v.device ?? '') } : null;
  } catch {
    return null;
  }
}

function save(v: { pin: string; device: string }): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch {
    /* privatni prozor — PIN se samo ne pamti */
  }
}

function forget(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ništa */
  }
}

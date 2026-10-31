import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  output,
  viewChild,
} from '@angular/core';
import { TURNSTILE_SITE_KEY, TURNSTILE_TEST_SITE_KEY } from '../../../core/config/app.constants';
import { currentLocale } from '../../../core/i18n/locale';

interface TurnstileApi {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId?: string): void;
  remove(widgetId?: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let loading: Promise<TurnstileApi> | null = null;

/** Učitava Cloudflare skriptu jednom za ceo sajt. */
function loadTurnstile(doc: Document): Promise<TurnstileApi> {
  const win = doc.defaultView as Window;
  if (win.turnstile) return Promise.resolve(win.turnstile);
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = doc.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => (win.turnstile ? resolve(win.turnstile) : reject(new Error('Turnstile nije učitan.')));
    script.onerror = () => {
      loading = null;
      reject(new Error('Turnstile nije učitan.'));
    };
    doc.head.appendChild(script);
  });
  return loading;
}

/** Javni ključ: pravi na sajtu, Cloudflareov probni lokalno i dok pravi nije upisan. */
export function turnstileSiteKey(hostname: string): string {
  const local = hostname === 'localhost' || hostname === '127.0.0.1';
  return TURNSTILE_SITE_KEY && !local ? TURNSTILE_SITE_KEY : TURNSTILE_TEST_SITE_KEY;
}

/**
 * Cloudflare Turnstile — provera „da li je čovek". Uglavnom je nevidljiva; okvir se pojavi samo kad
 * Cloudflare traži potvrdu. Svaki token važi za jedno slanje, pa forma posle slanja zove reset().
 */
@Component({
  selector: 'app-turnstile',
  template: `<div #box class="box"></div>`,
  styles: `:host { display: block; } .box:empty { display: none; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TurnstileComponent {
  /** Token za slanje, ili null dok ga nema (ili kad istekne). */
  readonly token = output<string | null>();
  /** Cloudflare skripta nije mogla da se učita (npr. blokator reklama, nema mreže). */
  readonly failed = output<void>();

  private readonly doc = inject(DOCUMENT);
  private readonly box = viewChild.required<ElementRef<HTMLElement>>('box');
  private readonly locale = currentLocale();
  private api: TurnstileApi | null = null;
  private widgetId: string | undefined;

  constructor() {
    afterNextRender(() => {
      loadTurnstile(this.doc)
        .then((api) => {
          this.api = api;
          this.widgetId = api.render(this.box().nativeElement, {
            sitekey: turnstileSiteKey(this.doc.location.hostname),
            appearance: 'interaction-only',
            language: this.locale,
            callback: (t: string) => this.token.emit(t),
            'expired-callback': () => this.reset(),
            'error-callback': () => this.token.emit(null),
          });
        })
        .catch(() => this.failed.emit());
    });
    inject(DestroyRef).onDestroy(() => this.api?.remove(this.widgetId));
  }

  /** Novi token (posle svakog slanja ili kad stari istekne). */
  reset(): void {
    this.token.emit(null);
    this.api?.reset(this.widgetId);
  }
}

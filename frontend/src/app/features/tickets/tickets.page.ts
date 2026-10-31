import { ChangeDetectionStrategy, Component, afterNextRender, inject, signal } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';
import { QrPath, qrPath } from '../../shared/qr/qr-path';

/** Početak sadržaja QR koda — isti kao u Google skripti (TICKET_QR_PREFIX). */
const QR_PREFIX = 'SB:';

interface Ticket {
  code: string;
  name: string;
  type: string;
  index: number;
  count: number;
  qr: QrPath;
}

/** Nazivi tipova ulaznica kako stižu iz tabele (srpski) → tekst na ulaznici u jeziku stranice. */
const TYPE_LABELS: Record<string, string> = {
  Svečana: $localize`Svečana ulaznica`,
  Galerija: $localize`Galerija`,
};

/**
 * Ulaznice iz mejla „Vaše ulaznice", u izgledu štampane karte — za čuvanje na telefonu ili štampu (A6, jedna po strani).
 * Podaci su u delu adrese posle „#" (base64url JSON { r, t: [[kod, ime, tip], …] }) i ne šalju se serveru;
 * na ulazu se svaki QR kod svejedno proverava u tabeli, pa izmenjen link ne daje važeću ulaznicu.
 */
@Component({
  selector: 'app-tickets-page',
  imports: [RouterLink],
  template: `
    <section class="page section bg-parchment paper">
      <div class="container">
        @switch (state()) {
          @case ('ready') {
            <header class="intro no-print">
              <p class="label eyebrow" i18n>Rezervacija {{ number() }}</p>
              <h1 class="h1" i18n>Vaše ulaznice</h1>
              <p class="lead" i18n>Na ulazu pokažite QR kod, sa telefona ili odštampan. Svaki kod važi za jedan ulazak.</p>
              <button type="button" class="btn btn--primary" (click)="print()" i18n>Sačuvaj kao PDF ili štampaj</button>
            </header>

            <div class="tickets">
              @for (t of tickets(); track t.code) {
                <article class="ticket" [attr.aria-label]="t.name">
                  <svg class="frame" viewBox="0 0 105 148" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M14.6 6.1H90.4L98.9 14.6V133.4L90.4 141.9H14.6L6.1 133.4V14.6Z" />
                    <rect x="8.6" y="8.8" width="88" height="130.4" />
                  </svg>
                  <div class="inner">
                    <img class="logo" src="/brand/emblem.svg" alt="" width="384" height="275" />
                    <p class="title"><span i18n>Prvi</span><br /><span>Sretenjski bal</span></p>
                    <p class="place" i18n>Narodni dom, Maribor</p>
                    <p class="date" i18n>subota, 13. februar 2027.</p>
                    <p class="stars" aria-hidden="true"><span>★</span><span class="big">★</span><span>★</span></p>
                    <p class="no" i18n>Ulaznica {{ t.index }} od {{ t.count }}</p>
                    <p class="name">{{ t.name }}</p>
                    @if (t.type) { <p class="type">{{ t.type }}</p> }
                    <svg class="qr" [attr.viewBox]="'-2 -2 ' + (t.qr.size + 4) + ' ' + (t.qr.size + 4)" role="img"
                      [attr.aria-label]="'QR ' + t.code" shape-rendering="crispEdges">
                      <rect x="-2" y="-2" width="100%" height="100%" fill="#fff" />
                      <path [attr.d]="t.qr.d" />
                    </svg>
                    <p class="code">{{ t.code }}</p>
                    <p class="tagline" i18n>Kultura koja spaja.</p>
                  </div>
                </article>
              }
            </div>
          }
          @case ('invalid') {
            <div class="intro">
              <h1 class="h1" i18n>Ulaznice nisu pronađene</h1>
              <p class="lead" i18n>Link nije potpun. Otvorite ulaznice ponovo preko dugmeta u mejlu „Vaše ulaznice" ili nam pišite.</p>
              <a class="text-link accent" routerLink="/kontakt" i18n>Kontakt</a>
            </div>
          }
          @default {
            <p class="lead" role="status" i18n>Učitavanje ulaznica…</p>
          }
        }
      </div>
    </section>
  `,
  styles: `
    .page { min-height: 80svh; padding-top: calc(var(--header-h) + var(--section-y)); }
    .intro { display: flex; flex-direction: column; align-items: flex-start; gap: 1.25rem; max-width: 40rem; margin-bottom: clamp(2.5rem, 5vw, 4rem); }
    .eyebrow, .accent { color: var(--c-burgundy); }
    .tickets { display: flex; flex-wrap: wrap; justify-content: center; gap: clamp(1.5rem, 4vw, 3rem); }

    /* Ulaznica u razmeri A6 (105 × 148 mm); sve mere su u cqw da bi ista ostala i na ekranu i u štampi. */
    .ticket {
      --gold: #b6842c;
      position: relative;
      width: min(100%, 26rem);
      aspect-ratio: 105 / 148;
      container-type: inline-size;
      background: #fffdf9;
      box-shadow: 0 30px 60px -40px rgba(23, 20, 19, 0.55);
      color: var(--gold);
      font-family: 'Playfair Display', 'Cormorant Garamond', Georgia, serif;
    }
    .frame { position: absolute; inset: 0; width: 100%; height: 100%; fill: none; stroke: #d2b77f; stroke-width: 0.45; }
    .inner {
      position: absolute;
      inset: 9.5% 13% 6.5%;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .inner > * { flex-shrink: 0; margin-bottom: 0; }
    .logo { width: 15cqw; height: auto; }
    .title { margin-top: 3cqw; font-size: 5.6cqw; line-height: 1.15; text-transform: uppercase; letter-spacing: 0.02em; }
    .place { margin-top: 2.6cqw; font-style: italic; font-size: 4.3cqw; line-height: 1.3; }
    .date { margin-top: 0.6cqw; font-size: 3.4cqw; line-height: 1.3; }
    .stars { margin-top: 2.2cqw; display: flex; align-items: center; gap: 2.6cqw; font-size: 2.4cqw; line-height: 1; color: #a7865a; }
    .stars .big { font-size: 3.2cqw; }
    .no { margin-top: 3cqw; font-family: var(--font-body); font-size: 2.2cqw; line-height: 1.4; letter-spacing: 0.24em; text-transform: uppercase; color: #a07a35; }
    .name { margin-top: 1cqw; font-size: 5.2cqw; line-height: 1.2; color: var(--c-burgundy); }
    .type { margin-top: 0.4cqw; font-style: italic; font-size: 3.5cqw; line-height: 1.3; }
    .qr { margin-top: 2.2cqw; width: 34cqw; height: 34cqw; fill: var(--c-burgundy); }
    .code { margin-top: 1.2cqw; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 2.4cqw; line-height: 1.3; letter-spacing: 0.08em; color: #6b5a4a; }
    .tagline { margin-top: auto; font-style: italic; font-size: 3.8cqw; line-height: 1.3; }

    @page { size: 105mm 148mm; margin: 0; }
    @media print {
      .page { padding: 0; min-height: 0; background: none; }
      .page::before, .page::after { display: none; }
      .container { padding: 0; max-width: none; }
      .no-print { display: none !important; }
      .tickets { display: block; }
      .ticket { width: 105mm; height: 148mm; box-shadow: none; break-after: page; page-break-after: always; }
      .ticket:last-child { break-after: auto; page-break-after: auto; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketsPage {
  protected readonly state = signal<'loading' | 'ready' | 'invalid'>('loading');
  protected readonly number = signal('');
  protected readonly tickets = signal<Ticket[]>([]);

  constructor() {
    inject(SeoService).set({
      title: $localize`Vaše ulaznice | Sretenjski bal`,
      description: $localize`Ulaznice za prvi Sretenjski bal sa QR kodom za ulaz.`,
      path: '/ulaznice',
    });
    inject(Meta).updateTag({ name: 'robots', content: 'noindex, nofollow' });
    // Podaci su samo u browseru (deo adrese posle „#"); unapred napravljena stranica ih nema.
    afterNextRender(() => this.load(location.hash.slice(1)));
  }

  protected print(): void {
    window.print();
  }

  private load(hash: string): void {
    const data = decode(hash);
    if (!data) {
      this.state.set('invalid');
      return;
    }
    const count = data.t.length;
    this.number.set(data.r);
    this.tickets.set(
      data.t.map(([code, name, type], i) => ({
        code,
        name,
        type: TYPE_LABELS[type] ?? type,
        index: i + 1,
        count,
        qr: qrPath(QR_PREFIX + code),
      })),
    );
    this.state.set('ready');
  }
}

function decode(hash: string): { r: string; t: [string, string, string][] } | null {
  try {
    const b64 = hash.replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0));
    const data = JSON.parse(new TextDecoder().decode(bytes));
    const ok =
      data &&
      typeof data.r === 'string' &&
      Array.isArray(data.t) &&
      data.t.length > 0 &&
      data.t.length <= 100 &&
      data.t.every((t: unknown) => Array.isArray(t) && t.length === 3 && t.every((v) => typeof v === 'string') && /^[\d]+-\d+-[0-9A-Z]{8}$/.test(t[0] as string));
    return ok ? data : null;
  } catch {
    return null;
  }
}

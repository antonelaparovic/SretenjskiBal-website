import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LEGAL, LEGAL_LANG_LABEL } from '../../core/content/legal-content';
import { Locale, currentLocale } from '../../core/i18n/locale';
import { SeoService } from '../../core/services/seo.service';

/** Pravne stranice (politika privatnosti, kolačići). Tekst je uvek na sva tri jezika, bez obzira na jezik sajta. */
@Component({
  selector: 'app-legal-page',
  imports: [RouterLink],
  template: `
    <section class="page section bg-parchment paper">
      <div class="container body">
        <div class="langs" role="group" i18n-aria-label aria-label="Jezik teksta">
          @for (l of langs; track l) {
            <button type="button" [class.on]="lang() === l" [attr.aria-pressed]="lang() === l" (click)="lang.set(l)">
              {{ label[l] }}
            </button>
          }
        </div>
        <h1>{{ doc().title }}</h1>
        <p class="upd">{{ doc().updated }}</p>
        @for (s of doc().sections; track s.h) {
          <h2>{{ s.h }}</h2>
          @for (t of s.p ?? []; track t) {
            <p>{{ t }}</p>
          }
          @if (s.table; as tb) {
            <div class="tw">
              <table>
                <thead>
                  <tr>
                    @for (h of tb.head; track h) {
                      <th>{{ h }}</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (r of tb.rows; track r[0]) {
                    <tr>
                      @for (c of r; track $index) {
                        <td>{{ c }}</td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
          @if (s.list) {
            <ul>
              @for (i of s.list; track i) {
                <li>{{ i }}</li>
              }
            </ul>
          }
        }
        <p class="back"><a class="text-link" routerLink="/" i18n>Na početnu</a></p>
      </div>
    </section>
  `,
  styles: `
    .page { padding-top: calc(var(--header-h) + var(--section-y)); }
    .body { max-width: 52rem; }
    h1 { font-family: var(--font-display); font-weight: 500; color: var(--c-burgundy); font-size: clamp(2.2rem, 5vw, 3.2rem); margin: 1.5rem 0 .25rem; }
    h2 { font-family: var(--font-display); font-weight: 600; color: var(--c-wine); font-size: 1.5rem; margin: 2.2rem 0 .6rem; }
    p, li { line-height: 1.7; }
    ul { padding-left: 1.4rem; list-style: disc; }
    .upd { opacity: .65; font-size: .9rem; }
    .langs { display: flex; gap: .5rem; flex-wrap: wrap; }
    .langs button { font: inherit; padding: .4rem .9rem; border: 1px solid var(--c-burgundy); background: transparent; color: var(--c-burgundy); cursor: pointer; }
    .langs button.on { background: var(--c-burgundy); color: var(--c-ivory); }
    .tw { overflow-x: auto; margin: 1rem 0; }
    table { border-collapse: collapse; width: 100%; min-width: 34rem; font-size: .95rem; }
    th, td { text-align: left; vertical-align: top; padding: .6rem .75rem; border-bottom: 1px solid rgba(90, 20, 30, .2); }
    th { color: var(--c-burgundy); }
    .back { margin-top: 3rem; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalPage {
  /** Iz route data: 'privacy' | 'cookies'. */
  readonly kind = input<'privacy' | 'cookies'>('privacy');
  protected readonly langs: Locale[] = ['sr', 'sl', 'en'];
  protected readonly label = LEGAL_LANG_LABEL;
  protected readonly lang = signal<Locale>(currentLocale());
  protected readonly doc = computed(() => LEGAL[this.kind()][this.lang()]);

  constructor() {
    const router = inject(Router);
    const seo = inject(SeoService);
    queueMicrotask(() =>
      seo.set({
        title: `${this.doc().title} | Sretenjski bal 2027`,
        description: $localize`Sretenjski bal, 13. februara 2027. u Mariboru.`,
        path: router.url.split(/[?#]/)[0],
      }),
    );
  }
}

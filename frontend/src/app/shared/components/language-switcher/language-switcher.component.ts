import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { LOCALES, currentLocale } from '../../../core/i18n/locale';

@Component({
  selector: 'app-language-switcher',
  template: `
    <ul class="langs" i18n-aria-label aria-label="Jezik">
      @for (l of locales; track l.code) {
        <li>
          @if (l.code === active) {
            <span class="lang is-active" aria-current="true">{{ l.label }}</span>
          } @else if (l.available) {
            <a class="lang" [href]="href(l.path)" [attr.hreflang]="l.code">{{ l.label }}</a>
          } @else {
            <span class="lang is-soon" title="—">{{ l.label }}</span>
          }
        </li>
      }
    </ul>
  `,
  styles: `
    .langs { display: flex; gap: 0.25rem; font-size: 0.75rem; letter-spacing: 0.14em; }
    li + li::before { content: '/'; margin-right: 0.25rem; opacity: 0.5; }
    .lang { display: inline-block; padding: 0.25rem 0; }
    .is-soon { opacity: 0.5; cursor: default; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSwitcherComponent {
  protected readonly locales = LOCALES;
  protected readonly active = currentLocale();
  private readonly router = inject(Router);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** Ista stranica u drugom jeziku (npr. /rezervacija → /sl/rezervacija). */
  protected href(localePath: string): string {
    const rest = this.url().replace(/^\//, '');
    return localePath + rest;
  }
}

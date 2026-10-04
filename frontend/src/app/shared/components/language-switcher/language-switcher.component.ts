import { ChangeDetectionStrategy, Component } from '@angular/core';
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
            <a class="lang" [href]="l.path" [attr.hreflang]="l.code">{{ l.label }}</a>
          } @else {
            <span class="lang is-soon" i18n-title title="Uskoro">{{ l.label }}</span>
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
}

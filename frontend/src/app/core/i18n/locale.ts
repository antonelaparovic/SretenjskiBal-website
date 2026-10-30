import { LOCALE_ID, inject } from '@angular/core';

export type Locale = 'sr' | 'sl' | 'en';

export interface LocaleOption {
  code: Locale;
  label: string;
  /** Putanja na kojoj živi ta jezička verzija sajta. */
  path: string;
  /** Jezici koji još nisu prevedeni prikazuju se, ali nisu klikabilni. */
  available: boolean;
}

/**
 * Jezici sajta. Prevodi su u src/locale/messages.sl.xlf i messages.en.xlf; svaka jezička verzija je
 * zasebna gradnja (angular.json → i18n), objavljena na svojoj putanji. Izvorni jezik je srpski (koren sajta).
 * Posle izmene teksta: `npx ng extract-i18n --format xlf --output-path src/locale`, pa dopuniti prevode (docs/PREVODI.md).
 */
export const LOCALES: LocaleOption[] = [
  { code: 'sr', label: 'SR', path: '/', available: true },
  { code: 'sl', label: 'SL', path: '/sl/', available: true },
  { code: 'en', label: 'EN', path: '/en/', available: true },
];

export function currentLocale(): Locale {
  const id = inject(LOCALE_ID).toLowerCase();
  if (id.startsWith('sl')) return 'sl';
  if (id.startsWith('en')) return 'en';
  return 'sr';
}

/** Prefiks putanje za jezik: '' za srpski (koren), '/sl' ili '/en'. */
export function localePrefix(locale: Locale): string {
  const o = LOCALES.find((l) => l.code === locale);
  return o ? o.path.replace(/\/$/, '') : '';
}

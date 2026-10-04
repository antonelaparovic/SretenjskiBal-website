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
 * Jezici sajta. Kad se doda slovenački: prevod u src/locale/messages.sl.xlf,
 * locale u angular.json (i18n.locales) i ovde available: true.
 */
export const LOCALES: LocaleOption[] = [
  { code: 'sr', label: 'SR', path: '/', available: true },
  { code: 'sl', label: 'SL', path: '/sl/', available: false },
  { code: 'en', label: 'EN', path: '/en/', available: false },
];

export function currentLocale(): Locale {
  const id = inject(LOCALE_ID).toLowerCase();
  if (id.startsWith('sl')) return 'sl';
  if (id.startsWith('en')) return 'en';
  return 'sr';
}

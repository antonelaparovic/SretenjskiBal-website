export interface NavItem {
  label: string;
  path: string;
}

export const MAIN_NAV: NavItem[] = [
  { label: $localize`Bal`, path: '/o-balu' },
  { label: $localize`Sretenje`, path: '/sretenje' },
  { label: $localize`Program`, path: '/program' },
  { label: $localize`Karte`, path: '/karte' },
  { label: $localize`Pravila oblačenja`, path: '/pravila-oblacenja' },
  { label: $localize`Prostor`, path: '/prostor' },
  { label: $localize`Partneri`, path: '/partneri' },
  { label: $localize`FAQ`, path: '/faq' },
];

export const FOOTER_NAV: NavItem[] = [
  { label: $localize`Bal`, path: '/o-balu' },
  { label: $localize`Sretenje`, path: '/sretenje' },
  { label: $localize`Program`, path: '/program' },
  { label: $localize`Karte`, path: '/karte' },
  { label: $localize`Pravila oblačenja`, path: '/pravila-oblacenja' },
  { label: $localize`Partneri`, path: '/partneri' },
  { label: $localize`FAQ`, path: '/faq' },
  { label: $localize`Kontakt`, path: '/kontakt' },
];

export const LEGAL_NAV: NavItem[] = [
  { label: $localize`Politika privatnosti`, path: '/privacy' },
  { label: $localize`Kolačići`, path: '/cookies' },
  { label: $localize`Uslovi korišćenja`, path: '/uslovi' },
];

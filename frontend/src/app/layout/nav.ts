export interface NavItem {
  label: string;
  path: string;
}

export const MAIN_NAV: NavItem[] = [
  // Sakriveno dok stranica O balu ne bude spremna:
  // { label: $localize`Bal`, path: '/o-balu' },
  // Sakriveno dok program ne bude definisan:
  // { label: $localize`Program`, path: '/program' },
  // Ulaznice su u meniju samo kao dugme (header.component.html), ne kao link.
  // { label: $localize`Prostor`, path: '/prostor' },
  // { label: $localize`Partneri`, path: '/partneri' }, // vratiti kad se pojave partneri
];

export const FOOTER_NAV: NavItem[] = [
  // { label: $localize`Bal`, path: '/o-balu' },
  // { label: $localize`Program`, path: '/program' },
  { label: $localize`Ulaznice`, path: '/rezervacija' },
  { label: $localize`Kontakt`, path: '/kontakt' },
];

export const LEGAL_NAV: NavItem[] = [
  { label: $localize`Politika privatnosti`, path: '/privacy' },
  { label: $localize`Kolačići`, path: '/cookies' },
  { label: $localize`Uslovi korišćenja`, path: '/uslovi' },
];

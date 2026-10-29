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

/** Padajući meni „Sekcije“: `id` je sekcija na početnoj (glatko skrolovanje), `path` je zasebna stranica. */
export interface SectionNavItem {
  label: string;
  id?: string;
  path?: string;
}

/** Nazivi su isti kao naslovi sekcija na početnoj. */
export const SECTION_NAV: SectionNavItem[] = [
  { label: $localize`Zašto Sretenje?`, id: 'sretenje' },
  { label: $localize`Bal nikada nije bio samo ples.`, id: 'bal' },
  { label: $localize`Program večeri`, id: 'program' },
  { label: $localize`Izvođači`, id: 'izvodjaci' },
  { label: $localize`Narodni dom, Maribor`, id: 'prostor' },
  { label: $localize`Formal / Black Tie`, id: 'pravila-oblacenja' },
  { label: $localize`Ulaznice`, id: 'karte' },
  { label: $localize`Kulturni centar Sretenje`, id: 'organizator' },
  { label: $localize`Priča o balskoj tradiciji`, path: '/balska-tradicija' },
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
  // { label: $localize`Uslovi korišćenja`, path: '/uslovi' }, // sakriveno dok ne budu napisani
];

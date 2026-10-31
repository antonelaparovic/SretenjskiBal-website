import { Routes } from '@angular/router';

const soon = (pageTitle: string) => ({
  loadComponent: () => import('./features/pages/coming-soon.page').then((m) => m.ComingSoonPage),
  data: { pageTitle },
});

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage) },
  { path: 'kontakt', loadComponent: () => import('./features/contact/contact.page').then((m) => m.ContactPage) },
  {
    path: 'rezervacija',
    loadComponent: () => import('./features/reservation/reservation.page').then((m) => m.ReservationPage),
  },

  // Faza 4 — sadržajne stranice
  // Stranica O balu je privremeno uklonjena (link vodi na 404 dok se ne vrati).
  // { path: 'o-balu', ...soon($localize`O balu`) },
  {
    path: 'balska-tradicija',
    loadComponent: () => import('./features/ball-tradition/ball-tradition.page').then((m) => m.BallTraditionPage),
  },
  { path: 'program', ...soon($localize`Program`) },
  // Stari link na karte vodi na formu za rezervaciju.
  { path: 'karte', redirectTo: 'rezervacija' },
  { path: 'prostor', ...soon($localize`Prostor`) },
  { path: 'partneri', ...soon($localize`Partneri`) },
  { path: 'privacy', loadComponent: () => import('./features/legal/legal.page').then((m) => m.LegalPage), data: { kind: 'privacy' } },
  { path: 'cookies', loadComponent: () => import('./features/legal/legal.page').then((m) => m.LegalPage), data: { kind: 'cookies' } },
  // Uslovi korišćenja: sakriveno dok ne budu napisani.
  // { path: 'uslovi', ...soon($localize`Uslovi korišćenja`) },

  // Stranica „ne postoji": prerender je pravi kao /404, a build je kopira u 404.html koji hosting vraća za nepoznate adrese.
  { path: '404', loadComponent: () => import('./features/pages/not-found.page').then((m) => m.NotFoundPage) },
  { path: '**', loadComponent: () => import('./features/pages/not-found.page').then((m) => m.NotFoundPage) },
];

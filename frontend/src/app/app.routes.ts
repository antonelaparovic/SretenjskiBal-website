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
  { path: 'balska-tradicija', ...soon($localize`Balska tradicija`) },
  { path: 'program', ...soon($localize`Program`) },
  // Stari link na karte vodi na formu za rezervaciju.
  { path: 'karte', redirectTo: 'rezervacija' },
  { path: 'prostor', ...soon($localize`Prostor`) },
  { path: 'partneri', ...soon($localize`Partneri`) },
  // TODO: tekst politike privatnosti — forma za rezervaciju i kontakt forma linkuju ovde.
  { path: 'privacy', ...soon($localize`Politika privatnosti`) },
  { path: 'cookies', ...soon($localize`Kolačići`) },
  { path: 'uslovi', ...soon($localize`Uslovi korišćenja`) },

  { path: '**', loadComponent: () => import('./features/pages/not-found.page').then((m) => m.NotFoundPage) },
];

import { Routes } from '@angular/router';

const soon = (pageTitle: string) => ({
  loadComponent: () => import('./features/pages/coming-soon.page').then((m) => m.ComingSoonPage),
  data: { pageTitle },
});

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage) },
  { path: 'kontakt', loadComponent: () => import('./features/contact/contact.page').then((m) => m.ContactPage) },

  // Faza 4 — sadržajne stranice
  { path: 'o-balu', ...soon($localize`O balu`) },
  { path: 'sretenje', ...soon($localize`Sretenje`) },
  { path: 'balska-tradicija', ...soon($localize`Balska tradicija`) },
  { path: 'program', ...soon($localize`Program`) },
  { path: 'karte', ...soon($localize`Karte`) },
  { path: 'prostor', ...soon($localize`Prostor`) },
  { path: 'pravila-oblacenja', ...soon($localize`Pravila oblačenja`) },
  { path: 'partneri', ...soon($localize`Partneri`) },
  { path: 'faq', ...soon($localize`Česta pitanja`) },
  { path: 'organizator', ...soon($localize`Kulturni centar Sretenje`) },
  { path: 'privacy', ...soon($localize`Politika privatnosti`) },
  { path: 'cookies', ...soon($localize`Kolačići`) },
  { path: 'uslovi', ...soon($localize`Uslovi korišćenja`) },

  { path: '**', loadComponent: () => import('./features/pages/not-found.page').then((m) => m.NotFoundPage) },
];

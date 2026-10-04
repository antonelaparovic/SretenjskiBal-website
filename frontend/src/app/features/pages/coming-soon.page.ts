import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';
import { SectionHeadingComponent } from '../../shared/components/section-heading/section-heading.component';
import { Router } from '@angular/router';

/**
 * Privremena stranica za rute koje se grade u Fazi 4.
 * Naslov dolazi iz route data (title).
 */
@Component({
  selector: 'app-coming-soon-page',
  imports: [RouterLink, SectionHeadingComponent],
  template: `
    <section class="page section bg-parchment paper">
      <div class="container body">
        <app-section-heading [level]="1">{{ heading() }}</app-section-heading>
        <p class="lead" i18n>Ova stranica je u pripremi. Do tada, sve najvažnije o balu naći ćete na početnoj.</p>
        <a class="text-link accent" routerLink="/" i18n>Na početnu</a>
      </div>
    </section>
  `,
  styles: `
    .page { min-height: 80svh; padding-top: calc(var(--header-h) + var(--section-y)); }
    .body { display: flex; flex-direction: column; align-items: flex-start; gap: 2rem; }
    .accent { color: var(--c-burgundy); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComingSoonPage {
  /** Iz route data zahvaljujući withComponentInputBinding. */
  readonly heading = input('', { alias: 'pageTitle' });

  constructor() {
    const router = inject(Router);
    const seo = inject(SeoService);
    queueMicrotask(() =>
      seo.set({
        title: `${this.heading()} | Sretenjski bal 2027`,
        description: $localize`Sretenjski bal, 13. februara 2027. u Mariboru.`,
        path: router.url.split(/[?#]/)[0],
      }),
    );
  }
}

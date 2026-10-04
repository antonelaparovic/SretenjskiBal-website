import { ChangeDetectionStrategy, Component, PLATFORM_ID, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { isPlatformServer } from '@angular/common';
import { RESPONSE_INIT } from '@angular/core';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  template: `
    <section class="page section bg-parchment paper">
      <div class="container body">
        <p class="label accent">404</p>
        <h1 class="h1" i18n>Ova stranica ne postoji.</h1>
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
export class NotFoundPage {
  constructor() {
    const init = inject(RESPONSE_INIT, { optional: true });
    if (isPlatformServer(inject(PLATFORM_ID)) && init) init.status = 404;
    inject(SeoService).set({
      title: $localize`Stranica nije pronađena | Sretenjski bal`,
      description: $localize`Tražena stranica ne postoji.`,
      path: '/404',
    });
  }
}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SeoService } from '../../core/services/seo.service';
import { SectionHeadingComponent } from '../../shared/components/section-heading/section-heading.component';
import { ReservationFormComponent } from './reservation-form.component';

@Component({
  selector: 'app-reservation-page',
  imports: [ReservationFormComponent, SectionHeadingComponent],
  template: `
    <section class="page section bg-parchment paper" aria-labelledby="reservation-title">
      <div class="container">
        <header class="head grid">
          <app-section-heading class="title" [level]="1" headingId="reservation-title">
            <ng-container i18n>Rezervacija karata.</ng-container>
          </app-section-heading>
          <div class="intro">
            <p class="lead" i18n>Popunite formu i rezervišite karte za Sretenjski bal. U roku od 3 dana javićemo vam se sa detaljima za uplatu.</p>
            <p class="note" i18n>13.2.2027 · Maribor</p>
          </div>
        </header>
        <app-reservation-form />
      </div>
    </section>
  `,
  styles: `
    .page { padding-top: calc(var(--header-h) + var(--section-y)); }
    .head { align-items: end; padding-bottom: 3rem; border-bottom: 1px solid var(--c-brass); }
    .title { grid-column: 1 / span 5; }
    .intro { grid-column: 6 / span 7; display: flex; flex-direction: column; gap: 1rem; }
    @media (max-width: 1023.98px) { .title, .intro { grid-column: 1 / -1; } .intro { margin-top: 1.5rem; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReservationPage {
  constructor() {
    inject(SeoService).set({
      title: $localize`Rezervacija karata | Sretenjski bal`,
      description: $localize`Rezervišite karte za Sretenjski bal, 13. februara 2027. u Mariboru.`,
      path: '/rezervacija',
    });
  }
}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SeoService } from '../../core/services/seo.service';
import { SectionHeadingComponent } from '../../shared/components/section-heading/section-heading.component';
import { ReservationFormComponent } from './reservation-form.component';

@Component({
  selector: 'app-reservation-page',
  imports: [ReservationFormComponent, SectionHeadingComponent],
  template: `
    <section class="page section on-dark" aria-labelledby="reservation-title">
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
    .page {
      position: relative;
      overflow: hidden;
      padding-top: calc(var(--header-h) + var(--section-y));
      background:
        radial-gradient(55% 40% at 88% 0%, rgba(180, 154, 99, 0.18), transparent 70%),
        radial-gradient(45% 35% at 0% 100%, rgba(180, 154, 99, 0.1), transparent 70%),
        linear-gradient(180deg, #401018 0%, #5a1723 45%, #401018 100%);
    }
    .head { align-items: end; padding-bottom: 3rem; border-bottom: 1px solid var(--c-rule-brass); }
    .head::after {
      content: '';
      grid-column: 1 / -1;
      justify-self: center;
      width: 9px;
      height: 9px;
      margin-bottom: -3.35rem;
      border: 1px solid var(--c-brass);
      background: #401018;
      transform: rotate(45deg);
    }
    app-reservation-form {
      display: block;
      margin-top: clamp(2.5rem, 5vw, 4rem);
      padding: 0 clamp(1.25rem, 4vw, 3.5rem);
      border: 1px solid var(--c-rule-brass);
      background: rgba(30, 10, 14, 0.38);
      box-shadow: 0 40px 80px -50px rgba(0, 0, 0, 0.7);
    }
    .lead { color: var(--c-on-dark-soft); }
    .note { color: var(--c-brass); }
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

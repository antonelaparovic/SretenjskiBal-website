import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CountdownComponent } from '../../../shared/components/countdown/countdown.component';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { dateParts } from '../../../core/util/format';

@Component({
  selector: 'app-date-moment-section',
  imports: [CountdownComponent, RevealDirective],
  template: `
    <section class="section bg-burgundy moment" aria-labelledby="date-title">
      <div class="container grid">
        <h2 id="date-title" class="visually-hidden" i18n>Datum bala</h2>
        <p class="date" appReveal aria-hidden="true">
          <span>{{ parts().day }}</span>
          <span class="indent">{{ parts().month }}</span>
          <span class="year">{{ parts().year }}</span>
        </p>
        <div class="aside" appReveal [appRevealDelay]="150">
          <p class="label city">{{ city() }}</p>
          <p class="quote" i18n>Jedno veče.<br />Početak jedne nove tradicije.</p>
          @if (showCountdown()) {
            <app-countdown [target]="startsAt()" />
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    .moment { padding-block: clamp(7rem, 12vw, 11rem); }
    .date {
      grid-column: 1 / span 7;
      display: flex;
      flex-direction: column;
      font-family: var(--font-display);
      font-weight: 300;
      font-size: var(--fs-date);
      line-height: 0.82;
      letter-spacing: -0.01em;
      font-variant-numeric: lining-nums;
    }
    .indent { padding-left: 0.75em; }
    .year { color: var(--c-brass); }
    .aside { grid-column: 9 / span 4; align-self: end; display: flex; flex-direction: column; gap: 1.75rem; }
    .city { color: var(--c-brass); font-size: 0.875rem; }
    @media (max-width: 1023.98px) {
      .date, .aside { grid-column: 1 / -1; }
      .aside { margin-top: 3rem; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateMomentSectionComponent {
  readonly startsAt = input.required<string>();
  readonly city = input('Maribor');
  readonly showCountdown = input(true);
  protected readonly parts = computed(() => dateParts(this.startsAt()));
}

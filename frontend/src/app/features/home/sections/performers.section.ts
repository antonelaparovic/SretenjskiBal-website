import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PERFORMERS } from '../../../core/content/site-content';
import { SectionHeadingComponent } from '../../../shared/components/section-heading/section-heading.component';
import { RevealDirective } from '../../../shared/directives/reveal.directive';

/**
 * Izvođači: glavni gost krupno, ostali u mreži kategorija (voditeljka, recitacije, hor, balet, KUD…).
 * Radi i dok imena nisu poznata — tada kartica prikazuje samo kategoriju i „Uskoro".
 */
@Component({
  selector: 'app-performers-section',
  imports: [SectionHeadingComponent, RevealDirective],
  template: `
    <section id="izvodjaci" class="section bg-ivory performers" aria-labelledby="performers-title">
      <div class="container">
        <div class="head" appReveal>
          <app-section-heading headingId="performers-title" i18n-eyebrow eyebrow="Nastupaju">
            <ng-container i18n>Umetnički program</ng-container>
          </app-section-heading>
        </div>

        @if (featured; as f) {
          <div class="feature" appReveal [appRevealDelay]="80">
            <p class="label">{{ f.role }}</p>
            <p class="feature__name">{{ f.name }}</p>
          </div>
        }

        <ul class="grid-list">
          @for (p of others; track p.role + p.name; let i = $index) {
            <li class="item" appReveal [appRevealDelay]="i * 70">
              <span class="item__no" aria-hidden="true">{{ i + 2 < 10 ? '0' + (i + 2) : i + 2 }}</span>
              <div class="item__text">
                <p class="label item__role">{{ p.role }}</p>
                @if (p.name) {
                  <p class="item__name">{{ p.name }}</p>
                } @else {
                  <p class="item__name item__name--soon" i18n>Uskoro</p>
                }
              </div>
            </li>
          }
        </ul>
      </div>
    </section>
  `,
  styles: `
    .head { margin-bottom: clamp(2rem, 4vw, 3.5rem); }
    .feature {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: clamp(2rem, 4vw, 3rem) 0;
      border-top: 1px solid var(--c-rule-dark);
      border-bottom: 1px solid var(--c-rule-dark);
    }
    .feature .label { color: var(--c-burgundy); }
    .feature__name {
      margin: 0;
      font-family: var(--font-display);
      font-weight: 300;
      font-size: clamp(3.25rem, 9vw, 7.5rem);
      line-height: 0.95;
      letter-spacing: 0.01em;
    }
    .grid-list {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      column-gap: clamp(2rem, 6vw, 6rem);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .item {
      display: grid;
      grid-template-columns: 2.75rem minmax(0, 1fr);
      align-items: baseline;
      gap: 1rem;
      padding: 1.5rem 0;
      border-bottom: 1px solid var(--c-rule-dark);
    }
    .item__no { font-family: var(--font-display); font-size: 1.125rem; color: var(--c-brass); }
    .item__text { display: flex; flex-direction: column; gap: 0.4rem; }
    .item__role { margin: 0; color: var(--c-burgundy); }
    .item__name { margin: 0; font-family: var(--font-display); font-size: clamp(1.625rem, 2.6vw, 2.125rem); line-height: 1.15; }
    .item__name--soon { font-style: italic; color: var(--c-ink-soft); }
    @media (max-width: 767.98px) { .grid-list { grid-template-columns: 1fr; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerformersSectionComponent {
  protected readonly featured = PERFORMERS.find((p) => p.featured) ?? null;
  protected readonly others = PERFORMERS.filter((p) => !p.featured);
}

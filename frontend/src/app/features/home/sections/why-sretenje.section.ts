import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SectionHeadingComponent } from '../../../shared/components/section-heading/section-heading.component';
import { RevealDirective } from '../../../shared/directives/reveal.directive';

interface Moment {
  mark: string;
  text: string;
}

@Component({
  selector: 'app-why-sretenje-section',
  imports: [SectionHeadingComponent, RevealDirective],
  template: `
    <section class="section bg-parchment paper" aria-labelledby="sretenje-title">
      <div class="container grid">
        <div class="intro" appReveal>
          <app-section-heading headingId="sretenje-title" i18n-eyebrow eyebrow="Značenje">
            <ng-container i18n>Zašto Sretenje?</ng-container>
          </app-section-heading>
          <p class="lead" i18n>
            Reč sretenje znači susret. Kroz vekove je okupila više značenja — verskih, istorijskih i narodnih.
          </p>
        </div>

        <ol class="timeline">
          @for (m of moments; track m.mark; let i = $index) {
            <li appReveal [appRevealDelay]="i * 80">
              <span class="mark">{{ m.mark }}</span>
              <p>{{ m.text }}</p>
            </li>
          }
        </ol>

        <p class="closing quote" appReveal i18n>A mi jednim novim susretom započinjemo novu tradiciju.</p>
      </div>
    </section>
  `,
  styles: `
    .intro { grid-column: 1 / span 4; display: flex; flex-direction: column; align-items: flex-start; gap: 1.75rem; }
    .timeline { grid-column: 7 / span 6; border-left: 1px solid var(--c-brass); }
    .timeline li { position: relative; display: flex; flex-direction: column; gap: 0.75rem; padding: 0 0 3.25rem 3rem; }
    .timeline li:last-child { padding-bottom: 0; }
    .timeline li::before { content: ''; position: absolute; left: -4px; top: 1.1rem; width: 7px; height: 7px; background: var(--c-parchment); border: 1px solid var(--c-brass); transform: rotate(45deg); }
    .mark { font-family: var(--font-display); font-size: clamp(2rem, 3vw, 2.5rem); line-height: 1.1; color: var(--c-burgundy); }
    .timeline p { font-weight: 300; max-width: 34em; }
    .closing { grid-column: 1 / span 9; margin-top: clamp(4rem, 7vw, 6rem); font-size: clamp(1.75rem, 3.2vw, 2.75rem); line-height: 1.2; color: var(--c-burgundy); }
    @media (max-width: 1023.98px) {
      .intro, .timeline, .closing { grid-column: 1 / -1; }
      .timeline { margin-top: 3rem; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhySretenjeSectionComponent {
  protected readonly moments: Moment[] = [
    {
      mark: $localize`Susret`,
      text: $localize`Praznik Sretenja Gospodnjeg seća se susreta starca Simeona sa Bogomladencem u jerusalimskom hramu. Otuda i sama ideja susreta.`,
    },
    { mark: '1804', text: $localize`Orašac — na Sretenje počinje Prvi srpski ustanak.` },
    { mark: '1835', text: $localize`Sretenjski ustav — jedan od važnih koraka u razvoju srpske ustavnosti.` },
    {
      mark: $localize`Narodna tradicija`,
      text: $localize`U narodu se Sretenje vezuje za simbolični susret zime i proleća.`,
    },
  ];
}

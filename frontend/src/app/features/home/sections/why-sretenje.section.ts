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
          <app-section-heading headingId="sretenje-title">
            <ng-container i18n>Zašto Sretenje?</ng-container>
          </app-section-heading>
          <p class="lead" i18n>
            Reč sretenje u srpskom i slovenačkom jeziku znači susret, a jedan praznik simboliše toliko susreta.
          </p>
          <p class="quote pairs accent" i18n>
            <span>Vere i istorije.</span>
            <span>Zime i proleća.</span>
            <span>Prošlosti i budućnosti.</span>
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

        <p class="closing quote" appReveal i18n>Sretenjski bal nastaje sa idejom susreta srpske i slovenačke kulture.</p>
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
    .pairs { display: flex; flex-direction: column; gap: 0.1em; margin-top: 0.5rem; }
    .pairs span { display: block; }
    .accent { color: var(--c-burgundy); }
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
      mark: $localize`Sretenje Gospodnje`,
      text: $localize`Prema Jevanđelju po Luki, četrdesetog dana po rođenju, Marija i Josif donose Isusa u jerusalimski hram, gde ga starac Simeon uzima u naručje i prepoznaje kao svetlost.`,
    },
    {
      mark: $localize`Narodna tradicija`,
      text: $localize`U narodu se Sretenje vezuje za simbolični susret zime i proleća.`,
    },
    {
      mark: '1804.',
      text: $localize`Na Sretenje u Orašcu je podignut Prvi srpski ustanak, kojim je započeta borba za oslobođenje Srbije od osmanske vlasti.`,
    },
    {
      mark: '1835.',
      text: $localize`U Kragujevcu je proglašen Sretenjski ustav. Njime su prvi put jasno postavljeni temelji moderne srpske države.`,
    },
    {
      mark: $localize`Od 2002.`,
      text: $localize`Sretenje je Dan državnosti Republike Srbije.`,
    },
  ];
}

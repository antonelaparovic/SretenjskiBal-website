import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EditorialImageComponent } from '../../../shared/components/editorial-image/editorial-image.component';
import { SectionHeadingComponent } from '../../../shared/components/section-heading/section-heading.component';
import { RevealDirective } from '../../../shared/directives/reveal.directive';

@Component({
  selector: 'app-encounter-section',
  imports: [EditorialImageComponent, SectionHeadingComponent, RevealDirective],
  template: `
    <section class="section bg-ivory" aria-labelledby="encounter-title">
      <div class="container grid">
        <div class="media">
          <app-editorial-image
            [arch]="true"
            i18n-alt alt="Ruke, knjiga i pozivnica na stolu"
            brief="Foto: ruke, knjiga i pozivnica na stolu, toplo večernje svetlo"
          />
        </div>
        <div class="text" appReveal>
          <app-section-heading headingId="encounter-title" i18n-eyebrow eyebrow="Susret">
            <ng-container i18n>Kultura koja spaja.</ng-container>
          </app-section-heading>
          <p class="lead" i18n>
            Sretenjski bal stvara savremeno mesto susreta srpskog i slovenačkog kulturnog prostora. Veče u
            kojem se muzika, književnost i razgovor prepliću, a ljudi koji dele isti grad dele i jedan sto.
          </p>
          <ul class="keywords">
            <li class="label" i18n>Kultura</li>
            <li class="label" i18n>Susret</li>
            <li class="label" i18n>Tradicija</li>
          </ul>
        </div>
      </div>
    </section>
  `,
  styles: `
    .grid { align-items: center; }
    .media { grid-column: 1 / span 6; height: clamp(420px, 48vw, 660px); }
    .media app-editorial-image { height: 100%; }
    .text { grid-column: 8 / span 5; display: flex; flex-direction: column; gap: 2rem; }
    .keywords { display: flex; flex-wrap: wrap; align-items: center; gap: 1.25rem; color: var(--c-burgundy); margin-top: 0.5rem; }
    .keywords li + li::before { content: ''; display: inline-block; width: 36px; height: 1px; margin-right: 1.25rem; vertical-align: middle; background: var(--c-brass); }
    @media (max-width: 1023.98px) {
      .media, .text { grid-column: 1 / -1; }
      .media { height: 480px; margin-bottom: 1.5rem; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EncounterSectionComponent {}

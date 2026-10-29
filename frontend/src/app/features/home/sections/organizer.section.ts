import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SectionHeadingComponent } from '../../../shared/components/section-heading/section-heading.component';
import { RevealDirective } from '../../../shared/directives/reveal.directive';

@Component({
  selector: 'app-organizer-section',
  imports: [SectionHeadingComponent, RevealDirective],
  template: `
    <section id="organizator" class="section bg-parchment paper" aria-labelledby="org-title">
      <div class="container grid">
        <div class="heading" appReveal>
          <app-section-heading headingId="org-title" i18n-eyebrow eyebrow="Organizator">Kulturni centar Sretenje</app-section-heading>
        </div>
        <div class="body" appReveal [appRevealDelay]="120">
          <p class="lead" i18n>
            Iza prvog Sretenjskog bala stoji Kulturni centar Sretenje — organizator bala i inicijativa nastala sa željom
            da se ponovo otvori prostor za pomalo zaboravljenu građansku kulturu i vrednosti koje je ona nosila.
          </p>
          <p i18n>
            Kroz istoriju, srpska zajednica na ovim prostorima ostavljala je trag kroz kulturu, obrazovanje, privredu i
            duhovni život. To nasleđe želimo da približimo savremenom trenutku — ne kao povratak u prošlost, već kao
            temelj za ono što tek možemo da gradimo.
          </p>
          <p i18n>
            Kulturni centar Sretenje zamišljen je kao trajno mesto susreta ljudi iz sveta kulture, nauke, privrede i
            duhovnog života. Mesto razgovora, povezivanja i novih ideja. Prostor u kom se neguje sopstveno nasleđe, ali
            i gradi odnos sa kulturnom sredinom u kojoj živimo.
          </p>
          <div class="why">
            <h3 class="label" i18n>Zašto baš Sretenje?</h3>
            <p i18n>
              Zato što je u njegovoj osnovi — susret. Susret duhovnog i građanskog. Tradicije i savremenosti. Našeg
              nasleđa i kulture u kojoj živimo. Verujemo da upravo iz takvih susreta nastaju novi mostovi.
            </p>
          </div>
          <p class="closing" i18n>Sretenjski bal je naš prvi korak.</p>
        </div>
      </div>
    </section>
  `,
  styles: `
    .heading { grid-column: 1 / span 5; }
    .body { grid-column: 7 / span 6; display: flex; flex-direction: column; align-items: flex-start; gap: 2rem; padding-top: 2.75rem; }
    .body p { max-width: 38rem; }
    .why { padding-top: 1.5rem; border-top: 1px solid var(--c-rule-brass); display: flex; flex-direction: column; gap: 0.75rem; }
    .closing { font-family: var(--font-display); font-size: clamp(1.5rem, 2.5vw, 2rem); font-style: italic; color: var(--c-wine); }
    @media (max-width: 1023.98px) { .heading, .body { grid-column: 1 / -1; } .body { padding-top: 1rem; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizerSectionComponent {}

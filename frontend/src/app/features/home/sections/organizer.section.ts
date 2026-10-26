import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SectionHeadingComponent } from '../../../shared/components/section-heading/section-heading.component';
import { RevealDirective } from '../../../shared/directives/reveal.directive';

@Component({
  selector: 'app-organizer-section',
  imports: [SectionHeadingComponent, RevealDirective],
  template: `
    <section class="section bg-parchment paper" aria-labelledby="org-title">
      <div class="container grid">
        <div class="heading" appReveal>
          <app-section-heading headingId="org-title" i18n-eyebrow eyebrow="Organizator">Kulturni centar Sretenje</app-section-heading>
        </div>
        <div class="body" appReveal [appRevealDelay]="120">
          <p class="lead" i18n>
            Kulturni centar Sretenje je organizator Sretenjskog bala. Pokreće kulturne inicijative koje povezuju
            ljude, nasleđe i savremeni kulturni život.
          </p>
        </div>
      </div>
    </section>
  `,
  styles: `
    .heading { grid-column: 1 / span 5; }
    .body { grid-column: 7 / span 6; display: flex; flex-direction: column; align-items: flex-start; gap: 2rem; padding-top: 2.75rem; }
    @media (max-width: 1023.98px) { .heading, .body { grid-column: 1 / -1; } .body { padding-top: 1rem; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizerSectionComponent {}

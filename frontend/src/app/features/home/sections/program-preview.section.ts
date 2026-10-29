import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PROGRAM } from '../../../core/content/site-content';
import { ProgramTimelineComponent } from '../../../shared/components/program-timeline/program-timeline.component';
import { SectionHeadingComponent } from '../../../shared/components/section-heading/section-heading.component';
import { RevealDirective } from '../../../shared/directives/reveal.directive';

@Component({
  selector: 'app-program-preview-section',
  imports: [ProgramTimelineComponent, SectionHeadingComponent, RevealDirective],
  template: `
    <section id="program" class="section bg-ivory" aria-labelledby="program-title">
      <div class="container grid">
        <div class="intro" appReveal>
          <app-section-heading headingId="program-title" i18n-eyebrow eyebrow="13. februar 2027">
            <ng-container i18n>Program večeri</ng-container>
          </app-section-heading>
        </div>
        <div class="list">
          <app-program-timeline [items]="program" />
          <p class="note hint" i18n>Satnica je okvirna i biće potvrđena.</p>
        </div>
      </div>
    </section>
  `,
  styles: `
    .intro { grid-column: 1 / span 4; display: flex; flex-direction: column; align-items: flex-start; gap: 2rem; }
    .list { grid-column: 6 / span 7; }
    .hint { margin-top: 1.25rem; }
    @media (max-width: 1023.98px) { .intro, .list { grid-column: 1 / -1; } .list { margin-top: 2.5rem; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgramPreviewSectionComponent {
  protected readonly program = PROGRAM;
}

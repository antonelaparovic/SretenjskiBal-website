import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PROGRAM } from '../../../core/content/site-content';
import { ProgramTimelineComponent } from '../../../shared/components/program-timeline/program-timeline.component';
import { SectionHeadingComponent } from '../../../shared/components/section-heading/section-heading.component';
import { RevealDirective } from '../../../shared/directives/reveal.directive';

@Component({
  selector: 'app-program-preview-section',
  imports: [ProgramTimelineComponent, SectionHeadingComponent, RevealDirective],
  template: `
    <section id="program" class="section program" aria-labelledby="program-title">
      <div class="container grid">
        <div class="intro" appReveal>
          <app-section-heading headingId="program-title" i18n-eyebrow eyebrow="13. februar 2027">
            <ng-container i18n>Program večeri</ng-container>
          </app-section-heading>
          <p class="lead" i18n>Od svečanog dočeka do ponoćnog kola — jedna večer, od prvog do poslednjeg takta.</p>

          <!-- Ornament: sat sa jednom zvezdom na dvanaestici. Samo ukras, ne nosi informaciju. -->
          <svg class="clock" viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="0.8" aria-hidden="true">
            <circle cx="100" cy="100" r="92" />
            <circle cx="100" cy="100" r="84" stroke-opacity="0.45" />
            <circle cx="100" cy="100" r="3" fill="currentColor" stroke="none" />
            @for (t of ticks; track t) {
              <line x1="100" y1="12" x2="100" [attr.y2]="t % 3 === 0 ? 28 : 20" [attr.transform]="'rotate(' + t * 30 + ' 100 100)'" />
            }
            <path class="hand hand--h" d="M100 100 L100 56" stroke-width="1.4" stroke-linecap="round" />
            <path class="hand hand--m" d="M100 100 L100 30" stroke-linecap="round" />
            <path d="M100 38 l2.4 5.6 5.6 2.4-5.6 2.4-2.4 5.6-2.4-5.6-5.6-2.4 5.6-2.4z" fill="currentColor" stroke="none" transform="translate(0 28)" opacity="0.0" />
          </svg>
        </div>
        <div class="list">
          <app-program-timeline [items]="program" variant="dark" />
          <p class="note hint" i18n>Satnica je okvirna i biće potvrđena.</p>
        </div>
      </div>
    </section>
  `,
  styles: `
    .program { position: relative; background: var(--c-burgundy); color: var(--c-ivory); border-block: 1px solid var(--c-rule-brass); }
    .intro { grid-column: 1 / span 4; display: flex; flex-direction: column; align-items: flex-start; gap: 2rem; }
    .intro app-section-heading { --eyebrow-color: var(--c-brass); }
    .lead { color: var(--c-on-dark-soft); }
    .clock { width: min(210px, 60%); color: var(--c-brass); margin-top: 1rem; opacity: 0.85; }
    .hand { transform-origin: 100px 100px; animation: tick 60s linear infinite; }
    .hand--h { animation-duration: 720s; }
    @keyframes tick { to { transform: rotate(360deg); } }
    .list { grid-column: 6 / span 7; }
    .hint { margin-top: 1.25rem; padding-left: calc(min(120px, 100%) + 1rem + 28px + 1rem); color: var(--c-on-dark-soft); }
    @media (max-width: 1023.98px) { .intro, .list { grid-column: 1 / -1; } .list { margin-top: 2.5rem; } .clock { display: none; } }
    @media (prefers-reduced-motion: reduce) { .hand { animation: none; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgramPreviewSectionComponent {
  protected readonly program = PROGRAM;
  protected readonly ticks = Array.from({ length: 12 }, (_, i) => i);
}

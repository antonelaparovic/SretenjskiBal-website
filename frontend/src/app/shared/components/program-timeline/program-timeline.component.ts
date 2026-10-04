import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ProgramItem } from '../../../core/models/content.models';
import { RevealDirective } from '../../directives/reveal.directive';

@Component({
  selector: 'app-program-timeline',
  imports: [RevealDirective],
  template: `
    <ol class="timeline">
      @for (item of items(); track item.time + item.title; let i = $index) {
        <li class="row" appReveal [appRevealDelay]="i * 60">
          <time class="time">{{ item.time }}</time>
          <div class="text">
            <span class="title">{{ item.title }}</span>
            @if (item.description) { <span class="desc">{{ item.description }}</span> }
          </div>
        </li>
      }
    </ol>
  `,
  styles: `
    .timeline { border-top: 1px solid var(--c-rule-dark); }
    .row {
      display: grid;
      grid-template-columns: minmax(84px, 160px) minmax(0, 1fr);
      align-items: baseline;
      gap: 1rem;
      padding: 1.5rem 0.75rem;
      border-bottom: 1px solid var(--c-rule-dark);
      transition: background-color var(--dur-base) var(--ease);
    }
    .row:hover { background: rgba(180, 154, 99, 0.08); }
    .time { font-family: var(--font-display); font-size: clamp(1.625rem, 2.4vw, 2.125rem); color: var(--c-burgundy); }
    .text { display: flex; flex-direction: column; gap: 0.25rem; }
    .title { font-size: 1.0625rem; }
    .desc { font-size: 0.9375rem; font-weight: 300; color: var(--c-ink-soft); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgramTimelineComponent {
  readonly items = input.required<ProgramItem[]>();
}

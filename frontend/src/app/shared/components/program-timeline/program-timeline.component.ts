import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ProgramItem } from '../../../core/models/content.models';
import { RevealDirective } from '../../directives/reveal.directive';

/** Vremenska linija večeri: vreme levo, tačka na vertikalnoj liniji, naziv i opis desno. `dark` za tamne pozadine. */
@Component({
  selector: 'app-program-timeline',
  imports: [RevealDirective],
  host: { '[class.dark]': 'variant() === "dark"' },
  template: `
    <ol class="timeline">
      @for (item of items(); track item.time + item.title; let i = $index) {
        <li class="row" appReveal [appRevealDelay]="i * 60">
          <time class="time">{{ item.time }}@if (item.until) { <span class="until">– {{ item.until }}</span> }</time>
          <span class="dot" aria-hidden="true"></span>
          <div class="text">
            <span class="title">{{ item.title }}</span>
            @if (item.description) { <span class="desc">{{ item.description }}</span> }
          </div>
        </li>
      }
    </ol>
  `,
  styles: `
    :host {
      --tl-line: var(--c-rule-dark);
      --tl-time: var(--c-burgundy);
      --tl-title: var(--c-ink);
      --tl-desc: var(--c-ink-soft);
      --tl-dot: var(--c-burgundy);
      display: block;
    }
    :host(.dark) {
      --tl-line: var(--c-rule-brass);
      --tl-time: var(--c-brass);
      --tl-title: var(--c-ivory);
      --tl-desc: var(--c-on-dark-soft);
      --tl-dot: var(--c-brass);
    }
    .timeline { position: relative; }
    .row {
      position: relative;
      display: grid;
      grid-template-columns: minmax(70px, 120px) 28px minmax(0, 1fr);
      align-items: baseline;
      column-gap: 1rem;
      padding: 1.5rem 0.5rem 1.5rem 0;
    }
    /* Vertikalna linija kroz sve redove. */
    .row::before {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      left: calc(min(120px, 100%) + 1rem + 13px);
      width: 1px;
      background: var(--tl-line);
    }
    .row:first-child::before { top: 2.2rem; }
    .row:last-child::before { bottom: calc(100% - 2.2rem); }
    .dot {
      position: relative;
      z-index: 1;
      justify-self: center;
      width: 11px;
      height: 11px;
      border: 1px solid var(--tl-dot);
      border-radius: 50%;
      background: transparent;
      transform: translateY(0.1rem) rotate(45deg);
      border-radius: 1px; /* mali romb umesto kruga */
      transition: background-color var(--dur-base) var(--ease), transform var(--dur-base) var(--ease);
    }
    @keyframes dot-glow { 0% { box-shadow: 0 0 0 0 var(--tl-dot); } 100% { box-shadow: 0 0 0 12px transparent; } }
    .row.is-visible .dot { animation: dot-glow 1.4s var(--ease) 0.3s 1 both; }
    @media (prefers-reduced-motion: reduce) { .row.is-visible .dot { animation: none; } }
    .row:hover .dot { background: var(--tl-dot); transform: translateY(0.1rem) rotate(45deg) scale(1.25); }
    .time { font-family: var(--font-display); font-size: clamp(1.625rem, 2.4vw, 2.125rem); color: var(--tl-time); line-height: 1.1; text-align: right; }
    .until { display: block; font-size: 0.55em; opacity: 0.75; margin-top: 0.15rem; }
    .text { display: flex; flex-direction: column; gap: 0.25rem; }
    .title { font-family: var(--font-display); font-size: clamp(1.375rem, 2vw, 1.625rem); color: var(--tl-title); line-height: 1.2; }
    .desc { font-size: 0.9375rem; font-weight: 300; color: var(--tl-desc); }
    @media (max-width: 599.98px) {
      .row { grid-template-columns: 64px 20px minmax(0, 1fr); column-gap: 0.75rem; }
      .row::before { left: calc(64px + 0.75rem + 9px); }
      .time { font-size: 1.375rem; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgramTimelineComponent {
  readonly items = input.required<ProgramItem[]>();
  readonly variant = input<'light' | 'dark'>('light');
}

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { PERFORMERS } from '../../../core/content/site-content';
import { SectionHeadingComponent } from '../../../shared/components/section-heading/section-heading.component';
import { RevealDirective } from '../../../shared/directives/reveal.directive';

/**
 * Umetnički program kao karusel: portreti u luku (motiv iz znaka), prevlačenje prstom
 * na telefonu, strelice na računaru. Dok nema imena, prikazuje prazne lukove i najavu.
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

          @if (performers.length > 1) {
            <div class="controls">
              <button class="arrow" type="button" (click)="step(-1)" [disabled]="atStart()" i18n-aria-label aria-label="Prethodni izvođač">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
              </button>
              <button class="arrow" type="button" (click)="step(1)" [disabled]="atEnd()" i18n-aria-label aria-label="Sledeći izvođač">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          }
        </div>

        @if (performers.length) {
          <ul #track class="track" appReveal [appRevealDelay]="120" (scroll)="sync()">
            @for (p of performers; track p.role + p.name) {
              <li class="card" [class.card--featured]="p.featured">
                <div class="portrait">
                  @if (p.photo) {
                    <img [src]="p.photo" [alt]="p.name ?? p.role" loading="lazy" decoding="async" />
                  } @else {
                    <span class="portrait__mark" aria-hidden="true"></span>
                  }
                </div>
                @if (p.name) {
                  <h3 class="name">{{ p.name }}</h3>
                } @else {
                  <h3 class="name name--soon" i18n>Uskoro</h3>
                }
                <p class="label role">{{ p.role }}</p>
              </li>
            }
          </ul>
        } @else {
          <ul class="track track--soon" appReveal [appRevealDelay]="120" aria-hidden="true">
            @for (i of soon; track i) {
              <li class="card"><div class="portrait"></div></li>
            }
          </ul>
          <p class="lead soon-note" appReveal i18n>Imena izvođača objavljujemo uskoro.</p>
        }
      </div>
    </section>
  `,
  styles: `
    .performers { overflow: hidden; }
    .head {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 2rem;
      margin-bottom: clamp(2.5rem, 5vw, 4rem);
    }
    .controls { display: flex; align-items: center; gap: 0.75rem; }
    .arrow {
      display: grid;
      place-items: center;
      width: 52px;
      height: 52px;
      border: 1px solid var(--c-wine);
      background: transparent;
      color: var(--c-wine);
      cursor: pointer;
      transition: background-color var(--dur-base) var(--ease), color var(--dur-base) var(--ease), opacity var(--dur-base) var(--ease);
    }
    .arrow svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.25; }
    .arrow:hover:not(:disabled) { background: var(--c-wine); color: var(--c-ivory); }
    .arrow:disabled { opacity: 0.3; cursor: default; }

    .track {
      --card-w: clamp(240px, 24vw, 300px);
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: var(--card-w);
      gap: clamp(1.25rem, 2.5vw, 2.5rem);
      margin: 0;
      padding: 0 0 0.5rem;
      list-style: none;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      scroll-behavior: smooth;
      overscroll-behavior-x: contain;
      scrollbar-width: none;
      /* Karusel izlazi do desne ivice ekrana, poravnat levo sa sadržajem. */
      margin-right: calc(-1 * var(--gutter));
      padding-right: var(--gutter);
    }
    .track::-webkit-scrollbar { display: none; }
    .card { scroll-snap-align: start; }

    .portrait {
      position: relative;
      aspect-ratio: 3 / 4;
      overflow: hidden;
      border-radius: 999px 999px 0 0;
      background: var(--c-placeholder-warm);
    }
    .portrait__mark {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 14px;
      height: 14px;
      border: 1px solid var(--c-brass);
      transform: translate(-50%, -50%) rotate(45deg);
    }
    .card--featured .name { color: var(--c-burgundy); }
    .name--soon { font-style: italic; color: var(--c-ink-soft); }
    .portrait img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    .name {
      margin: 1.5rem 0 0.5rem;
      font-family: var(--font-display);
      font-weight: 400;
      font-size: 1.75rem;
      line-height: 1.15;
    }
    .role { margin: 0; color: var(--c-burgundy); }

    .track--soon { overflow: hidden; scroll-snap-type: none; }
    .track--soon .portrait { background: transparent; border: 1px solid var(--c-rule-dark); }
    .soon-note { margin-top: 2.5rem; color: var(--c-ink-soft); }

    @media (prefers-reduced-motion: reduce) { .track { scroll-behavior: auto; } }
    @media (max-width: 767.98px) {
      .track { --card-w: 72vw; }
      .controls .arrow { display: none; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerformersSectionComponent {
  protected readonly performers = PERFORMERS;
  protected readonly soon = [1, 2, 3, 4, 5];
  protected readonly atStart = signal(true);
  protected readonly atEnd = signal(false);
  private readonly track = viewChild<ElementRef<HTMLUListElement>>('track');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.sync();
      const onResize = () => this.sync();
      window.addEventListener('resize', onResize, { passive: true });
      destroyRef.onDestroy(() => window.removeEventListener('resize', onResize));
    });
  }

  /** Pomera karusel za jednu karticu levo (-1) ili desno (1). */
  protected step(dir: 1 | -1): void {
    const el = this.track()?.nativeElement;
    const card = el?.querySelector<HTMLElement>('.card');
    if (!el || !card) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    el.scrollBy({ left: dir * (card.offsetWidth + gap) });
  }

  protected sync(): void {
    const el = this.track()?.nativeElement;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    this.atStart.set(el.scrollLeft <= 2);
    this.atEnd.set(el.scrollLeft >= max - 2);
  }
}

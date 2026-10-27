import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { BALL_TRADITION_IMAGE, EVENT } from '../../../core/content/site-content';
import { EventInfo } from '../../../core/models/content.models';
import { SectionHeadingComponent } from '../../../shared/components/section-heading/section-heading.component';
import { RevealDirective } from '../../../shared/directives/reveal.directive';

@Component({
  selector: 'app-venue-section',
  imports: [SectionHeadingComponent, RevealDirective],
  template: `
    <section class="bg-parchment venue" aria-labelledby="venue-title">
      <figure class="media" appReveal [appRevealImage]="true">
        @if (photo.src; as src) {
          <img [src]="src" [alt]="photo.alt" loading="lazy" />
        }
        @if (photo.credit) { <figcaption class="label">{{ photo.credit }}</figcaption> }
      </figure>
      <div class="container grid body">
        <div class="heading" appReveal>
          <app-section-heading headingId="venue-title" [eyebrow]="event().city">
            <ng-container i18n>Veče u istorijskom ambijentu.</ng-container>
          </app-section-heading>
        </div>
        <address class="details" appReveal [appRevealDelay]="120">
          @if (event().venueName; as name) {
            <span class="name">{{ name }}</span>
            @if (event().venueAddress; as address) { <span>{{ address }}</span> }
          } @else {
            <span class="name" i18n>Mesto održavanja biće uskoro objavljeno.</span>
          }
          <div class="links">
            @if (event().mapUrl; as map) {
              <a class="text-link accent" [href]="map" target="_blank" rel="noopener" i18n>Otvori mapu</a>
            }
          </div>
        </address>
      </div>
    </section>
  `,
  styles: `
    .venue { padding-bottom: var(--section-y); }
    .media { position: relative; margin: 0; height: clamp(360px, 44vw, 640px); overflow: hidden; background: var(--c-wine); }
    .media img { width: 100%; height: 100%; object-fit: cover; object-position: center 35%; filter: grayscale(1) contrast(1.1) brightness(0.92); }
    .media::before { content: ''; position: absolute; inset: 0; z-index: 1; pointer-events: none; background: #8a2434; mix-blend-mode: color; opacity: 0.9; }
    .media::after { content: ''; position: absolute; inset: 0; z-index: 1; pointer-events: none; background: linear-gradient(to top, rgba(64, 16, 24, 0.85), rgba(110, 30, 45, 0.15) 60%, rgba(64, 16, 24, 0.35)); }
    .media figcaption { position: absolute; z-index: 2; left: var(--gutter, 1.5rem); bottom: 1.25rem; color: var(--c-ivory); opacity: 0.8; font-size: 0.7rem; }
    .body { padding-top: clamp(3rem, 6vw, 5rem); }
    .heading { grid-column: 1 / span 6; }
    .details { grid-column: 8 / span 5; display: flex; flex-direction: column; gap: 0.75rem; padding-top: 2.5rem; font-style: normal; font-weight: 300; font-size: 1.0625rem; }
    .name { font-family: var(--font-display); font-weight: 400; font-size: 1.875rem; line-height: 1.2; }
    .links { display: flex; gap: 2rem; margin-top: 1rem; }
    .accent { color: var(--c-burgundy); }
    @media (max-width: 1023.98px) { .heading, .details { grid-column: 1 / -1; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VenueSectionComponent {
  protected readonly photo = BALL_TRADITION_IMAGE;
  protected readonly event = signal<EventInfo>(EVENT);
}

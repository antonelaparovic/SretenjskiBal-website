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
      <div class="container grid">
        <div class="text">
          <div appReveal>
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
        <figure class="photo" appReveal [appRevealImage]="true">
          @if (photo.src; as src) {
            <img [src]="src" [alt]="photo.alt" loading="lazy" />
          }
          @if (photo.credit) { <figcaption class="label">{{ photo.credit }}</figcaption> }
        </figure>
      </div>
    </section>
  `,
  styles: `
    .venue { padding-block: var(--section-y); }
    .grid { align-items: center; }
    .text { grid-column: 1 / span 6; display: flex; flex-direction: column; gap: clamp(2rem, 4vw, 3.5rem); }
    .details { display: flex; flex-direction: column; gap: 0.75rem; font-style: normal; font-weight: 300; font-size: 1.0625rem; }
    .name { font-family: var(--font-display); font-weight: 400; font-size: 1.875rem; line-height: 1.2; }
    .links { display: flex; gap: 2rem; margin-top: 1rem; }
    .accent { color: var(--c-burgundy); }
    .photo { grid-column: 8 / span 5; position: relative; margin: 0; aspect-ratio: 2 / 3; max-height: 88svh; overflow: hidden; background: var(--c-parchment); box-shadow: 0 0 0 1px var(--c-brass); outline: 1px solid var(--c-brass); outline-offset: 10px; }
    .photo img { width: 100%; height: 100%; object-fit: cover; object-position: center 60%; filter: sepia(0.5) saturate(0.5) contrast(1.05) brightness(0.98); transition: transform 1.2s var(--ease); }
    .photo:hover img { transform: scale(1.03); }
    .photo figcaption { position: absolute; left: 0; right: 0; bottom: 0; padding: 2.5rem 1.25rem 1rem; color: var(--c-ivory); font-size: 0.65rem; background: linear-gradient(to top, rgba(40, 20, 15, 0.6), transparent); }
    @media (max-width: 1023.98px) {
      .text, .photo { grid-column: 1 / -1; }
      .photo { margin-top: 2.5rem; aspect-ratio: 2 / 3; max-width: 26rem; outline-offset: 8px; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VenueSectionComponent {
  protected readonly photo = BALL_TRADITION_IMAGE;
  protected readonly event = signal<EventInfo>(EVENT);
}

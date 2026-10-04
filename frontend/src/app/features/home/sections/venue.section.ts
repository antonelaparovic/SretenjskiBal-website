import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { EVENT } from '../../../core/content/site-content';
import { EventInfo } from '../../../core/models/content.models';
import { EditorialImageComponent } from '../../../shared/components/editorial-image/editorial-image.component';
import { SectionHeadingComponent } from '../../../shared/components/section-heading/section-heading.component';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-venue-section',
  imports: [EditorialImageComponent, SectionHeadingComponent, RevealDirective, RouterLink],
  template: `
    <section class="bg-parchment venue" aria-labelledby="venue-title">
      <div class="media">
        <app-editorial-image
          i18n-alt alt="Istorijska zgrada u Mariboru"
          brief="Foto: fasada ili stepenište istorijske zgrade u Mariboru, bez ljudi, meko predvečerje"
        />
      </div>
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
            <a class="text-link accent" routerLink="/prostor" i18n>Kako stići</a>
          </div>
        </address>
      </div>
    </section>
  `,
  styles: `
    .venue { padding-bottom: var(--section-y); }
    .media { height: clamp(360px, 44vw, 640px); }
    .media app-editorial-image { height: 100%; }
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
  protected readonly event = signal<EventInfo>(EVENT);
}

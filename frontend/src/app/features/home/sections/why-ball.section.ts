import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '../../../shared/directives/reveal.directive';

@Component({
  selector: 'app-why-ball-section',
  imports: [RouterLink, RevealDirective],
  template: `
    <section class="section bg-forest" aria-labelledby="ball-title">
      <div class="container grid">
        <h2 id="ball-title" class="h1 title" appReveal i18n>Bal nikada nije bio samo ples.</h2>
        <div class="body" appReveal [appRevealDelay]="120">
          <p class="lead" i18n>
            U 19. veku bal je širom srednje Evrope, pa i u srpskoj građanskoj sredini, bio mesto susreta,
            razgovora, kulture i dobrotvornog rada. Muzika je bila povod, a zajednica smisao.
          </p>
          <a class="text-link brass" routerLink="/balska-tradicija" i18n>Priča o balskoj kulturi</a>
        </div>
      </div>
    </section>
  `,
  styles: `
    .title { grid-column: 1 / span 6; font-size: clamp(3rem, 6vw, 5.25rem); }
    .body { grid-column: 8 / span 5; display: flex; flex-direction: column; align-items: flex-start; gap: 2rem; padding-top: 1rem; }
    .lead { color: var(--c-on-dark-soft); }
    .brass { color: var(--c-brass); }
    @media (max-width: 1023.98px) { .title, .body { grid-column: 1 / -1; } .body { margin-top: 2rem; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhyBallSectionComponent {}

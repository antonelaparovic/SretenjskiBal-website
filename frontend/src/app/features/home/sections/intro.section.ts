import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '../../../shared/directives/reveal.directive';

/**
 * Predah između dva bordo bloka: pergament, centrirana kompozicija.
 * Naslov, mesingana linija i tri rečenice kao glavni element.
 */
@Component({
  selector: 'app-intro-section',
  imports: [RevealDirective],
  template: `
    <section class="intro bg-parchment paper" aria-labelledby="intro-title">
      <div class="container inner">
        <h2 id="intro-title" class="h1 title" appReveal i18n>Neke tradicije počinju tiho.</h2>
        <span class="rule" aria-hidden="true" appReveal [appRevealDelay]="160"></span>
        <p class="quote lines" appReveal [appRevealDelay]="240" i18n>
          <span>Jednim susretom.</span>
          <span>Jednom večeri.</span>
          <span>Jednom idejom.</span>
        </p>
      </div>
    </section>
  `,
  styles: `
    .intro { padding-block: clamp(5rem, 9vw, 8.5rem); }
    .inner { display: flex; flex-direction: column; align-items: center; text-align: center; }
    .title { max-width: 14em; font-size: clamp(2.75rem, 6vw, 5.25rem); }
    .rule { display: block; width: 64px; height: 1px; margin: clamp(2rem, 3.5vw, 3rem) 0; background: var(--c-brass); }
    .lines { display: flex; flex-direction: column; gap: 0.15em; color: var(--c-burgundy); font-size: clamp(1.75rem, 3vw, 2.5rem); }
    .lines span { display: block; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IntroSectionComponent {}

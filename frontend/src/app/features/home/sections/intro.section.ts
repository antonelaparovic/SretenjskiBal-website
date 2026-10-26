import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '../../../shared/directives/reveal.directive';

@Component({
  selector: 'app-intro-section',
  imports: [RevealDirective],
  template: `
    <section class="section bg-parchment paper" aria-labelledby="intro-title">
      <div class="container grid">
        <h2 id="intro-title" class="h1 title" appReveal i18n>Neke tradicije počinju tiho.</h2>
        <div class="body" appReveal [appRevealDelay]="120">
          <p class="quote accent" i18n>Jednim susretom.<br />Jednom večeri.<br />Jednom idejom.</p>
          <p class="lead" i18n>
            13. februara 2027. u Mariboru počinje Sretenjski bal — kulturno-muzičko veče posvećeno susretu,
            zajedništvu i savremenom nastavku građanske balske kulture.
          </p>
          <!-- Sakriveno dok stranica O balu ne bude spremna:
          <a class="text-link accent" routerLink="/o-balu" i18n>Otkrijte priču</a> -->
        </div>
      </div>
    </section>
  `,
  styles: `
    .title { grid-column: 1 / span 8; }
    .body { grid-column: 8 / span 5; margin-top: clamp(2rem, 7vw, 6rem); display: flex; flex-direction: column; align-items: flex-start; gap: 2rem; }
    .accent { color: var(--c-burgundy); }
    @media (max-width: 1023.98px) { .title, .body { grid-column: 1 / -1; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IntroSectionComponent {}

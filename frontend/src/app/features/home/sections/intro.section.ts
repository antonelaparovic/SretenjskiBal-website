import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '../../../shared/directives/reveal.directive';

@Component({
  selector: 'app-intro-section',
  imports: [RevealDirective],
  template: `
    <section class="intro bg-parchment paper" aria-labelledby="intro-title">
      <div class="container grid">
        <h2 id="intro-title" class="h1 title" appReveal i18n>Neke tradicije počinju tiho.</h2>
        <div class="body" appReveal [appRevealDelay]="120">
          <p class="quote accent" i18n>Jednim susretom.<br />Jednom večeri.<br />Jednom idejom.</p>
        </div>
      </div>
    </section>
  `,
  styles: `
    /* Uža sekcija: samo naslov i tri rečenice. */
    .intro { padding-block: clamp(3.5rem, 6vw, 5.5rem); }
    .grid { align-items: center; }
    .title { grid-column: 1 / span 7; }
    .body { grid-column: 8 / span 5; }
    .accent { color: var(--c-burgundy); }
    @media (max-width: 1023.98px) { .title, .body { grid-column: 1 / -1; } .body { margin-top: 1.5rem; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IntroSectionComponent {}

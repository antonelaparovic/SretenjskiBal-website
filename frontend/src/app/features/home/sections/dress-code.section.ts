import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '../../../shared/directives/reveal.directive';

@Component({
  selector: 'app-dress-code-section',
  imports: [RevealDirective],
  template: `
    <section id="pravila-oblacenja" class="section bg-ivory" aria-labelledby="dress-title">
      <div class="container">
        <div class="head" appReveal>
          <h2 id="dress-title" class="h2" i18n>Pravila oblačenja</h2>
          <p class="lead" i18n>Bal je veče koje traži svečanost i u načinu odevanja.</p>
        </div>
        <div class="columns" appReveal [appRevealDelay]="120">
          <div class="col">
            <h3 class="label accent" i18n>Dame</h3>
            <p class="rule-text" i18n>Balske i duge večernje haljine.</p>
          </div>
          <div class="col">
            <h3 class="label accent" i18n>Gospoda</h3>
            <p class="rule-text" i18n>Smoking ili formalno tamno odelo sa leptir mašnom.</p>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: `
    .head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 1.5rem 3rem; }
    .head .lead { max-width: 26em; }
    .columns { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); margin: clamp(3rem, 6vw, 5rem) 0 0; border-top: 1px solid var(--c-brass); }
    .col { display: flex; flex-direction: column; gap: 1.1rem; padding-top: 3rem; }
    .col:first-child { padding-right: clamp(1.5rem, 4vw, 3.75rem); border-right: 1px solid var(--c-brass); }
    .col:last-child { padding-left: clamp(1.5rem, 4vw, 3.75rem); }
    .rule-text { font-family: var(--font-display); font-weight: 300; font-size: clamp(1.75rem, 2.6vw, 2.25rem); line-height: 1.25; }
    .accent { color: var(--c-burgundy); }
    @media (max-width: 767.98px) {
      .columns { grid-template-columns: 1fr; }
      .col:first-child { padding-right: 0; padding-bottom: 2.5rem; border-right: 0; border-bottom: 1px solid var(--c-brass); }
      .col:last-child { padding-left: 0; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DressCodeSectionComponent {}

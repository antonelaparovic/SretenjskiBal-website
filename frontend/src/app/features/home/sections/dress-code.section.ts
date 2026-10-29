import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '../../../shared/directives/reveal.directive';

interface Guide {
  title: string;
  icon: 'gown' | 'bow';
  allowed: string[];
  forbidden: string[];
}

@Component({
  selector: 'app-dress-code-section',
  imports: [RevealDirective],
  template: `
    <section id="pravila-oblacenja" class="section dress" aria-labelledby="dress-title">
      <div class="container">
        <div class="head" appReveal>
          <div class="head__title">
            <p class="label eyebrow" i18n>Kodeks oblačenja · Dress code</p>
            <h2 id="dress-title" class="display title" i18n>Formal / Black Tie</h2>
          </div>
          <p class="lead" i18n>Svečani karakter bala podrazumeva i odgovarajući kodeks oblačenja.</p>
        </div>

        <div class="cols">
          @for (g of guides; track g.title; let i = $index) {
            <article class="col" appReveal [appRevealDelay]="i * 140">
              <h3 class="col__title">
                @if (g.icon === 'gown') {
                  <svg class="ico ico--gown" viewBox="0 0 30 40" aria-hidden="true"><path d="M11 2C10 6 9 8 9.500 11c.5 2.500 2 3.500 2.500 5C11 24 6 31 2 38c6 1.500 9-.5 13 1 4-1.500 7 .5 13-1-4-7-9-14-10-22 .5-1.500 2-2.500 2.500-5C21 8 20 6 19 2 M9.500 11c2.500 2 8.500 2 11 0 M12 16h6 M15 17c0 7-1 14-1.500 21" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                } @else {
                  <svg class="ico" viewBox="0 0 40 24" aria-hidden="true"><path d="M20 12L3 3v18zM20 12l17-9v18z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><rect x="16.5" y="8" width="7" height="8" rx="1.5" fill="currentColor"/></svg>
                }
                <span>{{ g.title }}</span>
              </h3>

              <p class="label sub" i18n>Predviđeno</p>
              <ul class="list yes">
                @for (t of g.allowed; track t) {
                  <li>
                    <svg class="mark" viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 10.5l4 4 9-9.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    <span>{{ t }}</span>
                  </li>
                }
              </ul>

              <p class="label sub sub--no" i18n>Nije dozvoljeno</p>
              <ul class="list no">
                @for (t of g.forbidden; track t) {
                  <li>
                    <svg class="mark" viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 4.5l11 11M15.5 4.5l-11 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
                    <span>{{ t }}</span>
                  </li>
                }
              </ul>
            </article>
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    .dress { background: var(--c-parchment); color: var(--c-ink); }
    .head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 1.5rem 4rem; }
    .head__title { display: flex; flex-direction: column; gap: 1.25rem; }
    .eyebrow { color: var(--c-burgundy); }
    .title { font-size: clamp(2.6rem, 6vw, 5rem); line-height: 1; }
    .lead { max-width: 24em; color: var(--c-ink-soft); }

    .cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: clamp(2.5rem, 7vw, 6rem); margin-top: clamp(3rem, 6vw, 5rem); }
    .col { display: flex; flex-direction: column; }
    .col__title { display: flex; align-items: center; gap: 1rem; padding-bottom: 1.5rem; margin-bottom: 2rem; border-bottom: 1px solid var(--c-rule-brass); font-family: var(--font-display); font-weight: 500; font-size: clamp(1.9rem, 3.2vw, 2.6rem); line-height: 1; letter-spacing: 0.04em; text-transform: uppercase; }
    .ico { width: 2.2rem; height: auto; color: var(--c-burgundy); flex: none; }
    .ico--gown { width: 1.9rem; height: 2.5rem; }
    .sub { color: var(--c-ink-soft); margin-bottom: 0.4rem; }
    .sub--no { margin-top: 2.25rem; color: var(--c-burgundy); }
    .list li { display: flex; align-items: center; gap: 0.9rem; padding: 0.9rem 0; border-bottom: 1px solid var(--c-rule-dark); font-size: 1.0625rem; }
    .mark { width: 1.15rem; height: 1.15rem; flex: none; }
    .yes .mark { color: var(--c-ink-soft); }
    .no .mark { color: var(--c-burgundy); }
    .no li { color: var(--c-ink-soft); }

    @media (max-width: 767.98px) { .cols { grid-template-columns: 1fr; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DressCodeSectionComponent {
  protected readonly guides: Guide[] = [
    {
      title: $localize`Za dame`,
      icon: 'gown',
      allowed: [$localize`Duga večernja ili balska haljina do poda`, $localize`Elegantna svečana obuća`],
      forbidden: [
        $localize`Kratke i koktel haljine`,
        $localize`Kratke suknje i dnevna odeća`,
        $localize`Patike i neformalna obuća`,
        $localize`Narodne nošnje`,
      ],
    },
    {
      title: $localize`Za gospodu`,
      icon: 'bow',
      allowed: [
        $localize`Crni frak ili smoking`,
        $localize`Elegantno crno ili tamno odelo`,
        $localize`Bela košulja i leptir mašna`,
        $localize`Elegantne svečane cipele`,
      ],
      forbidden: [
        $localize`Kravate umesto leptir mašne`,
        $localize`Sportska i neformalna odeća`,
        $localize`Patike`,
        $localize`Narodne nošnje`,
      ],
    },
  ];
}

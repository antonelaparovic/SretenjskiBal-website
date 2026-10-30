import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '../../../shared/directives/reveal.directive';

interface Guide {
  title: string;
  image: string;
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
                <span>{{ g.title }}</span>
              </h3>

              <div class="col__body">
              <div class="col__lists">
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
              </div>
              <img class="figure" [src]="g.image" alt="" width="388" height="900" loading="lazy" decoding="async" />
              </div>
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
    .col__body { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: clamp(1.25rem, 3vw, 2.5rem); align-items: end; }
    .figure { height: clamp(18rem, 32vw, 27rem); width: auto; align-self: end; opacity: 0.62; }
    .sub { color: var(--c-ink-soft); margin-bottom: 0.4rem; }
    .sub--no { margin: 2.25rem 0 0; padding: 0.7rem 1rem; font-weight: 600; color: var(--c-ivory); background: var(--c-burgundy); }
    .no { border: 1px solid var(--c-burgundy); border-top: 0; padding: 0 1rem; background: rgba(90, 23, 35, 0.05); }
    .list li { display: flex; align-items: center; gap: 0.9rem; padding: 0.9rem 0; border-bottom: 1px solid var(--c-rule-dark); font-size: 1.0625rem; }
    .mark { width: 1.15rem; height: 1.15rem; flex: none; }
    .yes .mark { color: var(--c-ink-soft); }
    .no .mark { color: var(--c-burgundy); }
    .no li { color: var(--c-ink); }
    .no li:last-child { border-bottom: 0; }

    @media (max-width: 767.98px) { .cols { grid-template-columns: 1fr; } }
    @media (max-width: 479.98px) { .col__body { gap: 1rem; } .figure { height: 14rem; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DressCodeSectionComponent {
  protected readonly guides: Guide[] = [
    {
      title: $localize`Za dame`,
      image: '/images/silueta-dama.png',
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
      image: '/images/silueta-gospoda.png',
      allowed: [
        $localize`Crni frak ili smoking`,
        $localize`Elegantno crno ili tamno odelo`,
        $localize`Bela košulja i leptir mašna`,
        $localize`Elegantna svečana obuća`,
      ],
      forbidden: [
        $localize`Kravate umesto leptir mašne`,
        $localize`Sportska i neformalna odeća`,
        $localize`Patike i neformalna obuća`,
        $localize`Narodne nošnje`,
      ],
    },
  ];
}

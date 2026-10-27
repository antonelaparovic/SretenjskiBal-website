import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '../../../shared/directives/reveal.directive';

interface Guide {
  title: string;
  allowed: string[];
  forbidden: string[];
}

@Component({
  selector: 'app-dress-code-section',
  imports: [RevealDirective],
  template: `
    <section id="pravila-oblacenja" class="section bg-ivory dress" aria-labelledby="dress-title">
      <span class="ghost" aria-hidden="true">Black Tie</span>
      <div class="container">
        <div class="head" appReveal>
          <p class="label eyebrow" i18n>Kodeks oblačenja · Dress code</p>
          <h2 id="dress-title" class="display title" i18n>Formal / Black Tie</h2>
          <p class="lead" i18n>Svečani karakter bala podrazumeva i odgovarajući kodeks oblačenja.</p>
        </div>

        <div class="cards">
          @for (g of guides; track g.title; let i = $index) {
            <article class="card" appReveal [appRevealDelay]="i * 140">
              <h3 class="card__title">{{ g.title }}</h3>
              <span class="rule" aria-hidden="true"></span>

              <p class="label sub" i18n>Predviđeno</p>
              <ul class="list yes">
                @for (t of g.allowed; track t) { <li>{{ t }}</li> }
              </ul>

              <p class="label sub sub--no" i18n>Nije dozvoljeno</p>
              <ul class="list no">
                @for (t of g.forbidden; track t) { <li>{{ t }}</li> }
              </ul>
            </article>
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    .dress { position: relative; overflow: hidden; }
    .ghost { position: absolute; left: 50%; top: 4%; transform: translateX(-50%); font-family: var(--font-display); font-style: italic; font-size: clamp(8rem, 24vw, 22rem); line-height: 1; white-space: nowrap; color: transparent; -webkit-text-stroke: 1px rgba(180, 154, 99, 0.25); pointer-events: none; user-select: none; }
    .container { position: relative; }
    .head { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 1.25rem; max-width: 40rem; margin: 0 auto; }
    .eyebrow { color: var(--c-burgundy); }
    .title { font-size: clamp(2.6rem, 6vw, 5rem); line-height: 1; color: var(--c-wine); }
    .lead { max-width: 28em; }

    .cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: clamp(1.5rem, 4vw, 3.5rem); margin-top: clamp(3rem, 6vw, 5rem); }
    .card { position: relative; display: flex; flex-direction: column; gap: 0.9rem; padding: clamp(5rem, 9vw, 7.5rem) clamp(1.5rem, 4vw, 3.25rem) clamp(2rem, 4vw, 3rem); background: var(--c-parchment); border: 1px solid var(--c-brass); border-radius: 999px 999px 0 0 / 260px 260px 0 0; transition: transform 0.6s var(--ease), box-shadow 0.6s var(--ease); }
    .card::before { content: ''; position: absolute; inset: 10px; border: 1px solid rgba(180, 154, 99, 0.45); border-radius: 999px 999px 0 0 / 250px 250px 0 0; pointer-events: none; }
    .card:hover { transform: translateY(-6px); box-shadow: 0 24px 50px -28px rgba(64, 16, 24, 0.5); }
    .card__title { text-align: center; font-family: var(--font-display); font-weight: 500; font-size: clamp(2rem, 3.4vw, 2.75rem); line-height: 1.1; color: var(--c-burgundy); text-transform: none; }
    .rule { align-self: center; width: 3rem; height: 1px; background: var(--c-brass); margin: 0.4rem 0 1rem; position: relative; }
    .rule::after { content: ''; position: absolute; left: 50%; top: -3px; width: 7px; height: 7px; transform: translateX(-50%) rotate(45deg); background: var(--c-parchment); border: 1px solid var(--c-brass); }
    .sub { color: var(--c-burgundy); margin-top: 0.5rem; }
    .sub--no { margin-top: 1.75rem; color: rgba(23, 20, 19, 0.55); }
    .list { display: flex; flex-direction: column; gap: 0.7rem; }
    .list li { position: relative; padding-left: 1.6rem; font-weight: 300; line-height: 1.5; }
    .yes li::before { content: ''; position: absolute; left: 0.2rem; top: 0.6em; width: 6px; height: 6px; transform: rotate(45deg); background: var(--c-brass); }
    .no li { color: rgba(23, 20, 19, 0.6); }
    .no li::before { content: '×'; position: absolute; left: 0.1rem; top: -0.05em; font-size: 1.15rem; color: var(--c-burgundy); opacity: 0.7; }

    @media (max-width: 767.98px) {
      .cards { grid-template-columns: 1fr; }
      .card { border-radius: 999px 999px 0 0 / 180px 180px 0 0; padding-top: 5.5rem; }
      .card::before { border-radius: 999px 999px 0 0 / 170px 170px 0 0; }
    }
    @media (prefers-reduced-motion: reduce) { .card, .card:hover { transition: none; transform: none; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DressCodeSectionComponent {
  protected readonly guides: Guide[] = [
    {
      title: $localize`Za dame`,
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

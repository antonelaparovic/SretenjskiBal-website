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
    <section id="pravila-oblacenja" class="section bg-ivory" aria-labelledby="dress-title">
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
              <h3 class="col__title">{{ g.title }}</h3>

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
    .head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 1.5rem 4rem; }
    .head__title { display: flex; flex-direction: column; gap: 1.25rem; }
    .eyebrow { color: var(--c-burgundy); }
    .title { font-size: clamp(2.6rem, 6vw, 5rem); line-height: 1; color: var(--c-wine); }
    .lead { max-width: 24em; }

    .cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: clamp(3rem, 6vw, 5rem); border-top: 1px solid var(--c-brass); }
    .col { display: flex; flex-direction: column; padding-top: 3rem; }
    .col:first-child { padding-right: clamp(1.5rem, 5vw, 4.5rem); border-right: 1px solid var(--c-brass); }
    .col:last-child { padding-left: clamp(1.5rem, 5vw, 4.5rem); }
    .col__title { font-family: var(--font-display); font-weight: 400; font-size: clamp(2.2rem, 4vw, 3.25rem); line-height: 1.05; color: var(--c-burgundy); margin-bottom: 2.25rem; }
    .sub { color: var(--c-burgundy); margin-bottom: 0.5rem; }
    .sub--no { margin-top: 2.5rem; color: rgba(23, 20, 19, 0.5); }
    .list li { padding: 0.85rem 0; border-bottom: 1px solid rgba(180, 154, 99, 0.35); font-weight: 300; font-size: 1.0625rem; }
    .yes li { font-family: var(--font-display); font-size: clamp(1.25rem, 1.8vw, 1.5rem); font-weight: 400; }
    .no li { color: rgba(23, 20, 19, 0.55); text-decoration: line-through; text-decoration-color: rgba(90, 23, 35, 0.45); }

    @media (max-width: 767.98px) {
      .cols { grid-template-columns: 1fr; }
      .col:first-child { padding-right: 0; padding-bottom: 3rem; border-right: 0; border-bottom: 1px solid var(--c-brass); }
      .col:last-child { padding-left: 0; }
    }
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

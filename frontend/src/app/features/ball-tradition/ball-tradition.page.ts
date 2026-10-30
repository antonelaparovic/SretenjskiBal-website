import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';
import { RevealDirective } from '../../shared/directives/reveal.directive';

interface Chapter {
  mark: string;
  title: string;
  text: string[];
}

/** Stranica „Balska tradicija": istorija bala od ballare do Narodnog doma u Mariboru. */
@Component({
  selector: 'app-ball-tradition-page',
  imports: [RouterLink, RevealDirective],
  template: `
    <section class="hero bg-wine" aria-labelledby="bt-title">
      <span class="ghost" aria-hidden="true">ballare</span>
      <div class="container hero__in">
        <p class="label brass rise" style="--d: 0ms" i18n>Balska tradicija</p>
        <h1 id="bt-title" class="display rise" style="--d: 120ms" i18n>Bal nikada nije bio samo ples.</h1>
        <p class="lead rise" style="--d: 260ms" i18n>Reč postoji od 12. veka, od latinskog <em>ballare</em> — igrati.</p>
        <span class="scroll rise" style="--d: 500ms" aria-hidden="true"></span>
      </div>
    </section>

    <section class="section bg-parchment paper" aria-label="Istorija balova">
      <div class="container">
        <ol class="chapters">
          @for (c of chapters; track c.mark; let i = $index) {
            <li class="chapter" appReveal>
              <div class="mark-col">
                <span class="mark">{{ c.mark }}</span>
              </div>
              <div class="text-col">
                <h2 class="chapter__title">{{ c.title }}</h2>
                @for (t of c.text; track t) {
                  <p>{{ t }}</p>
                }
              </div>
            </li>
          }
        </ol>
      </div>
    </section>

    <section class="section bg-burgundy closing" aria-labelledby="bt-closing">
      <div class="container narrow">
        <div class="lines" appReveal>
          <p class="quote" i18n>Tako su prostori za susret postajali više od prostora.</p>
          <p class="quote soft" i18n>Postajali su mesta na kojima se gradila kultura, povezivali ljudi i stvarale ideje koje su trajale mnogo duže od jedne večeri.</p>
        </div>
        <p class="lead" appReveal [appRevealDelay]="100" i18n>Bio je to način da se ljudi sretnu, različite kulture približe i da iz jednog susreta nastane nešto što će trajati.</p>
        <h2 id="bt-closing" class="final" appReveal [appRevealDelay]="150" i18n>Sretenjski bal u Mariboru nastaje sa istom idejom — kao susret srpske i slovenačke kulture i kao početak jedne nove tradicije.</h2>
        <a class="btn cta" routerLink="/rezervacija" appReveal [appRevealDelay]="200" i18n>Rezerviši ulaznice</a>
      </div>
    </section>
  `,
  styles: `
    .brass { color: var(--c-brass); }
    .hero { position: relative; overflow: hidden; min-height: 88svh; display: flex; align-items: center; padding: calc(var(--header-h) + 3rem) 0 5rem; }
    .hero__in { position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 1.75rem; }
    .display { font-size: clamp(3rem, 8vw, 7rem); line-height: 0.98; max-width: 12ch; }
    .lead { color: var(--c-on-dark-soft); max-width: 30em; }
    .lead em { color: var(--c-brass); font-family: var(--font-display); font-size: 1.15em; }
    .ghost { position: absolute; right: -2vw; bottom: -0.15em; font-family: var(--font-display); font-style: italic; font-size: clamp(8rem, 28vw, 26rem); line-height: 1; color: transparent; -webkit-text-stroke: 1px rgba(180, 154, 99, 0.28); white-space: nowrap; pointer-events: none; user-select: none; animation: drift 24s ease-in-out infinite alternate; }
    .scroll { width: 1px; height: 4.5rem; margin-top: 1.5rem; background: linear-gradient(var(--c-brass), transparent); transform-origin: top; animation: grow 2.4s ease-in-out 1.2s infinite; }
    .rise { opacity: 0; transform: translateY(18px); animation: rise 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) forwards; animation-delay: var(--d, 0ms); }
    @keyframes rise { to { opacity: 1; transform: none; } }
    @keyframes drift { from { transform: translateX(0); } to { transform: translateX(-4vw); } }
    @keyframes grow { 0% { transform: scaleY(0); } 60% { transform: scaleY(1); opacity: 1; } 100% { transform: scaleY(1); opacity: 0; } }

    .chapters { position: relative; margin: 0; padding: 0; list-style: none; }
    .chapters::before { content: ''; position: absolute; top: 0; bottom: 0; left: calc(33.333% - 1px); width: 1px; background: linear-gradient(var(--c-brass), rgba(180, 154, 99, 0.15)); }
    .chapter { position: relative; display: grid; grid-template-columns: 1fr 2fr; gap: 0 clamp(2rem, 6vw, 5rem); padding-bottom: clamp(3.5rem, 7vw, 6rem); }
    .chapter:last-child { padding-bottom: 0; }
    .chapter::before { content: ''; position: absolute; left: calc(33.333% - 5px); top: 1.4rem; width: 9px; height: 9px; background: var(--c-parchment); border: 1px solid var(--c-brass); transform: rotate(45deg); }
    .mark-col { text-align: right; }
    .mark { position: sticky; top: calc(var(--header-h) + 1.5rem); display: inline-block; font-family: var(--font-display); font-size: clamp(2.4rem, 5vw, 4.5rem); line-height: 1.05; color: var(--c-burgundy); padding-right: 1.5rem; }
    .text-col { display: flex; flex-direction: column; gap: 1.1rem; max-width: 36em; padding-top: 0.4rem; }
    .chapter__title { font-family: var(--font-display); font-weight: 500; font-size: clamp(1.5rem, 2.4vw, 2rem); color: var(--c-wine); }
    .text-col p { font-weight: 300; line-height: 1.75; }

    .closing { padding-block: clamp(5rem, 10vw, 9rem); }
    .narrow { display: flex; flex-direction: column; gap: 2.5rem; max-width: 52rem; }
    .lines { display: flex; flex-direction: column; gap: 1.2rem; }
    .quote.soft { color: var(--c-on-dark-soft); font-family: var(--font-body); font-style: normal; font-weight: 300; font-size: 1.1rem; line-height: 1.7; max-width: 34em; }
    .final { font-family: var(--font-display); font-weight: 400; font-size: clamp(1.8rem, 3.6vw, 2.9rem); line-height: 1.2; color: var(--c-brass); padding-top: 2.5rem; border-top: 1px solid rgba(180, 154, 99, 0.4); }
    .cta { align-self: flex-start; background: var(--c-ivory); color: var(--c-wine); }
    .cta:hover { background: transparent; color: var(--c-ivory); border-color: var(--c-brass); }

    @media (max-width: 767.98px) {
      .chapters::before { left: 0.5rem; }
      .chapter { grid-template-columns: 1fr; padding-left: 2.25rem; gap: 0.75rem; }
      .chapter::before { left: calc(0.5rem - 4px); }
      .mark-col { text-align: left; }
      .mark { position: static; padding: 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .rise { animation: none; opacity: 1; transform: none; }
      .ghost, .scroll { animation: none; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BallTraditionPage {
  protected readonly chapters: Chapter[] = [
    {
      mark: '1834.',
      title: $localize`Kragujevac, dvor kneza Miloša`,
      text: [
        $localize`Prvi bal u Kneževini Srbiji održan je 1834. u Kragujevcu, na dvoru kneza Miloša.`,
        $localize`Kroz decenije koje su usledile, balovi su bili mesta susreta, razgovora, povezivanja i dogovora. Na njima su se susretali ljudi iz sveta politike, kulture, privrede i umetnosti, a dobrotvorni balovi prikupljali su sredstva za škole, društva i druge javne potrebe.`,
      ],
    },
    {
      mark: $localize`1860-ih`,
      title: $localize`Slovenačke zemlje i čitalnice`,
      text: [
        $localize`I u slovenačkim zemljama ples je odavno bio deo građanskog i društvenog života, ali se do tada balska kultura razvijala u okviru tadašnjih građanskih krugova, često pod snažnim nemačkim i austrijskim kulturnim uticajem.`,
        $localize`Od šezdesetih godina 19. veka počinje da se razvija mreža slovenskih čitalnica.`,
      ],
    },
    {
      mark: '1863.',
      title: $localize`Čitalnica u Kranju`,
      text: [
        $localize`Kada je 1863. otvorena čitalnica u Kranju, nakon izvođenja pesme „Hej Slovani“ otpočeo je ples kojim je svečanost i završena.`,
        $localize`Čitalnice su predstavljale prostore u kojima se nisu samo čitale knjige, već se okupljalo, slušala muzika, održavale predstave, predavanja i, naravno, plesalo.`,
      ],
    },
    {
      mark: '1898.',
      title: $localize`U Mariboru je ta ideja dobila svoj dom`,
      text: [
        $localize`Godine 1898. podignut je Narodni dom, središte kulturnog i društvenog života mariborskih Slovenaca. Pod njegovim krovom našli su se čitaonica, biblioteka, muzička i dramska društva, dok su se u svečanoj dvorani održavali koncerti, predstave, skupovi — i plesovi.`,
      ],
    },
  ];

  constructor() {
    inject(SeoService).set({
      title: `${$localize`Balska tradicija`} | Sretenjski bal`,
      description: $localize`Bal nikada nije bio samo ples: od latinskog ballare, preko prvog bala u Kragujevcu i slovenačkih čitalnica, do Narodnog doma u Mariboru.`,
      path: '/balska-tradicija',
    });
  }
}

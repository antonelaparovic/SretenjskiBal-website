import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EVENT, TICKETS } from '../../../core/content/site-content';
import { formatPrice } from '../../../core/util/format';
import { RevealDirective } from '../../../shared/directives/reveal.directive';

@Component({
  selector: 'app-tickets-section',
  imports: [RevealDirective, RouterLink],
  template: `
    <section id="karte" class="section bg-wine" aria-labelledby="tickets-title">
      <div class="container">
        <div class="head" appReveal>
          <h2 id="tickets-title" class="display title">
            <span i18n>Neke večeri ostaju zauvek u sećanju.</span>
            <span class="brass" i18n>Neke postaju tradicija.</span>
          </h2>
          <p class="lead" i18n>
            Sretenjski bal otvara svoja vrata za prvi susret u Mariboru — veče posvećeno kulturi, muzici i zajedništvu.
          </p>
        </div>

        <p class="label kicker" appReveal i18n>Ulaznice · dve kategorije</p>

        <ul class="cards">
          @for (t of tickets; track t.code; let i = $index) {
            <li class="card" appReveal [appRevealDelay]="i * 140">
              <h3 class="name">{{ t.name }}</h3>
              @if (t.description) { <p class="desc">{{ t.description }}</p> }
              <p class="price" [class.price--soon]="t.priceCents <= 0">
                @if (salesStatus === 'SOLD_OUT' || t.soldOut) {
                  <span class="sold" i18n>Rasprodato</span>
                } @else if (t.priceCents > 0) {
                  {{ price(t.priceCents) }}
                } @else {
                  <ng-container i18n>Cena uskoro</ng-container>
                }
              </p>
            </li>
          }
        </ul>

        <p class="note" appReveal i18n>
          Bilo da veče provedete za svečano postavljenim stolovima ili na galeriji, očekuje vas bogat
          kulturno-umetnički program, muzika i susreti koji daju poseban smisao našem okupljanju.
        </p>

        @switch (salesStatus) {
          @case ('COMING_SOON') { <p class="quote status" appReveal i18n>Prodaja uskoro počinje.</p> }
          @case ('SOLD_OUT') { <p class="quote status" appReveal i18n>Sve karte su rasprodate.</p> }
          @case ('OPEN') {
            <a class="btn cta" routerLink="/rezervacija" appReveal i18n>Rezerviši ulaznice</a>
          }
        }
      </div>
    </section>
  `,
  styles: `
    .head { display: flex; flex-direction: column; gap: 2rem; max-width: 46rem; }
    .title { font-size: clamp(2.4rem, 5.2vw, 4.5rem); line-height: 1.05; display: flex; flex-direction: column; }
    .brass { color: var(--c-brass); font-style: italic; }
    .lead { color: var(--c-on-dark-soft); max-width: 32em; }
    .kicker { color: var(--c-brass); margin-top: clamp(3.5rem, 7vw, 6rem); }

    .cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: clamp(1.25rem, 3vw, 2.5rem); margin-top: 1.5rem; }
    .card { position: relative; display: flex; flex-direction: column; gap: 0.75rem; padding: clamp(2rem, 4vw, 3.25rem); border: 1px solid var(--c-rule-brass); transition: border-color 0.5s var(--ease), background 0.5s var(--ease); }
    .card::before { content: ''; position: absolute; left: clamp(2rem, 4vw, 3.25rem); top: 0; width: 3rem; height: 2px; background: var(--c-brass); }
    .card:hover { border-color: var(--c-brass); background: rgba(246, 241, 232, 0.03); }
    .name { font-family: var(--font-display); font-weight: 400; font-size: clamp(2.2rem, 3.6vw, 3rem); line-height: 1.05; }
    .desc { font-weight: 300; color: var(--c-on-dark-soft); min-height: 3em; }
    .price { margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--c-rule-brass); font-family: var(--font-display); font-size: clamp(3rem, 5vw, 4.5rem); line-height: 1; color: var(--c-brass); }
    .price--soon { font-size: 1.25rem; font-style: italic; }
    .sold { font-size: 1.25rem; font-style: italic; color: rgba(246, 241, 232, 0.6); }

    .note { margin-top: clamp(2rem, 4vw, 3rem); max-width: 44rem; font-size: 1.125rem; font-weight: 300; line-height: 1.75; color: var(--c-on-dark-soft); }
    .status { color: var(--c-brass); margin-top: 2rem; }
    .cta { margin-top: clamp(2rem, 4vw, 3rem); background: var(--c-ivory); color: var(--c-wine); }
    .cta:hover { background: transparent; color: var(--c-ivory); border-color: var(--c-brass); }
    @media (max-width: 767.98px) { .cards { grid-template-columns: 1fr; } .desc { min-height: 0; } }
    @media (prefers-reduced-motion: reduce) { .card { transition: none; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketsSectionComponent {
  protected readonly tickets = TICKETS;
  protected readonly salesStatus = EVENT.salesStatus;
  protected price(cents: number): string {
    return formatPrice(cents);
  }
}

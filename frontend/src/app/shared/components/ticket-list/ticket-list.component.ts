import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SalesStatus, TicketType } from '../../../core/models/content.models';
import { formatPrice } from '../../../core/util/format';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '../../directives/reveal.directive';

/** Kategorije karata kao redovi. */
@Component({
  selector: 'app-ticket-list',
  imports: [RevealDirective, RouterLink],
  template: `
    <ul class="list">
      @for (t of rows(); track t.name) {
        <li class="ticket" appReveal>
          <div class="info">
            <h3 class="name">{{ t.name }}</h3>
            @if (t.description) { <p class="desc">{{ t.description }}</p> }
          </div>
          <p class="price" [class.price--soon]="!t.hasPrice">{{ t.price }}</p>
          <div class="action">
            @switch (t.state) {
              @case ('open') {
                @if (t.internal) {
                  <a class="btn btn--outline-light" [routerLink]="t.ctaUrl" i18n>Rezerviši ulaznicu</a>
                } @else {
                  <a class="btn btn--outline-light" [href]="t.ctaUrl" target="_blank" rel="noopener" i18n>Rezerviši ulaznicu</a>
                }
              }
              @case ('sold') { <span class="label muted" i18n>Rasprodato</span> }
              @default { <span class="label muted" i18n>Uskoro</span> }
            }
          </div>
        </li>
      }
    </ul>
  `,
  styles: `
    .list { border-top: 1px solid var(--c-rule-brass); }
    .ticket {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      align-items: center;
      gap: 1.5rem 2rem;
      padding: 2rem 0;
      border-bottom: 1px solid var(--c-rule-brass);
    }
    .name { font-family: var(--font-display); font-weight: 400; font-size: clamp(1.625rem, 2.4vw, 2rem); line-height: 1.1; }
    .desc { margin-top: 0.4rem; font-size: 0.9375rem; font-weight: 300; color: var(--c-on-dark-soft); }
    .price { font-family: var(--font-display); font-size: clamp(1.5rem, 2.2vw, 1.875rem); color: var(--c-brass); }
    .price--soon { font-size: 1.125rem; font-style: italic; }
    .muted { color: rgba(246, 241, 232, 0.6); }
    @media (max-width: 767.98px) {
      .ticket { grid-template-columns: minmax(0, 1fr) auto; }
      .action { grid-column: 1 / -1; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketListComponent {
  readonly tickets = input.required<TicketType[]>();
  readonly salesStatus = input.required<SalesStatus>();

  protected readonly rows = computed(() =>
    this.tickets().map((t) => ({
      name: t.name,
      description: t.description,
      hasPrice: t.priceCents > 0,
      price: t.priceCents > 0 ? formatPrice(t.priceCents) : $localize`Cena uskoro`,
      ctaUrl: t.ctaUrl,
      /** '/rezervacija' — forma na samom sajtu; ostalo je spoljni prodavac karata. */
      internal: !!t.ctaUrl?.startsWith('/'),
      state:
        this.salesStatus() === 'SOLD_OUT' || t.soldOut
          ? 'sold'
          : this.salesStatus() === 'OPEN' && t.ctaUrl
            ? 'open'
            : 'soon',
    })),
  );
}

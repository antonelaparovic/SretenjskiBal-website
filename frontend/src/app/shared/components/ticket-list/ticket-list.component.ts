import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SalesStatus, TicketType } from '../../../core/models/content.models';
import { formatPrice } from '../../../core/util/format';
import { RevealDirective } from '../../directives/reveal.directive';

/** Vrste ulaznica kao redovi: naziv i cena. Dugme za rezervaciju je jedno, ispod liste (tickets.section). */
@Component({
  selector: 'app-ticket-list',
  imports: [RevealDirective],
  template: `
    <ul class="list">
      @for (t of rows(); track t.name) {
        <li class="ticket" appReveal>
          <div class="info">
            <h3 class="name">{{ t.name }}</h3>
            @if (t.description) { <p class="desc">{{ t.description }}</p> }
            @if (t.includes.length) {
              <ul class="includes">
                @for (i of t.includes; track i) { <li>{{ i }}</li> }
              </ul>
            }
          </div>
          @if (t.sold) {
            <p class="label muted" i18n>Rasprodato</p>
          } @else {
            <p class="price" [class.price--soon]="!t.hasPrice">{{ t.price }}</p>
          }
        </li>
      }
    </ul>
  `,
  styles: `
    .list { border-top: 1px solid var(--c-rule-brass); }
    .ticket {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 1.5rem 2rem;
      padding: 2.25rem 0;
      border-bottom: 1px solid var(--c-rule-brass);
    }
    .name { font-family: var(--font-display); font-weight: 400; font-size: clamp(1.875rem, 2.8vw, 2.5rem); line-height: 1.1; }
    .desc { margin-top: 0.4rem; font-size: 0.9375rem; font-weight: 300; color: var(--c-on-dark-soft); }
    .includes { margin-top: 1.1rem; display: flex; flex-direction: column; gap: 0.5rem; max-width: 34em; }
    .includes li { position: relative; padding-left: 1.4rem; font-size: 1.125rem; font-weight: 300; line-height: 1.5; color: var(--c-on-dark-soft); }
    .includes li::before { content: ''; position: absolute; left: 0.15rem; top: 0.6em; width: 5px; height: 5px; transform: rotate(45deg); background: var(--c-brass); }
    .price { font-family: var(--font-display); font-size: clamp(1.875rem, 2.8vw, 2.5rem); color: var(--c-brass); }
    .price--soon { font-size: 1.125rem; font-style: italic; }
    .muted { color: rgba(246, 241, 232, 0.6); }
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
      includes: t.includes ?? [],
      hasPrice: t.priceCents > 0,
      price: t.priceCents > 0 ? formatPrice(t.priceCents) : $localize`Cena uskoro`,
      sold: this.salesStatus() === 'SOLD_OUT' || t.soldOut,
    })),
  );
}

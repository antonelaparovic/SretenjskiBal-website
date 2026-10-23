import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EVENT, TICKETS } from '../../../core/content/site-content';
import { TicketListComponent } from '../../../shared/components/ticket-list/ticket-list.component';
import { RevealDirective } from '../../../shared/directives/reveal.directive';

@Component({
  selector: 'app-tickets-section',
  imports: [TicketListComponent, RevealDirective],
  template: `
    <section id="karte" class="section bg-wine" aria-labelledby="tickets-title">
      <div class="container grid">
        <div class="intro" appReveal>
          <h2 id="tickets-title" class="display title" i18n>Rezervacija</h2>
          @switch (salesStatus) {
            @case ('COMING_SOON') { <p class="quote status" i18n>Prodaja uskoro počinje.</p> }
            @case ('SOLD_OUT') { <p class="quote status" i18n>Sve karte su rasprodate.</p> }
          }
        </div>
        <div class="list">
          <app-ticket-list [tickets]="tickets" [salesStatus]="salesStatus" />
        </div>
      </div>
    </section>
  `,
  styles: `
    .intro { grid-column: 1 / span 4; display: flex; flex-direction: column; gap: 1.75rem; }
    .title { font-size: clamp(5rem, 9vw, 8rem); line-height: 0.9; }
    .status { color: var(--c-brass); }
    .list { grid-column: 6 / span 7; }
    @media (max-width: 1023.98px) { .intro, .list { grid-column: 1 / -1; } .list { margin-top: 2.5rem; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketsSectionComponent {
  protected readonly tickets = TICKETS;
  protected readonly salesStatus = EVENT.salesStatus;
}

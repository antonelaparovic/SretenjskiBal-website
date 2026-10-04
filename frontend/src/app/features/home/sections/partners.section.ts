import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SPONSORS } from '../../../core/content/site-content';
import { SponsorGridComponent } from '../../../shared/components/sponsor-grid/sponsor-grid.component';
import { RevealDirective } from '../../../shared/directives/reveal.directive';

@Component({
  selector: 'app-partners-section',
  imports: [RouterLink, SponsorGridComponent, RevealDirective],
  template: `
    <section class="section bg-ivory" aria-labelledby="partners-title">
      <div class="container inner">
        <h2 id="partners-title" class="h2" appReveal i18n>Partneri i prijatelji bala</h2>
        @if (sponsors.length) {
          <app-sponsor-grid appReveal [sponsors]="sponsors" />
        }
        <div class="invite" appReveal>
          @if (!sponsors.length) {
            <p class="lead" i18n>Prvo izdanje bala nastaje uz partnere koji dele njegovu ideju.</p>
          }
          <a class="btn btn--outline-dark" routerLink="/kontakt" [queryParams]="{ tema: 'PARTNERSTVO' }" i18n>Postanite partner</a>
        </div>
      </div>
    </section>
  `,
  styles: `
    .inner { display: flex; flex-direction: column; align-items: center; gap: clamp(3rem, 5vw, 4.5rem); text-align: center; }
    .invite { display: flex; flex-direction: column; align-items: center; gap: 2rem; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartnersSectionComponent {
  protected readonly sponsors = SPONSORS;
}

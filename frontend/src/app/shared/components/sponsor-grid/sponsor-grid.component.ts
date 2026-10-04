import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Sponsor, SponsorTier } from '../../../core/models/content.models';

const TIER_ORDER: SponsorTier[] = ['POKROVITELJ', 'ZLATNI', 'SREBRNI', 'BRONZANI', 'PRIJATELJ', 'MEDIJSKI'];

const TIER_LABEL: Record<SponsorTier, string> = {
  POKROVITELJ: $localize`Pokrovitelj`,
  ZLATNI: $localize`Zlatni partneri`,
  SREBRNI: $localize`Srebrni partneri`,
  BRONZANI: $localize`Bronzani partneri`,
  PRIJATELJ: $localize`Prijatelji bala`,
  MEDIJSKI: $localize`Medijski partneri`,
};

/** Logotipi po nivoima; jednobojni i vizuelno izjednačeni (visina opada sa nivoom). */
@Component({
  selector: 'app-sponsor-grid',
  template: `
    @for (group of groups(); track group.tier) {
      <section class="tier" [attr.aria-label]="group.label">
        <h3 class="label tier__label">{{ group.label }}</h3>
        <ul class="logos" [class.logos--lead]="group.tier === 'POKROVITELJ'">
          @for (s of group.items; track s.name) {
            <li>
              <a class="logo" [attr.href]="s.url ?? null" target="_blank" rel="noopener" [attr.aria-label]="s.name">
                @if (s.logoUrl) {
                  <img [src]="s.logoUrl" [alt]="s.name" loading="lazy" decoding="async" />
                } @else {
                  <span class="logo__name">{{ s.name }}</span>
                }
              </a>
            </li>
          }
        </ul>
      </section>
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 4rem; }
    .tier { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; }
    .tier__label { color: var(--c-burgundy); font-size: 0.6875rem; }
    .logos { display: flex; flex-wrap: wrap; justify-content: center; gap: 2rem 3.5rem; }
    .logo { display: flex; align-items: center; justify-content: center; height: 56px; min-width: 120px; }
    .logos--lead .logo { height: 88px; min-width: 200px; }
    .logo img { max-height: 100%; max-width: 200px; width: auto; filter: grayscale(1) contrast(1.1); opacity: 0.78; transition: opacity var(--dur-base) var(--ease); }
    .logos--lead .logo img { max-width: 280px; }
    .logo:hover img { opacity: 1; }
    .logo__name { font-family: var(--font-display); font-size: 1.375rem; color: var(--c-ink-soft); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SponsorGridComponent {
  readonly sponsors = input.required<Sponsor[]>();

  protected readonly groups = computed(() =>
    TIER_ORDER.map((tier) => ({
      tier,
      label: TIER_LABEL[tier],
      items: this.sponsors()
        .filter((s) => s.tier === tier),
    })).filter((g) => g.items.length > 0),
  );
}

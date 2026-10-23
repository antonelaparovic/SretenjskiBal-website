import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Oznaka iznad naslova + naslov sekcije. Nivo naslova je podesiv radi hijerarhije. */
@Component({
  selector: 'app-section-heading',
  imports: [NgTemplateOutlet],
  // Sadržaj se projektuje jednom (u ng-template), pa se prikazuje u naslovu izabranog nivoa.
  // Više <ng-content /> unutar @switch ne radi: Angular sadržaj stavlja samo u jedan od njih.
  template: `
    <ng-template #content><ng-content /></ng-template>
    @if (eyebrow()) {
      <p class="label eyebrow">{{ eyebrow() }}</p>
    }
    @switch (level()) {
      @case (1) { <h1 class="h2" [id]="headingId()"><ng-container [ngTemplateOutlet]="content" /></h1> }
      @case (3) { <h3 class="h2" [id]="headingId()"><ng-container [ngTemplateOutlet]="content" /></h3> }
      @default { <h2 class="h2" [id]="headingId()"><ng-container [ngTemplateOutlet]="content" /></h2> }
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 1.5rem; }
    .eyebrow { color: var(--eyebrow-color, var(--c-burgundy)); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionHeadingComponent {
  readonly eyebrow = input<string | null>(null);
  readonly level = input<1 | 2 | 3>(2);
  readonly headingId = input<string | null>(null);
}

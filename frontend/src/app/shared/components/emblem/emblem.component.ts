import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Znak Sretenjskog bala. Dekorativan osim ako se prosledi label. */
@Component({
  selector: 'app-emblem',
  template: `<img
    src="/brand/emblem.svg"
    [attr.alt]="label() ?? ''"
    [attr.aria-hidden]="label() ? null : 'true'"
    [style.width.px]="size()"
    width="384"
    height="275"
    decoding="async"
  />`,
  styles: `
    :host { display: inline-block; line-height: 0; }
    img { height: auto; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmblemComponent {
  readonly size = input(56);
  readonly label = input<string | null>(null);
}

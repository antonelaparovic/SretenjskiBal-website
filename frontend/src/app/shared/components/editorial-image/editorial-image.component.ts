import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RevealDirective } from '../../directives/reveal.directive';

/**
 * Urednička fotografija. Dok prave fotografije nisu snimljene, prikazuje
 * toniranu površinu sa opisom šta tu treba da stoji (brief za fotografa).
 */
@Component({
  selector: 'app-editorial-image',
  imports: [NgOptimizedImage, RevealDirective],
  template: `
    <figure class="frame" [class.frame--arch]="arch()" [class.frame--dark]="tone() === 'dark'" appReveal [appRevealImage]="true">
      @if (src(); as s) {
        <img [ngSrc]="s" [alt]="alt()" fill [priority]="priority()" sizes="(max-width: 1024px) 100vw, 60vw" />
      } @else {
        <div class="placeholder" role="img" [attr.aria-label]="alt()">
          <span class="placeholder__brief">{{ brief() }}</span>
        </div>
      }
    </figure>
  `,
  styles: `
    :host { display: block; }
    .frame {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 280px;
      overflow: hidden;
      background: var(--c-placeholder-warm);
    }
    .frame--dark { background: var(--c-placeholder-dark); }
    .frame--arch { border-radius: 999px 999px 0 0 / 360px 360px 0 0; }
    img { object-fit: cover; transition: transform 900ms var(--ease); }
    .frame:hover img { transform: scale(1.02); }
    .placeholder {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding: 1.5rem;
    }
    .placeholder__brief {
      max-width: 28em;
      text-align: center;
      font-size: 0.6875rem;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: rgba(23, 20, 19, 0.7);
    }
    .frame--dark .placeholder__brief { color: rgba(246, 241, 232, 0.55); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorialImageComponent {
  readonly src = input<string | null>(null);
  readonly alt = input.required<string>();
  /** Opis fotografije za fotografa, vidljiv samo dok nema prave slike. */
  readonly brief = input('');
  readonly arch = input(false);
  readonly tone = input<'warm' | 'dark'>('warm');
  readonly priority = input(false);
}

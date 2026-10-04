import {
  Directive,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  input,
  DestroyRef,
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

/**
 * Blago otkrivanje elementa kad uđe u ekran.
 * Na serveru i bez JS-a sadržaj je vidljiv; klasa .js-reveal na <html>
 * uključuje animaciju tek u browseru. Poštuje prefers-reduced-motion.
 */
@Directive({
  selector: '[appReveal]',
  host: { '[class.reveal]': '!image()', '[class.reveal-image]': 'image()' },
})
export class RevealDirective {
  readonly image = input(false, { alias: 'appRevealImage' });
  /** Kašnjenje u ms, za smenjivanje više elemenata u istoj sekciji. */
  readonly delay = input(0, { alias: 'appRevealDelay' });

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    const platformId = inject(PLATFORM_ID);
    const doc = inject(DOCUMENT);
    const destroyRef = inject(DestroyRef);
    if (!isPlatformBrowser(platformId)) return;

    afterNextRender(() => {
      const node = this.el.nativeElement;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce || !('IntersectionObserver' in window)) {
        node.classList.add('is-visible');
        return;
      }
      // Ono što je već na ekranu pri učitavanju ne skrivamo (bez treptaja).
      const rect = node.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        node.classList.add('is-visible');
        doc.documentElement.classList.add('js-reveal');
        return;
      }
      doc.documentElement.classList.add('js-reveal');
      if (this.delay()) node.style.transitionDelay = `${this.delay()}ms`;

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              node.classList.add('is-visible');
              observer.disconnect();
            }
          }
        },
        { rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
      );
      observer.observe(node);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}

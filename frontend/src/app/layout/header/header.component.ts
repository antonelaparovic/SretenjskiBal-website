import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { EmblemComponent } from '../../shared/components/emblem/emblem.component';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';
import { MAIN_NAV } from '../nav';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, EmblemComponent, LanguageSwitcherComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closeMenu()' },
})
export class HeaderComponent {
  protected readonly nav = MAIN_NAV;
  protected readonly menuOpen = signal(false);
  private readonly scrolled = signal(false);
  private readonly doc = inject(DOCUMENT);
  private readonly menuButton = viewChild<ElementRef<HTMLButtonElement>>('menuButton');

  private readonly url = toSignal(
    inject(Router).events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: inject(Router).url },
  );

  /** Providan samo preko hera na početnoj, dok se ne skroluje. */
  protected readonly transparent = computed(
    () => this.url().split(/[?#]/)[0] === '/' && !this.scrolled() && !this.menuOpen(),
  );

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const onScroll = () => this.scrolled.set(window.scrollY > 48);
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
      destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll));
    });

    effect(() => {
      this.url();
      this.menuOpen.set(false);
    });

    effect(() => {
      this.doc.body.style.overflow = this.menuOpen() ? 'hidden' : '';
    });
  }

  protected toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  protected closeMenu(): void {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    this.menuButton()?.nativeElement.focus();
  }
}

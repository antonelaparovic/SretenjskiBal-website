import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Tih odbrojavač: dani, sati, minuti. Osvežava se jednom u minuti.
 * Kad uđe u ekran, cifre se „zavrte" kao brojač: svaka traka prođe jedan pun krug
 * od 0 do prave cifre (desne cifre kasnije staju). Bez JS-a i uz smanjen pokret
 * odmah se vide prave vrednosti.
 */
@Component({
  selector: 'app-countdown',
  template: `
    @if (remaining(); as r) {
      <dl class="countdown" [class.is-rolling]="rolling()" [class.is-settled]="settled()" i18n-aria-label aria-label="Do bala je ostalo">
        @for (u of units(); track u.key) {
          <div>
            <dt class="label">{{ u.label }}</dt>
            <dd>
              <span class="visually-hidden">{{ u.value }}</span>
              <span class="digits" aria-hidden="true">
                @for (c of u.chars; track $index) {
                  <span class="digit">
                    <span class="roll" [style.--d]="c + 10" [style.--i]="$index + u.offset">
                      @for (n of digits; track $index) { <i>{{ n }}</i> }
                    </span>
                  </span>
                }
              </span>
            </dd>
          </div>
        }
      </dl>
    }
  `,
  styles: `
    .countdown { display: flex; gap: 2.25rem; margin: 0; padding-top: 1.75rem; border-top: 1px solid var(--c-rule-brass); }
    .countdown div { display: flex; flex-direction: column-reverse; }
    dd { margin: 0; font-family: var(--font-display); font-weight: 300; font-size: 2.75rem; line-height: 1; font-variant-numeric: lining-nums tabular-nums; }
    dt { margin-top: 0.5rem; font-size: 0.6875rem; color: var(--c-on-dark-soft); }

    .digits { display: inline-flex; }
    .digit { display: block; height: 1em; overflow: hidden; }
    .roll { display: flex; flex-direction: column; transform: translateY(calc(var(--d) * -1em)); }
    .roll i { display: block; height: 1em; font-style: normal; text-align: center; }

    /* Samo u browseru: cifre kreću od nule i zavrte se do prave vrednosti kad sekcija uđe u ekran. */
    :host-context(.js-reveal) .roll { transform: translateY(0); }
    :host-context(.js-reveal) .is-rolling .roll {
      transform: translateY(calc(var(--d) * -1em));
      transition: transform 2400ms cubic-bezier(0.22, 0.7, 0.15, 1);
      transition-delay: calc(var(--i) * 140ms);
    }
    /* Posle prvog okretanja minuti se menjaju bez animacije. */
    :host-context(.js-reveal) .is-settled .roll { transition: none; }

    @media (prefers-reduced-motion: reduce) {
      :host-context(.js-reveal) .roll { transform: translateY(calc(var(--d) * -1em)); transition: none; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountdownComponent {
  readonly target = input.required<string>();
  private readonly now = signal(Date.now());
  protected readonly rolling = signal(false);
  protected readonly settled = signal(false);
  protected readonly digits = DIGITS;

  protected readonly remaining = computed(() => {
    const ms = new Date(this.target()).getTime() - this.now();
    if (!Number.isFinite(ms) || ms <= 0) return null;
    return {
      days: String(Math.floor(ms / 86_400_000)),
      hours: String(Math.floor(ms / 3_600_000) % 24).padStart(2, '0'),
      minutes: String(Math.floor(ms / 60_000) % 60).padStart(2, '0'),
    };
  });

  protected readonly units = computed(() => {
    const r = this.remaining();
    if (!r) return [];
    const mk = (key: string, label: string, value: string, offset: number) => ({
      key,
      label,
      value,
      offset,
      chars: value.split('').map(Number),
    });
    const days = mk('d', $localize`Dana`, r.days, 0);
    const hours = mk('h', $localize`Sati`, r.hours, days.chars.length);
    const minutes = mk('m', $localize`Minuta`, r.minutes, days.chars.length + hours.chars.length);
    return [days, hours, minutes];
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    const host = inject<ElementRef<HTMLElement>>(ElementRef);
    afterNextRender(() => {
      this.now.set(Date.now());
      const id = setInterval(() => this.now.set(Date.now()), 60_000);
      destroyRef.onDestroy(() => clearInterval(id));

      const io = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          io.disconnect();
          this.rolling.set(true);
          setTimeout(() => this.settled.set(true), 4500);
        },
        { threshold: 0.6 },
      );
      io.observe(host.nativeElement);
      destroyRef.onDestroy(() => io.disconnect());
    });
  }
}

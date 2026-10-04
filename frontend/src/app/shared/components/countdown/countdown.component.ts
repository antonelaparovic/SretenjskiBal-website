import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

/** Tih odbrojavač: dani, sati, minuti. Osvežava se jednom u minuti. */
@Component({
  selector: 'app-countdown',
  template: `
    @if (remaining(); as r) {
      <dl class="countdown" i18n-aria-label aria-label="Do bala je ostalo">
        <div><dt class="label" i18n>Dana</dt><dd>{{ r.days }}</dd></div>
        <div><dt class="label" i18n>Sati</dt><dd>{{ r.hours }}</dd></div>
        <div><dt class="label" i18n>Minuta</dt><dd>{{ r.minutes }}</dd></div>
      </dl>
    }
  `,
  styles: `
    .countdown { display: flex; gap: 2.25rem; margin: 0; padding-top: 1.75rem; border-top: 1px solid var(--c-rule-brass); }
    .countdown div { display: flex; flex-direction: column-reverse; }
    dd { margin: 0; font-family: var(--font-display); font-weight: 300; font-size: 2.75rem; line-height: 1; font-variant-numeric: tabular-nums; }
    dt { margin-top: 0.5rem; font-size: 0.6875rem; color: var(--c-on-dark-soft); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountdownComponent {
  readonly target = input.required<string>();
  private readonly now = signal(Date.now());

  protected readonly remaining = computed(() => {
    const ms = new Date(this.target()).getTime() - this.now();
    if (!Number.isFinite(ms) || ms <= 0) return null;
    return {
      days: Math.floor(ms / 86_400_000),
      hours: String(Math.floor(ms / 3_600_000) % 24).padStart(2, '0'),
      minutes: String(Math.floor(ms / 60_000) % 60).padStart(2, '0'),
    };
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.now.set(Date.now());
      const id = setInterval(() => this.now.set(Date.now()), 60_000);
      destroyRef.onDestroy(() => clearInterval(id));
    });
  }
}

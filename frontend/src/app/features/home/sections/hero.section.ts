import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmblemComponent } from '../../../shared/components/emblem/emblem.component';
import { EditorialImageComponent } from '../../../shared/components/editorial-image/editorial-image.component';

@Component({
  selector: 'app-hero-section',
  imports: [RouterLink, EmblemComponent, EditorialImageComponent],
  template: `
    <section class="hero" aria-labelledby="hero-title">
      <div class="media" aria-hidden="true">
        <app-editorial-image
          tone="dark"
          [priority]="true"
          alt=""
          brief="Foto ili video: neorenesansna sala u Mariboru, lusteri, parket, večernje svetlo"
        />
      </div>
      <div class="scrim" aria-hidden="true"></div>

      <div class="container content">
        <app-emblem class="rise d1" [size]="96" />
        <h1 id="hero-title" class="title rise d2">
          <span>Sretenjski</span>
          <span>bal</span>
        </h1>
        <span class="line" aria-hidden="true"></span>
        <p class="when rise d3">
          <time datetime="2027-02-13">13 — 02 — 2027</time>
          <span class="city">Maribor</span>
        </p>
        <p class="tagline rise d4" i18n>Kultura koja spaja.</p>
        <div class="actions rise d5">
          <a class="btn btn--primary" routerLink="/rezervacija" i18n>Rezervacija</a>
          <a class="text-link" routerLink="/o-balu" i18n>O balu</a>
        </div>
      </div>
    </section>
  `,
  styles: `
    .hero {
      position: relative;
      min-height: max(640px, 100svh);
      display: flex;
      align-items: flex-end;
      color: var(--c-ivory);
      overflow: hidden;
    }
    .media { position: absolute; inset: 0; }
    .media app-editorial-image { height: 100%; }
    .scrim { position: absolute; inset: 0; background: rgba(23, 20, 19, 0.5); }
    .content {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2rem;
      padding-top: calc(var(--header-h) + 4rem);
      padding-bottom: clamp(4rem, 10vh, 7rem);
    }
    .title {
      display: flex;
      flex-direction: column;
      font-family: var(--font-display);
      font-weight: 300;
      font-size: var(--fs-hero);
      line-height: 0.86;
      letter-spacing: 0.01em;
      text-transform: uppercase;
    }
    .line {
      display: block;
      width: 180px;
      height: 1px;
      background: var(--c-brass);
      transform-origin: left;
      animation: draw-line 600ms var(--ease) 500ms both;
    }
    .when {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 2.5rem;
      font-size: 0.9375rem;
      letter-spacing: 0.3em;
      text-transform: uppercase;
    }
    .city { color: var(--c-brass); }
    .tagline {
      font-family: var(--font-display);
      font-style: italic;
      font-weight: 300;
      font-size: clamp(1.75rem, 2.6vw, 2.125rem);
    }
    .actions { display: flex; align-items: center; gap: 2.25rem; margin-top: 0.5rem; }
    .actions .text-link { color: var(--c-ivory); }
    .rise { animation: rise 600ms var(--ease) both; }
    .d1 { animation-delay: 100ms; }
    .d2 { animation-delay: 220ms; }
    .d3 { animation-delay: 420ms; }
    .d4 { animation-delay: 540ms; }
    .d5 { animation-delay: 660ms; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroSectionComponent {}

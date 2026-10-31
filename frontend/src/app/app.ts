import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { HeaderComponent } from './layout/header/header.component';
import { FooterComponent } from './layout/footer/footer.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  template: `
    @if (!bare()) {
      <a class="skip-link" href="#main" i18n>Preskoči na sadržaj</a>
      <app-header />
    }
    <main id="main" tabindex="-1">
      <router-outlet />
    </main>
    @if (!bare()) {
      <app-footer />
    }
  `,
  styles: `main:focus { outline: none; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly router = inject(Router);

  /** Stranice sa data: { bare: true } (npr. skeniranje na ulazu) prikazuju se bez zaglavlja i podnožja. */
  protected readonly bare = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => isBare(this.router.routerState.snapshot.root)),
    ),
    { initialValue: false },
  );
}

function isBare(route: ActivatedRouteSnapshot): boolean {
  let r: ActivatedRouteSnapshot | null = route;
  while (r) {
    if (r.data['bare']) return true;
    r = r.firstChild;
  }
  return false;
}

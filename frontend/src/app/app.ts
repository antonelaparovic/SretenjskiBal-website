import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './layout/header/header.component';
import { FooterComponent } from './layout/footer/footer.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  template: `
    <a class="skip-link" href="#main" i18n>Preskoči na sadržaj</a>
    <app-header />
    <main id="main" tabindex="-1">
      <router-outlet />
    </main>
    <app-footer />
  `,
  styles: `main:focus { outline: none; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmblemComponent } from '../../shared/components/emblem/emblem.component';
import { FOOTER_NAV, LEGAL_NAV } from '../nav';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, EmblemComponent],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  protected readonly nav = FOOTER_NAV;
  protected readonly legal = LEGAL_NAV;
  protected readonly year = 2027;
}

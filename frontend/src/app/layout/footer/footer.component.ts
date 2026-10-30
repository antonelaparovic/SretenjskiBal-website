import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '../../shared/directives/reveal.directive';
import { EmblemComponent } from '../../shared/components/emblem/emblem.component';
import { ORGANIZER } from '../../core/content/site-content';
import { FOOTER_SECTION_IDS, FOOTER_STORY, LEGAL_NAV, SECTION_NAV } from '../nav';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, EmblemComponent, RevealDirective],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  protected readonly sections = SECTION_NAV.filter((s) => s.id && FOOTER_SECTION_IDS.includes(s.id));
  protected readonly story = FOOTER_STORY;
  protected readonly legal = LEGAL_NAV;
  protected readonly org = ORGANIZER;
  protected readonly year = 2027;
}

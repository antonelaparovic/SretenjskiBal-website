import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HERO_IMAGE } from '../../../core/content/site-content';
import { EmblemComponent } from '../../../shared/components/emblem/emblem.component';

/**
 * Hero „Bordo noć": tamni bordo, fotografija Narodnog doma tonirana u bordo
 * (kad postoji) i plesni par (linijski crtež) koji se polako ukazuje.
 */
@Component({
  selector: 'app-hero-section',
  imports: [NgOptimizedImage, RouterLink, EmblemComponent],
  templateUrl: './hero.section.html',
  styleUrl: './hero.section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroSectionComponent {
  protected readonly image = HERO_IMAGE;
}

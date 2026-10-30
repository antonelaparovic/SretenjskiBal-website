import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ORGANIZER } from '../../core/content/site-content';
import { SeoService } from '../../core/services/seo.service';
import { ContactFormComponent } from '../../shared/components/contact-form/contact-form.component';
import { SectionHeadingComponent } from '../../shared/components/section-heading/section-heading.component';

@Component({
  selector: 'app-contact-page',
  imports: [ContactFormComponent, SectionHeadingComponent],
  template: `
    <section class="page section bg-parchment paper" aria-labelledby="contact-title">
      <div class="container grid">
        <div class="intro">
          <app-section-heading [level]="1" headingId="contact-title" i18n-eyebrow eyebrow="Kontakt">
            <ng-container i18n>Pišite nam.</ng-container>
          </app-section-heading>
          <p class="lead" i18n>Zanima Vas partnerstvo, medijsko izveštavanje ili nastup na balu, ili jednostavno imate pitanje o večeri? Pišite nam, rado ćemo Vam odgovoriti u najkraćem roku.</p>
          <p class="note">Kulturni centar Sretenje · Maribor<br /><a class="mail" [href]="'mailto:' + email">{{ email }}</a></p>
        </div>
        <app-contact-form class="form" [topic]="tema()" />
      </div>
    </section>
  `,
  styles: `
    .mail { border-bottom: 1px solid var(--c-brass); transition: color var(--dur-base) var(--ease); }
    .mail:hover { color: var(--c-burgundy); }
    .note { line-height: 1.8; }
    .page { padding-top: calc(var(--header-h) + var(--section-y)); }
    .intro { grid-column: 1 / span 5; display: flex; flex-direction: column; gap: 2rem; }
    .form { grid-column: 7 / span 6; }
    @media (max-width: 1023.98px) { .intro, .form { grid-column: 1 / -1; } .form { margin-top: 3rem; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactPage {
  protected readonly email = ORGANIZER.email;
  /** ?tema=PARTNERSTVO */
  readonly tema = input<string | undefined>();

  constructor() {
    inject(SeoService).set({
      title: $localize`Kontakt | Sretenjski bal`,
      description: $localize`Pišite organizatoru Sretenjskog bala — partnerstva, mediji, nastupi i opšta pitanja.`,
      path: '/kontakt',
    });
  }
}

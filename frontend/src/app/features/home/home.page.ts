import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SeoService } from '../../core/services/seo.service';
import { SITE_URL } from '../../core/config/app.constants';
import { EVENT } from '../../core/content/site-content';
import { HeroSectionComponent } from './sections/hero.section';
import { IntroSectionComponent } from './sections/intro.section';
import { EncounterSectionComponent } from './sections/encounter.section';
import { DateMomentSectionComponent } from './sections/date-moment.section';
import { WhySretenjeSectionComponent } from './sections/why-sretenje.section';
import { WhyBallSectionComponent } from './sections/why-ball.section';
// Program večeri je sakriven dok program ne bude definisan.
// import { ProgramPreviewSectionComponent } from './sections/program-preview.section';
import { VenueSectionComponent } from './sections/venue.section';
import { DressCodeSectionComponent } from './sections/dress-code.section';
import { TicketsSectionComponent } from './sections/tickets.section';
import { OrganizerSectionComponent } from './sections/organizer.section';
import { PartnersSectionComponent } from './sections/partners.section';

@Component({
  selector: 'app-home-page',
  imports: [
    HeroSectionComponent,
    IntroSectionComponent,
    EncounterSectionComponent,
    DateMomentSectionComponent,
    WhySretenjeSectionComponent,
    WhyBallSectionComponent,
    VenueSectionComponent,
    DressCodeSectionComponent,
    TicketsSectionComponent,
    OrganizerSectionComponent,
    PartnersSectionComponent,
  ],
  template: `
    <app-hero-section />
    <app-intro-section />
    <app-encounter-section />
    <app-date-moment-section [startsAt]="event.startsAt" [city]="event.city" />
    <app-why-sretenje-section />
    <app-why-ball-section />
    <!-- Program večeri — sakriveno dok program ne bude definisan:
    <app-program-preview-section /> -->
    <app-venue-section />
    <app-dress-code-section />
    <app-tickets-section />
    <app-organizer-section />
    <app-partners-section />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  protected readonly event = EVENT;

  constructor() {
    const seo = inject(SeoService);
    const e = EVENT;
    seo.set({
      title: $localize`Sretenjski bal 2027 | Maribor`,
      description: $localize`Sretenjski bal, 13. februara 2027. u Mariboru. Kulturno-muzičko veče i početak jedne nove tradicije. Kultura koja spaja.`,
      path: '/',
    });
    seo.setJsonLd('ld-event', {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: `${e.title} ${e.year}`,
      description: e.tagline,
      startDate: e.startsAt,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      image: [`${SITE_URL}/brand/og-image.jpg`],
      location: {
        '@type': 'Place',
        name: e.venueName ?? e.city,
        address: {
          '@type': 'PostalAddress',
          streetAddress: e.venueAddress ?? undefined,
          addressLocality: e.city,
          addressCountry: 'SI',
        },
      },
      organizer: { '@type': 'Organization', name: 'Kulturni centar Sretenje', url: SITE_URL },
      offers: {
        '@type': 'Offer',
        url: `${SITE_URL}/karte`,
        availability:
          e.salesStatus === 'OPEN'
            ? 'https://schema.org/InStock'
            : e.salesStatus === 'SOLD_OUT'
              ? 'https://schema.org/SoldOut'
              : 'https://schema.org/PreOrder',
      },
    });
  }
}

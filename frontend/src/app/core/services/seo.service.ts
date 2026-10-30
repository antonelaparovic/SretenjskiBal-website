import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { SITE_NAME, SITE_URL } from '../config/app.constants';
import { LOCALES, Locale, currentLocale, localePrefix } from '../i18n/locale';

export interface PageSeo {
  title: string;
  description: string;
  /** Putanja bez domena, npr. '/program'. */
  path: string;
  image?: string;
  type?: 'website' | 'article';
}

const OG_LOCALE: Record<Locale, string> = { sr: 'sr_RS', sl: 'sl_SI', en: 'en_GB' };

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);
  private readonly locale = currentLocale();

  set(page: PageSeo): void {
    const url = this.urlFor(this.locale, page.path);
    const image = page.image ?? `${SITE_URL}/brand/og-image.jpg`;

    this.title.setTitle(page.title);
    this.meta.updateTag({ name: 'description', content: page.description });

    this.meta.updateTag({ property: 'og:type', content: page.type ?? 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this.meta.updateTag({ property: 'og:locale', content: OG_LOCALE[this.locale] });
    this.meta.updateTag({ property: 'og:title', content: page.title });
    this.meta.updateTag({ property: 'og:description', content: page.description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: image });

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: page.title });
    this.meta.updateTag({ name: 'twitter:description', content: page.description });
    this.meta.updateTag({ name: 'twitter:image', content: image });

    this.setCanonical(url);
    this.setAlternates(page.path);
  }

  /** Puna adresa stranice u datom jeziku (srpski je u korenu, ostali pod /sl, /en). */
  private urlFor(locale: Locale, path: string): string {
    const clean = path === '/' ? '/' : path;
    return `${SITE_URL}${localePrefix(locale)}${clean}`;
  }

  /** hreflang veze ka svim jezičkim verzijama iste stranice. */
  private setAlternates(path: string): void {
    this.doc.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((n) => n.remove());
    const add = (hreflang: string, href: string) => {
      const link = this.doc.createElement('link');
      link.rel = 'alternate';
      link.hreflang = hreflang;
      link.href = href;
      this.doc.head.appendChild(link);
    };
    for (const l of LOCALES) add(l.code, this.urlFor(l.code, path));
    add('x-default', this.urlFor('sr', path));
  }

  /** Upisuje (ili zamenjuje) JSON-LD blok sa datim id-jem. */
  setJsonLd(id: string, data: Record<string, unknown> | null): void {
    const existing = this.doc.getElementById(id);
    existing?.remove();
    if (!data) return;
    const script = this.doc.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
    this.doc.head.appendChild(script);
  }

  private setCanonical(url: string): void {
    let link = this.doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.rel = 'canonical';
      this.doc.head.appendChild(link);
    }
    link.href = url;
  }
}

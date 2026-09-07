import type { AiSeoMetadata } from './types';

export class SeoService {
  /**
   * Deterministically computes the canonical URL for an article
   */
  public static deriveCanonicalUrl(locale: string, slug: string): string {
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
    const cleanLocale = locale || 'en';
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    return `${siteUrl}/${cleanLocale}/blog/${cleanSlug}`;
  }

  /**
   * Builds the Strapi shared.seo component payload
   */
  public static buildSeoComponent(
    aiSeo: AiSeoMetadata,
    locale: string,
    slug: string,
    coverImageId?: number | null
  ): Record<string, any> {
    const canonicalURL = this.deriveCanonicalUrl(locale, slug);

    return {
      metaTitle: (aiSeo.metaTitle || `${slug} | Chronicle`).slice(0, 70),
      metaDescription: (aiSeo.metaDescription || 'Read our latest architectural insights on Chronicle.').slice(0, 160),
      keywords: aiSeo.keywords || '',
      canonicalURL,
      preventIndexing: false,
      ...(coverImageId ? { shareImage: coverImageId } : {}),
    };
  }
}

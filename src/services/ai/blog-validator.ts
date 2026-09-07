import type { AiBlogGeneratedData, AiValidationResult } from './types';

export class BlogValidator {
  public static validateAndSanitize(raw: any): AiValidationResult {
    const errors: string[] = [];

    if (!raw || typeof raw !== 'object') {
      return { isValid: false, errors: ['AI returned empty or non-object response.'] };
    }

    // Title validation
    let title = typeof raw.title === 'string' ? raw.title.trim() : '';
    if (title.length < 5) {
      errors.push('Article title is too short (minimum 5 characters).');
    }

    // Slug sanitization
    let slug = typeof raw.slug === 'string' ? raw.slug.trim() : '';
    if (!slug) {
      slug = title;
    }
    slug = slug
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (!slug) {
      slug = `article-${Date.now()}`;
    }

    // Excerpt validation
    let excerpt = typeof raw.excerpt === 'string' ? raw.excerpt.trim() : '';
    if (!excerpt && raw.content) {
      excerpt = raw.content.slice(0, 160).replace(/[#*`]/g, '').trim();
    }
    if (!excerpt) {
      errors.push('Article excerpt is missing.');
    }

    // Content validation
    let content = typeof raw.content === 'string' ? raw.content.trim() : '';
    if (content.length < 100) {
      errors.push('Article content is too short (minimum 100 characters).');
    }

    // Reading time
    let readingTime = typeof raw.readingTime === 'number' ? Math.round(raw.readingTime) : 5;
    if (readingTime < 1) readingTime = 1;

    // SEO validation
    const seoRaw = raw.seo || {};
    const metaTitle = (typeof seoRaw.metaTitle === 'string' ? seoRaw.metaTitle.trim() : title).slice(0, 70);
    const metaDescription = (typeof seoRaw.metaDescription === 'string' ? seoRaw.metaDescription.trim() : excerpt).slice(0, 160);

    const seo = {
      metaTitle,
      metaDescription,
      keywords: typeof seoRaw.keywords === 'string' ? seoRaw.keywords : '',
      ogTitle: typeof seoRaw.ogTitle === 'string' ? seoRaw.ogTitle : metaTitle,
      ogDescription: typeof seoRaw.ogDescription === 'string' ? seoRaw.ogDescription : metaDescription,
    };

    // Table of contents extraction / sanitization
    let tableOfContents: Array<{ title: string; anchor: string; level?: number }> = [];
    if (Array.isArray(raw.tableOfContents)) {
      tableOfContents = raw.tableOfContents
        .filter((item: any) => item && typeof item.title === 'string')
        .map((item: any) => ({
          title: item.title.trim(),
          anchor: (item.anchor || item.title).toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
          level: typeof item.level === 'number' ? item.level : 2,
        }));
    } else {
      // Auto-extract from ## headings in markdown if not provided
      const headingMatches = content.matchAll(/^##\s+(.+)$/gm);
      for (const match of headingMatches) {
        const text = match[1].trim();
        tableOfContents.push({
          title: text,
          anchor: text.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
          level: 2,
        });
      }
    }

    const sanitizedData: AiBlogGeneratedData = {
      title,
      slug,
      excerpt,
      content,
      category: typeof raw.category === 'string' ? raw.category.trim() : undefined,
      tags: Array.isArray(raw.tags) ? raw.tags.map((t: any) => String(t).trim()).filter(Boolean) : [],
      readingTime,
      seo,
      imagePrompt: typeof raw.imagePrompt === 'string' ? raw.imagePrompt.trim() : title,
      featured: Boolean(raw.featured),
      tableOfContents: tableOfContents as any,
    };

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData,
    };
  }
}

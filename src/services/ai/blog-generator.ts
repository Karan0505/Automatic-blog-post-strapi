import type { Core } from '@strapi/strapi';
import crypto from 'crypto';
import type {
  AiBlogRequest,
  BlogPublishResult,
  WorkflowStatus,
  ModerationStatus,
} from './types';
import { costLedger } from './cost-ledger';
import { openRouterProvider } from './providers/openrouter-provider';
import { PromptBuilder } from './prompt-builder';
import { BlogValidator } from './blog-validator';
import { ModerationProvider } from './providers/moderation-provider';
import { SeoService } from './seo-service';
import { ImageService } from './image-service';
import { TranslationQueueService } from './translation-worker';

export class BlogGeneratorService {
  private static idempotencyCache = new Map<string, BlogPublishResult>();

  /**
   * Preview mode: Executes cost estimation and prompt preview without writing to database or spending budget
   */
  public static async preview(request: AiBlogRequest) {
    const costEstimate = await costLedger.estimateCost(request);
    const systemPrompt = PromptBuilder.buildSystemPrompt();
    const userPrompt = PromptBuilder.buildUserPrompt(request);

    return {
      costEstimate,
      previewPrompts: {
        systemPrompt,
        userPrompt,
      },
    };
  }

  /**
   * Main publishing pipeline
   */
  public static async generateAndPublish(
    strapi: Core.Strapi,
    request: AiBlogRequest
  ): Promise<BlogPublishResult> {
    // 1. Idempotency Check
    if (request.idempotencyKey && this.idempotencyCache.has(request.idempotencyKey)) {
      console.log(`[BlogGenerator] Returning cached result for idempotencyKey: ${request.idempotencyKey}`);
      return this.idempotencyCache.get(request.idempotencyKey)!;
    }

    const locale = request.locale || 'en';

    // 2. Pre-flight Cost Estimation & Reservation
    const costEstimate = await costLedger.estimateCost(request);
    if (!costEstimate.withinRequestCeiling) {
      throw new Error(
        `Estimated cost ($${costEstimate.totalEstimatedUsd}) exceeds specified request ceiling ($${request.maxCostUsd}). Zero spend incurred.`
      );
    }
    if (!costEstimate.withinDailyBudget) {
      throw new Error(
        `Estimated cost ($${costEstimate.totalEstimatedUsd}) would breach daily budget limit ($${costEstimate.dailyBudgetLimitUsd}). Current spend: $${costEstimate.currentDailySpendUsd}.`
      );
    }

    const reserved = await costLedger.reserve(costEstimate.totalEstimatedUsd, request.maxCostUsd);
    if (!reserved) {
      throw new Error('Failed to reserve budget in ledger. Daily budget ceiling reached.');
    }

    let actualCostUsd = 0;

    try {
      // 3. Check for Duplicate Topics
      const existingPosts = await (strapi.documents('api::post.post') as any).findMany({
        locale,
        filters: {
          $or: [
            { title: { $eqi: request.topic.trim() } },
            { slug: { $eqi: request.topic.toLowerCase().replace(/[^a-z0-9-_]/g, '-') } },
          ],
        },
      });

      if (existingPosts && existingPosts.length > 0) {
        const policy = request.onDuplicateTopic || 'reject';
        if (policy === 'reject') {
          await costLedger.release(costEstimate.totalEstimatedUsd);
          throw new Error(
            `A post with matching topic or slug already exists (documentId: ${existingPosts[0].documentId}). Duplicate policy is 'reject'.`
          );
        }
      }

      // 4. Generate structured content with AI Provider
      const systemPrompt = PromptBuilder.buildSystemPrompt();
      const userPrompt = PromptBuilder.buildUserPrompt(request);

      const aiResponse = await openRouterProvider.generateStructuredJson<any>(
        systemPrompt,
        userPrompt
      );

      actualCostUsd += aiResponse.costUsd;

      // 5. Schema, Boundary & Sanitization Validation
      const validation = BlogValidator.validateAndSanitize(aiResponse.data);
      if (!validation.isValid || !validation.sanitizedData) {
        throw new Error(`AI generated content failed validation: ${validation.errors.join('; ')}`);
      }

      const generated = validation.sanitizedData;

      // 6. Content Moderation Gate
      const moderation = await ModerationProvider.evaluateContent(
        generated.title,
        generated.content,
        generated.excerpt
      );

      let willPublish = Boolean(request.autoPublish) && moderation.status === 'approved';
      let workflowStatus: WorkflowStatus = willPublish ? 'approved' : 'draft';
      let moderationStatus: ModerationStatus = moderation.status;

      if (moderation.status === 'flagged' && request.autoPublish) {
        console.warn(`[BlogGenerator] Content flagged by moderation gate. Disabling auto-publish. Reasons:`, moderation.reasons);
      }

      // 7. Transactional Category, Author, and Tag Resolution
      let categoryDocId: string | null = null;
      if (generated.category || request.category) {
        const catName = request.category || generated.category;
        try {
          const existingCat = await (strapi.documents('api::category.category') as any).findFirst({
            locale,
            filters: { name: { $eqi: catName } },
          });
          if (existingCat) {
            categoryDocId = existingCat.documentId;
          } else {
            const newCat = await (strapi.documents('api::category.category') as any).create({
              locale,
              data: {
                name: catName,
                slug: String(catName).toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
                description: `Articles and publications covering ${catName}`,
              },
            });
            categoryDocId = newCat?.documentId || null;
          }
        } catch (catErr: any) {
          console.warn('[BlogGenerator] Category resolution warning:', catErr.message);
        }
      }

      // Author resolution
      let authorDocId: string | null = null;
      try {
        const authorFilter = request.author ? { name: { $eqi: request.author } } : {};
        const author = await (strapi.documents('api::author.author') as any).findFirst({
          locale,
          filters: authorFilter,
        });
        if (author) {
          authorDocId = author.documentId;
        }
      } catch (authErr: any) {
        console.warn('[BlogGenerator] Author resolution warning:', authErr.message);
      }

      // Tags resolution
      const tagDocIds: string[] = [];
      if (generated.tags && generated.tags.length > 0) {
        for (const tagName of generated.tags.slice(0, 5)) {
          try {
            const existingTag = await (strapi.documents('api::tag.tag') as any).findFirst({
              locale,
              filters: { name: { $eqi: tagName } },
            });
            if (existingTag) {
              tagDocIds.push(existingTag.documentId);
            } else {
              const newTag = await (strapi.documents('api::tag.tag') as any).create({
                locale,
                data: {
                  name: tagName,
                  slug: tagName.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
                },
              });
              if (newTag?.documentId) tagDocIds.push(newTag.documentId);
            }
          } catch (tagErr: any) {
            console.warn(`[BlogGenerator] Tag "${tagName}" resolution note:`, tagErr.message);
          }
        }
      }

      // 8. Optional Image Generation with Built-in Sharp WebP Compression
      let coverImageId: number | null = null;
      if (request.imageUrl) {
        try {
          const imgResult = await ImageService.downloadCompressAndUpload(
            strapi,
            request.imageUrl,
            generated.slug,
            generated.title,
            request.imageCompressionConfig
          );
          coverImageId = imgResult.coverImageId;
        } catch (imgErr: any) {
          console.warn('[BlogGenerator] Direct image download failed:', imgErr.message);
        }
      } else if (request.generateImage !== false) {
        const imageResult = await ImageService.generateCompressAndUpload(
          strapi,
          generated.imagePrompt || `${generated.title} ${request.topic}`,
          generated.slug,
          request.imageCompressionConfig,
          { category: generated.category || request.category, tags: generated.tags }
        );
        coverImageId = imageResult.coverImageId;
        actualCostUsd += imageResult.costUsd;
      }

      // Reconcile spend with ledger
      await costLedger.reconcile(costEstimate.totalEstimatedUsd, actualCostUsd);

      // 9. Build SEO and Post Data Payload
      const canonicalUrl = SeoService.deriveCanonicalUrl(locale, generated.slug);
      const seoPayload = SeoService.buildSeoComponent(generated.seo, locale, generated.slug, coverImageId);

      const postDataPayload: Record<string, any> = {
        title: generated.title,
        slug: generated.slug,
        excerpt: generated.excerpt,
        content: generated.content,
        readingTime: generated.readingTime,
        featured: Boolean(request.featured || generated.featured),
        trending: false,
        aiGenerated: true,
        aiModel: aiResponse.model,
        aiPrompt: request.topic,
        aiCostUsd: Number(actualCostUsd.toFixed(5)),
        moderationStatus,
        workflowStatus,
        seo: seoPayload,
        tableOfContents: generated.tableOfContents || [],
        ...(coverImageId ? { coverImage: coverImageId } : {}),
        ...(categoryDocId ? { category: { set: [categoryDocId] } } : {}),
        ...(authorDocId ? { author: { set: [authorDocId] } } : {}),
        ...(tagDocIds.length > 0 ? { tags: { set: tagDocIds } } : {}),
      };

      // 10. Create Post in Strapi 5 Document Service
      const createdPost = await (strapi.documents('api::post.post') as any).create({
        locale,
        data: postDataPayload,
      });

      const documentId = createdPost.documentId;
      let finalStatus: 'draft' | 'published' = 'draft';

      // 11. Auto-publish if requested and passed moderation
      if (willPublish) {
        try {
          await (strapi.documents('api::post.post') as any).publish({
            documentId,
            locale,
          });
          finalStatus = 'published';
          console.log(`[BlogGenerator] ✅ Auto-published master post ${documentId} (${locale})`);
        } catch (pubErr: any) {
          console.warn('[BlogGenerator] Auto-publish warning:', pubErr.message);
        }
      }

      // 12. HMAC-signed Next.js Revalidation
      let revalidated = false;
      if (finalStatus === 'published') {
        revalidated = await this.triggerRevalidation(locale, generated.slug);
      }

      // 13. Enqueue Multi-Locale Translations
      const enqueuedLocales: string[] = [];
      try {
        const localesService = strapi.plugin('i18n')?.service('locales');
        const configuredLocales = await localesService?.find();

        if (Array.isArray(configuredLocales)) {
          const targetLocales = configuredLocales
            .map((l: any) => l.code)
            .filter((c: string) => c !== locale);

          for (const targetLoc of targetLocales) {
            await TranslationQueueService.enqueue(strapi, {
              contentType: 'api::post.post',
              documentId,
              sourceLocale: locale,
              targetLocale: targetLoc,
              autoPublish: willPublish,
            });
            enqueuedLocales.push(targetLoc);
          }
        }
      } catch (queueErr: any) {
        console.warn('[BlogGenerator] Translation queue dispatch warning:', queueErr.message);
      }

      const result: BlogPublishResult = {
        success: true,
        documentId,
        title: generated.title,
        slug: generated.slug,
        locale,
        status: finalStatus,
        workflowStatus,
        moderationStatus,
        aiCostUsd: Number(actualCostUsd.toFixed(5)),
        aiModel: aiResponse.model,
        coverImage: coverImageId,
        canonicalUrl,
        translationsEnqueued: enqueuedLocales,
        revalidated,
        message: `Successfully created ${finalStatus} post with WebP compressed cover image.`,
      };

      if (request.idempotencyKey) {
        this.idempotencyCache.set(request.idempotencyKey, result);
      }

      return result;
    } catch (err: any) {
      await costLedger.release(costEstimate.totalEstimatedUsd);
      throw err;
    }
  }

  /**
   * Dispatches HMAC-SHA256 signed cache revalidation request to Next.js
   */
  private static async triggerRevalidation(locale: string, slug: string): Promise<boolean> {
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
    const secret = process.env.REVALIDATION_SECRET || 'chronicle-secure-revalidation-secret-key-2026';
    const timestamp = Date.now().toString();

    const payload = JSON.stringify({
      locale,
      slug,
      path: `/${locale}/blog/${slug}`,
      timestamp,
    });

    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    try {
      const response = await fetch(`${siteUrl}/api/revalidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-strapi-signature': signature,
          'x-strapi-timestamp': timestamp,
        },
        body: payload,
        signal: AbortSignal.timeout(1500),
      });

      if (response.ok) {
        console.log(`[BlogGenerator] Revalidated Next.js cache for /${locale}/blog/${slug}`);
        return true;
      } else {
        console.warn(`[BlogGenerator] Next.js revalidation returned ${response.status}`);
        return false;
      }
    } catch (err: any) {
      console.warn(`[BlogGenerator] Could not trigger Next.js cache revalidation:`, err.message);
      return false;
    }
  }

  /**
   * Direct Publish from external MCP / API requests
   */
  public static async publishDirect(strapi: Core.Strapi, payload: any): Promise<any> {
    const locale = payload.locale || 'en';
    const rawTitle = (payload.title || '').trim();
    if (!rawTitle) {
      throw new Error('Title is required to publish a blog post.');
    }

    const cleanSlug = (payload.slug || rawTitle)
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Resolve Category
    let categoryDocId: string | null = null;
    if (payload.category) {
      const catName = String(payload.category).trim();
      try {
        const existingCat = await (strapi.documents('api::category.category') as any).findFirst({
          locale,
          filters: { name: { $eqi: catName } },
        });
        if (existingCat) {
          categoryDocId = existingCat.documentId;
        } else {
          const newCat = await (strapi.documents('api::category.category') as any).create({
            locale,
            data: {
              name: catName,
              slug: catName.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
              description: `Articles and publications covering ${catName}`,
            },
          });
          categoryDocId = newCat?.documentId || null;
        }
      } catch (catErr: any) {
        console.warn('[BlogGenerator] Category resolution warning:', catErr.message);
      }
    }

    // Resolve Author
    let authorDocId: string | null = null;
    try {
      const authorFilter = payload.author ? { name: { $eqi: String(payload.author).trim() } } : {};
      const author = await (strapi.documents('api::author.author') as any).findFirst({
        locale,
        filters: authorFilter,
      });
      if (author) {
        authorDocId = author.documentId;
      }
    } catch (authErr: any) {
      console.warn('[BlogGenerator] Author resolution warning:', authErr.message);
    }

    // Resolve Tags
    const tagDocIds: string[] = [];
    if (Array.isArray(payload.tags) && payload.tags.length > 0) {
      for (const tagName of payload.tags.slice(0, 5)) {
        try {
          const cleanTag = String(tagName).trim();
          const existingTag = await (strapi.documents('api::tag.tag') as any).findFirst({
            locale,
            filters: { name: { $eqi: cleanTag } },
          });
          if (existingTag) {
            tagDocIds.push(existingTag.documentId);
          } else {
            const newTag = await (strapi.documents('api::tag.tag') as any).create({
              locale,
              data: {
                name: cleanTag,
                slug: cleanTag.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
              },
            });
            if (newTag?.documentId) tagDocIds.push(newTag.documentId);
          }
        } catch (tagErr: any) {
          console.warn(`[BlogGenerator] Tag "${tagName}" resolution note:`, tagErr.message);
        }
      }
    }

    // Format content with FAQs and Conclusion if not already included
    let fullContent = payload.content || '';
    if (Array.isArray(payload.faqs) && payload.faqs.length > 0 && !fullContent.includes('Frequently Asked Questions')) {
      fullContent += '\n\n## Frequently Asked Questions\n\n' +
        payload.faqs.map((f: any) => `### ${f.question}\n\n${f.answer}`).join('\n\n');
    }
    if (payload.conclusion && !fullContent.includes('Conclusion')) {
      fullContent += `\n\n## Conclusion\n\n${payload.conclusion}`;
    }

    // Calculate reading time (avg 200 words per minute)
    const wordCount = fullContent.split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    // Optional Cover Image (Direct URL or AI Generation)
    let coverImageId: number | null = null;
    if (payload.imageUrl) {
      try {
        const imgResult = await ImageService.downloadCompressAndUpload(
          strapi,
          payload.imageUrl,
          cleanSlug,
          payload.title
        );
        coverImageId = imgResult.coverImageId;
      } catch (imgErr: any) {
        console.warn('[BlogGenerator] Direct image download failed:', imgErr.message);
      }
    } else if (payload.generateImage !== false && (payload.imagePrompt || payload.title)) {
      try {
        const imageResult = await ImageService.generateCompressAndUpload(
          strapi,
          payload.imagePrompt || `${payload.title} ${payload.category || ''}`,
          cleanSlug,
          undefined,
          { category: payload.category, tags: payload.tags }
        );
        coverImageId = imageResult.coverImageId;
      } catch (imgErr: any) {
        console.warn('[BlogGenerator] Optional image generation failed:', imgErr.message);
      }
    }

    // Build SEO Component
    const seoMetadata = {
      metaTitle: payload.metaTitle || rawTitle,
      metaDescription: payload.metaDescription || payload.excerpt || rawTitle,
      keywords: payload.focusKeyword || (payload.tags || []).join(', '),
    };
    const seoPayload = SeoService.buildSeoComponent(seoMetadata, locale, cleanSlug, coverImageId);

    // Build Table of Contents
    const tableOfContents: Array<{ title: string; anchor: string; level: number }> = [];
    if (Array.isArray(payload.headings) && payload.headings.length > 0) {
      for (const h of payload.headings) {
        tableOfContents.push({
          title: h.text,
          anchor: h.anchor || h.text.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
          level: h.level || 2,
        });
      }
    } else {
      const h2Matches = fullContent.matchAll(/^##\s+(.+)$/gm);
      for (const match of h2Matches) {
        const text = match[1].trim();
        tableOfContents.push({
          title: text,
          anchor: text.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
          level: 2,
        });
      }
    }

    const postDataPayload: Record<string, any> = {
      title: rawTitle,
      slug: cleanSlug,
      excerpt: payload.excerpt || fullContent.slice(0, 160).trim() + '...',
      content: fullContent,
      readingTime,
      featured: false,
      trending: false,
      aiGenerated: true,
      aiModel: 'mcp-publisher',
      aiPrompt: payload.title,
      aiCostUsd: 0,
      moderationStatus: 'approved',
      workflowStatus: 'approved',
      seo: seoPayload,
      tableOfContents,
      ...(coverImageId ? { coverImage: coverImageId } : {}),
      ...(categoryDocId ? { category: { set: [categoryDocId] } } : {}),
      ...(authorDocId ? { author: { set: [authorDocId] } } : {}),
      ...(tagDocIds.length > 0 ? { tags: { set: tagDocIds } } : {}),
    };

    // Create in Strapi 5 Document Service
    const createdPost = await (strapi.documents('api::post.post') as any).create({
      locale,
      data: postDataPayload,
    });

    const documentId = createdPost.documentId;

    // Publish
    await (strapi.documents('api::post.post') as any).publish({
      documentId,
      locale,
    });

    // Revalidate Next.js cache
    const revalidated = await this.triggerRevalidation(locale, cleanSlug);

    // Enqueue translations to other locales if available
    try {
      const localesService = strapi.plugin('i18n')?.service('locales');
      const configuredLocales = await localesService?.find();
      if (Array.isArray(configuredLocales)) {
        const targetLocales = configuredLocales
          .map((l: any) => l.code)
          .filter((c: string) => c !== locale);

        for (const targetLoc of targetLocales) {
          await TranslationQueueService.enqueue(strapi, {
            contentType: 'api::post.post',
            documentId,
            sourceLocale: locale,
            targetLocale: targetLoc,
            autoPublish: true,
          });
        }
      }
    } catch (queueErr: any) {
      console.warn('[BlogGenerator] Translation queue dispatch note:', queueErr.message);
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
    const liveUrl = `${siteUrl}/${locale}/blog/${cleanSlug}`;

    return {
      success: true,
      status: 'published',
      documentId,
      title: rawTitle,
      slug: cleanSlug,
      liveUrl,
      revalidation: revalidated,
      message: `✅ Blog "${rawTitle}" has been successfully published to Strapi and is now LIVE!`,
    };
  }
}

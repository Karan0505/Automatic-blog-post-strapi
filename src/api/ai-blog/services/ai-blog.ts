import type { Core } from '@strapi/strapi';
import { BlogGeneratorService } from '../../../services/ai/blog-generator';
import { costLedger } from '../../../services/ai/cost-ledger';
import { TranslationQueueService } from '../../../services/ai/translation-worker';
import { ImageService } from '../../../services/ai/image-service';
import type { AiBlogRequest } from '../../../services/ai/types';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async preview(request: AiBlogRequest) {
    return BlogGeneratorService.preview(request);
  },

  async generate(request: AiBlogRequest) {
    return BlogGeneratorService.generateAndPublish(strapi, request);
  },

  async publish(payload: any) {
    return BlogGeneratorService.publishDirect(strapi, payload);
  },

  async getBudgetStatus() {
    const dailySpend = await costLedger.getDailySpend();
    const dailyBudget = parseFloat(process.env.AI_DAILY_BUDGET_USD || '5.00');
    return {
      dailySpendUsd: Number(dailySpend.toFixed(4)),
      dailyBudgetUsd: dailyBudget,
      remainingUsd: Number(Math.max(0, dailyBudget - dailySpend).toFixed(4)),
      currentModel: process.env.OPENROUTER_MODEL || 'minimax/minimax-m2.7:free',
    };
  },

  async retryTranslation(documentId: string, targetLocale: string, autoPublish: boolean = true) {
    return TranslationQueueService.processJob(strapi, {
      contentType: 'api::post.post',
      documentId,
      sourceLocale: 'en',
      targetLocale,
      autoPublish,
    });
  },

  async backfillCovers() {
    const fs = require('fs');
    const path = require('path');
    const results: any[] = [];
    const publicDir = path.join(process.cwd(), 'public');

    // 1. Check Author Avatars (Alex Vance and Elena Rostova)
    const authorSlugs = [
      { slug: 'alex-vance', prompt: 'Professional portrait headshot of Alex Vance, male Lead Software Architect, clean studio lighting', filename: 'alex-vance-avatar' },
      { slug: 'elena-rostova', prompt: 'Professional portrait headshot of Elena Rostova, female Principal Design Engineer, studio lighting', filename: 'elena-rostova-avatar' },
    ];

    for (const authInfo of authorSlugs) {
      try {
        const author = await (strapi.documents('api::author.author') as any).findFirst({
          filters: { slug: { $eqi: authInfo.slug } },
          populate: ['avatar'],
        });

        const avatarUrl = author?.avatar?.url;
        const exists = avatarUrl ? fs.existsSync(path.join(publicDir, avatarUrl)) : false;

        if (author && (!avatarUrl || !exists)) {
          strapi.log.info(`Generating avatar for ${author.name} (file exists: ${exists})...`);
          const imgRes = await ImageService.generateCompressAndUpload(
            strapi,
            authInfo.prompt,
            authInfo.filename
          );
          if (imgRes?.coverImageId) {
            await (strapi.documents('api::author.author') as any).update({
              documentId: author.documentId,
              data: { avatar: imgRes.coverImageId },
            });
            results.push({ target: `author:${authInfo.slug}`, avatarId: imgRes.coverImageId });
            strapi.log.info(`✅ Attached avatar for ${author.name}`);
          }
        } else if (author) {
          strapi.log.info(`Author ${author.name} avatar is valid on disk: ${avatarUrl}`);
        }
      } catch (err: any) {
        strapi.log.warn(`Author ${authInfo.slug} avatar check note:`, err.message);
      }
    }

    // 2. Dynamically find all posts across all locales that lack a cover image or have missing files
    try {
      const allPosts = await (strapi.documents('api::post.post') as any).findMany({
        locale: 'en',
        populate: ['coverImage', 'category'],
      });

      for (const post of allPosts || []) {
        const coverUrl = post.coverImage?.url;
        const existsOnDisk = coverUrl ? fs.existsSync(path.join(publicDir, coverUrl)) : false;

        if (!post.coverImage || !coverUrl || !existsOnDisk) {
          strapi.log.info(`[Backfill] Generating AI cover image for post: "${post.title}" (${post.documentId})...`);
          try {
            const imgRes = await ImageService.generateCompressAndUpload(
              strapi,
              post.title,
              post.slug || post.documentId,
              undefined,
              { category: post.category?.name }
            );

            if (imgRes?.coverImageId) {
              for (const loc of ['en', 'gu', 'hi-IN']) {
                try {
                  const existingDoc = await (strapi.documents('api::post.post') as any).findOne({
                    documentId: post.documentId,
                    locale: loc,
                  });
                  if (existingDoc) {
                    await (strapi.documents('api::post.post') as any).update({
                      documentId: post.documentId,
                      locale: loc,
                      data: { coverImage: imgRes.coverImageId },
                    });
                    await (strapi.documents('api::post.post') as any).publish({
                      documentId: post.documentId,
                      locale: loc,
                    });
                  }
                } catch (locErr: any) {
                  strapi.log.warn(`[Backfill] Locale ${loc} note:`, locErr.message);
                }
              }
              results.push({ documentId: post.documentId, title: post.title, coverImageId: imgRes.coverImageId });
              strapi.log.info(`[Backfill] ✅ Successfully attached AI cover image to "${post.title}"`);
            }
          } catch (postErr: any) {
            results.push({ documentId: post.documentId, title: post.title, error: postErr.message });
          }
        }
      }
    } catch (findErr: any) {
      strapi.log.error('[Backfill] Error finding posts:', findErr.message);
    }

    // 3. Revalidate Next.js frontend
    const revalidatePaths = ['/en', '/gu', '/hi-IN', '/en/blog', '/gu/blog', '/hi-IN/blog'];
    for (const p of revalidatePaths) {
      try {
        await fetch('http://localhost:3000/api/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: p }),
          signal: AbortSignal.timeout(2000),
        });
      } catch {}
    }

    return {
      success: true,
      updatedCount: results.length,
      results,
    };
  },
});


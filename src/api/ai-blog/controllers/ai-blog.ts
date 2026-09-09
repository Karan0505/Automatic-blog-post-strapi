import type { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async preview(ctx: any) {
    try {
      const { topic, locale, wordCount, tone, targetAudience, maxCostUsd } = ctx.request.body || {};

      if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
        return ctx.badRequest('Missing or invalid required parameter "topic".');
      }

      const service = (strapi.service('api::ai-blog.ai-blog') as any);
      if (!service) {
        return ctx.internalServerError('AI Blog service is not registered.');
      }

      const previewResult = await service.preview({
        topic: topic.trim(),
        locale: locale || 'en',
        wordCount: wordCount ? Number(wordCount) : 1000,
        tone,
        targetAudience,
        maxCostUsd: maxCostUsd ? Number(maxCostUsd) : 1.00,
      });

      return ctx.send({
        success: true,
        data: previewResult,
      });
    } catch (err: any) {
      strapi.log.error('[AiBlogController] Preview error:', err);
      return ctx.badRequest(err.message || 'Failed to generate preview.');
    }
  },

  async generate(ctx: any) {
    try {
      const payload = ctx.request.body;
      if (!payload || !payload.topic) {
        return ctx.badRequest('Missing required field "topic" in request body.');
      }

      const service = (strapi.service('api::ai-blog.ai-blog') as any);
      if (!service) {
        return ctx.internalServerError('AI Blog service is not registered.');
      }

      const result = await service.generate(payload);
      return ctx.send(result);
    } catch (err: any) {
      strapi.log.error('[AiBlogController] Generate error:', err);
      return ctx.badRequest(err.message || 'Failed to execute automated blog generation.');
    }
  },

  async publish(ctx: any) {
    try {
      const payload = ctx.request.body;
      if (!payload || !payload.title || !payload.content) {
        return ctx.badRequest('Missing required fields "title" and "content" in request body.');
      }

      const service = (strapi.service('api::ai-blog.ai-blog') as any);
      if (!service) {
        return ctx.internalServerError('AI Blog service is not registered.');
      }

      const result = await service.publish(payload);
      return ctx.send(result);
    } catch (err: any) {
      strapi.log.error('[AiBlogController] Publish error:', err);
      return ctx.badRequest(err.message || 'Failed to publish blog post.');
    }
  },

  async status(ctx: any) {
    try {
      const service = (strapi.service('api::ai-blog.ai-blog') as any);
      const budgetStatus = await service.getBudgetStatus();
      return ctx.send({
        success: true,
        data: budgetStatus,
      });
    } catch (err: any) {
      strapi.log.error('[AiBlogController] Status error:', err);
      return ctx.badRequest(err.message || 'Failed to get budget status.');
    }
  },

  async categories(ctx: any) {
    try {
      const locale = ctx.query?.locale || 'en';
      const categories = await (strapi.documents('api::category.category') as any).findMany({
        locale,
      });
      return ctx.send({ data: categories });
    } catch (err: any) {
      strapi.log.error('[AiBlogController] Categories error:', err);
      return ctx.badRequest(err.message || 'Failed to fetch categories.');
    }
  },

  async checkDuplicate(ctx: any) {
    try {
      const { title, slug, locale = 'en' } = ctx.request.body || {};
      if (!title && !slug) {
        return ctx.send({ exists: false, matches: [] });
      }
      const filters: any = {};
      if (slug && title) {
        filters.$or = [{ title: { $eqi: title } }, { slug: { $eqi: slug } }];
      } else if (title) {
        filters.title = { $eqi: title };
      } else if (slug) {
        filters.slug = { $eqi: slug };
      }
      const matches = await (strapi.documents('api::post.post') as any).findMany({
        locale,
        filters,
      });
      return ctx.send({
        exists: matches.length > 0,
        matches,
      });
    } catch (err: any) {
      strapi.log.error('[AiBlogController] Check duplicate error:', err);
      return ctx.badRequest(err.message || 'Failed to check duplicate.');
    }
  },

  async retryTranslation(ctx: any) {
    try {
      const { documentId, targetLocale, autoPublish } = ctx.request.body || {};
      if (!documentId || !targetLocale) {
        return ctx.badRequest('Missing required parameters: documentId, targetLocale.');
      }

      const service = (strapi.service('api::ai-blog.ai-blog') as any);
      const res = await service.retryTranslation(documentId, targetLocale, autoPublish);
      return ctx.send(res);
    } catch (err: any) {
      strapi.log.error('[AiBlogController] Retry translation error:', err);
      return ctx.badRequest(err.message || 'Failed to retry translation.');
    }
  },

  async backfillCovers(ctx: any) {
    try {
      const service = (strapi.service('api::ai-blog.ai-blog') as any);
      const res = await service.backfillCovers();
      return ctx.send(res);
    } catch (err: any) {
      strapi.log.error('[AiBlogController] Backfill covers error:', err);
      return ctx.badRequest(err.message || 'Failed to backfill cover images.');
    }
  },
});


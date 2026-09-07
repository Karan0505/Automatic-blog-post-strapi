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
});

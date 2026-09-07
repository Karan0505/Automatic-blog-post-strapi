import type { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async translate(ctx: any) {
    try {
      const { contentType, documentId, sourceLocale, targetLocale } = ctx.request.body;

      if (!contentType || !documentId || !sourceLocale || !targetLocale) {
        return ctx.badRequest('Missing required parameters: contentType, documentId, sourceLocale, targetLocale.');
      }

      // Security check: Only allow supported content types
      const allowedPrefixes = ['api::', 'plugin::'];
      if (!allowedPrefixes.some((p) => contentType.startsWith(p))) {
        return ctx.badRequest(`Invalid or unauthorized content type "${contentType}".`);
      }

      const translationService = (strapi.service('api::translation.translation') as any);
      if (!translationService) {
        return ctx.internalServerError('Translation service is not registered.');
      }

      const result = await translationService.translateDocument({
        contentType,
        documentId,
        sourceLocale,
        targetLocale,
      });

      return ctx.send(result);
    } catch (err: any) {
      strapi.log.error('Translation error:', err);
      return ctx.badRequest(err.message || 'Translation process encountered an error.');
    }
  },

  async checkExisting(ctx: any) {
    try {
      const { contentType, documentId, targetLocale } = ctx.query;

      if (!contentType || !documentId || !targetLocale) {
        return ctx.badRequest('Missing required query parameters: contentType, documentId, targetLocale.');
      }

      const existing = await (strapi.documents(contentType as any) as any).findOne({
        documentId,
        locale: targetLocale,
      });

      return ctx.send({
        exists: !!existing,
        documentId,
        targetLocale,
      });
    } catch (err: any) {
      strapi.log.error('Check existing error:', err);
      return ctx.badRequest(err.message || 'Failed to check target localization existence.');
    }
  },

  async translateFullSite(ctx: any) {
    try {
      const { sourceLocale = 'en', targetLocale } = ctx.request.body;

      if (!targetLocale) {
        return ctx.badRequest('Missing required parameter: targetLocale.');
      }

      const translationService = (strapi.service('api::translation.translation') as any);
      if (!translationService) {
        return ctx.internalServerError('Translation service is not registered.');
      }

      const result = await translationService.translateFullSite({
        sourceLocale,
        targetLocale,
      });

      return ctx.send(result);
    } catch (err: any) {
      strapi.log.error('Full site translation error:', err);
      return ctx.badRequest(err.message || 'Full site translation failed.');
    }
  },

  async publishAll(ctx: any) {
    try {
      const { locale = 'gu-IN' } = ctx.request.body || {};
      const translationService = (strapi.service('api::translation.translation') as any);
      const result = await translationService.publishAllLocales(locale);
      return ctx.send({ success: true, locale, result });
    } catch (err: any) {
      return ctx.badRequest(err.message || 'Publish all failed.');
    }
  },
});

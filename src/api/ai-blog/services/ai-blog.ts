import type { Core } from '@strapi/strapi';
import { BlogGeneratorService } from '../../../services/ai/blog-generator';
import { costLedger } from '../../../services/ai/cost-ledger';
import { TranslationQueueService } from '../../../services/ai/translation-worker';
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
});

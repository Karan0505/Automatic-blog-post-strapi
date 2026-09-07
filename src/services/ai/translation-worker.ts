import type { Core } from '@strapi/strapi';
import type { TranslationJobPayload, TranslationJobResult } from './types';

export class TranslationQueueService {
  private static inMemoryQueue: TranslationJobPayload[] = [];
  private static isProcessing = false;
  private static bullQueue: any = null;

  public static async initQueue(strapi: Core.Strapi) {
    const redisHost = process.env.REDIS_HOST;
    if (redisHost) {
      try {
        const { Queue, Worker } = require('bullmq');
        const connection = {
          host: redisHost,
          port: Number(process.env.REDIS_PORT || 6379),
          password: process.env.REDIS_PASSWORD || undefined,
        };

        this.bullQueue = new Queue('ai-blog-translations', { connection });

        const concurrency = Number(process.env.TRANSLATION_WORKER_CONCURRENCY || 2);
        new Worker(
          'ai-blog-translations',
          async (job: any) => {
            await this.processJob(strapi, job.data);
          },
          { connection, concurrency }
        );

        console.log('[TranslationWorker] BullMQ queue and worker initialized on Redis.');
        return;
      } catch (err: any) {
        console.warn('[TranslationWorker] BullMQ setup note (falling back to in-memory queue):', err.message);
        this.bullQueue = null;
      }
    }
  }

  public static async enqueue(strapi: Core.Strapi, payload: TranslationJobPayload) {
    if (this.bullQueue) {
      try {
        await this.bullQueue.add(`translate-${payload.targetLocale}`, payload, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 3000,
          },
          removeOnComplete: true,
        });
        return;
      } catch (err: any) {
        console.warn('[TranslationWorker] BullMQ enqueue failed, falling back to memory queue:', err.message);
      }
    }

    // In-memory queue fallback
    this.inMemoryQueue.push(payload);
    this.triggerMemoryWorker(strapi);
  }

  private static triggerMemoryWorker(strapi: Core.Strapi) {
    if (this.isProcessing) return;
    this.isProcessing = true;

    setTimeout(async () => {
      while (this.inMemoryQueue.length > 0) {
        const payload = this.inMemoryQueue.shift();
        if (payload) {
          try {
            await this.processJob(strapi, payload);
          } catch (err: any) {
            console.error(`[TranslationWorker] Failed job for ${payload.targetLocale}:`, err.message);
          }
        }
      }
      this.isProcessing = false;
    }, 500);
  }

  public static async processJob(
    strapi: Core.Strapi,
    payload: TranslationJobPayload
  ): Promise<TranslationJobResult> {
    const { contentType, documentId, sourceLocale, targetLocale, autoPublish } = payload;
    console.log(`[TranslationWorker] Processing translation: ${contentType} (${documentId}) ${sourceLocale} -> ${targetLocale}`);

    try {
      const translationService = strapi.service('api::translation.translation');
      if (!translationService?.translateDocument) {
        throw new Error('Strapi translation service not found or missing translateDocument method.');
      }

      const result = await translationService.translateDocument({
        contentType,
        documentId,
        sourceLocale,
        targetLocale,
      });

      if (autoPublish) {
        try {
          await (strapi.documents(contentType as any) as any).publish({
            documentId,
            locale: targetLocale,
          });
          console.log(`[TranslationWorker] Auto-published ${targetLocale} translation for ${documentId}`);
        } catch (pubErr: any) {
          console.warn(`[TranslationWorker] Publish warning for ${targetLocale}:`, pubErr.message);
        }
      }

      return {
        locale: targetLocale,
        success: true,
        documentId,
      };
    } catch (err: any) {
      console.error(`[TranslationWorker] Error translating to ${targetLocale}:`, err.message);
      return {
        locale: targetLocale,
        success: false,
        error: err.message,
        documentId,
      };
    }
  }
}

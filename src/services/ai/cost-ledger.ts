import type { AiBlogRequest, CostEstimate } from './types';

// Approximate pricing per 1M tokens (USD)
const PRICING_TABLE: Record<string, { promptPerM: number; completionPerM: number }> = {
  'minimax/minimax-m2.7:free': { promptPerM: 0, completionPerM: 0 },
  'google/gemini-2.5-flash': { promptPerM: 0.075, completionPerM: 0.30 },
  'anthropic/claude-3-5-sonnet': { promptPerM: 3.0, completionPerM: 15.0 },
  'openai/gpt-4o-mini': { promptPerM: 0.15, completionPerM: 0.60 },
  'default': { promptPerM: 0.20, completionPerM: 0.80 },
};

const DEFAULT_IMAGE_COST_USD = 0.03; // ~$0.02 - $0.04 per generated image
const DEFAULT_DAILY_BUDGET_USD = 5.00;

class CostLedgerService {
  private dailySpendMap: Map<string, number> = new Map();
  private redisClient: any = null;

  constructor() {
    this.initRedis();
  }

  private async initRedis() {
    const redisHost = process.env.REDIS_HOST;
    if (redisHost) {
      try {
        const IORedis = require('ioredis');
        this.redisClient = new IORedis({
          host: redisHost,
          port: Number(process.env.REDIS_PORT || 6379),
          password: process.env.REDIS_PASSWORD || undefined,
          lazyConnect: true,
        });
        await this.redisClient.connect();
      } catch (err: any) {
        console.warn('[CostLedger] Redis unavailable, using robust in-memory ledger:', err.message);
        this.redisClient = null;
      }
    }
  }

  private getTodayKey(): string {
    const today = new Date().toISOString().split('T')[0];
    return `ai:budget:${today}`;
  }

  public async getDailySpend(): Promise<number> {
    const key = this.getTodayKey();
    if (this.redisClient) {
      try {
        const val = await this.redisClient.get(key);
        return val ? parseFloat(val) : 0;
      } catch {
        // fallback
      }
    }
    return this.dailySpendMap.get(key) || 0;
  }

  /**
   * Pre-flight Phase 1: Zero-spend estimation
   */
  public async estimateCost(request: AiBlogRequest): Promise<CostEstimate> {
    const model = process.env.OPENROUTER_MODEL || 'minimax/minimax-m2.7:free';
    const pricing = PRICING_TABLE[model] || PRICING_TABLE['default'];

    const targetWords = request.wordCount || 1000;
    const estimatedOutputTokens = Math.ceil(targetWords * 1.35);
    const estimatedPromptTokens = 800; // prompt instructions + schema

    const textCost =
      (estimatedPromptTokens / 1_000_000) * pricing.promptPerM +
      (estimatedOutputTokens / 1_000_000) * pricing.completionPerM;

    const imageCost = request.generateImage ? DEFAULT_IMAGE_COST_USD : 0;
    const totalEstimatedUsd = Number((textCost + imageCost).toFixed(4));

    const dailySpend = await this.getDailySpend();
    const dailyBudgetLimitUsd = parseFloat(process.env.AI_DAILY_BUDGET_USD || `${DEFAULT_DAILY_BUDGET_USD}`);
    const maxCostCeiling = request.maxCostUsd ?? 1.00;

    const withinRequestCeiling = totalEstimatedUsd <= maxCostCeiling;
    const withinDailyBudget = dailySpend + totalEstimatedUsd <= dailyBudgetLimitUsd;

    return {
      estimatedTextCostUsd: Number(textCost.toFixed(4)),
      estimatedImageCostUsd: Number(imageCost.toFixed(4)),
      totalEstimatedUsd,
      withinRequestCeiling,
      withinDailyBudget,
      currentDailySpendUsd: Number(dailySpend.toFixed(4)),
      dailyBudgetLimitUsd,
    };
  }

  /**
   * Phase 2: Atomic Reservation
   */
  public async reserve(amountUsd: number, maxAllowedUsd?: number): Promise<boolean> {
    const key = this.getTodayKey();
    const dailyBudget = parseFloat(process.env.AI_DAILY_BUDGET_USD || `${DEFAULT_DAILY_BUDGET_USD}`);

    if (this.redisClient) {
      try {
        const current = parseFloat((await this.redisClient.get(key)) || '0');
        if (current + amountUsd > dailyBudget) return false;
        if (maxAllowedUsd && amountUsd > maxAllowedUsd) return false;

        await this.redisClient.incrbyfloat(key, amountUsd);
        await this.redisClient.expire(key, 86400 * 2);
        return true;
      } catch {
        // fallback to memory
      }
    }

    const current = this.dailySpendMap.get(key) || 0;
    if (current + amountUsd > dailyBudget) return false;
    if (maxAllowedUsd && amountUsd > maxAllowedUsd) return false;

    this.dailySpendMap.set(key, current + amountUsd);
    return true;
  }

  /**
   * Reconciles reserved amount with actual provider usage
   */
  public async reconcile(reservedUsd: number, actualUsd: number): Promise<void> {
    const diff = actualUsd - reservedUsd;
    if (Math.abs(diff) < 0.00001) return;

    const key = this.getTodayKey();
    if (this.redisClient) {
      try {
        await this.redisClient.incrbyfloat(key, diff);
        return;
      } catch {}
    }

    const current = this.dailySpendMap.get(key) || 0;
    this.dailySpendMap.set(key, Math.max(0, current + diff));
  }

  /**
   * Releases full reservation if execution was aborted before AI dispatch
   */
  public async release(reservedUsd: number): Promise<void> {
    await this.reconcile(reservedUsd, 0);
  }
}

export const costLedger = new CostLedgerService();

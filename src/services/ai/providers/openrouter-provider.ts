import type { AIProvider, StructuredGenerationResult } from './ai-provider';

export class OpenRouterProvider implements AIProvider {
  public name = 'OpenRouter';

  private getApiKey(): string {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) {
      throw new Error('OPENROUTER_API_KEY is not configured in Strapi environment.');
    }
    return key;
  }

  private getCandidateModels(): string[] {
    const primary = process.env.OPENROUTER_MODEL || 'minimax/minimax-m2.7:free';
    const fallbackEnv = process.env.OPENROUTER_FALLBACK_MODELS;
    const fallbacks = fallbackEnv
      ? fallbackEnv.split(',').map((s) => s.trim())
      : [
          'nvidia/nemotron-3.5-lightning:free',
          'z-ai/glm-5.2:free',
          'google/gemma-4-26b-a4b-it:free',
          'minimax/minimax-m2.7:free',
        ];

    return Array.from(new Set([primary, ...fallbacks])).filter(Boolean);
  }

  public async generateStructuredJson<T>(
    systemPrompt: string,
    userPrompt: string
  ): Promise<StructuredGenerationResult<T>> {
    const apiKey = this.getApiKey();
    const candidateModels = this.getCandidateModels();
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        console.log(`[OpenRouterProvider] Attempting generation with model: ${model}`);
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': 'http://localhost:1337',
            'X-Title': 'Strapi Automated Blog Publishing',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.warn(`[OpenRouterProvider] Model ${model} returned [${response.status}]: ${errText}`);
          lastError = new Error(`OpenRouter model ${model} HTTP ${response.status}`);
          continue;
        }

        const data: any = await response.json();
        const rawContent = data.choices?.[0]?.message?.content;

        if (!rawContent) {
          lastError = new Error(`Empty response content from model ${model}`);
          continue;
        }

        let parsed: T;
        try {
          const cleaned = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
          parsed = JSON.parse(cleaned);
        } catch (parseErr) {
          const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            throw parseErr;
          }
        }

        // Calculate approximate cost from token usage
        const usage = data.usage || { prompt_tokens: 800, completion_tokens: 1200, total_tokens: 2000 };
        const promptTokens = usage.prompt_tokens || 800;
        const completionTokens = usage.completion_tokens || 1200;
        const totalTokens = usage.total_tokens || promptTokens + completionTokens;

        const isFree = model.includes(':free');
        const costUsd = isFree ? 0 : Number(((promptTokens * 0.0000002) + (completionTokens * 0.0000008)).toFixed(5));

        return {
          data: parsed,
          costUsd,
          model,
          usage: {
            promptTokens,
            completionTokens,
            totalTokens,
          },
        };
      } catch (err: any) {
        console.warn(`[OpenRouterProvider] Model ${model} failed:`, err.message);
        lastError = err;
      }
    }

    throw lastError || new Error('All OpenRouter candidate models failed to generate valid structured output.');
  }
}

export const openRouterProvider = new OpenRouterProvider();

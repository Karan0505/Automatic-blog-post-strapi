import type { ModerationResult } from '../types';

export class ModerationProvider {
  /**
   * Evaluates generated blog content against editorial safety and quality criteria
   */
  public static async evaluateContent(
    title: string,
    content: string,
    excerpt: string
  ): Promise<ModerationResult> {
    const combinedText = `${title} ${excerpt} ${content}`.toLowerCase();
    const flaggedCategories: string[] = [];
    const reasons: string[] = [];

    // 1. Check for prompt injection / code leak anomalies
    const injectionPatterns = [
      'ignore previous instructions',
      'system prompt',
      '<script',
      'javascript:',
      'drop table',
      'union select',
      'eval(',
    ];
    for (const pattern of injectionPatterns) {
      if (combinedText.includes(pattern)) {
        flaggedCategories.push('prompt_injection_or_xss');
        reasons.push(`Contains potentially harmful syntax: "${pattern}"`);
      }
    }

    // 2. Prohibited or high-risk content checks
    const prohibitedKeywords = [
      'casino',
      'free money',
      'crypto scam',
      'buy followers',
      'viagra',
      'adult webcam',
    ];
    for (const kw of prohibitedKeywords) {
      if (combinedText.includes(kw)) {
        flaggedCategories.push('spam_or_illicit');
        reasons.push(`Detected prohibited commercial/spam keyword: "${kw}"`);
      }
    }

    // 3. Minimum quality boundaries
    if (content.trim().length < 150) {
      flaggedCategories.push('low_quality');
      reasons.push('Content is unusually short (less than 150 characters).');
    }

    const isFlagged = flaggedCategories.length > 0;

    return {
      status: isFlagged ? 'flagged' : 'approved',
      reasons,
      flaggedCategories,
    };
  }
}

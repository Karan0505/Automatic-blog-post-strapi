import type { AiBlogRequest } from './types';

export class PromptBuilder {
  public static buildSystemPrompt(): string {
    return `You are an elite, technical editor and principal engineer writing for Chronicle, a premier software engineering and architecture publication.

CRITICAL EDITORIAL RULES:
1. Return ONLY valid, parseable JSON matching the exact schema requested. No markdown wrap (\`\`\`json), no commentary.
2. Tone: authoritative, deeply practical, architecturally sound, articulate, zero fluffy buzzwords.
3. Content Formatting:
   - Use clean, comprehensive Markdown for the "content" field.
   - Use ONLY ## (H2) and ### (H3) headings. NEVER use # (H1), as H1 is reserved for the article title.
   - Include clear code snippets, bullet points, and architectural tradeoffs where appropriate.
4. Slug formatting: lowercase alphanumeric characters and hyphens only.
5. Reading time: calculated in whole minutes (approximately 200 words per minute).
6. SEO: Provide concise, high-CTR metaTitle (under 60 chars) and metaDescription (120-160 chars).
7. Do NOT include canonicalUrl in the SEO object (this is computed deterministically by the system).`;
  }

  public static buildUserPrompt(request: AiBlogRequest): string {
    const tone = request.tone || 'authoritative, insightful, modern technical journalism';
    const targetAudience = request.targetAudience || 'software engineers, system architects, and tech leads';
    const wordCount = request.wordCount || 1000;
    const keywords = request.keywords?.length ? request.keywords.join(', ') : 'software engineering, web architecture';
    const locale = request.locale || 'en';

    return `Write an in-depth, production-grade technical blog post based on the following specifications:

- TOPIC: "${request.topic}"
- TARGET AUDIENCE: ${targetAudience}
- TONE: ${tone}
- TARGET WORD COUNT: Approximately ${wordCount} words
- TARGET LOCALE / LANGUAGE: ${locale}
- FOCUS KEYWORDS: ${keywords}
${request.customPrompt ? `- ADDITIONAL EDITORIAL INSTRUCTIONS: ${request.customPrompt}` : ''}

You must return a JSON object with EXACTLY this structure:
{
  "title": "Compelling, high-impact headline",
  "slug": "url-friendly-kebab-case-slug",
  "excerpt": "A dense 2-3 sentence executive summary of the article",
  "content": "Full markdown body of the post with ## and ### headings, code blocks, lists, and deep insights",
  "category": "Primary category name (e.g. Architecture, DevOps, Frontend, Performance)",
  "tags": ["3 to 5 relevant technical tags"],
  "readingTime": 5,
  "seo": {
    "metaTitle": "SEO title between 30 and 60 characters",
    "metaDescription": "SEO description between 120 and 160 characters summarizing the post value",
    "keywords": "comma separated keywords",
    "ogTitle": "Social share title",
    "ogDescription": "Social share summary"
  },
  "imagePrompt": "A detailed descriptive prompt for generating an aesthetic editorial cover image for this topic",
  "featured": ${request.featured ? 'true' : 'false'},
  "tableOfContents": [
    { "title": "Heading Text", "anchor": "heading-slug" }
  ]
}`;
  }
}

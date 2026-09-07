import type { Core } from '@strapi/strapi';

export interface TranslationPayload {
  contentType: string;
  documentId: string;
  sourceLocale: string;
  targetLocale: string;
}

export interface TranslationResult {
  success: boolean;
  sourceLocale: string;
  targetLocale: string;
  documentId: string;
  message: string;
  data?: any;
}

// User-facing translatable field names
const TRANSLATABLE_FIELDS = new Set([
  'title',
  'name',
  'heading',
  'subheading',
  'badge',
  'description',
  'excerpt',
  'content',
  'bio',
  'role',
  'buttonText',
  'primaryButtonText',
  'secondaryButtonText',
  'placeholder',
  'browseArchiveText',
  'viewAllText',
  'subtitle',
  'siteSubtitle',
  'ctaButtonText',
  'column1Title',
  'column2Title',
  'newsletterTitle',
  'newsletterDescription',
  'newsletterButtonText',
  'copyrightText',
  'metaTitle',
  'metaDescription',
]);

/**
 * Recursively strips component database IDs so Strapi 5 can create/link fresh components in new localizations
 */
function cleanComponentIds(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => cleanComponentIds(item));
  }

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === 'id' && typeof value === 'number') {
      continue; // Strip component DB ID
    }
    cleaned[key] = cleanComponentIds(value);
  }
  return cleaned;
}

/**
 * Recursively extracts user-facing translatable text from an object, array, or Dynamic Zone block
 */
function extractTranslatableContent(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => extractTranslatableContent(item));
  }

  const extracted: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    // Always preserve technical and component metadata
    if (key === '__component' || key === 'id' || key === 'documentId' || key === 'icon' || key === 'color') {
      extracted[key] = value;
      continue;
    }

    // Preserve media, relations, booleans, numbers
    if (key === 'coverImage' || key === 'avatar' || key === 'image' || key === 'author' || key === 'category' || key === 'tags' || key === 'comments' || key === 'slug') {
      extracted[key] = value;
      continue;
    }

    if (typeof value === 'string') {
      if (TRANSLATABLE_FIELDS.has(key) || value.trim().length > 0) {
        extracted[key] = value;
      } else {
        extracted[key] = value;
      }
    } else if (typeof value === 'object' && value !== null) {
      extracted[key] = extractTranslatableContent(value);
    } else {
      extracted[key] = value;
    }
  }

  return extracted;
}

/**
 * Merges translated fields back into original structure preserving non-translatable fields
 */
function mergeTranslatedContent(original: any, translated: any): any {
  if (!original || typeof original !== 'object') {
    return translated !== undefined ? translated : original;
  }

  if (Array.isArray(original)) {
    if (!Array.isArray(translated)) return original;
    return original.map((origItem, idx) => {
      const transItem = translated[idx] || {};
      return mergeTranslatedContent(origItem, transItem);
    });
  }

  const result: Record<string, any> = { ...original };

  for (const [key, val] of Object.entries(translated)) {
    if (key === '__component' || key === 'id' || key === 'documentId') {
      continue; // Keep original identifiers
    }

    if (typeof val === 'object' && val !== null && original[key] !== undefined) {
      result[key] = mergeTranslatedContent(original[key], val);
    } else {
      result[key] = val;
    }
  }

  return result;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  cleanComponentIds,
  extractTranslatableContent,
  mergeTranslatedContent,

  /**
   * Translates structured payload using OpenRouter API
   */
  async translatePayloadWithOpenRouter(payload: any, sourceLocale: string, targetLocale: string): Promise<any> {
    // Read live .env values if changed during runtime
    let apiKey = process.env.OPENROUTER_API_KEY;
    let model = process.env.OPENROUTER_MODEL;

    try {
      const fs = require('fs');
      const path = require('path');
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const keyMatch = envContent.match(/OPENROUTER_API_KEY=([^\r\n]+)/);
        const modelMatch = envContent.match(/OPENROUTER_MODEL=([^\r\n]+)/);
        if (keyMatch) apiKey = keyMatch[1].trim();
        if (modelMatch) model = modelMatch[1].trim();
      }
    } catch {}

    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured on the server. Please check your environment variables.');
    }

    if (!model) {
      throw new Error('OPENROUTER_MODEL is not configured on the server (strapi/.env). Please set OPENROUTER_MODEL.');
    }

    // Dynamic language name resolution from Strapi locales
    let sourceLang = sourceLocale;
    let targetLang = targetLocale;

    try {
      const locales = await (strapi.plugin('i18n')?.service('locales') as any)?.find();
      if (Array.isArray(locales)) {
        const s = locales.find((l: any) => l.code === sourceLocale);
        const t = locales.find((l: any) => l.code === targetLocale);
        if (s?.name) sourceLang = `${s.name} (${s.code})`;
        if (t?.name) targetLang = `${t.name} (${t.code})`;
      }
    } catch {
      // fallback to locale codes
    }

    const systemPrompt = `You are an elite, production-grade localization translation engine for technical and editorial publishing.
Your task is to translate JSON content from ${sourceLang} to ${targetLang}.

CRITICAL RULES:
1. Return ONLY valid, parseable JSON matching the exact key structure of the input. Do NOT wrap in markdown code blocks, do NOT include explanations.
2. Translate all human-readable, user-facing text, titles, headings, markdown body, excerpts, labels, placeholders, SEO meta titles, and descriptions into natural, culturally accurate ${targetLang}.
3. STRICTLY PRESERVE all '__component' strings, technical identifiers, CSS class names, URLs, mailto links, code snippets, Markdown link syntax [text](url), and dynamic parameters.
4. Maintain tone: polished, professional, modern tech journalism / software architecture standards.
5. Do NOT translate brand names (e.g. 'CHRONICLE', 'Strapi', 'Next.js', 'PostgreSQL', 'TypeScript').
6. Preserve array lengths and block order exactly.`;

    const userPrompt = JSON.stringify(payload, null, 2);

    const candidateModels = [
      model,
      'nvidia/nemotron-3.5-lightning:free',
      'z-ai/glm-5.2:free',
      'minimax/minimax-m2.7:free',
      'google/gemma-4-26b-a4b-it:free',
    ].filter(Boolean) as string[];

    let lastError: any = null;

    for (const currentModel of candidateModels) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': 'http://localhost:1337',
            'X-Title': 'Chronicle Strapi Localization',
          },
          body: JSON.stringify({
            model: currentModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.2,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          strapi.log.warn(`OpenRouter model ${currentModel} returned [${response.status}]: ${errText}`);
          lastError = new Error(`OpenRouter model ${currentModel} failed with status ${response.status}.`);
          continue;
        }

        const data: any = await response.json();
        const rawContent = data.choices?.[0]?.message?.content;

        if (!rawContent) {
          lastError = new Error(`Empty response from model ${currentModel}`);
          continue;
        }

        try {
          const cleaned = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
          return JSON.parse(cleaned);
        } catch (parseErr) {
          // If JSON parse fails, try extracting first JSON object match
          const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
          strapi.log.warn(`Could not parse JSON from model ${currentModel}:`, rawContent);
          lastError = parseErr;
          continue;
        }
      } catch (reqErr: any) {
        strapi.log.warn(`Request failed for model ${currentModel}:`, reqErr.message);
        lastError = reqErr;
      }
    }

    throw lastError || new Error('All OpenRouter translation models failed.');
  },

  /**
   * Main 7-step translation and persistence pipeline
   */
  async translateDocument({ contentType, documentId, sourceLocale, targetLocale }: TranslationPayload): Promise<TranslationResult> {
    if (!contentType || !sourceLocale || !targetLocale) {
      throw new Error('Missing required translation parameters (contentType, sourceLocale, targetLocale).');
    }

    if (sourceLocale === targetLocale) {
      throw new Error('Source locale and target locale cannot be identical.');
    }

    // Step 1: Validate contentType model and kind
    const schema = strapi.getModel(contentType as any);
    if (!schema) {
      throw new Error(`Invalid contentType "${contentType}". Model not found in Strapi schema registry.`);
    }

    const isSingleType = schema.kind === 'singleType';

    if (!isSingleType && !documentId) {
      throw new Error(`Missing required parameter "documentId" for collection type "${contentType}".`);
    }

    const populateObj: Record<string, any> = {};
    if (schema?.attributes) {
      for (const [attrName, attrVal] of Object.entries(schema.attributes as Record<string, any>)) {
        if (attrVal.type === 'dynamiczone' || attrVal.type === 'component') {
          populateObj[attrName] = { populate: '*' };
        } else if (attrVal.type === 'media' || attrVal.type === 'relation') {
          populateObj[attrName] = true;
        }
      }
    }

    // Step 2: Resolve source document explicitly for requested sourceLocale
    let sourceDoc: any = null;

    if (isSingleType) {
      // Single types have exactly one document per locale
      sourceDoc = await (strapi.documents(contentType as any) as any).findFirst({
        locale: sourceLocale,
        populate: Object.keys(populateObj).length > 0 ? populateObj : '*',
      });
    } else {
      // Collection types: primary lookup by documentId + sourceLocale
      sourceDoc = await (strapi.documents(contentType as any) as any).findOne({
        documentId,
        locale: sourceLocale,
        populate: Object.keys(populateObj).length > 0 ? populateObj : '*',
      });

      // Fallback: If documentId was provided from another locale's draft/view, check if any document in sourceLocale exists
      if (!sourceDoc && documentId) {
        const anyDoc = await (strapi.documents(contentType as any) as any).findOne({
          documentId,
        });
        if (anyDoc && anyDoc.locale === sourceLocale) {
          sourceDoc = anyDoc;
        }
      }
    }

    // Temporary/debug-safe logging (never logs API keys or payload content)
    strapi.log.info('[Translation Pipeline] Resolving source document:', {
      contentType,
      documentId: documentId || 'N/A (SingleType)',
      sourceLocale,
      targetLocale,
      isSingleType,
      sourceFound: !!sourceDoc,
      sourceDocId: sourceDoc?.documentId,
      sourceDocLocale: sourceDoc?.locale,
    });

    if (!sourceDoc) {
      throw new Error(
        `Source document not found for contentType "${contentType}", documentId "${documentId || 'N/A'}", and locale "${sourceLocale}". Diagnostic: No document with source locale "${sourceLocale}" exists for this entry.`
      );
    }

    if (sourceDoc.locale && sourceDoc.locale !== sourceLocale) {
      throw new Error(
        `Source document resolved with documentId "${sourceDoc.documentId}" has locale "${sourceDoc.locale}", which does not match requested sourceLocale "${sourceLocale}".`
      );
    }

    // Step 3: Check whether target localization already exists
    let existingTargetDoc: any = null;
    if (isSingleType) {
      existingTargetDoc = await (strapi.documents(contentType as any) as any).findFirst({
        locale: targetLocale,
      });
    } else {
      existingTargetDoc = await (strapi.documents(contentType as any) as any).findOne({
        documentId: sourceDoc.documentId,
        locale: targetLocale,
      });
    }

    // Step 4: Schema-driven extraction
    const translatablePayload = extractTranslatableContent(sourceDoc);

    // Step 5: Translate via OpenRouter
    strapi.log.info(`Translating document ${sourceDoc.documentId} (${contentType}) from ${sourceLocale} to ${targetLocale}...`);
    const translatedPayload = await this.translatePayloadWithOpenRouter(translatablePayload, sourceLocale, targetLocale);

    // Step 6: Validate and merge into complete data payload
    const mergedData = mergeTranslatedContent(sourceDoc, translatedPayload);

    // Sanitize relations, media, components and system fields before persistence
    const sanitizedData: Record<string, any> = {};
    for (const [key, value] of Object.entries(mergedData)) {
      if (['id', 'documentId', 'createdAt', 'updatedAt', 'publishedAt', 'locale', 'localizations'].includes(key)) {
        continue;
      }

      const attr = schema?.attributes?.[key];
      if (!attr) {
        sanitizedData[key] = value;
        continue;
      }

      const isLocalized = !!attr.pluginOptions?.i18n?.localized;

      if (!isLocalized && attr.type !== 'dynamiczone' && attr.type !== 'component' && attr.type !== 'relation') {
        // For non-localized fields in Strapi 5, preserve original sourceDoc value to avoid unique index collisions
        if (sourceDoc[key] !== undefined) {
          sanitizedData[key] = sourceDoc[key];
        }
        continue;
      }

      if (attr.type === 'relation') {
        // In Strapi 5, mappedBy relations are read-only
        if (attr.mappedBy) {
          continue;
        }

        const targetUID = attr.target;
        if (targetUID && value) {
          const targetModel = strapi.getModel(targetUID as any);
          const isTargetLocalized = !!targetModel?.pluginOptions?.i18n?.localized;

          if (Array.isArray(value)) {
            const validDocIds: string[] = [];
            for (const item of value) {
              const relDocId = typeof item === 'object' ? item?.documentId : item;
              if (relDocId) {
                if (isTargetLocalized) {
                  const exists = await (strapi.documents(targetUID as any) as any).findOne({
                    documentId: relDocId,
                    locale: targetLocale,
                  });
                  if (exists) validDocIds.push(relDocId);
                } else {
                  validDocIds.push(relDocId);
                }
              }
            }
            if (validDocIds.length > 0) {
              sanitizedData[key] = { set: validDocIds };
            }
          } else if (typeof value === 'object' && value !== null) {
            const relDocId = (value as any)?.documentId;
            if (relDocId) {
              if (isTargetLocalized) {
                const exists = await (strapi.documents(targetUID as any) as any).findOne({
                  documentId: relDocId,
                  locale: targetLocale,
                });
                if (exists) {
                  sanitizedData[key] = { set: [relDocId] };
                }
              } else {
                sanitizedData[key] = { set: [relDocId] };
              }
            }
          }
        }
      } else if (attr.type === 'uid') {
        const baseSlug = String(sourceDoc[key] || value || 'item').toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        const cleanLocale = targetLocale.toLowerCase().replace(/[^a-z0-9]/g, '');
        sanitizedData[key] = baseSlug ? `${baseSlug}-${cleanLocale}` : `${key}-${cleanLocale}`;
      } else if (attr.type === 'email') {
        // If email is unique in database, format or omit
        if (value) {
          const cleanLocale = targetLocale.toLowerCase().replace(/[^a-z0-9]/g, '');
          const strVal = String(value);
          sanitizedData[key] = strVal.includes('@') ? strVal.replace('@', `+${cleanLocale}@`) : `${cleanLocale}_${strVal}`;
        }
      } else if (attr.type === 'media') {
        if (value) {
          if (Array.isArray(value)) {
            const mediaIds = value.map((item: any) => (typeof item === 'object' ? item?.id : item)).filter(Boolean);
            if (mediaIds.length > 0) sanitizedData[key] = mediaIds;
          } else if (typeof value === 'object') {
            const mediaId = (value as any)?.id;
            if (mediaId) sanitizedData[key] = mediaId;
          } else {
            sanitizedData[key] = value;
          }
        }
      } else if (attr.type === 'dynamiczone' || attr.type === 'component') {
        sanitizedData[key] = cleanComponentIds(value);
      } else {
        sanitizedData[key] = value;
      }
    }

    // Step 7: Persist official Strapi 5 localization
    // In Strapi 5, all localizations share the same documentId.
    // Calling update with documentId and targetLocale creates/updates the localization on that document.
    let savedDoc: any;

    if (isSingleType) {
      if (existingTargetDoc) {
        savedDoc = await (strapi.documents(contentType as any) as any).update({
          documentId: existingTargetDoc.documentId,
          locale: targetLocale,
          data: sanitizedData,
        });
      } else if (sourceDoc?.documentId) {
        savedDoc = await (strapi.documents(contentType as any) as any).update({
          documentId: sourceDoc.documentId,
          locale: targetLocale,
          data: sanitizedData,
        });
      } else {
        savedDoc = await (strapi.documents(contentType as any) as any).create({
          locale: targetLocale,
          data: sanitizedData,
        });
      }
      strapi.log.info(`✅ Successfully saved single-type ${targetLocale} localization for ${contentType}`);
    } else {
      // Collection types: always link to sourceDoc.documentId via update
      try {
        savedDoc = await (strapi.documents(contentType as any) as any).update({
          documentId: sourceDoc.documentId,
          locale: targetLocale,
          data: sanitizedData,
        });
        strapi.log.info(`✅ Successfully linked & saved ${targetLocale} localization for document ${sourceDoc.documentId}`);
      } catch (updateErr: any) {
        strapi.log.warn(`Update failed for ${targetLocale}, falling back to create:`, updateErr?.message);
        savedDoc = await (strapi.documents(contentType as any) as any).create({
          locale: targetLocale,
          data: sanitizedData,
        });
      }
    }

    // Auto-publish if source document was published
    if (sourceDoc.publishedAt) {
      try {
        await (strapi.documents(contentType as any) as any).publish({
          documentId: savedDoc?.documentId || sourceDoc.documentId,
          locale: targetLocale,
        });
        strapi.log.info(`✅ Auto-published ${targetLocale} localization for document ${savedDoc?.documentId || sourceDoc.documentId}`);
      } catch (pubErr) {
        strapi.log.warn(`Could not auto-publish ${targetLocale} document:`, pubErr);
      }
    }

    // Verify localization relationship
    const verifiedDoc = await (strapi.documents(contentType as any) as any).findOne({
      documentId: savedDoc?.documentId || sourceDoc.documentId,
      locale: targetLocale,
    });

    return {
      success: true,
      sourceLocale,
      targetLocale,
      documentId: savedDoc?.documentId || sourceDoc.documentId,
      message: `Localization for ${targetLocale} was successfully created and linked.`,
      data: verifiedDoc || savedDoc,
    };
  },

  /**
   * Translates the complete site (Header, Footer, Pages, Categories, Authors, Posts, Tags)
   */
  async translateFullSite({ sourceLocale, targetLocale }: { sourceLocale: string; targetLocale: string }) {
    const summary: Record<string, any> = {};

    // Single types
    const singleTypes = [
      'api::header.header',
      'api::footer.footer',
      'api::home-page.home-page',
      'api::about-page.about-page',
      'api::articles-page.articles-page',
    ];

    for (const st of singleTypes) {
      try {
        const doc = await (strapi.documents(st as any) as any).findFirst({
          locale: sourceLocale,
        });
        if (doc?.documentId) {
          await this.translateDocument({
            contentType: st,
            documentId: doc.documentId,
            sourceLocale,
            targetLocale,
          });
          summary[st] = 'Translated & Published';
        }
      } catch (err: any) {
        summary[st] = `Error: ${err.message}`;
      }
    }

    // Collection types in dependency order
    const collectionTypes = [
      'api::category.category',
      'api::author.author',
      'api::tag.tag',
      'api::post.post',
    ];

    for (const ct of collectionTypes) {
      try {
        const docs = await (strapi.documents(ct as any) as any).findMany({
          locale: sourceLocale,
        });
        summary[ct] = { total: docs?.length || 0, translated: 0, errors: [] };

        if (Array.isArray(docs)) {
          for (const doc of docs) {
            try {
              await this.translateDocument({
                contentType: ct,
                documentId: doc.documentId,
                sourceLocale,
                targetLocale,
              });
              summary[ct].translated++;
            } catch (docErr: any) {
              summary[ct].errors.push(`${doc.documentId}: ${docErr.message}`);
            }
          }
        }
      } catch (err: any) {
        summary[ct] = `Error: ${err.message}`;
      }
    }

    return {
      success: true,
      sourceLocale,
      targetLocale,
      message: `Full website translated to ${targetLocale}!`,
      summary,
    };
  },

  async publishAllLocales(locale: string = 'gu-IN') {
    const uids = [
      'api::header.header',
      'api::footer.footer',
      'api::home-page.home-page',
      'api::about-page.about-page',
      'api::articles-page.articles-page',
      'api::category.category',
      'api::author.author',
      'api::tag.tag',
      'api::post.post',
    ];

    const results: Record<string, any> = {};

    for (const uid of uids) {
      try {
        const docs = await (strapi.documents(uid as any) as any).findMany({
          locale,
          status: 'draft',
        });

        results[uid] = { count: docs?.length || 0 };

        if (Array.isArray(docs)) {
          for (const doc of docs) {
            try {
              await (strapi.documents(uid as any) as any).publish({
                documentId: doc.documentId,
                locale,
              });
            } catch (pErr: any) {
              strapi.log.warn(`Publish error on ${uid} (${doc.documentId}):`, pErr);
            }
          }
        }
      } catch (err: any) {
        results[uid] = { error: err.message };
      }
    }

    return results;
  },

  /**
   * Automatically translates a document from English to all other configured Strapi locales
   */
  async autoTranslateToAllLocales({
    contentType,
    documentId,
    sourceLocale = 'en',
    status = 'draft',
  }: {
    contentType: string;
    documentId: string;
    sourceLocale?: string;
    status?: 'draft' | 'published';
  }) {
    try {
      const localesService = strapi.plugin('i18n')?.service('locales');
      const locales = await localesService?.find();
      if (!Array.isArray(locales) || locales.length === 0) return;

      const targetLocales = locales
        .map((l: any) => l.code)
        .filter((code: string) => code !== sourceLocale);

      strapi.log.info(`[Auto-Translation] Starting auto-translation for ${contentType} (${documentId}) to: ${targetLocales.join(', ')}`);

      for (const targetLocale of targetLocales) {
        try {
          await this.translateDocument({
            contentType,
            documentId,
            sourceLocale,
            targetLocale,
          });

          if (status === 'published') {
            try {
              await (strapi.documents(contentType as any) as any).publish({
                documentId,
                locale: targetLocale,
              });
            } catch (pubErr: any) {
              strapi.log.warn(`[Auto-Translation] Auto-publish note for ${targetLocale}:`, pubErr.message);
            }
          }

          strapi.log.info(`[Auto-Translation] ✅ ${targetLocale} auto-translated and saved for ${contentType} (${documentId})`);
        } catch (itemErr: any) {
          strapi.log.warn(`[Auto-Translation] ⚠️ Failed for ${targetLocale}:`, itemErr.message);
        }
      }
    } catch (err: any) {
      strapi.log.error('[Auto-Translation] Global error:', err);
    }
  },
});


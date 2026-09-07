const STRAPI_URL = 'http://127.0.0.1:1337';

const SINGLE_TYPES = [
  'api::header.header',
  'api::footer.footer',
  'api::home-page.home-page',
  'api::about-page.about-page',
  'api::articles-page.articles-page',
];

const COLLECTION_TYPES = [
  'api::category.category',
  'api::author.author',
  'api::tag.tag',
  'api::post.post',
];

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} on ${url}: ${text}`);
  }
  return res.json();
}

async function translateDoc(contentType, documentId, sourceLocale, targetLocale) {
  return fetchJson(`${STRAPI_URL}/api/translation/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contentType,
      documentId,
      sourceLocale,
      targetLocale,
    }),
  });
}

async function run(targetLocale) {
  console.log(`\n========================================`);
  console.log(`🚀 Starting Translation to: ${targetLocale}`);
  console.log(`========================================\n`);

  // 1. Single Types
  for (const st of SINGLE_TYPES) {
    try {
      const endpoint = st.replace('api::', '').replace(/\..*$/, '');
      const data = await fetchJson(`${STRAPI_URL}/api/${endpoint}?locale=en`);
      const docId = data?.data?.documentId;
      if (!docId) {
        console.log(`⚠️ No documentId found for single-type ${st}`);
        continue;
      }
      console.log(`⏳ Translating single-type ${st} (${docId})...`);
      await translateDoc(st, docId, 'en', targetLocale);
      console.log(`✅ [${st}] Translated successfully!`);
    } catch (err) {
      console.error(`❌ Error on single-type ${st}:`, err.message);
    }
  }

  // 2. Collection Types
  for (const ct of COLLECTION_TYPES) {
    try {
      let endpoint = ct.replace('api::', '').replace(/\..*$/, '');
      if (endpoint === 'category') endpoint = 'categories';
      else if (endpoint === 'author') endpoint = 'authors';
      else if (endpoint === 'tag') endpoint = 'tags';
      else if (endpoint === 'post') endpoint = 'posts';

      const data = await fetchJson(`${STRAPI_URL}/api/${endpoint}?locale=en`);
      const items = data?.data || [];
      console.log(`\n⏳ Translating collection-type ${ct} (${items.length} items)...`);

      for (const item of items) {
        const docId = item?.documentId;
        if (!docId) continue;
        try {
          console.log(`  -> Translating item ${docId} (${item.title || item.name || ''})...`);
          await translateDoc(ct, docId, 'en', targetLocale);
          console.log(`  ✅ Item ${docId} translated!`);
        } catch (itemErr) {
          console.error(`  ❌ Item ${docId} failed:`, itemErr.message);
        }
      }
    } catch (err) {
      console.error(`❌ Error on collection-type ${ct}:`, err.message);
    }
  }

  // 3. Publish all in targetLocale
  console.log(`\n📢 Publishing all ${targetLocale} entries...`);
  try {
    await fetchJson(`${STRAPI_URL}/api/translation/publish-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: targetLocale }),
    });
    console.log(`🎉 ALL ${targetLocale} entries published successfully!`);
  } catch (pubErr) {
    console.warn('Publish note:', pubErr.message);
  }
}

async function main() {
  const targets = process.argv.slice(2);
  const localesToTranslate = targets.length > 0 ? targets : ['zh-Hans-SG', 'hi-IN', 'gu-IN'];
  for (const loc of localesToTranslate) {
    await run(loc);
  }
}

main().catch(console.error);

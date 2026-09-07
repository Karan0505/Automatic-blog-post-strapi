const http = require('http');

function httpRequest({ method = 'GET', path, body = null }) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 1337,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(raw);
            if (res.statusCode >= 400) {
              reject(new Error(parsed.error?.message || `HTTP ${res.statusCode}`));
            } else {
              resolve(parsed);
            }
          } catch (e) {
            reject(new Error(`Failed to parse JSON (HTTP ${res.statusCode}): ${raw}`));
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
}

async function translateDoc(contentType, documentId, sourceLocale, targetLocale) {
  return httpRequest({
    method: 'POST',
    path: '/api/translation/translate',
    body: { contentType, documentId, sourceLocale, targetLocale },
  });
}

async function translateAllForLocale(targetLocale) {
  console.log(`\n========================================`);
  console.log(`🚀 Starting Full Translation to: ${targetLocale}`);
  console.log(`========================================\n`);

  // Single types
  const singleTypes = [
    { ct: 'api::header.header', ep: 'header' },
    { ct: 'api::footer.footer', ep: 'footer' },
    { ct: 'api::home-page.home-page', ep: 'home-page' },
    { ct: 'api::about-page.about-page', ep: 'about-page' },
    { ct: 'api::articles-page.articles-page', ep: 'articles-page' },
  ];

  for (const { ct, ep } of singleTypes) {
    try {
      const json = await httpRequest({ path: `/api/${ep}?locale=en` });
      const docId = json?.data?.documentId;
      if (docId) {
        process.stdout.write(`⏳ Single Type [${ep}]... `);
        await translateDoc(ct, docId, 'en', targetLocale);
        console.log(`✅ OK`);
      }
    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
    }
  }

  // Collection types
  const collectionTypes = [
    { ct: 'api::category.category', ep: 'categories' },
    { ct: 'api::author.author', ep: 'authors' },
    { ct: 'api::tag.tag', ep: 'tags' },
    { ct: 'api::post.post', ep: 'posts' },
  ];

  for (const { ct, ep } of collectionTypes) {
    try {
      const json = await httpRequest({ path: `/api/${ep}?locale=en` });
      const items = json?.data || [];
      console.log(`\n📂 Collection [${ep}] (${items.length} items):`);

      for (const item of items) {
        if (!item.documentId) continue;
        try {
          process.stdout.write(`  -> [${item.title || item.name || item.documentId}]... `);
          await translateDoc(ct, item.documentId, 'en', targetLocale);
          console.log(`✅ OK`);
        } catch (itemErr) {
          console.log(`❌ Error: ${itemErr.message}`);
        }
      }
    } catch (err) {
      console.log(`❌ Failed collection ${ep}: ${err.message}`);
    }
  }

  console.log(`\n🎉 Translation complete for ${targetLocale}!\n`);
}

async function main() {
  const targets = process.argv.slice(2);
  const locales = targets.length > 0 ? targets : ['zh-Hans-SG', 'hi-IN'];
  for (const loc of locales) {
    await translateAllForLocale(loc);
  }
}

main().catch(console.error);

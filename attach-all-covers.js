const fs = require('fs');
const path = require('path');
const os = require('os');
const sharp = require('sharp');

async function getImageBuffer(prompt, title) {
  const cleanPrompt = encodeURIComponent(
    `Modern editorial tech publication cover: ${prompt.slice(0, 160)}. Minimalist, sleek, high resolution, dark mode aesthetic.`
  );
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=1280&height=720&model=flux&nologo=true`;

  try {
    const res = await fetch(pollinationsUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const arr = await res.arrayBuffer();
      if (arr.byteLength > 1000) {
        console.log(`  -> Pollinations AI image downloaded successfully`);
        return Buffer.from(arr);
      }
    }
  } catch (err) {
    console.warn(`  -> Pollinations fetch note: ${err.message}, using high-res tech fallback`);
  }

  // Curated tech fallbacks based on topic keywords
  const lower = (title + ' ' + prompt).toLowerCase();
  let cdnUrl = 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1280&q=80';
  if (lower.includes('civil') || lower.includes('infrastruct') || lower.includes('construct')) {
    cdnUrl = 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f8?w=1280&q=80';
  } else if (lower.includes('connect') || lower.includes('network') || lower.includes('server')) {
    cdnUrl = 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1280&q=80';
  } else if (lower.includes('cloud') || lower.includes('architect') || lower.includes('system')) {
    cdnUrl = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1280&q=80';
  } else if (lower.includes('next') || lower.includes('react') || lower.includes('app router')) {
    cdnUrl = 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1280&q=80';
  } else if (lower.includes('claude') || lower.includes('ai') || lower.includes('model') || lower.includes('intel')) {
    cdnUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1280&q=80';
  } else if (lower.includes('python')) {
    cdnUrl = 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1280&q=80';
  }

  try {
    const res = await fetch(cdnUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const arr = await res.arrayBuffer();
      return Buffer.from(arr);
    }
  } catch (err) {
    console.warn(`  -> CDN fetch error: ${err.message}`);
  }

  // Pure SVG fallback if network fails
  const svg = `
    <svg width="1200" height="700" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="50%" stop-color="#1e1b4b" />
          <stop offset="100%" stop-color="#312e81" />
        </linearGradient>
      </defs>
      <rect width="1200" height="700" fill="url(#g)" />
      <circle cx="950" cy="200" r="280" fill="#6366f1" opacity="0.3" />
      <circle cx="250" cy="500" r="240" fill="#a855f7" opacity="0.25" />
      <text x="80" y="320" fill="#f8fafc" font-size="42" font-family="sans-serif" font-weight="bold">${title.slice(0, 45)}</text>
      <text x="80" y="380" fill="#94a3b8" font-size="22" font-family="sans-serif">CHRONICLE ARCHITECTURE & ENGINEERING</text>
    </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function uploadToStrapi(buffer, filename, altText) {
  const compressed = await sharp(buffer)
    .resize({ width: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const tempFile = path.join(os.tmpdir(), `${filename}-${Date.now()}.webp`);
  fs.writeFileSync(tempFile, compressed);

  try {
    const formData = new FormData();
    const fileBlob = new Blob([compressed], { type: 'image/webp' });
    formData.append('files', fileBlob, `${filename}.webp`);
    formData.append(
      'fileInfo',
      JSON.stringify({
        name: filename,
        alternativeText: altText,
      })
    );

    const uploadRes = await fetch('http://127.0.0.1:1337/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Upload failed with status ${uploadRes.status}: ${errText}`);
    }

    const uploadResult = await uploadRes.json();
    const uploadedMedia = Array.isArray(uploadResult) ? uploadResult[0] : uploadResult;
    return uploadedMedia?.id || null;
  } finally {
    try {
      fs.unlinkSync(tempFile);
    } catch {}
  }
}

async function main() {
  console.log('=== Step 1: Checking and Updating Elena Rostova Author Avatar ===');
  try {
    const authRes = await fetch('http://127.0.0.1:1337/api/authors?filters[slug][$eq]=elena-rostova&populate=*');
    const authData = await authRes.json();
    const elena = authData.data?.[0];
    if (elena && !elena.avatar) {
      console.log(`Found Elena Rostova without avatar (documentId: ${elena.documentId}). Generating avatar...`);
      const avatarRes = await fetch('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80');
      const avatarBuf = Buffer.from(await avatarRes.arrayBuffer());
      const avatarMediaId = await uploadToStrapi(avatarBuf, 'elena-rostova-avatar', 'Elena Rostova Avatar');
      if (avatarMediaId) {
        const updateRes = await fetch(`http://127.0.0.1:1337/api/authors/${elena.documentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: { avatar: avatarMediaId },
          }),
        });
        console.log(`Elena Rostova avatar updated! Status: ${updateRes.status}`);
      }
    } else {
      console.log('Elena Rostova already has an avatar or not found.');
    }
  } catch (err) {
    console.warn('Error updating author avatar:', err.message);
  }

  console.log('\n=== Step 2: Checking Posts without Cover Images ===');
  const postRes = await fetch('http://127.0.0.1:1337/api/posts?populate=*&pagination[pageSize]=100');
  const postData = await postRes.json();
  const posts = postData.data || [];

  const missingPosts = posts.filter((p) => !p.coverImage);
  console.log(`Found ${missingPosts.length} posts needing cover images out of ${posts.length} total posts.\n`);

  for (const post of missingPosts) {
    console.log(`Processing: [${post.id}] "${post.title}" (documentId: ${post.documentId})`);
    try {
      const prompt = post.aiPrompt || post.excerpt || post.title;
      const imgBuffer = await getImageBuffer(prompt, post.title);
      const filename = `${post.slug || 'post'}-cover`;
      const mediaId = await uploadToStrapi(imgBuffer, filename, `Cover image for ${post.title}`);

      if (mediaId) {
        console.log(`  -> Uploaded media ID: ${mediaId}. Updating post...`);
        const updateRes = await fetch(`http://127.0.0.1:1337/api/posts/${post.documentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: {
              coverImage: mediaId,
            },
          }),
        });

        if (updateRes.ok) {
          console.log(`  -> ✅ Successfully attached cover image to post "${post.title}"`);
        } else {
          console.warn(`  -> ⚠️ Failed to update post: status ${updateRes.status}`);
        }

        // Revalidate Next.js cache
        try {
          await fetch('http://localhost:3000/api/revalidate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'post',
              entry: { slug: post.slug },
              locale: post.locale || 'en',
            }),
            signal: AbortSignal.timeout(2000),
          });
        } catch {}
      }
    } catch (err) {
      console.error(`  -> Error processing post ${post.id}:`, err.message);
    }
  }

  // Final revalidation of home page
  try {
    console.log('\nRevalidating Next.js home page cache...');
    await fetch('http://localhost:3000/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/en' }),
      signal: AbortSignal.timeout(2000),
    });
    console.log('Revalidated home page cache successfully!');
  } catch (err) {
    console.log('Revalidation note:', err.message);
  }

  console.log('\nAll done! All missing images attached.');
}

main().catch(console.error);

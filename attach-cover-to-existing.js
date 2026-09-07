const fs = require('fs');
const path = require('path');
const os = require('os');
const sharp = require('sharp');

async function attachImage() {
  console.log('Attaching WebP cover image to existing post...');
  const postRes = await fetch('http://127.0.0.1:1337/api/posts?filters[slug][$containsi]=react&populate=*');
  const postData = await postRes.json();
  const post = postData.data?.[0];
  if (!post) {
    console.log('Post not found');
    return;
  }

  console.log(`Found post ${post.id} (documentId: ${post.documentId}): ${post.title}`);

  // Fetch curated high-res React tech image from Unsplash
  const unsplashUrl = 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1280&q=80';
  const imgRes = await fetch(unsplashUrl);
  const rawBuf = Buffer.from(await imgRes.arrayBuffer());

  // Compress to WebP with max-width 1200
  const compressed = await sharp(rawBuf)
    .resize({ width: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const tempFile = path.join(os.tmpdir(), `react-blog-cover-${Date.now()}.webp`);
  fs.writeFileSync(tempFile, compressed);
  console.log(`Compressed WebP created: ${(compressed.length / 1024).toFixed(1)} KB`);

  // Upload via Strapi /api/upload multipart form
  const formData = new FormData();
  const fileBlob = new Blob([compressed], { type: 'image/webp' });
  formData.append('files', fileBlob, 'react-blog-cover.webp');
  formData.append(
    'fileInfo',
    JSON.stringify({
      name: 'react-blog-cover',
      alternativeText: 'React Blog Architecture Cover',
    })
  );

  const uploadRes = await fetch('http://127.0.0.1:1337/api/upload', {
    method: 'POST',
    body: formData,
  });

  const uploadResult = await uploadRes.json();
  const uploadedMedia = Array.isArray(uploadResult) ? uploadResult[0] : uploadResult;
  console.log('Upload result media ID:', uploadedMedia?.id);

  if (uploadedMedia?.id) {
    // Update the post with coverImage
    const updateRes = await fetch(`http://127.0.0.1:1337/api/posts/${post.documentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          coverImage: uploadedMedia.id,
        },
      }),
    });
    const updateData = await updateRes.json();
    console.log('Post update response status:', updateRes.status);

    // Also trigger Next.js cache revalidation
    await fetch('http://localhost:3000/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'post',
        entry: { slug: post.slug },
        locale: 'en',
      }),
    });
    console.log('Next.js cache revalidated!');
  }

  try {
    fs.unlinkSync(tempFile);
  } catch {}

  console.log('Done!');
}

attachImage().catch(console.error);

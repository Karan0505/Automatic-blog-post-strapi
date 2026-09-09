const sharp = require('sharp');

async function testImageGen() {
  const prompt = "Modern editorial 3D digital tech illustration of Shift-Left Security Building DevSecOps into Your CI CD Pipeline, in category Engineering. Vibrant volumetric lighting, dark aesthetic, clean, high resolution, 4k";
  const seed = 12345;
  const encodedPrompt = encodeURIComponent(prompt);
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1200&height=630&model=turbo&nologo=true&seed=${seed}`;

  console.log('Testing Pollinations Turbo URL:', pollinationsUrl);
  const start = Date.now();
  try {
    const res = await fetch(pollinationsUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(15000),
    });
    console.log('Status:', res.status, res.statusText, `in ${Date.now() - start}ms`);
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      console.log('Success, buffer size:', buf.length);
      const compressed = await sharp(buf).webp({ quality: 82 }).toBuffer();
      console.log('Compressed size:', compressed.length);
    } else {
      console.log('Failed status:', res.status);
      const text = await res.text();
      console.log('Body:', text.slice(0, 300));
    }
  } catch (err) {
    console.error('Error:', err.message, `after ${Date.now() - start}ms`);
  }
}

testImageGen();

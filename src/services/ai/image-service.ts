import type { Core } from '@strapi/strapi';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ImageCompressionService } from './image-compression';
import type { ImageCompressionOptions } from './types';

export class ImageService {
  /**
   * Topic-specific curated high-definition tech photography fallback library
   */
  public static getTopicMatchedFallbackUrl(text: string): string {
    const lower = (text || '').toLowerCase();

    // 1. Artificial Intelligence & Machine Learning
    const isAiTopic =
      /(?:^|\W)(ai|genai|agi)(?:\W|$)/i.test(lower) ||
      lower.includes('artificial') ||
      lower.includes('machine learning') ||
      lower.includes('deep learning') ||
      lower.includes('neural') ||
      lower.includes('llm') ||
      lower.includes('gpt') ||
      lower.includes('intelligence') ||
      lower.includes('robot') ||
      lower.includes('computer vision') ||
      lower.includes('nlp') ||
      lower.includes('generative');

    if (isAiTopic) {
      const aiPool = [
        'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1280&q=80', // Glowing AI brain / neural connections
        'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1280&q=80', // Deep learning network
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1280&q=80', // Cybernetic glowing AI structure
      ];
      return aiPool[Math.floor(Math.random() * aiPool.length)];
    }

    // 2. Docker, Kubernetes, DevOps & Cloud
    if (
      lower.includes('docker') ||
      lower.includes('kubernetes') ||
      lower.includes('container') ||
      lower.includes('k8s') ||
      lower.includes('devops') ||
      lower.includes('cloud') ||
      lower.includes('aws') ||
      lower.includes('azure') ||
      lower.includes('gcp') ||
      lower.includes('ci/cd') ||
      lower.includes('cluster') ||
      lower.includes('microservice') ||
      lower.includes('serverless')
    ) {
      const devopsPool = [
        'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1280&q=80', // Modern cloud server racks & containers
        'https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=1280&q=80', // Container network abstraction
        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1280&q=80', // Global interconnected nodes
      ];
      return devopsPool[Math.floor(Math.random() * devopsPool.length)];
    }

    // 3. Cybersecurity, Auth & Ethical Hacking
    if (
      lower.includes('security') ||
      lower.includes('cyber') ||
      lower.includes('hack') ||
      lower.includes('auth') ||
      lower.includes('crypt') ||
      lower.includes('firewall') ||
      lower.includes('vulnerab') ||
      lower.includes('penetration') ||
      lower.includes('privacy') ||
      lower.includes('shield')
    ) {
      const secPool = [
        'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1280&q=80', // Digital cyber shield / padlock
        'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1280&q=80', // High security matrix visualization
      ];
      return secPool[Math.floor(Math.random() * secPool.length)];
    }

    // 4. Databases & Data Engineering
    if (
      lower.includes('data') ||
      lower.includes('sql') ||
      lower.includes('database') ||
      lower.includes('postgres') ||
      lower.includes('mongo') ||
      lower.includes('redis') ||
      lower.includes('analytics') ||
      lower.includes('big data') ||
      lower.includes('pipeline') ||
      lower.includes('warehouse')
    ) {
      return 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=1280&q=80'; // Data systems and storage
    }

    // 5. Frontend & UI/UX (React, Next.js, Vue, Design)
    if (
      lower.includes('react') ||
      lower.includes('next') ||
      lower.includes('vue') ||
      lower.includes('front') ||
      lower.includes('ui') ||
      lower.includes('ux') ||
      lower.includes('design') ||
      lower.includes('tailwind') ||
      lower.includes('javascript') ||
      lower.includes('typescript') ||
      lower.includes('web')
    ) {
      if (lower.includes('react')) {
        return 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1280&q=80'; // React 3D glow
      }
      return 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1280&q=80'; // Modern UI/UX design workspace
    }

    // 6. Mobile & App Development
    if (
      lower.includes('mobile') ||
      lower.includes('android') ||
      lower.includes('ios') ||
      lower.includes('flutter') ||
      lower.includes('react native') ||
      lower.includes('swift') ||
      lower.includes('app')
    ) {
      return 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1280&q=80'; // Modern smartphone interface
    }

    // 7. System Architecture, Performance, Scalability
    if (
      lower.includes('architect') ||
      lower.includes('scale') ||
      lower.includes('speed') ||
      lower.includes('perform') ||
      lower.includes('distribut')
    ) {
      return 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1280&q=80'; // Network architecture
    }

    // Default Tech
    return 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1280&q=80'; // Digital tech futuristic backdrop
  }

  /**
   * Downloads an external image from a URL, compresses to WebP, and uploads to Strapi Media Library
   */
  public static async downloadCompressAndUpload(
    strapi: Core.Strapi,
    imageUrl: string,
    slug: string,
    caption?: string,
    compressionOptions?: ImageCompressionOptions
  ): Promise<{ coverImageId: number | null; costUsd: number; metrics?: any }> {
    try {
      console.log(`[ImageService] Fetching external image URL: ${imageUrl}`);
      const res = await fetch(imageUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch image from URL: ${res.status} ${res.statusText}`);
      }

      const arr = await res.arrayBuffer();
      const rawBuffer = Buffer.from(arr);

      return await this.compressAndUploadBuffer(
        strapi,
        rawBuffer,
        slug,
        caption || slug,
        compressionOptions
      );
    } catch (err: any) {
      console.error('[ImageService] Failed to download and upload image from URL:', err.message);
      return { coverImageId: null, costUsd: 0 };
    }
  }

  /**
   * Generates or fetches an AI image based on the prompt, compresses to WebP, and uploads to Strapi Media Library
   */
  public static async generateCompressAndUpload(
    strapi: Core.Strapi,
    prompt: string,
    slug: string,
    compressionOptions?: ImageCompressionOptions,
    context?: { category?: string; tags?: string[] }
  ): Promise<{ coverImageId: number | null; costUsd: number; metrics?: any }> {
    let rawBuffer: Buffer | null = null;
    let costUsd = 0;

    // Build focused editorial prompt for AI generator
    const cleanTopic = (prompt || '')
      .replace(/[^\w\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const categoryHint = context?.category ? `, in category ${context.category}` : '';
    const styledPrompt = `Modern editorial 3D digital tech illustration of ${cleanTopic.slice(0, 120)}${categoryHint}. Vibrant volumetric lighting, dark aesthetic, clean, high resolution, 4k`;

    try {
      // 1. Check if OpenAI API key is available for DALL-E 3
      if (process.env.OPENAI_API_KEY) {
        try {
          const res = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: 'dall-e-3',
              prompt: `Editorial tech illustration, clean modern architectural aesthetic: ${cleanTopic}`,
              n: 1,
              size: '1024x1024',
              response_format: 'b64_json',
            }),
            signal: AbortSignal.timeout(12000),
          });
          if (res.ok) {
            const data: any = await res.json();
            const b64 = data.data?.[0]?.b64_json;
            if (b64) {
              rawBuffer = Buffer.from(b64, 'base64');
              costUsd = 0.04;
              console.log('[ImageService] ✅ Generated with OpenAI DALL-E 3');
            }
          }
        } catch (openaiErr: any) {
          console.warn('[ImageService] OpenAI DALL-E call skipped/failed:', openaiErr.message);
        }
      }

      // 2. High-performance Fast AI generator: Pollinations AI (Turbo Model)
      if (!rawBuffer) {
        const seed = Math.floor(Math.random() * 1000000);
        const encodedPrompt = encodeURIComponent(styledPrompt);
        const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1200&height=630&model=turbo&nologo=true&seed=${seed}`;

        // Attempt primary fetch with 15s timeout
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            console.log(`[ImageService] Calling Pollinations AI (turbo, attempt ${attempt}): "${cleanTopic.slice(0, 50)}"`);
            const fallbackRes = await fetch(pollinationsUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
              signal: AbortSignal.timeout(15000),
            });

            if (fallbackRes.ok) {
              const arrayBuf = await fallbackRes.arrayBuffer();
              if (arrayBuf.byteLength > 1000) {
                rawBuffer = Buffer.from(arrayBuf);
                costUsd = 0;
                console.log(`[ImageService] ✅ Generated AI image via Pollinations Turbo (${arrayBuf.byteLength} bytes)`);
                break;
              }
            } else if (fallbackRes.status === 429) {
              // Rate limit backoff
              console.warn(`[ImageService] Pollinations returned 429 rate limit. Waiting 1.5s before retry...`);
              await new Promise((r) => setTimeout(r, 1500));
            }
          } catch (pollErr: any) {
            console.warn(`[ImageService] Pollinations attempt ${attempt} note:`, pollErr.message);
            if (attempt === 1) {
              await new Promise((r) => setTimeout(r, 1000));
            }
          }
        }
      }

      // 3. Exact Topic-Matched High-Definition Tech Photography Fallback
      if (!rawBuffer) {
        try {
          const combinedQuery = `${cleanTopic} ${context?.category || ''} ${(context?.tags || []).join(' ')}`;
          const cdnUrl = this.getTopicMatchedFallbackUrl(combinedQuery);
          console.log(`[ImageService] Using topic-matched curated fallback CDN for query "${combinedQuery.slice(0, 40)}": ${cdnUrl}`);

          const cdnRes = await fetch(cdnUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(6000),
          });
          if (cdnRes.ok) {
            const arr = await cdnRes.arrayBuffer();
            rawBuffer = Buffer.from(arr);
            costUsd = 0;
          }
        } catch (cdnErr: any) {
          console.warn('[ImageService] CDN fallback fetch note:', cdnErr.message);
        }
      }

      // 4. Zero-network fallback: Procedural Sharp tech visual
      if (!rawBuffer) {
        const sharp = require('sharp');
        const displayLabel = cleanTopic.slice(0, 40).toUpperCase() || 'TECH PUBLICATION';
        const svgCard = `
          <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#0f172a" />
                <stop offset="50%" stop-color="#1e1b4b" />
                <stop offset="100%" stop-color="#312e81" />
              </linearGradient>
            </defs>
            <rect width="1200" height="630" fill="url(#grad)" />
            <circle cx="950" cy="200" r="280" fill="#6366f1" opacity="0.25" filter="blur(60px)" />
            <circle cx="250" cy="450" r="240" fill="#a855f7" opacity="0.2" filter="blur(50px)" />
            <text x="80" y="300" fill="#f8fafc" font-size="46" font-family="system-ui, sans-serif" font-weight="bold">${displayLabel}</text>
            <text x="80" y="360" fill="#94a3b8" font-size="22" font-family="system-ui, sans-serif">CHRONICLE • ARCHITECTURAL BLUEPRINT</text>
          </svg>
        `;
        rawBuffer = await sharp(Buffer.from(svgCard)).png().toBuffer();
      }

      if (!rawBuffer) {
        console.warn('[ImageService] Could not obtain image buffer for prompt:', prompt);
        return { coverImageId: null, costUsd: 0 };
      }

      // Compress and upload to Strapi
      return await this.compressAndUploadBuffer(
        strapi,
        rawBuffer,
        slug,
        cleanTopic.slice(0, 100),
        compressionOptions
      );
    } catch (err: any) {
      console.error('[ImageService] Failed to generate/compress/upload image:', err);
      return { coverImageId: null, costUsd: 0 };
    }
  }

  /**
   * Compresses raw image buffer using Sharp to WebP and uploads to Strapi Media Library
   */
  private static async compressAndUploadBuffer(
    strapi: Core.Strapi,
    rawBuffer: Buffer,
    slug: string,
    caption: string,
    compressionOptions?: ImageCompressionOptions
  ): Promise<{ coverImageId: number | null; costUsd: number; metrics?: any }> {
    const compressed = await ImageCompressionService.compress(rawBuffer, {
      maxWidth: 1200,
      quality: 82,
      format: 'webp',
      ...compressionOptions,
    });

    console.log(`[ImageService] Image compressed successfully: ${compressed.originalSize}B -> ${compressed.compressedSize}B (${compressed.compressionRatio} reduction)`);

    const tempDir = os.tmpdir();
    const fileName = `${slug}-${Date.now()}.webp`;
    const tempFilePath = path.join(tempDir, fileName);
    await fs.promises.writeFile(tempFilePath, compressed.buffer);

    const fileStat = await fs.promises.stat(tempFilePath);

    const filePayload = {
      filepath: tempFilePath,
      path: tempFilePath,
      originalFilename: fileName,
      name: fileName,
      type: 'image/webp',
      mimetype: 'image/webp',
      size: fileStat.size,
    };

    const uploadService = strapi.plugin('upload').service('upload');
    const uploadedFiles = await uploadService.upload({
      data: {
        fileInfo: {
          name: `${slug}-cover`,
          caption: caption.slice(0, 100),
          alternativeText: `Cover image for ${slug}`,
        },
      },
      files: filePayload,
    });

    try {
      await fs.promises.unlink(tempFilePath);
    } catch {}

    const uploadedMedia = Array.isArray(uploadedFiles) ? uploadedFiles[0] : uploadedFiles;
    console.log(`[ImageService] ✅ Uploaded to Strapi Media Library with ID: ${uploadedMedia?.id}`);

    return {
      coverImageId: uploadedMedia?.id || null,
      costUsd: 0,
      metrics: {
        originalSize: compressed.originalSize,
        compressedSize: compressed.compressedSize,
        compressionRatio: compressed.compressionRatio,
      },
    };
  }
}

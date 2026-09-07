import type { Core } from '@strapi/strapi';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ImageCompressionService } from './image-compression';
import type { ImageCompressionOptions } from './types';

export class ImageService {
  /**
   * Generates or fetches an AI image based on the prompt, compresses to WebP, and uploads to Strapi Media Library
   */
  public static async generateCompressAndUpload(
    strapi: Core.Strapi,
    prompt: string,
    slug: string,
    compressionOptions?: ImageCompressionOptions
  ): Promise<{ coverImageId: number | null; costUsd: number; metrics?: any }> {
    let rawBuffer: Buffer | null = null;
    let costUsd = 0;

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
              prompt: `Editorial tech illustration, clean modern architectural aesthetic: ${prompt}`,
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
            }
          }
        } catch (openaiErr: any) {
          console.warn('[ImageService] OpenAI DALL-E call skipped/failed:', openaiErr.message);
        }
      }

      // 2. High-performance fallback: Pollinations AI image generator (Flux)
      if (!rawBuffer) {
        try {
          const cleanPrompt = encodeURIComponent(
            `Modern editorial tech publication cover: ${prompt.slice(0, 160)}. Minimalist, sleek, high resolution, dark mode aesthetic.`
          );
          const pollinationsUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=1280&height=720&model=flux&nologo=true`;

          const fallbackRes = await fetch(pollinationsUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(8000),
          });

          if (fallbackRes.ok) {
            const arrayBuf = await fallbackRes.arrayBuffer();
            if (arrayBuf.byteLength > 1000) {
              rawBuffer = Buffer.from(arrayBuf);
              costUsd = 0;
            }
          }
        } catch (pollErr: any) {
          console.warn('[ImageService] Pollinations fetch note:', pollErr.message);
        }
      }

      // 3. Ultra-reliable fallback: Curated Tech Editorial CDN
      if (!rawBuffer) {
        try {
          const lower = prompt.toLowerCase();
          let cdnUrl = 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1280&q=80'; // Code on screen
          if (lower.includes('react')) {
            cdnUrl = 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1280&q=80'; // React 3D glow
          } else if (lower.includes('architect') || lower.includes('distribut') || lower.includes('system')) {
            cdnUrl = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1280&q=80'; // Network architecture
          } else if (lower.includes('perform') || lower.includes('scale') || lower.includes('speed')) {
            cdnUrl = 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1280&q=80'; // High velocity
          } else if (lower.includes('next') || lower.includes('front') || lower.includes('ui')) {
            cdnUrl = 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1280&q=80'; // Modern UI
          } else if (lower.includes('data') || lower.includes('sql') || lower.includes('back')) {
            cdnUrl = 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=1280&q=80'; // Data systems
          }

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
        const svgCard = `
          <svg width="1200" height="700" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#0f172a" />
                <stop offset="50%" stop-color="#1e1b4b" />
                <stop offset="100%" stop-color="#312e81" />
              </linearGradient>
            </defs>
            <rect width="1200" height="700" fill="url(#grad)" />
            <circle cx="950" cy="200" r="280" fill="#6366f1" opacity="0.25" filter="blur(60px)" />
            <circle cx="250" cy="500" r="240" fill="#a855f7" opacity="0.2" filter="blur(50px)" />
            <text x="80" y="320" fill="#f8fafc" font-size="44" font-family="system-ui, sans-serif" font-weight="bold">${prompt.slice(0, 45)}</text>
            <text x="80" y="380" fill="#94a3b8" font-size="24" font-family="system-ui, sans-serif">CHRONICLE • ARCHITECTURAL BLUEPRINT</text>
          </svg>
        `;
        rawBuffer = await sharp(Buffer.from(svgCard)).png().toBuffer();
      }

      // 5. Compress using Sharp WebP pipeline
      if (!rawBuffer) {
        console.warn('[ImageService] Could not obtain image buffer for prompt:', prompt);
        return { coverImageId: null, costUsd: 0 };
      }

      const compressed = await ImageCompressionService.compress(rawBuffer, {
        maxWidth: 1200,
        quality: 82,
        format: 'webp',
        ...compressionOptions,
      });

      console.log(`[ImageService] Image compressed successfully: ${compressed.originalSize}B -> ${compressed.compressedSize}B (${compressed.compressionRatio} reduction)`);

      // 6. Save to temporary file for Strapi upload service
      const tempDir = os.tmpdir();
      const fileName = `${slug}-${Date.now()}.webp`;
      const tempFilePath = path.join(tempDir, fileName);
      await fs.promises.writeFile(tempFilePath, compressed.buffer);

      const fileStat = await fs.promises.stat(tempFilePath);

      // Strapi 5 Formidable-compatible file payload
      const filePayload = {
        filepath: tempFilePath,
        path: tempFilePath,
        originalFilename: fileName,
        name: fileName,
        type: 'image/webp',
        mimetype: 'image/webp',
        size: fileStat.size,
      };

      // 7. Upload into Strapi Media Library
      const uploadService = strapi.plugin('upload').service('upload');
      const uploadedFiles = await uploadService.upload({
        data: {
          fileInfo: {
            name: `${slug}-cover`,
            caption: prompt.slice(0, 100),
            alternativeText: `Cover image for ${slug}`,
          },
        },
        files: filePayload,
      });

      // Cleanup temporary file
      try {
        await fs.promises.unlink(tempFilePath);
      } catch {}

      const uploadedMedia = Array.isArray(uploadedFiles) ? uploadedFiles[0] : uploadedFiles;
      console.log(`[ImageService] ✅ Uploaded to Strapi Media Library with ID: ${uploadedMedia?.id}`);

      return {
        coverImageId: uploadedMedia?.id || null,
        costUsd,
        metrics: {
          originalSize: compressed.originalSize,
          compressedSize: compressed.compressedSize,
          compressionRatio: compressed.compressionRatio,
        },
      };
    } catch (err: any) {
      console.error('[ImageService] Failed to generate/compress/upload image:', err);
      return { coverImageId: null, costUsd: 0 };
    }
  }
}

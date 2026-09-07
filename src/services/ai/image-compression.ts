import type { ImageCompressionOptions, CompressedImageResult } from './types';

let sharpInstance: any = null;

function getSharp() {
  if (!sharpInstance) {
    try {
      sharpInstance = require('sharp');
    } catch (err: any) {
      console.warn('[ImageCompression] Sharp load warning:', err.message);
    }
  }
  return sharpInstance;
}

export class ImageCompressionService {
  /**
   * Compresses raw image buffer to WebP with auto-resizing and metadata stripping
   */
  public static async compress(
    rawBuffer: Buffer,
    options: ImageCompressionOptions = {}
  ): Promise<CompressedImageResult> {
    const originalSize = rawBuffer.length;
    const maxWidth = options.maxWidth || 1200;
    const maxHeight = options.maxHeight;
    const quality = options.quality ?? 82;
    const format = options.format || 'webp';

    const sharp = getSharp();

    if (!sharp) {
      // Fallback if sharp cannot be initialized
      return {
        buffer: rawBuffer,
        format: 'png',
        mimeType: 'image/png',
        originalSize,
        compressedSize: originalSize,
        compressionRatio: '0%',
      };
    }

    try {
      let pipeline = sharp(rawBuffer, { failOnError: false })
        .rotate() // auto-orient based on EXIF
        .resize({
          width: maxWidth,
          height: maxHeight,
          fit: 'inside',
          withoutEnlargement: true,
        });

      if (format === 'webp') {
        pipeline = pipeline.webp({
          quality,
          effort: 4,
          lossless: false,
        });
      } else if (format === 'avif') {
        pipeline = pipeline.avif({
          quality,
          effort: 4,
        });
      } else {
        pipeline = pipeline.jpeg({
          quality,
          mozjpeg: true,
        });
      }
      // Strip unneeded EXIF & ICC profiles
      const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

      const compressedSize = data.length;
      const reduction = Math.max(0, ((originalSize - compressedSize) / originalSize) * 100);
      const compressionRatio = `${reduction.toFixed(1)}%`;

      return {
        buffer: data,
        format,
        mimeType: `image/${format}`,
        originalSize,
        compressedSize,
        compressionRatio,
        width: info.width,
        height: info.height,
      };
    } catch (err: any) {
      console.warn('[ImageCompression] Compression error, using original buffer:', err.message);
      return {
        buffer: rawBuffer,
        format: 'png',
        mimeType: 'image/png',
        originalSize,
        compressedSize: originalSize,
        compressionRatio: '0%',
      };
    }
  }
}

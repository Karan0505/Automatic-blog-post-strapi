export interface GeneratedImageBuffer {
  buffer: Buffer;
  costUsd: number;
  provider: string;
}

export interface ImageProvider {
  name: string;
  generateImage(prompt: string): Promise<GeneratedImageBuffer>;
}

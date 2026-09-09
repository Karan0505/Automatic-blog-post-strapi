export type WorkflowStatus = 'draft' | 'review' | 'approved' | 'archived';
export type ModerationStatus = 'pending' | 'approved' | 'flagged' | 'rejected';
export type DuplicateTopicPolicy = 'reject' | 'create-new' | 'update-existing';

export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg';
}

export interface CompressedImageResult {
  buffer: Buffer;
  format: string;
  mimeType: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: string;
  width?: number;
  height?: number;
}

export interface AiBlogRequest {
  topic: string;
  locale?: string;
  tone?: string;
  targetAudience?: string;
  keywords?: string[];
  wordCount?: number;
  category?: string; // name or documentId
  author?: string;   // name or documentId
  autoPublish?: boolean;
  generateImage?: boolean;
  imageUrl?: string;
  imageCompressionConfig?: ImageCompressionOptions;
  featured?: boolean;
  idempotencyKey?: string;
  maxCostUsd?: number;
  onDuplicateTopic?: DuplicateTopicPolicy;
  customPrompt?: string;
}

export interface AiSeoMetadata {
  metaTitle: string;
  metaDescription: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
}

export interface AiBlogGeneratedData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category?: string;
  tags?: string[];
  readingTime: number;
  seo: AiSeoMetadata;
  imagePrompt?: string;
  featured?: boolean;
  tableOfContents?: Array<{ title: string; anchor: string }>;
}

export interface AiValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: AiBlogGeneratedData;
}

export interface ModerationResult {
  status: ModerationStatus;
  reasons: string[];
  flaggedCategories: string[];
}

export interface CostEstimate {
  estimatedTextCostUsd: number;
  estimatedImageCostUsd: number;
  totalEstimatedUsd: number;
  withinRequestCeiling: boolean;
  withinDailyBudget: boolean;
  currentDailySpendUsd: number;
  dailyBudgetLimitUsd: number;
}

export interface TranslationJobPayload {
  contentType: string;
  documentId: string;
  sourceLocale: string;
  targetLocale: string;
  autoPublish?: boolean;
}

export interface TranslationJobResult {
  locale: string;
  success: boolean;
  error?: string;
  documentId?: string;
  attempt?: number;
}

export interface BlogPublishResult {
  success: boolean;
  documentId: string;
  title: string;
  slug: string;
  locale: string;
  status: 'draft' | 'published';
  workflowStatus: WorkflowStatus;
  moderationStatus: ModerationStatus;
  aiCostUsd: number;
  aiModel: string;
  coverImage?: any;
  canonicalUrl: string;
  translationsEnqueued?: string[];
  revalidated?: boolean;
  message?: string;
}

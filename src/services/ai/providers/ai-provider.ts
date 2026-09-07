export interface StructuredGenerationResult<T> {
  data: T;
  costUsd: number;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIProvider {
  name: string;
  generateStructuredJson<T>(
    systemPrompt: string,
    userPrompt: string,
    schemaDescription?: string
  ): Promise<StructuredGenerationResult<T>>;
}

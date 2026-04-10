export type AIProviderName = 'OPENAI' | 'ANTHROPIC' | 'GEMINI';

export interface LLMConfig {
  provider: AIProviderName;
  apiKey: string; // Dinámico para soportar BYOK
  model: string;
  temperature?: number;
}

export interface PromptContext {
  systemInstructions: string;
  userPrompt: string;
  variables?: Record<string, any>;
}

export interface ProviderStrategy {
  name: AIProviderName;
  generateText(config: LLMConfig, context: PromptContext): Promise<string>;
}

export interface DualStageResult {
  refinedPrompt: string;
  finalOutput?: string;
  status: 'REFINED_ONLY' | 'COMPLETED'; // REFINED_ONLY para usuarios FREE que no pasan a la Etapa 2
}

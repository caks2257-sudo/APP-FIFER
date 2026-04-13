import type { ExternalBridgeVault } from '@/types/external-bridge-vault';

export type LlmProviderId = 'vertex' | 'openai' | 'anthropic';

/**
 * Turnos user/assistant al estilo chat (sin system; el system va aparte).
 */
export type LlmChatTurn = { role: 'user' | 'assistant'; content: string };

export type LlmCompletionInput = {
  systemInstruction?: string;
  turns: LlmChatTurn[];
  temperature?: number;
  /** OpenAI `response_format`; Vertex `responseMimeType: application/json`. */
  jsonMode?: boolean;
};

export type OrchestratorLlmSecrets = {
  openaiApiKey: string | null;
  anthropicApiKey: string | null;
  openaiModel: string;
  anthropicModel: string;
  vertexProjectId: string | null;
  vertexLocation: string;
  vertexModelId: string;
};

export type LlmCompletionSuccess = {
  text: string;
  provider: LlmProviderId;
};

export interface LlmProviderAdapter {
  readonly id: LlmProviderId;
  complete(
    input: LlmCompletionInput,
    secrets: OrchestratorLlmSecrets,
  ): Promise<string>;
}

export type { ExternalBridgeVault };

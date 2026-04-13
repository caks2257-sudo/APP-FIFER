import { anthropicLlmAdapter } from './adapters/anthropic-adapter';
import { openAiLlmAdapter } from './adapters/openai-adapter';
import { vertexLlmAdapter } from './adapters/vertex-adapter';
import type {
  ExternalBridgeVault,
  LlmCompletionInput,
  LlmCompletionSuccess,
  LlmProviderAdapter,
} from './types';
import { extractLlmSecretsFromVault } from './vault-secrets';

/** Orden: Vertex (GCP) → OpenAI → Anthropic. */
const PROVIDER_CHAIN: LlmProviderAdapter[] = [
  vertexLlmAdapter,
  openAiLlmAdapter,
  anthropicLlmAdapter,
];

/**
 * Punto único de salida LLM del motor AODS: intenta proveedores en cadena hasta el primer éxito.
 */
export async function completeLlmWithFallback(
  input: LlmCompletionInput,
  vault: ExternalBridgeVault,
): Promise<LlmCompletionSuccess | null> {
  const secrets = extractLlmSecretsFromVault(vault);

  for (const adapter of PROVIDER_CHAIN) {
    try {
      const text = await adapter.complete(input, secrets);
      const t = text?.trim();
      if (t) {
        return { text: t, provider: adapter.id };
      }
    } catch {
      /* siguiente proveedor */
    }
  }

  return null;
}

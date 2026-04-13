import type { ExternalBridgeVault } from '@/types/external-bridge-vault';

import type { OrchestratorLlmSecrets } from './types';

function pick(vault: ExternalBridgeVault, key: string): string | null {
  const v = vault[key]?.trim();
  return v || null;
}

/**
 * Secretos y parámetros de modelo para el orquestador LLM.
 * Las claves sensibles se leen solo del mapa devuelto por `loadDecryptedVault()`
 * (Secret Manager / `.env.local` fusionado en el vault), no directamente de `process.env`.
 */
export function extractLlmSecretsFromVault(
  vault: ExternalBridgeVault,
): OrchestratorLlmSecrets {
  const vertexProjectId =
    pick(vault, 'FIFER_VERTEX_PROJECT') ||
    pick(vault, 'FIFER_GCP_PROJECT') ||
    pick(vault, 'GOOGLE_CLOUD_PROJECT') ||
    pick(vault, 'GCP_PROJECT');

  const vertexLocation =
    pick(vault, 'FIFER_VERTEX_LOCATION') ||
    pick(vault, 'VERTEX_AI_LOCATION') ||
    'us-central1';

  const vertexModelId =
    pick(vault, 'FIFER_VERTEX_MODEL') || 'gemini-2.0-flash-001';

  const openaiModel =
    pick(vault, 'FIFER_OPENAI_MODEL') ||
    pick(vault, 'FIFER_AODS_OPENAI_MODEL') ||
    'gpt-4o-mini';

  const anthropicModel = pick(vault, 'FIFER_ANTHROPIC_MODEL') || 'claude-3-5-haiku-20241022';

  return {
    openaiApiKey: pick(vault, 'OPENAI_API_KEY'),
    anthropicApiKey: pick(vault, 'ANTHROPIC_API_KEY'),
    openaiModel,
    anthropicModel,
    vertexProjectId,
    vertexLocation,
    vertexModelId,
  };
}

import type { OrchestratorLlmSecrets } from './types';

/** Etiqueta UI alineada con la cadena Vertex → OpenAI → Anthropic. */
export function formatLlmProviderPreferenceLabel(
  secrets: OrchestratorLlmSecrets,
): string {
  if (secrets.vertexProjectId) {
    return `Vertex AI (${secrets.vertexModelId})`;
  }
  if (secrets.openaiApiKey) {
    return `OpenAI (${secrets.openaiModel})`;
  }
  if (secrets.anthropicApiKey) {
    return `Anthropic (${secrets.anthropicModel})`;
  }
  return 'MOCK / heurística local (sin clave LIVE)';
}

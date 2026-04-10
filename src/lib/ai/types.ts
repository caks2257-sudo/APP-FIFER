/**
 * Contrato único Living OS → motor IA (admin-only por ahora).
 * Los Fifer Boxes consumen el orquestador vía HTTP: `POST {API_BASE}/api/v1/master/ai/proxy`.
 */

export type AiOrchestrationProvider = "openai" | "gemini" | "elevenlabs" | "leonardo";

export type AiOrchestrationContract = {
  provider?: string;
  action?: string;
  payload?: Record<string, unknown>;
  /**
   * `true` o ausente: usar solo `FIFER_ADMIN_*` (administrador FIFER).
   * `false`: BYOK de usuario — no implementado en motor; el orquestador responde 501.
   */
  useAdminKey?: boolean;
};

export type AiOrchestrationHttpResult = {
  httpStatus: number;
  json: Record<string, unknown>;
};

export const AI_ORCHESTRATOR_ENGINE_ID = 'ai-orchestrator-engine' as const;

export interface OrchestratorConfig {
  /** Límite de iteraciones del loop (fases posteriores). */
  maxLoops?: number;
}

export type AodsIdeationMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export interface SessionStartParams {
  ownerId: string;
  planMaestro: string;
  /** Fase -1: conversación previa (no persiste en ideate; sí en init). */
  chatHistory?: AodsIdeationMessage[];
}

/** Fase -1 — respuesta conversacional sin persistir sesión. */
export type IdeateResult = {
  success: true;
  reply: string;
  mock: boolean;
};

/** Resultado de `initSession` (Fase 0). */
export type InitSessionResult = {
  success: true;
  sessionId: string;
  message: string;
};

/** Fase 3 — análisis NotebookLM → GEMINI_DOC. */
export type AnalyzeNotebookResult = {
  success: true;
  message: string;
};

/** Fase 4 — prompt para Cursor / loop Gemini. */
export type GenerateGeminiActivatorResult = {
  success: true;
  activatorPrompt: string;
};

/** Fase 7 — informe Cursor → nueva versión GEMINI_DOC. */
export type UpdateGeminiDocResult = {
  success: true;
  version: number;
  message: string;
};

/** Fase 9 — disparo de despliegue Vercel (hook opcional). */
export type TriggerDeploymentResult = {
  success: true;
  message: string;
  deployHookAttempted: boolean;
  deployHookSucceeded: boolean;
};

/** Contrato de observabilidad §6.4 — alineado con `BotEngineHealth` / `ForecastCoreHealth`. */
export type AiOrchestratorHealth = {
  ok: boolean;
  engineId: typeof AI_ORCHESTRATOR_ENGINE_ID;
  /** Mensaje operativo para logs / futuras sondas. */
  detail?: string;
  /** Claves §25.2.2 aún sin valor efectivo (process.env). */
  missingInfraKeys?: string[];
};

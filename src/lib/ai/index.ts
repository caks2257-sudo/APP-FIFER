/**
 * Capa IA del motor — proveedores + orquestador admin (`FIFER_ADMIN_*`).
 * HTTP: `src/api/v1/ai/proxy.ts` → `POST /api/v1/master/ai/proxy`.
 */
export { resolveAdminApiKey, type AdminProviderKey } from "./admin-keys";
export { AIOrchestrator, runAiOrchestration } from "./AIOrchestrator";
export type { AiOrchestrationContract, AiOrchestrationHttpResult, AiOrchestrationProvider } from "./types";
export { runOpenaiProvider } from "./openai.provider";
export { runGeminiProvider } from "./gemini.provider";
export { runElevenlabsProvider } from "./elevenlabs.provider";
export { runLeonardoProvider } from "./leonardo.provider";

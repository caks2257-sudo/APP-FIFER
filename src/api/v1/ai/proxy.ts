/**
 * Puerta HTTP del AIOrchestrator para Fifer Boxes y clientes del API master.
 *
 * **Ruta montada:** `POST /api/v1/master/ai/proxy` (Express + `requireAuth`).
 * **Base URL** (landing): `NEXT_PUBLIC_FIFER_API_BASE_URL` + sufijo `/api/v1/master/ai/proxy`.
 *
 * **Contrato JSON:**
 * ```json
 * {
 *   "provider": "openai" | "gemini" | "elevenlabs" | "leonardo",
 *   "action": "chat-completions" | "refine-prompt" | "text-to-speech" | "generate-image" | "...",
 *   "payload": { },
 *   "useAdminKey": true
 * }
 * ```
 *
 * Hoy solo se admiten llaves **`FIFER_ADMIN_*`** (`useAdminKey` true u omitido).
 */
import path from "path";
import { AIOrchestrator } from "../../../lib/ai/AIOrchestrator";
import { createAiProxyController } from "../../../controllers/ai/ai-proxy.controller";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { errorResponse } = require(path.join(__dirname, "../../../utils/response_builder.js")) as {
  errorResponse: (err: string, meta?: Record<string, unknown>, data?: unknown) => Record<string, unknown>;
};

/** @deprecated Usar `AIOrchestrator.run` desde `src/lib/ai`. */
export async function dispatchAiProxy(body: unknown) {
  return AIOrchestrator.run(body);
}

export type { AiOrchestrationContract as AiProxyContract } from "../../../lib/ai/types";

export function createAiProxyHandler(): (req: unknown, res: unknown) => Promise<void> {
  const controller = createAiProxyController();
  return async (req: any, res: any) => {
    try {
      return await controller(req, res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json(errorResponse(msg, { node: "ai_proxy", code: "unhandled" }));
    }
  };
}

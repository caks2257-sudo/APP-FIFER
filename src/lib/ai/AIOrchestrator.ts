/**
 * AIOrchestrator — punto único de entrada para OpenAI, Gemini, ElevenLabs y Leonardo.ai.
 * Política actual: **solo llaves `FIFER_ADMIN_*`** (sin BYOK de usuario en el motor).
 */
import path from "path";
import { resolveAdminApiKey } from "./admin-keys";
import { runElevenlabsProvider } from "./elevenlabs.provider";
import { runGeminiProvider } from "./gemini.provider";
import { runLeonardoProvider } from "./leonardo.provider";
import { runOpenaiProvider } from "./openai.provider";
import type { AiOrchestrationContract, AiOrchestrationHttpResult } from "./types";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { successResponse, errorResponse } = require(path.join(
  __dirname,
  "../../utils/response_builder.js"
)) as {
  successResponse: (data: unknown, meta?: Record<string, unknown>) => Record<string, unknown>;
  errorResponse: (err: string, meta?: Record<string, unknown>, data?: unknown) => Record<string, unknown>;
};

const NODE = "ai_orchestrator";

export class AIOrchestrator {
  /**
   * Ejecuta el contrato (validación + resolución admin key + despacho al proveedor).
   */
  static async run(body: unknown): Promise<AiOrchestrationHttpResult> {
    const b = body as AiOrchestrationContract;
    if (!b || typeof b !== "object") {
      return { httpStatus: 400, json: errorResponse("invalid_body", { node: NODE, code: "bad_request" }) };
    }

    const provider = typeof b.provider === "string" ? b.provider.trim().toLowerCase() : "";
    const action = typeof b.action === "string" ? b.action.trim() : "";
    const payload = b.payload && typeof b.payload === "object" ? b.payload : {};
    const useAdminKey = b.useAdminKey !== false;

    if (!provider || !action) {
      return {
        httpStatus: 400,
        json: errorResponse("provider_and_action_required", { node: NODE, code: "bad_request" }),
      };
    }

    if (!useAdminKey) {
      return {
        httpStatus: 501,
        json: errorResponse("user_BYOK_not_implemented_admin_only_FIFER_ADMIN_keys", {
          node: NODE,
          code: "not_implemented",
        }),
      };
    }

    const apiKey = resolveAdminApiKey(provider);
    if (!apiKey) {
      return {
        httpStatus: 503,
        json: errorResponse(`admin_key_missing_for_provider:${provider}`, {
          node: NODE,
          code: "missing_admin_key",
        }),
      };
    }

    let result:
      | Awaited<ReturnType<typeof runOpenaiProvider>>
      | Awaited<ReturnType<typeof runGeminiProvider>>
      | Awaited<ReturnType<typeof runElevenlabsProvider>>
      | Awaited<ReturnType<typeof runLeonardoProvider>>;

    switch (provider) {
      case "openai":
        result = await runOpenaiProvider(action, payload, apiKey);
        break;
      case "gemini":
        result = await runGeminiProvider(action, payload, apiKey);
        break;
      case "elevenlabs":
        result = await runElevenlabsProvider(action, payload, apiKey);
        break;
      case "leonardo":
        result = await runLeonardoProvider(action, payload, apiKey);
        break;
      default:
        return {
          httpStatus: 400,
          json: errorResponse(`unknown_provider:${provider}`, { node: NODE, code: "unknown_provider" }),
        };
    }

    if (!result.ok) {
      return {
        httpStatus: result.status >= 400 && result.status < 600 ? result.status : 502,
        json: errorResponse(result.error || "upstream_error", {
          node: NODE,
          provider,
          action,
          upstream_status: result.status,
        }, result.data ?? null),
      };
    }

    return {
      httpStatus: 200,
      json: successResponse(result.data ?? {}, {
        node: NODE,
        provider,
        action,
      }),
    };
  }
}

/** Alias funcional para imports que prefieren función nombrada. */
export async function runAiOrchestration(body: unknown): Promise<AiOrchestrationHttpResult> {
  return AIOrchestrator.run(body);
}

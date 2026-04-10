import { z } from "zod";
import type { Request, Response } from "express";
import { AIVault, VaultError, type AiProviderKey } from "../../lib/security/ai-vault";
import { AiFactory } from "../../lib/ai/providers/ai-factory";

const AiProxyPayloadSchema = z.object({
  provider: z.string().min(1),
  action: z.string().min(1),
  payload: z.unknown(),
});

type AuthRequest = Request & {
  user?: { id?: string };
  supabaseUser?: { id?: string };
};

function sanitizeErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : "unknown_proxy_error";
  // Defensa extra: evita eco accidental de secretos en mensajes.
  return msg.replace(/(sk-[A-Za-z0-9_-]{8,}|FIFER_ADMIN_[A-Z_]+|Bearer\s+[A-Za-z0-9._-]+)/g, "[redacted]");
}

function resolveTaskType(action: string): "text" | "image" | "audio" {
  const a = action.toLowerCase();
  if (a.includes("image") || a.includes("generation")) return "image";
  if (a.includes("speech") || a.includes("audio") || a.includes("tts")) return "audio";
  return "text";
}

export function createAiProxyController() {
  return async (req: AuthRequest, res: Response): Promise<Response> => {
    const parsed = AiProxyPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        error: "bad_request",
        message: "Payload inválido para /api/v1/master/ai/proxy",
        details: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          code: i.code,
          message: i.message,
        })),
      });
    }

    const provider = parsed.data.provider.trim().toLowerCase() as AiProviderKey;
    const action = parsed.data.action.trim();
    const payload = parsed.data.payload;
    const userId = req.user?.id || req.supabaseUser?.id;

    if (provider !== "openai" && provider !== "leonardo" && provider !== "elevenlabs") {
      return res.status(400).json({
        ok: false,
        error: "unsupported_provider",
        message: "Proveedor no soportado en AI proxy",
      });
    }

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return res.status(400).json({
        ok: false,
        error: "invalid_payload",
        message: "`payload` debe ser un objeto JSON",
      });
    }

    try {
      // Se resuelve en backend; jamás se expone al cliente.
      const apiKey = await AIVault.resolveKey(provider, userId);

      const taskType = resolveTaskType(action);
      const data =
        taskType === "image"
          ? await AiFactory.runImageTask(payload as Record<string, unknown>, userId, apiKey)
          : taskType === "audio"
            ? await AiFactory.runAudioTask(payload as Record<string, unknown>, userId, apiKey)
            : await AiFactory.runTextTask(payload as Record<string, unknown>, userId, apiKey);

      return res.status(200).json({
        ok: true,
        provider,
        action,
        taskType,
        data,
      });
    } catch (err) {
      if (err instanceof VaultError) {
        return res.status(503).json({
          ok: false,
          error: "vault_error",
          message: sanitizeErrorMessage(err),
          details: err.details,
        });
      }
      return res.status(502).json({
        ok: false,
        error: "provider_error",
        message: sanitizeErrorMessage(err),
      });
    }
  };
}

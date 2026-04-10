import type { IAiProvider } from "./IAiProvider";
import { AIVault } from "../../security/ai-vault";
import { adaptAiProviderError, adaptAiProviderResponse, type UniversalAiEnvelope } from "./universal-adapter";

/**
 * Provider OpenAI (texto/lógica). Skeleton listo para SDK oficial o fetch.
 */
export class OpenAiProvider implements IAiProvider {
  async generateText(
    body: Record<string, unknown>,
    apiKey?: string,
    userId?: string
  ): Promise<UniversalAiEnvelope<Record<string, unknown>>> {
    try {
      const resolvedKey = apiKey ?? (await AIVault.resolveKey("openai", userId));
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resolvedKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) throw new Error(`openai_upstream_error:${res.status}`);
      return adaptAiProviderResponse("openai", "text", data);
    } catch (err) {
      return adaptAiProviderError("openai", "text", err);
    }
  }

  async execute(payload: any, apiKey: string): Promise<unknown> {
    const action = String(payload?.action || "chat-completions");
    const body = payload?.payload ?? {};

    if (action === "chat-completions") {
      return this.generateText(body, apiKey);
    }

    throw new Error(`unsupported_openai_action:${action}`);
  }
}

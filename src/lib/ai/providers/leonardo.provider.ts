import type { IAiProvider } from "./IAiProvider";
import { AIVault } from "../../security/ai-vault";
import { adaptAiProviderError, adaptAiProviderResponse, type UniversalAiEnvelope } from "./universal-adapter";

/**
 * Provider Leonardo (imágenes). Skeleton listo para SDK oficial o fetch.
 */
export class LeonardoProvider implements IAiProvider {
  async generateImage(
    body: Record<string, unknown>,
    apiKey?: string,
    userId?: string
  ): Promise<UniversalAiEnvelope<Record<string, unknown>>> {
    try {
      const resolvedKey = apiKey ?? (await AIVault.resolveKey("leonardo", userId));
      const base = (process.env.FIFER_LEONARDO_API_BASE_URL || "https://cloud.leonardo.ai/api/rest/v1").replace(
        /\/$/,
        ""
      );
      const res = await fetch(`${base}/generations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resolvedKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) throw new Error(`leonardo_upstream_error:${res.status}`);
      return adaptAiProviderResponse("leonardo", "image", data);
    } catch (err) {
      return adaptAiProviderError("leonardo", "image", err);
    }
  }

  async execute(payload: any, apiKey: string): Promise<unknown> {
    const action = String(payload?.action || "generate-image");
    const body = payload?.payload ?? {};
    if (action !== "generate-image" && action !== "generations") {
      throw new Error(`unsupported_leonardo_action:${action}`);
    }
    return this.generateImage(body, apiKey);
  }
}

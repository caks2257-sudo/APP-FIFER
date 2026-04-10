export type OpenAiProviderResult = {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
};

/**
 * Llamadas OpenAI (chat + imágenes). `payload` = cuerpo JSON tal cual la API v1.
 */
export async function runOpenaiProvider(
  action: string,
  payload: Record<string, unknown>,
  apiKey: string
): Promise<OpenAiProviderResult> {
  if (!apiKey) {
    return { ok: false, status: 503, error: "missing_openai_key" };
  }

  const base = "https://api.openai.com/v1";

  if (action === "chat-completions") {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as unknown;
    return { ok: res.ok, status: res.status, data, error: res.ok ? undefined : "openai_upstream_error" };
  }

  if (action === "images-generations" || action === "generate-image-openai") {
    const res = await fetch(`${base}/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as unknown;
    return { ok: res.ok, status: res.status, data, error: res.ok ? undefined : "openai_images_upstream_error" };
  }

  return { ok: false, status: 400, error: `unknown_openai_action:${action}` };
}

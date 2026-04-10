export type GeminiProviderResult = {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
};

/**
 * Gemini REST (generateContent). `payload` debe incluir al menos `contents` o usar acción `refine-prompt`.
 */
export async function runGeminiProvider(
  action: string,
  payload: Record<string, unknown>,
  apiKey: string
): Promise<GeminiProviderResult> {
  if (!apiKey) {
    return { ok: false, status: 503, error: "missing_gemini_key" };
  }

  const model =
    (typeof payload.model === "string" && payload.model) ||
    process.env.FIFER_ADMIN_GEMINI_MODEL ||
    "gemini-2.0-flash";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  if (action === "refine-prompt") {
    const prompt = String(payload.prompt ?? "").trim();
    if (!prompt) {
      return { ok: false, status: 400, error: "payload.prompt_required" };
    }
    const system =
      typeof payload.system === "string"
        ? payload.system
        : "Refina el prompt del usuario: más claro, accionable, sin texto extra alrededor.";
    const body = {
      contents: [{ parts: [{ text: `${system}\n\n${prompt}` }] }],
      generationConfig: { temperature: 0.35, maxOutputTokens: 2048 },
    };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const text = extractGeminiText(data);
    return {
      ok: res.ok,
      status: res.status,
      data: { raw: data, refined: text || prompt },
      error: res.ok ? undefined : "gemini_upstream_error",
    };
  }

  if (action === "generate-content") {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as unknown;
    return { ok: res.ok, status: res.status, data, error: res.ok ? undefined : "gemini_upstream_error" };
  }

  return { ok: false, status: 400, error: `unknown_gemini_action:${action}` };
}

function extractGeminiText(json: Record<string, unknown>): string {
  const cands = json.candidates as { content?: { parts?: { text?: string }[] } }[] | undefined;
  const t = cands?.[0]?.content?.parts?.[0]?.text;
  return typeof t === "string" ? t.trim() : "";
}

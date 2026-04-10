export type LeonardoProviderResult = {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
};

/**
 * Leonardo.ai REST. Por defecto POST /generations — ajusta base con FIFER_LEONARDO_API_BASE_URL.
 */
export async function runLeonardoProvider(
  action: string,
  payload: Record<string, unknown>,
  apiKey: string
): Promise<LeonardoProviderResult> {
  if (!apiKey) {
    return { ok: false, status: 503, error: "missing_leonardo_key" };
  }

  if (action !== "generate-image" && action !== "generations") {
    return { ok: false, status: 400, error: `unknown_leonardo_action:${action}` };
  }

  const base = (process.env.FIFER_LEONARDO_API_BASE_URL || "https://cloud.leonardo.ai/api/rest/v1").replace(
    /\/$/,
    ""
  );

  const res = await fetch(`${base}/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => ({}))) as unknown;
  return {
    ok: res.ok,
    status: res.status,
    data,
    error: res.ok ? undefined : "leonardo_upstream_error",
  };
}

import { getApiBase } from "@/lib/fifer-api";
import { createFiferBrowserClient } from "@/lib/supabase";

export type UFValueResult = {
  value: number;
  formatted: string;
  source: "ai-proxy";
  raw: unknown;
};

function formatUfValue(value: number): string {
  return `$${new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

function parseLocaleNumber(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/\$/g, "").replace(/\./g, "").replace(/,/g, ".").replace(/[^\d.-]/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return parseLocaleNumber(value);
  return null;
}

function extractUfValue(json: unknown): number | null {
  const root = json as Record<string, unknown> | null;
  if (!root || typeof root !== "object") return null;

  const data = root.data as Record<string, unknown> | undefined;
  const envelopeData = data?.data as Record<string, unknown> | undefined;
  const candidateDirect = toNumber(envelopeData?.value ?? envelopeData?.ufValue ?? envelopeData?.uf_value);
  if (candidateDirect != null) return candidateDirect;

  const content =
    ((envelopeData?.choices as Array<{ message?: { content?: string } }> | undefined)?.[0]?.message?.content ??
      (envelopeData?.text as string | undefined) ??
      "") as string;
  if (typeof content === "string" && content.trim()) {
    const match = content.match(/\$?\s*\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?/);
    if (match?.[0]) return toNumber(match[0]);
  }

  return null;
}

export async function getUFValue(): Promise<UFValueResult> {
  const base = getApiBase();
  if (!base) throw new Error("NEXT_PUBLIC_FIFER_API_BASE_URL no configurada");

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const sb = createFiferBrowserClient();
  if (sb) {
    const { data } = await sb.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${base}/api/v1/master/ai/proxy`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      provider: "openai",
      action: "get_current_uf",
      payload: { context: "Necesito el valor actual de la UF en Chile hoy" },
    }),
  });

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg = typeof json.message === "string" ? json.message : `HTTP ${res.status}`;
    throw new Error(msg);
  }

  const providerError = (json.data as Record<string, unknown> | undefined)?.error;
  if (providerError && typeof providerError === "string") {
    throw new Error(providerError);
  }

  const value = extractUfValue(json);
  if (value == null) {
    throw new Error("No se pudo extraer valor UF desde AI Proxy");
  }

  return {
    value,
    formatted: formatUfValue(value),
    source: "ai-proxy",
    raw: json,
  };
}

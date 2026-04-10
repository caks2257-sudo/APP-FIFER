import { createFiferBrowserClient } from "./supabase";

export type FiferStandardResponse<T> = {
  success: boolean;
  data: T;
  metadata?: Record<string, unknown> | null;
  error?: string | null;
};

/** Lanza si `success === false` — útil dentro de `useFiferData` para propagar al `BoxErrorBoundary`. */
export function unwrapFiferStandardResponse<T>(res: FiferStandardResponse<T>): T {
  if (!res.success) {
    throw new Error(res.error || "FIFER API error");
  }
  return res.data;
}

export type AiCapabilityRow = {
  id: string;
  provider: string;
  capability_type: string;
  external_id: string;
  name: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  updated_at: string;
  /** Catálogo: recurso reservado a FIFER Pro (UI candado). */
  requires_pro?: boolean;
};

export type UserSubscriptionPayload = {
  subscription_tier: "free" | "pro";
  tier_expires_at: string | null;
  expired_pro?: boolean;
  byok_openai: boolean;
  byok_anthropic: boolean;
};

/** Curador Fase 5 — scores sobre filas de ai_capabilities */
export type CuratedCapability = AiCapabilityRow & {
  match_score: number;
  is_recommended: boolean;
  match_reason?: string;
};

export type CuratorPayload = {
  voices: CuratedCapability[];
  text_models: CuratedCapability[];
  product_signals?: {
    concepts: Record<string, number>;
    text_sample: string;
  };
};

export type UrlCampaignData = {
  curator?: CuratorPayload;
  draft_id?: string | null;
  [key: string]: unknown;
};

/**
 * Origen del API master (`/api/v1/master/*`). Debe ser la URL base del proceso que expone esas rutas
 * (no el pre-flight `node src/server.js`, que solo valida boot).
 */
export function getApiBase(): string {
  return String(process.env.NEXT_PUBLIC_FIFER_API_BASE_URL || "").replace(/\/$/, "");
}

/** Alias explícito para documentación y prompts. */
export function getFiferApiBaseUrl(): string {
  return getApiBase();
}

async function authHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const supabase = createFiferBrowserClient();
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  return headers;
}

export async function fetchUserSubscription(): Promise<FiferStandardResponse<UserSubscriptionPayload | null>> {
  const base = getApiBase();
  if (!base) {
    return { success: false, data: null, error: "NEXT_PUBLIC_FIFER_API_BASE_URL no configurada" };
  }
  const res = await fetch(`${base}/api/v1/master/user/subscription`, {
    headers: await authHeaders(),
    cache: "no-store",
  });
  const json = (await res.json()) as FiferStandardResponse<UserSubscriptionPayload | null>;
  if (!res.ok || !json.success) {
    return {
      success: false,
      data: null,
      error: json.error || `HTTP ${res.status}`,
    };
  }
  return json;
}

export async function fetchAiCapabilities(filters?: {
  type?: string;
  provider?: string;
}): Promise<FiferStandardResponse<AiCapabilityRow[]>> {
  const base = getApiBase();
  if (!base) {
    return {
      success: false,
      data: [],
      error: "NEXT_PUBLIC_FIFER_API_BASE_URL no configurada",
    };
  }
  const q = new URLSearchParams();
  if (filters?.type) q.set("type", filters.type);
  if (filters?.provider) q.set("provider", filters.provider);
  const qs = q.toString();
  const url = `${base}/api/v1/master/ai-capabilities${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, { headers: await authHeaders(), cache: "no-store" });
  let json: FiferStandardResponse<AiCapabilityRow[]>;
  try {
    json = (await res.json()) as FiferStandardResponse<AiCapabilityRow[]>;
  } catch {
    return {
      success: false,
      data: [],
      error: `HTTP ${res.status}: respuesta no JSON`,
    };
  }
  if (!res.ok || !json.success) {
    return {
      success: false,
      data: Array.isArray(json.data) ? json.data : [],
      error: json.error || `HTTP ${res.status}`,
    };
  }
  return json;
}

export type EngineItem = {
  id: string;
  name: string;
  description?: string;
  estimated_cost_usd?: number;
  vendor?: string;
};

export async function fetchEngines(): Promise<FiferStandardResponse<EngineItem[]>> {
  const base = getApiBase();
  if (!base) {
    return { success: false, data: [], error: "NEXT_PUBLIC_FIFER_API_BASE_URL no configurada" };
  }
  const res = await fetch(`${base}/api/v1/master/engines`, {
    headers: await authHeaders(),
    cache: "no-store",
  });
  return (await res.json()) as FiferStandardResponse<EngineItem[]>;
}

export async function postUrlCampaign(body: {
  url: string;
  requested_engine_tier?: string;
  use_user_key?: boolean;
}): Promise<FiferStandardResponse<UrlCampaignData | null>> {
  const base = getApiBase();
  if (!base) {
    return { success: false, data: null, error: "NEXT_PUBLIC_FIFER_API_BASE_URL no configurada" };
  }
  const res = await fetch(`${base}/api/v1/master/url-campaign`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  return (await res.json()) as FiferStandardResponse<UrlCampaignData | null>;
}

export type PublishDraftData = {
  draft_id: string;
  status: string;
  dispatched?: boolean;
  http_status?: number | null;
};

export type CampaignDraftListItem = {
  id: string;
  status: string;
  source_url: string;
  published_url: string | null;
  published_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string;
};

export async function fetchCampaignDrafts(
  limit = 50
): Promise<FiferStandardResponse<{ drafts: CampaignDraftListItem[] }>> {
  const base = getApiBase();
  if (!base) {
    return {
      success: false,
      data: { drafts: [] },
      error: "NEXT_PUBLIC_FIFER_API_BASE_URL no configurada",
    };
  }
  const q = new URLSearchParams({ limit: String(Math.min(Math.max(limit, 1), 100)) });
  const res = await fetch(`${base}/api/v1/master/campaign-drafts?${q}`, {
    headers: await authHeaders(),
    cache: "no-store",
  });
  const json = (await res.json()) as FiferStandardResponse<{ drafts: CampaignDraftListItem[] }>;
  if (!res.ok || !json.success) {
    return {
      success: false,
      data: { drafts: [] },
      error: json.error || `HTTP ${res.status}`,
    };
  }
  return json;
}

/** Publicar borrador → Make.com (`MAKE_PUBLISH_WEBHOOK_URL` en el API). */
export async function postPublishDraft(draftId: string): Promise<FiferStandardResponse<PublishDraftData | null>> {
  const base = getApiBase();
  if (!base) {
    return { success: false, data: null, error: "NEXT_PUBLIC_FIFER_API_BASE_URL no configurada" };
  }
  const id = String(draftId || "").trim();
  if (!id) {
    return { success: false, data: null, error: "draft_id requerido" };
  }
  const res = await fetch(`${base}/api/v1/master/publish-draft`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ draft_id: id }),
  });
  const json = (await res.json()) as FiferStandardResponse<PublishDraftData | null>;
  if (!res.ok || !json.success) {
    return {
      success: false,
      data: null,
      error: json.error || `HTTP ${res.status}`,
      metadata: json.metadata,
    };
  }
  return json;
}

export type LedgerRecentEntry = {
  id: string;
  type: string;
  amount: number;
  currency: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type WeeklyIncomeBucket = {
  week_start: string;
  label: string;
  amount_usd: number;
};

export type CampaignRoiRow = {
  draft_id: string;
  user_gain_usd: number;
  ai_cost_usd: number;
  roi_percent: number | null;
  note?: string;
};

export type FinanceReportData = {
  total_revenue: number;
  available_balance: number;
  ai_spend: number;
  platform_breakdown: { platform: string; revenue: number }[];
  recent_transactions: {
    id: string;
    amount: number;
    type: string;
    source_store?: string;
    created_at: string | null;
  }[];
  weekly_income_usd?: WeeklyIncomeBucket[];
  ledger_recent?: LedgerRecentEntry[];
  campaign_rois?: CampaignRoiRow[];
};

export async function fetchFinanceReport(): Promise<FiferStandardResponse<FinanceReportData | null>> {
  const base = getApiBase();
  if (!base) {
    return { success: false, data: null, error: "NEXT_PUBLIC_FIFER_API_BASE_URL no configurada" };
  }
  const res = await fetch(`${base}/api/v1/master/finance/report`, {
    headers: await authHeaders(),
    cache: "no-store",
  });
  const json = (await res.json()) as FiferStandardResponse<FinanceReportData | null>;
  if (!res.ok || !json.success) {
    return {
      success: false,
      data: null,
      error: json.error || `HTTP ${res.status}`,
    };
  }
  return json;
}

export type PlatformProfitRankRow = {
  rank: number;
  platform_key: string;
  display_name: string;
  total_usd: number;
  trend_up: boolean;
  previous_rank: number | null;
};

export type PlatformProfitRankingPayload = {
  ranking: PlatformProfitRankRow[];
  window_days: number;
  note?: string;
};

export async function fetchPlatformProfitRanking(): Promise<
  FiferStandardResponse<PlatformProfitRankingPayload | null>
> {
  const base = getApiBase();
  if (!base) {
    return { success: false, data: null, error: "NEXT_PUBLIC_FIFER_API_BASE_URL no configurada" };
  }
  const res = await fetch(`${base}/api/v1/master/finance/platform-ranking`, {
    headers: await authHeaders(),
    cache: "no-store",
  });
  const json = (await res.json()) as FiferStandardResponse<PlatformProfitRankingPayload | null>;
  if (!res.ok || !json.success) {
    return {
      success: false,
      data: null,
      error: json.error || `HTTP ${res.status}`,
    };
  }
  return json;
}

/** Respuesta `GET /api/v1/master/finance/cost-savings` (Smart Task Router). */
export type CostSavingsPayload = {
  month_utc: string;
  period_start_utc: string;
  total_savings_month: number;
  total_baseline_month: number;
  total_actual_month: number;
  optimization_pct_of_baseline: number;
  by_task_type: { task_type: string; total_savings: number }[];
};

export async function fetchCostSavings(): Promise<FiferStandardResponse<CostSavingsPayload | null>> {
  const base = getApiBase();
  if (!base) {
    return { success: false, data: null, error: "NEXT_PUBLIC_FIFER_API_BASE_URL no configurada" };
  }
  const res = await fetch(`${base}/api/v1/master/finance/cost-savings`, {
    headers: await authHeaders(),
    cache: "no-store",
  });
  const json = (await res.json()) as FiferStandardResponse<CostSavingsPayload | null>;
  if (!res.ok || !json.success) {
    return {
      success: false,
      data: null,
      error: json.error || `HTTP ${res.status}`,
    };
  }
  return json;
}

/** Fila `fifer_platform.api_health_status` (monitor OSS). */
export type ApiHealthStatusRow = {
  provider_name: string;
  status: string;
  latency_ms: number | null;
  last_error: string | null;
  last_checked_at: string;
};

export async function fetchApiHealthStatus(): Promise<FiferStandardResponse<ApiHealthStatusRow[]>> {
  const base = getApiBase();
  if (!base) {
    return {
      success: false,
      data: [],
      error: "NEXT_PUBLIC_FIFER_API_BASE_URL no configurada",
    };
  }
  const res = await fetch(`${base}/api/v1/master/system/api-health`, {
    headers: await authHeaders(),
    cache: "no-store",
  });
  let json: FiferStandardResponse<ApiHealthStatusRow[]>;
  try {
    json = (await res.json()) as FiferStandardResponse<ApiHealthStatusRow[]>;
  } catch {
    return { success: false, data: [], error: `HTTP ${res.status}: respuesta no JSON` };
  }
  if (!res.ok || !json.success) {
    return {
      success: false,
      data: Array.isArray(json.data) ? json.data : [],
      error: json.error || `HTTP ${res.status}`,
    };
  }
  return json;
}

export type ApiHealthRefreshPayload = {
  refreshed: boolean;
  upserted: number;
  providers: ApiHealthStatusRow[];
};

/** Dispara pings inmediatos en el motor (`api_health_monitor.js`) y devuelve filas actualizadas. */
export async function refreshApiHealthMonitor(): Promise<FiferStandardResponse<ApiHealthRefreshPayload>> {
  const base = getApiBase();
  if (!base) {
    return {
      success: false,
      data: { refreshed: false, upserted: 0, providers: [] },
      error: "NEXT_PUBLIC_FIFER_API_BASE_URL no configurada",
    };
  }
  const res = await fetch(`${base}/api/v1/master/system/api-health/refresh`, {
    method: "POST",
    headers: await authHeaders(),
    cache: "no-store",
  });
  let json: FiferStandardResponse<ApiHealthRefreshPayload>;
  try {
    json = (await res.json()) as FiferStandardResponse<ApiHealthRefreshPayload>;
  } catch {
    return {
      success: false,
      data: { refreshed: false, upserted: 0, providers: [] },
      error: `HTTP ${res.status}: respuesta no JSON`,
    };
  }
  if (!res.ok || !json.success) {
    return {
      success: false,
      data: json.data ?? { refreshed: false, upserted: 0, providers: [] },
      error: json.error || `HTTP ${res.status}`,
    };
  }
  return json;
}

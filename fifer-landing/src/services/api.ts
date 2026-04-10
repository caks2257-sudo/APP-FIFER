import {
  fetchFinanceReport,
  type FinanceReportData,
  getApiBase,
} from "@/lib/fifer-api";
import { createFiferBrowserClient } from "@/lib/supabase";

export type FinanceDashboardPayload = FinanceReportData;

export async function getFinanceDashboardData(): Promise<FinanceDashboardPayload> {
  const res = await fetchFinanceReport();
  if (!res.success || !res.data) {
    throw new Error(res.error || "No se pudo obtener dashboard de finanzas");
  }
  return res.data;
}

export async function postManualIncome(input: {
  amount: number;
  note?: string;
}): Promise<{ ok: true }> {
  const base = getApiBase();
  if (!base) throw new Error("NEXT_PUBLIC_FIFER_API_BASE_URL no configurada");
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Monto inválido");
  }
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const sb = createFiferBrowserClient();
  if (sb) {
    const { data } = await sb.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${base}/api/v1/master/finance/manual-income`, {
    method: "POST",
    headers,
    body: JSON.stringify({ amount, note: input.note || "" }),
  });
  const json = (await res.json()) as { success?: boolean; error?: string };
  if (!res.ok || json.success !== true) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return { ok: true };
}

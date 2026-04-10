import type { FiferBoxDataNormalized } from "@/utils/adapters/types";
import { useUserStore } from "@/store/useUserStore";
import type { UserEngineExecuteContext } from "@/user_space/user-engine-loaders";

const MIN_KEY_LEN = 8;

async function resolveApiKey(ctx?: UserEngineExecuteContext): Promise<string | null> {
  const provisional = ctx?.provisionalApiKey?.trim();
  if (provisional) return provisional;
  const bid = ctx?.boxId;
  if (!bid) return null;
  return useUserStore.getState().getVaultKeyPlain(bid);
}

/**
 * Motor de ejemplo (sandbox user_space) — salida al contrato Shell (`03_PROTOCOL_SHELL.md` §2.1).
 * Riesgo `high`: exige API Key en AIVault (BYOK) o `provisionalApiKey` en prueba de conexión.
 */
export async function execute(ctx?: UserEngineExecuteContext): Promise<FiferBoxDataNormalized> {
  const apiKey = await resolveApiKey(ctx);
  if (!apiKey || apiKey.length < MIN_KEY_LEN) {
    throw new Error("credentials_required: API Key ausente o demasiado corta (BYOK / Vault)");
  }

  /** Integración (solo `development`): fallo aleatorio ~1/3 para validar BoxErrorBoundary / CircuitBreaker. */
  if (process.env.NODE_ENV === "development" && Math.floor(Math.random() * 3) === 0) {
    throw new Error("sample-scraper: fallo aleatorio de integración (sandbox)");
  }
  return {
    source: "scraper",
    title: "Sample scraper (user space)",
    metrics: {
      status: 1,
      rows: 0,
    },
    canonicalRecords: [
      { label: "engine", value: "sample-scraper", status: "idle" },
      { label: "vault", value: "byok-ok", status: "ok" },
    ],
    meta: {
      sourceHint: "user_space/[user_id_mock]/engines/sample-scraper",
      reason: "sandbox-mock",
    },
  };
}

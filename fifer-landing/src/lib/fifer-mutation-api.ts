/**
 * Cola simulada de persistencia para mutaciones optimistas (dev).
 * En producción es no-op: el layout ya persiste en Zustand/localStorage.
 */
const DEV_PATH = "/api/dev/fifer-mutation";

export type FiferMutationPayload = {
  kind: "favorite" | "reorder-slot" | "box-action" | "layout-sync";
  moduleId?: string;
  routePath?: string;
  slotName?: string;
  boxId?: string;
  action?: string;
};

function shouldSimulateFailure(): boolean {
  return typeof process !== "undefined" && process.env.NEXT_PUBLIC_FIFER_MUTATION_FAIL === "1";
}

/** Latencia simulada de red (ms). */
function simulatedDelay(): Promise<void> {
  const ms = 280 + Math.floor(Math.random() * 220);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Intenta persistir en segundo plano (solo dev: POST a `/api/dev/fifer-mutation`).
 * `NEXT_PUBLIC_FIFER_MUTATION_FAIL=1` fuerza fallo para probar rollback.
 */
export async function persistFiferMutation(payload: FiferMutationPayload): Promise<void> {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV === "production") {
    return;
  }

  await simulatedDelay();

  if (shouldSimulateFailure()) {
    throw new Error("Simulación: la red no confirmó el cambio (NEXT_PUBLIC_FIFER_MUTATION_FAIL=1).");
  }

  const res = await fetch(DEV_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
}

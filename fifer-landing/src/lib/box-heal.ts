/**
 * Autosanación: limpia caché local FIFER y notifica re-hidratación JIT.
 * Ver: `DiscoveryBox` + `BoxLoader` (nonce + router.refresh).
 */

export const FIFER_LAYOUT_STORAGE_KEY = "fifer-layout-store";

const FIFER_STORAGE_PREFIX = "fifer-";

export function clearFiferLocalCache(): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k === FIFER_LAYOUT_STORAGE_KEY || k.startsWith(FIFER_STORAGE_PREFIX))) {
        toRemove.push(k);
      }
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore quota / private mode */
  }
}

export type HealDetail = { boxId?: string; source?: "discovery" | "programmatic" };

/**
 * Limpia caché y emite evento para que los Boxes reinicien hidratación sin recargar toda la app.
 * El caller debe incrementar `healNonce` / `router.refresh()` si aplica.
 */
export function healComponent(options?: { boxId?: string }): void {
  clearFiferLocalCache();
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<HealDetail>("fifer-heal", {
      detail: { boxId: options?.boxId, source: "programmatic" },
    })
  );
}

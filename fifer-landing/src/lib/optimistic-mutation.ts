/**
 * Optimistic UI — aplica un cambio local al instante y ejecuta la petición en segundo plano.
 * Si falla, revierte y notifica (Fifer Conscious Alerts).
 */
import { dispatchFiferAlert } from "@/store/useAlertStore";

export type OptimisticMutationOptions = {
  /** Efecto visual inmediato (p. ej. setState, Zustand, reorder). */
  apply: () => void;
  /** Restaurar estado anterior (debe ser idempotente). */
  revert: () => void;
  request: () => Promise<unknown>;
  /** Título de la alerta si hay rollback. */
  errorTitle?: string;
  /** Cuerpo opcional; por defecto usa el mensaje del error. */
  errorBody?: (err: Error) => string;
};

/**
 * Ejecuta `apply` → `await request()`. Si `request` lanza, ejecuta `revert` y muestra alerta WARNING.
 */
export async function runOptimisticMutation(opts: OptimisticMutationOptions): Promise<boolean> {
  opts.apply();
  try {
    await opts.request();
    return true;
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    opts.revert();
    const body =
      opts.errorBody?.(err) ??
      `No se pudo confirmar en el servidor. La vista volvió al estado anterior.\n${err.message}`;
    dispatchFiferAlert({
      level: "WARNING",
      title: opts.errorTitle ?? "Acción revertida",
      body,
    });
    return false;
  }
}

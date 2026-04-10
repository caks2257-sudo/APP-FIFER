import { clsx } from "clsx";

/** Permisos / suscripción: acceso denegado sin ruido visual (leyes FIFER: mínima superficie de ataque). */
export function AccessRestricted({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "flex min-h-[120px] flex-col items-center justify-center rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-4 py-6 text-center",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        Acceso restringido
      </p>
      <p className="mt-1 max-w-xs text-sm text-zinc-400">
        No tienes permisos o el plan requerido para este módulo.
      </p>
    </div>
  );
}

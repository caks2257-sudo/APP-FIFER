import { clsx } from "clsx";
import { Button } from "@/components/ui/button";

/** Trazabilidad ROI: error explícito y reintento sin romper el lienzo del panel. */
export function FallbackError({
  message,
  onRetry,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-6 text-center",
        className
      )}
      role="alert"
    >
      <p className="text-sm font-medium text-red-200/90">No se pudo cargar este módulo</p>
      {message ? (
        <p className="max-w-sm text-xs text-red-300/70">{message}</p>
      ) : null}
      {onRetry ? (
        <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}

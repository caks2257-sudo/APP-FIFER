import { clsx } from "clsx";
import type { ReactNode } from "react";

/**
 * Ghost Mode “cerrado”: sin datos o sin clave — blur/grayscale + CTA BYOK (ley BYOK First).
 * `integration` refuerza desaturación para fallos Supabase/red capturados por el error boundary.
 */
export function FallbackLockedApi({
  children,
  className,
  title = "Activar con API Key",
  subtitle = "Conecta tu clave BYOK o revisa Ajustes IA para desbloquear datos en vivo.",
  ghostVariant = "byok",
}: {
  children?: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  ghostVariant?: "byok" | "integration";
}) {
  const aria =
    ghostVariant === "integration"
      ? "Módulo en modo fantasma: error de conexión"
      : "Contenido bloqueado: se requiere API Key";

  return (
    <div
      className={clsx(
        "relative min-h-[140px] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/40",
        ghostVariant === "integration" && "border-zinc-700/60 bg-zinc-950/50",
        className
      )}
      role="region"
      aria-label={aria}
    >
      <div
        className={clsx(
          "pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 p-4 backdrop-blur-md",
          ghostVariant === "integration" ? "bg-zinc-950/80" : "bg-zinc-950/70"
        )}
      >
        <p className="text-center text-sm font-semibold" style={{ color: "var(--fifer-box-accent, #EAB308)" }}>
          {title}
        </p>
        <p className="max-w-sm text-center text-xs leading-relaxed text-zinc-400">{subtitle}</p>
      </div>
      {children != null ? (
        <div
          className={clsx(
            "pointer-events-none select-none blur-sm grayscale contrast-75",
            ghostVariant === "integration" && "saturate-0 opacity-60"
          )}
        >
          {children}
        </div>
      ) : (
        <div className="min-h-[120px]" aria-hidden />
      )}
    </div>
  );
}

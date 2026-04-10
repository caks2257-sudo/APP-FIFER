import type { CSSProperties } from "react";
import type { IFiferBoxManifest } from "@/types/fifer-box";

/** Inyecta paleta por app en el contenedor del Box (variables CSS para Tailwind arbitrary / hijos). */
export function themeOverridesToStyle(
  theme?: IFiferBoxManifest["themeOverrides"]
): CSSProperties | undefined {
  if (!theme) return undefined;
  const s: Record<string, string> = {};
  if (theme.primary) s["--fifer-box-primary"] = theme.primary;
  if (theme.secondary) s["--fifer-box-secondary"] = theme.secondary;
  if (theme.accent) s["--fifer-box-accent"] = theme.accent;
  if (theme.surface) s["--fifer-box-surface"] = theme.surface;
  if (theme.onPrimary) s["--fifer-box-on-primary"] = theme.onPrimary;
  if (theme.onSurface) s["--fifer-box-on-surface"] = theme.onSurface;
  if (theme.muted) s["--fifer-box-muted"] = theme.muted;
  if (theme.border) s["--fifer-box-border"] = theme.border;
  if (theme.radius) s["--fifer-box-radius"] = theme.radius;
  if (theme.cssVariables) {
    for (const [key, val] of Object.entries(theme.cssVariables)) {
      if (key && val != null && val !== "") s[key] = val;
    }
  }
  return Object.keys(s).length ? (s as CSSProperties) : undefined;
}

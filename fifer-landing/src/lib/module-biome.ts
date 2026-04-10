/**
 * Biomas visuales por módulo — valores alineados con:
 * - `fifer-landing/src/modules/finance/_xray_v0_local.md` (Esmeralda / oro)
 * - `fifer-landing/src/modules/content/_xray_v0_local.md` (Azul editorial / cian)
 * - `fifer-landing/src/modules/affiliates/_xray_v0_local.md` (Yellow Electric / blue)
 *
 * `BoxLoader` y `PageOrchestrator` inyectan `--fifer-primary`, `--fifer-accent` y `--fifer-deep-navy`.
 */

export type FiferDashboardModuleId = "finance" | "content" | "affiliates" | "logistics" | "dashboard" | string;

export interface ModuleBiomeTokens {
  /** `--fifer-primary` */
  primary: string;
  /** `--fifer-accent` */
  accent: string;
  /** Fondo shell / lienzo denso (`--fifer-deep-navy` en MASTER) */
  deepNavy: string;
}

/** Valores por defecto (MASTER + landing). */
export const FIFER_MASTER_DEEP_NAVY = "#0A0F1E";

const BIOMES: Record<string, ModuleBiomeTokens> = {
  /** Motor finanzas — `src/_xray_v0_local.md` (verde confianza) */
  finance: {
    deepNavy: FIFER_MASTER_DEEP_NAVY,
    primary: "#059669",
    accent: "#D97706",
  },
  /** Contenido — `fifer-content/_xray_v0_local.md` */
  content: {
    deepNavy: FIFER_MASTER_DEEP_NAVY,
    primary: "#1E3A5F",
    accent: "#22D3EE",
  },
  /** Afiliados — landing / módulo afiliados (Yellow Electric) */
  affiliates: {
    deepNavy: FIFER_MASTER_DEEP_NAVY,
    primary: "#EAB308",
    accent: "#2563EB",
  },
  /** Logistics — Azul Cobalto + Acero */
  logistics: {
    deepNavy: FIFER_MASTER_DEEP_NAVY,
    primary: "#1D4ED8",
    accent: "#64748B",
  },
  /** Dashboard genérico / shell */
  dashboard: {
    deepNavy: FIFER_MASTER_DEEP_NAVY,
    primary: "#0A0F1E",
    accent: "#EAB308",
  },
};

const DEFAULT_BIOME: ModuleBiomeTokens = BIOMES.dashboard;

export function resolveModuleBiome(moduleId: string | undefined): ModuleBiomeTokens {
  if (!moduleId) return DEFAULT_BIOME;
  const key = String(moduleId).toLowerCase();
  return BIOMES[key] ?? DEFAULT_BIOME;
}

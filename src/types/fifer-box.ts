/**
 * Contrato maestro — Fifer Box UI (micro-frontends + v0 Bridge).
 * Puede persistirse como JSON (misma forma) junto al código o en `manifests/*.json`.
 *
 * Consumo en UI: `fifer-landing` reexporta vía `@/types/fifer-box` (alias → `fifer-landing/src/types/fifer-box.ts`).
 */

/**
 * Módulos ROI-first principales (valores en manifiesto en minúsculas).
 * Producto: **Finance** | **Content** | **Ingestor**.
 */
export type FiferCoreSourceModule = "finance" | "content" | "ingestor";

/** Origen lógico del Box; incluye el núcleo + extensiones (`landing`, integraciones). */
export type FiferSourceModule = FiferCoreSourceModule | "landing" | (string & {});

/** Slots del lienzo: nombres v0/Lovable + legacy dashboard. */
export type FiferTargetSlot =
  | "slot-hero"
  | "slot-stats-grid"
  | "slot-main-content"
  | "slot-sidebar-nav"
  | "finance-stats"
  | "content-editor"
  | "affiliate-feed"
  | "dashboard_top"
  | "main_grid"
  | "sidebar";

/**
 * Política de degradación del Box (aislamiento a nivel de componente).
 * Incluye alias legacy (`ghost_mode_mock`, `error_boundary`) para manifiestos ya desplegados.
 */
export type FiferBoxFallbackStrategy =
  | "ghost"
  | "skeleton"
  | "error-message"
  | "hide"
  | "ghost_mode_mock"
  | "error_boundary";

/**
 * Cuadrícula del panel: `minWidth` / `minHeight` definen span o tamaños mínimos (ver `boxGridClassName`).
 */
export interface IFiferBoxLayout {
  minWidth: number;
  minHeight: number;
  isResizable: boolean;
}

/**
 * Paleta y tokens por app; `themeOverridesToStyle` mapea campos conocidos a `--fifer-box-*`.
 * `cssVariables` permite inyectar cualquier variable CSS en el contenedor del Box.
 */
export interface IFiferBoxThemeOverrides {
  primary?: string;
  secondary?: string;
  accent?: string;
  surface?: string;
  onPrimary?: string;
  /** Texto base dentro del slot (mitiga herencia del shell Lovable). */
  onSurface?: string;
  /** Texto secundario / captions. */
  muted?: string;
  /** Borde del contenedor del Box (`border-color`). */
  border?: string;
  /** Radio del contenedor, p. ej. `12px` o `0.75rem`. */
  radius?: string;
  /**
   * Variables CSS arbitrarias en el contenedor (claves con o sin prefijo `--`; se recomienda usar `--*`).
   * @example { "--fifer-widget-gap": "8px" }
   */
  cssVariables?: Record<string, string>;
}

export interface IFiferBoxManifest {
  /** Identificador único estable del Box (telemetría, keys React). */
  boxId: string;
  /** Módulo de origen: núcleo **Finance** / **Content** / **Ingestor** (`finance` | `content` | `ingestor`) u otros. */
  sourceModule: FiferSourceModule;
  /** Slot de inyección en el lienzo Grid del panel. */
  targetSlot: FiferTargetSlot;
  layout: IFiferBoxLayout;
  permissions: {
    requiredRole: "admin" | "affiliate" | "user";
    requiresActiveSubscription: boolean;
  };
  /**
   * Scopes RBAC como strings (anclaje v0 / JSON estático). `BoxLoader` sigue usando `permissions.requiredRole`.
   */
  permissionScopes?: string[];
  /** Dependencias de datos; `requiresBYOK` activa la ruta BYOK en BoxLoader. */
  dataDependencies: {
    endpoint: string;
    requiresBYOK: boolean;
    method?: "GET" | "POST";
  }[];
  /**
   * Estrategia de fallback ante BYOK / carga / error.
   * Si se omite, BoxLoader usa `skeleton` por defecto.
   */
  fallbackStrategy?: FiferBoxFallbackStrategy;
  /**
   * Si es true, el componente puede reintentar la carga de datos tras un fallo (p. ej. junto a `onRetry` del loader).
   */
  retryable?: boolean;
  /**
   * Origen del UI del Box: ajusta aislamiento (v0 vs layout Lovable) y política del error boundary.
   * Si no se define, BoxLoader usa `childStack` explícito o por defecto `v0`.
   */
  uiProvenance?: "v0" | "lovable";
  /**
   * Paleta por app (hex / tokens). Debe alinearse con `_xray_v0_local.md` de la sub-app.
   * BoxLoader inyecta `--fifer-box-*` en el `<section>` para hijos y utilidades Tailwind arbitrarias.
   */
  themeOverrides?: IFiferBoxThemeOverrides;
}

export type ScrapingTargetModule = "content" | "finance" | "affiliates";

export interface FiferBoxDataNormalized {
  source: "scraper";
  module: ScrapingTargetModule;
  url: string;
  title: string;
  summary: string;
  keyPoints: string[];
  canonicalRecords: Array<Record<string, string | number>>;
  metrics: Record<string, string | number>;
  raw: {
    htmlLength: number;
    refinedPrompt: string;
  };
}

/**
 * Contrato mínimo que consume la UI del Shell (`BoxProps`):
 * - `data`: payload normalizado para el Box
 * - `config`: metadata operativa/visual
 * - `error`: estado de fallo serializable (null en éxito)
 */
export interface FiferBoxResponseContract<TData = FiferBoxDataNormalized> {
  data: TData | null;
  config: {
    engineId: string;
    module: ScrapingTargetModule;
    url: string;
    isRefining: boolean;
    stage: "preflight" | "refining" | "extraction" | "normalization" | "done" | "error";
    generatedAt: string;
  };
  error: { message: string; code?: string } | null;
  /** Fragmento opcional alineado a `IFiferBoxManifest` (hidratación SDUI / BoxLoader). */
  manifest?: Partial<IFiferBoxManifest>;
}

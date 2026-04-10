"use client";

/**
 * Envoltorio universal Fifer Box — v0 (minimal) + Lovable (complejo).
 * - Manifiesto: suele venir de **`core/manifests/*.json`** vía `boxManifests.ts` (mock/ anclaje inicial) o TS inline.
 * - Sin `children`: **JIT** desde `@/components/v0-ingestion/boxes/*` según `manifest.boxId` (`V0BoxLoader` + `registry.ts`).
 * - `manifest.themeOverrides` + `_xray_v0_local` (reflejado en manifiesto) → variables CSS `--fifer-box-*` en el `<section>`.
 * - `BoxErrorBoundary`: cortafuegos por manifiesto (`fallbackStrategy` / `retryable`) — un boundary por hijo
 *   de nivel superior (`Children.toArray`) para que un micro-UI v0 no tumbe a sus hermanos ni el grid.
 * - `BoxLoaderIntegrationBoundary`: red de seguridad si falla el shell o política Lovable / integración.
 * - `BoxContentShell` reduce choques de Tailwind entre shell del dashboard y el micro-UI.
 */
import { clsx } from "clsx";
import { Children, isValidElement, type CSSProperties, type ReactNode } from "react";
import type { IFiferBoxManifest } from "@/types/fifer-box";
import { BoxErrorBoundary } from "./BoxErrorBoundary";
import { AccessRestricted } from "./box-loader/AccessRestricted";
import {
  BoxLoaderIntegrationBoundary,
  resolveChildStack,
  type BoxLoaderChildStack,
} from "./box-loader/BoxLoaderIntegrationBoundary";
import { BoxContentShell } from "./box-loader/BoxContentShell";
import { byokSatisfied } from "./box-loader/byokGate";
import { FallbackError } from "./box-loader/FallbackError";
import { FallbackLockedApi } from "./box-loader/FallbackLockedApi";
import { FallbackSkeleton } from "./box-loader/FallbackSkeleton";
import { boxGridClassName, boxGridInlineStyle } from "./box-loader/gridLayout";
import { roleMeetsRequired, subscriptionOk } from "./box-loader/roleAccess";
import { themeOverridesToStyle } from "./box-loader/themeVars";
import { V0BoxLoader } from "./box-loader/V0BoxLoader";

export type { BoxLoaderChildStack };

export type BoxLoaderProps = {
  manifest: IFiferBoxManifest;
  /**
   * Contenido del micro-UI. Si se omite (`null` / `undefined`), el loader importa el módulo JIT desde
   * `@/components/v0-ingestion/boxes/*` según `manifest.boxId` (socket v0).
   */
  children?: ReactNode;
  /** Props extra para el default export v0 cuando no pasas `children` (p. ej. `reloadNonce` en Ingestor). */
  jitChildProps?: Record<string, unknown>;
  /** Mientras las dependencias de datos cargan — muestra Skeleton. */
  loading?: boolean;
  /** Rol actual — permisos del panel (ley BYOK / gobernanza de acceso). */
  userRole?: "admin" | "affiliate" | "user" | null;
  /** Suscripción activa — Financial Bunker / ROI-first (operaciones facturables). */
  hasActiveSubscription?: boolean;
  /** Llave BYOK válida cuando `dataDependencies` lo exige — ley BYOK First. */
  hasValidByok?: boolean;
  /** Fallo de fetch o reglas de negocio — error explícito + reintento sin tumbar el grid. */
  error?: Error | null;
  /** Sin datos o API no disponible — overlay blur + “Activar con API Key” sobre children. */
  dataLocked?: boolean;
  onRetry?: () => void;
  className?: string;
  /**
   * Origen UI del hijo: `lovable` activa aislamiento fuerte + Ghost ante cualquier error de render.
   * Si se omite, se usa `manifest.uiProvenance` o `v0`.
   */
  childStack?: BoxLoaderChildStack;
  /** Incrementar tras reintentos para limpiar el error boundary sin remontar todo el dashboard. */
  errorBoundaryResetKey?: number | string;
};

export function BoxLoader({
  manifest,
  children,
  jitChildProps,
  loading = false,
  userRole = null,
  hasActiveSubscription,
  hasValidByok,
  error,
  dataLocked = false,
  onRetry,
  className,
  childStack: childStackProp,
  errorBoundaryResetKey,
}: BoxLoaderProps) {
  const { permissions, layout } = manifest;
  const resolvedStack = resolveChildStack(manifest, childStackProp);

  const slotContent =
    children == null ? (
      <V0BoxLoader manifest={manifest} jitChildProps={jitChildProps} />
    ) : (
      children
    );

  const sectionStyle = (): CSSProperties | undefined => {
    const grid = boxGridInlineStyle(layout);
    const theme = themeOverridesToStyle(manifest.themeOverrides);
    const radius = manifest.themeOverrides?.radius
      ? { borderRadius: manifest.themeOverrides.radius }
      : undefined;
    const merged = { ...grid, ...theme, ...radius };
    return Object.keys(merged).length ? merged : undefined;
  };

  const sectionClass = (extra?: string) =>
    clsx(
      boxGridClassName(layout),
      manifest.themeOverrides?.accent && "ring-1 ring-[color:var(--fifer-box-accent)]/35",
      manifest.themeOverrides?.border && "border border-[color:var(--fifer-box-border)]",
      extra
    );

  const boundaryRemountKey =
    errorBoundaryResetKey === undefined
      ? manifest.boxId
      : `${manifest.boxId}-${String(errorBoundaryResetKey)}`;

  /** Estrategia de degradación del manifiesto del Box que se está cargando (cortafuegos). */
  const manifestFallbackStrategy = manifest.fallbackStrategy;
  const errorBoundaryOnReset = manifest.retryable === false ? undefined : onRetry;

  const wrapWithBoundary = (inner: ReactNode) => (
    <BoxLoaderIntegrationBoundary
      boxId={manifest.boxId}
      childStack={resolvedStack}
      onRetry={onRetry}
      resetKey={errorBoundaryResetKey}
    >
      <BoxContentShell childStack={resolvedStack}>
        {wrapDynamicSubtreeWithErrorBoundaries(inner, {
          boxId: manifest.boxId,
          fallbackStrategy: manifestFallbackStrategy,
          onReset: errorBoundaryOnReset,
          boundaryRemountKey,
        })}
      </BoxContentShell>
    </BoxLoaderIntegrationBoundary>
  );

  // --- Permisos y suscripción (antes que datos / BYOK) ---
  const allowedByRole = roleMeetsRequired(userRole, permissions.requiredRole);
  const allowedByPlan = subscriptionOk(
    permissions.requiresActiveSubscription,
    hasActiveSubscription
  );
  if (!allowedByRole || !allowedByPlan) {
    return (
      <section
        data-box-id={manifest.boxId}
        data-slot={manifest.targetSlot}
        data-fifer-box-provenance={resolvedStack}
        className={clsx(sectionClass(), className)}
        style={sectionStyle()}
      >
        <AccessRestricted />
      </section>
    );
  }

  // --- Carga de dependencias de datos ---
  if (loading) {
    return (
      <section
        data-box-id={manifest.boxId}
        data-slot={manifest.targetSlot}
        data-loading="true"
        data-fifer-box-provenance={resolvedStack}
        className={clsx(sectionClass(), className)}
        style={sectionStyle()}
      >
        <FallbackSkeleton layout={layout} />
      </section>
    );
  }

  // --- Error de pipeline / ROI (prioridad sobre fallback por BYOK) ---
  if (error) {
    return (
      <section
        data-box-id={manifest.boxId}
        data-slot={manifest.targetSlot}
        data-fifer-box-provenance={resolvedStack}
        className={clsx(sectionClass(), className)}
        style={sectionStyle()}
      >
        <FallbackError message={error.message} onRetry={onRetry} />
      </section>
    );
  }

  // --- BYOK: degradación controlada (Ghost Mode, skeleton, etc.) ---
  const byokOk = byokSatisfied(manifest, hasValidByok);
  if (!byokOk) {
    const fallbackStrategy = manifest.fallbackStrategy ?? "skeleton";
    return (
      <section
        data-box-id={manifest.boxId}
        data-slot={manifest.targetSlot}
        data-fifer-box-provenance={resolvedStack}
        className={clsx(sectionClass(), className)}
        style={sectionStyle()}
      >
        <FallbackSwitch
          strategy={fallbackStrategy}
          layout={layout}
          onRetry={onRetry}
          wrapChildren={wrapWithBoundary}
        >
          {slotContent}
        </FallbackSwitch>
      </section>
    );
  }

  // --- Datos bloqueados / sin API (overlay Ghost sin tumbar el slot) ---
  if (dataLocked) {
    return (
      <section
        data-box-id={manifest.boxId}
        data-source-module={manifest.sourceModule}
        data-slot={manifest.targetSlot}
        data-locked="true"
        data-fifer-box-provenance={resolvedStack}
        className={clsx(sectionClass(), className)}
        style={sectionStyle()}
      >
        <FallbackLockedApi>{wrapWithBoundary(slotContent)}</FallbackLockedApi>
      </section>
    );
  }

  // --- Ruta feliz: contenido real del micro-frontend ---
  return (
    <section
      data-box-id={manifest.boxId}
      data-source-module={manifest.sourceModule}
      data-slot={manifest.targetSlot}
      data-resizable={layout.isResizable ? "true" : "false"}
      data-fifer-box-provenance={resolvedStack}
      className={clsx(sectionClass(), className)}
      style={sectionStyle()}
    >
      {wrapWithBoundary(slotContent)}
    </section>
  );
}

type DynamicErrorBoundaryOpts = {
  boxId: string;
  fallbackStrategy: IFiferBoxManifest["fallbackStrategy"];
  onReset?: () => void;
  boundaryRemountKey: string;
};

function dynamicLeafKey(boxId: string, boundaryRemountKey: string, child: ReactNode, index: number): string {
  if (isValidElement(child) && child.key != null && child.key !== "") {
    return `${boxId}-${boundaryRemountKey}-${String(child.key)}`;
  }
  return `${boxId}-${boundaryRemountKey}-leaf-${index}`;
}

/**
 * Envuelve cada componente dinámico de nivel superior en su propio `BoxErrorBoundary`.
 * Los errores de render no suben al grid del dashboard: se contienen en el slot del Box.
 */
function wrapDynamicSubtreeWithErrorBoundaries(
  inner: ReactNode,
  opts: DynamicErrorBoundaryOpts
): ReactNode {
  const leaves = Children.toArray(inner);

  if (leaves.length <= 1) {
    return (
      <BoxErrorBoundary
        key={opts.boundaryRemountKey}
        fallbackStrategy={opts.fallbackStrategy}
        onReset={opts.onReset}
      >
        {leaves.length === 1 ? leaves[0] : inner}
      </BoxErrorBoundary>
    );
  }

  return leaves.map((leaf, index) => (
    <BoxErrorBoundary
      key={dynamicLeafKey(opts.boxId, opts.boundaryRemountKey, leaf, index)}
      fallbackStrategy={opts.fallbackStrategy}
      onReset={opts.onReset}
    >
      {leaf}
    </BoxErrorBoundary>
  ));
}

function FallbackSwitch({
  strategy,
  children,
  layout,
  onRetry,
  wrapChildren,
}: {
  strategy: NonNullable<IFiferBoxManifest["fallbackStrategy"]>;
  children: ReactNode;
  layout: IFiferBoxManifest["layout"];
  onRetry?: () => void;
  wrapChildren: (n: ReactNode) => ReactNode;
}) {
  switch (strategy) {
    case "skeleton":
      return <FallbackSkeleton layout={layout} />;
    case "ghost":
    case "ghost_mode_mock":
      return <FallbackLockedApi>{wrapChildren(children)}</FallbackLockedApi>;
    case "error-message":
    case "error_boundary":
      return (
        <FallbackError
          message="No hay credenciales BYOK válidas para este módulo."
          onRetry={onRetry}
        />
      );
    case "hide":
      return null;
    default: {
      const _exhaustive: never = strategy;
      return _exhaustive;
    }
  }
}

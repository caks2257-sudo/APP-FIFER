"use client";

/**
 * BoxLoader — no incorpora credenciales Supabase; datos vía `useFiferData` / motores.
 * Variables de entorno en cliente: solo prefijos `NEXT_PUBLIC_*` acordes a `next.config` (p. ej. banners de diagnóstico); secretos permanecen en rutas API y `supabase-server.ts` (servidor).
 */
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { boxCircuitBreaker, BOX_CIRCUIT_FAILURE_THRESHOLD } from "../../../../src/core/CircuitBreaker";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Gem, Sparkles } from "lucide-react";
import { BoxErrorBoundary } from "@/components/core/BoxErrorBoundary";
import { BoxLockedOverlay } from "@/components/core/BoxLockedOverlay";
import { DiscoveryBox, type DiscoveryReason } from "@/components/core/DiscoveryBox";
import type { IFiferBoxManifest } from "@/types/fifer-box";
import { getHttpStatusFromError } from "@/lib/fifer-http-error";
import { FIFER_ELECTRIC_YELLOW, fiferLayoutSpring } from "@/components/core/fifer-theme";
import { CatalogGapBanner } from "@/components/core/CatalogGapBanner";
import { JITUpsellBanner } from "@/components/core/JITUpsellBanner";
import { RefiningPromptPulse } from "@/components/core/RefiningPromptPulse";
import { runOptimisticMutation } from "@/lib/optimistic-mutation";
import { persistFiferMutation } from "@/lib/fifer-mutation-api";
import { resolveModuleBiome } from "@/lib/module-biome";
import { FIFER_BOX_CATALOG, getBoxCatalogEntry, isBoxRegisteredInCatalog } from "@/registry/box-catalog";
import { getV0BoxLoader } from "@/components/v0-ingestion/registry";
import { defaultHrefForFavoriteBox, labelForFavoriteBox } from "@/config/sidebar-navigation";
import { useFiferData } from "@/hooks/useFiferData";
import { useFiferEngine } from "@/hooks/useFiferEngine";
import { useUserEngine } from "@/hooks/useUserEngine";
import { isUserSpaceBoxId } from "@/user_space/user-space-box-ids";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useDualStageShellStore } from "@/store/useDualStageShellStore";
import { useLayoutStore } from "@/store/useLayoutStore";
import { useUserStore } from "@/store/useUserStore";
import { buildRefiningMotorComparison } from "@/lib/ai/credit-orchestrator";
import { FiferDataValidationError } from "@/types/schemas";

type ByokService = "google-ads" | "mercadolibre";

function resolveByokService(boxId: string): ByokService | null {
  const bid = boxId.toLowerCase();
  if (bid.includes("google-shopping") || bid.includes("google-ads")) return "google-ads";
  if (bid.includes("mercadolibre") || bid.includes("meli")) return "mercadolibre";
  return null;
}

function BoxShell({ boxId }: { boxId: string }) {
  if (boxId === "__force_error__") {
    throw new Error("Forced box crash");
  }
  return <p style={{ margin: 0, fontSize: 13 }}>Cargando cascarón v0: {boxId}</p>;
}

function GhostSkeleton() {
  return (
    <div
      className="fifer-ghost-skeleton"
      data-fifer-ghost="skeleton"
      style={{
        borderRadius: "0.75rem",
        border: `1px solid ${FIFER_ELECTRIC_YELLOW}22`,
        background: "linear-gradient(90deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        backgroundSize: "200% 100%",
        minHeight: 88,
        width: "100%",
      }}
    />
  );
}

/** Dual-Stage Etapa 1: skeleton animado + chispa #EAB308 (micro-interacción borde en `globals.css`). */
function RefiningSkeleton() {
  return (
    <div
      className="fifer-refining-border-pulse w-full space-y-3 rounded-lg border border-[#EAB308]/30 bg-[#0A0F1E]/90 p-4"
      data-fifer-refining-skeleton="true"
    >
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#EAB308]" aria-hidden />
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="fifer-ghost-shimmer h-2.5 w-[78%] rounded-md bg-[#EAB308]/12" />
          <div className="fifer-ghost-shimmer h-2.5 w-[52%] rounded-md bg-[#EAB308]/10" />
          <div className="fifer-ghost-shimmer h-16 w-full rounded-md bg-[#1e293b]/80" />
        </div>
      </div>
    </div>
  );
}

function resolveDiscoveryReason(error: Error | null | undefined, isDataCorruption: boolean): DiscoveryReason {
  if (isDataCorruption) return "data-corrupt";
  if (!error) return "error";
  const http = getHttpStatusFromError(error);
  if (http === 401 || http === 403) return "credentials";
  const m = error.message.toLowerCase();
  if (m.includes("credentials_required") || m.includes("credencial") || m.includes("api key")) return "credentials";
  return "error";
}

function ThrowBoxError({ error }: { error: Error }): never {
  throw error;
}

function hasRenderableData(data: unknown): boolean {
  if (data === undefined || data === null) return false;
  if (Array.isArray(data)) return data.length > 0;
  if (typeof data === "object") return Object.keys(data as object).length > 0;
  return true;
}

export type BoxLoaderProps = {
  boxId: string;
  /**
   * Módulo de la ruta actual (`PageOrchestrator`). Solo se usa si `boxId` no tiene manifiesto en `FIFER_BOX_CATALOG`
   * (p. ej. cajas solo en `BOX_CATALOG`).
   */
  moduleId?: string;
  expanded?: boolean;
  showAIFace?: boolean;
  onToggleExpand?: () => void;
  onToggleAiView?: () => void;
  /** Overrides opcionales para composición de contenedores (render recursivo de Boxes). */
  dataOverride?: unknown;
  loadingOverride?: boolean;
  errorOverride?: Error | null;
  /** Slot en `PageOrchestrator` — necesario para JIT manifest → grid. */
  slotName?: string;
  /** Ruta normalizada (`makeRouteKey`) para persistir spans al hidratar desde motor. */
  routePathForLayout?: string;
};

type BoxVisualState = "idle" | "loading" | "error" | "locked";

/**
 * Shell de carga JIT para Boxes v0: configuración desde `FIFER_BOX_CATALOG` por `boxId` (módulo fuente, tema),
 * bioma vía `resolveModuleBiome`, aislamiento de errores y Ghost. Contrato: `_xray_PROTOCOL_SHELL.md`.
 */
export function BoxLoader({
  boxId,
  moduleId: routeModuleId,
  expanded,
  showAIFace,
  onToggleExpand,
  onToggleAiView,
  dataOverride,
  loadingOverride,
  errorOverride,
  slotName,
  routePathForLayout,
}: BoxLoaderProps) {
  /** Manifiesto Core Registry — fuente única para `sourceModule` / `themeOverrides`. */
  const manifest = FIFER_BOX_CATALOG.find((m) => m.boxId === boxId);
  const moduleIdResolved = manifest?.sourceModule ?? routeModuleId ?? "dashboard";
  const router = useRouter();
  const pathname = usePathname() || "";
  const toggleFavoriteBox = useUserStore((s) => s.toggleFavoriteBox);
  const setIsPremium = useUserStore((s) => s.setIsPremium);
  const isFavorite = useUserStore((s) => s.favoriteBoxes.some((f) => f.boxId === boxId));
  const isProTier = useUserStore((s) => s.isPremium || s.hasCustomKey);
  const hasCustomKey = useUserStore((s) => s.hasCustomKey);
  const setBoxIntegration401 = useLayoutStore((s) => s.setBoxIntegration401);
  const applyPartialEngineManifest = useLayoutStore((s) => s.applyPartialEngineManifest);
  const flip = Boolean(showAIFace);
  const walletBalance = useFinanceStore((s) => s.walletBalance);
  const topUp = useFinanceStore((s) => s.topUp);
  const refiningTaskSnippet = useDualStageShellStore((s) => s.taskByBoxId[boxId] ?? "");
  /** Dual-Stage: tarea activa en el store → “Pulido de Prompt” (no depende de props sueltas). */
  const shellIsRefining = Boolean(refiningTaskSnippet);
  /** Metadatos UI opcionales (`BOX_CATALOG`) — variant Mini → Ghost si payload vacío. */
  const ghostWhenEmpty = getBoxCatalogEntry(boxId)?.variant === "Mini";
  const byokService = useMemo(() => resolveByokService(boxId), [boxId]);
  const missingByokCredentials = Boolean(byokService && !hasCustomKey);
  /** Financial Bunker: sin Chispas → bloquear IA en Boxes y CTA “Recargar saldo”. */
  const aiBlocked = walletBalance <= 0;
  const [healNonce, setHealNonce] = useState(0);
  const [jitError, setJitError] = useState<Error | null>(null);
  const hadErrorRef = useRef(false);

  const isUserSpace = isUserSpaceBoxId(boxId);
  const engine = useFiferEngine();
  const userEngine = useUserEngine(boxId, healNonce);
  const isRefining = shellIsRefining || (isUserSpace ? userEngine.isRefining : engine.isRefining);
  /** BYOK: el formulario Vault debe permanecer visible mientras `Probar conexión` usa Dual-Stage (`isRefining`). */
  const vaultHighRiskLock = isUserSpace && userEngine.lockedByVault;
  const showRefiningSkeleton = isRefining && !vaultHighRiskLock;

  const circuitApplies = isUserSpace;
  const rawCircuitOpen = useSyncExternalStore(
    boxCircuitBreaker.subscribe,
    () => boxCircuitBreaker.isOpen(boxId),
    () => false,
  );
  const circuitOpen = circuitApplies && rawCircuitOpen;

  useEffect(() => {
    if (aiBlocked && flip && onToggleAiView) {
      onToggleAiView();
    }
  }, [aiBlocked, flip, onToggleAiView]);

  /** Demo vs real + fetch API: `useFiferData` → skeleton mientras carga; error del adaptador (Fase 5) → Discovery. */
  const bridge = useFiferData(moduleIdResolved, boxId);
  const resolvedData =
    dataOverride !== undefined
      ? dataOverride
      : isRefining
        ? undefined
        : isUserSpace
          ? userEngine.data
          : (engine.data ?? bridge.data);
  const resolvedLoading =
    loadingOverride ??
    (isUserSpace ? userEngine.isLoading : bridge.isLoading || engine.isLoading);
  const resolvedError =
    errorOverride ?? (isUserSpace ? userEngine.error : (engine.error ?? bridge.error));
  const isDataCorruptionError =
    resolvedError instanceof FiferDataValidationError || resolvedError?.name === "FiferDataValidationError";

  const dataRequiresPro =
    resolvedData &&
    typeof resolvedData === "object" &&
    resolvedData !== null &&
    "requiresProMotor" in resolvedData &&
    Boolean((resolvedData as { requiresProMotor?: boolean }).requiresProMotor);
  const requiresProMotor = !isUserSpace && (engine.requiresProMotor || dataRequiresPro);

  useEffect(() => {
    if (!slotName || !routePathForLayout) return;
    const fromData =
      resolvedData &&
      typeof resolvedData === "object" &&
      resolvedData !== null &&
      "engineManifest" in resolvedData
        ? (resolvedData as { engineManifest?: Partial<IFiferBoxManifest> }).engineManifest
        : undefined;
    const m = isUserSpace ? fromData : (engine.lastEngineManifest ?? fromData);
    if (!m?.layout) return;
    applyPartialEngineManifest(moduleIdResolved, routePathForLayout, slotName, boxId, m);
  }, [
    isUserSpace,
    engine.lastEngineManifest,
    resolvedData,
    slotName,
    routePathForLayout,
    moduleIdResolved,
    boxId,
    applyPartialEngineManifest,
  ]);

  useEffect(() => {
    const http401 =
      getHttpStatusFromError(resolvedError) === 401 || getHttpStatusFromError(jitError) === 401;
    setBoxIntegration401(boxId, http401);
    return () => {
      setBoxIntegration401(boxId, false);
    };
  }, [resolvedError, jitError, boxId, setBoxIntegration401]);

  const catalogGap = useMemo(() => !isBoxRegisteredInCatalog(boxId), [boxId]);
  const showCatalogGapBanner =
    catalogGap &&
    (process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_FIFER_SHOW_CATALOG_GAP === "1");

  const biome = useMemo(() => resolveModuleBiome(moduleIdResolved), [moduleIdResolved]);
  const biomeVars = useMemo(() => {
    const to = manifest?.themeOverrides;
    return {
      "--fifer-primary": to?.primary ?? biome.primary,
      "--fifer-accent": to?.accent ?? biome.accent,
      "--fifer-deep-navy": to?.surface ?? biome.deepNavy,
    } as CSSProperties;
  }, [biome, manifest]);
  const refiningPulseColor = manifest?.themeOverrides?.accent ?? biome.accent ?? FIFER_ELECTRIC_YELLOW;

  const onHeal = useCallback(() => {
    boxCircuitBreaker.reset(boxId);
    setHealNonce((n) => n + 1);
    setJitError(null);
    hadErrorRef.current = false;
    router.refresh();
  }, [boxId, router]);

  const onReconnectData = useCallback(() => {
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (catalogGap) {
      console.warn(
        `[Fifer] boxId "${boxId}" no está en BOX_CATALOG — añade entrada en registry/box-catalog.ts, V0_BOX_LOADERS y manifiesto (ver CatalogGapBanner en dev).`
      );
    }
  }, [boxId, catalogGap]);

  useEffect(() => {
    if (!circuitApplies) return;
    const bad = Boolean(resolvedError || jitError);
    if (bad && !hadErrorRef.current) {
      boxCircuitBreaker.recordFailure(boxId);
    }
    hadErrorRef.current = bad;
  }, [circuitApplies, resolvedError, jitError, boxId]);

  useEffect(() => {
    if (!circuitApplies) return;
    if (resolvedLoading || resolvedError || jitError || isRefining) return;
    boxCircuitBreaker.recordSuccess(boxId);
  }, [circuitApplies, resolvedLoading, resolvedError, jitError, isRefining, boxId]);

  useEffect(() => {
    const loader = getV0BoxLoader(boxId);
    if (!loader) {
      setJitError(null);
      return;
    }
    let cancelled = false;
    loader()
      .then(() => {
        if (!cancelled) setJitError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setJitError(err instanceof Error ? err : new Error(String(err)));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [boxId, healNonce]);

  const LazyV0 = useMemo(() => {
    const loader = getV0BoxLoader(boxId);
    if (!loader) return null;
    return lazy(loader);
  }, [boxId]);

  const refiningMotorComparison = useMemo(() => {
    if (!isRefining) return null;
    return buildRefiningMotorComparison({ task: refiningTaskSnippet });
  }, [isRefining, refiningTaskSnippet]);

  const showNoDataGhost =
    ghostWhenEmpty &&
    !resolvedLoading &&
    !resolvedError &&
    !jitError &&
    !isRefining &&
    !hasRenderableData(resolvedData);

  const showFetchError = Boolean(resolvedError);
  const hasAnyError = showFetchError || Boolean(jitError) || circuitOpen;
  const isLocked = aiBlocked || missingByokCredentials || (isUserSpace && userEngine.lockedByVault);
  const isProExecuting = !isRefining && resolvedLoading && !hasAnyError;
  const visualState: BoxVisualState = hasAnyError ? "error" : resolvedLoading ? "loading" : isLocked ? "locked" : "idle";

  const showProUpsellStrip =
    requiresProMotor &&
    !isProTier &&
    !catalogGap &&
    !circuitOpen &&
    !resolvedError &&
    !jitError &&
    !isRefining &&
    !resolvedLoading &&
    !showNoDataGhost;

  const mainContent = () => {
    if (LazyV0) {
      const Comp = LazyV0;
      return (
        <Suspense key={healNonce} fallback={<GhostSkeleton />}>
          <Comp
            boxId={boxId}
            data={resolvedData}
            isLoading={resolvedLoading}
            error={resolvedError}
            isLocked={isLocked}
            isRefining={Boolean(isRefining)}
            engine={engine}
          />
        </Suspense>
      );
    }
    return <BoxShell boxId={boxId} />;
  };

  return (
    <motion.section
      layout
      className={isRefining ? "fifer-refining-slot" : undefined}
      data-box-id={boxId}
      data-fifer-catalog-gap={catalogGap ? "true" : "false"}
      data-fifer-ai-blocked={aiBlocked ? "true" : "false"}
      data-fifer-wallet-balance={String(walletBalance)}
      data-fifer-hydration={bridge.isDemoMode ? "demo" : "real"}
      data-fifer-loading={resolvedLoading ? "true" : "false"}
      data-fifer-refining={isRefining ? "true" : "false"}
      data-fifer-pro-upsell={showProUpsellStrip ? "true" : "false"}
      data-fifer-module={moduleIdResolved}
      data-fifer-state={visualState}
      data-fifer-vault-high-risk-lock={vaultHighRiskLock ? "true" : "false"}
      data-fifer-vault-lock-reason={userEngine.lockReason ?? ""}
      data-fifer-pro-executing={isProExecuting ? "true" : "false"}
      data-box-variant={expanded ? "hero" : "standard"}
      data-ai-face={flip ? "on" : "off"}
      transition={fiferLayoutSpring}
      animate={{
        minHeight: expanded ? 200 : 120,
        borderColor: isRefining ? refiningPulseColor : expanded ? `${FIFER_ELECTRIC_YELLOW}99` : "#252525",
        boxShadow: isRefining
          ? `0 0 0 1px ${refiningPulseColor}, 0 0 28px ${refiningPulseColor}`
          : expanded
            ? "0 0 24px rgba(234, 179, 8, 0.08)"
            : "0 0 0 rgba(0,0,0,0)",
      }}
      style={{
        ...biomeVars,
        borderWidth: 1,
        borderStyle: "solid",
        borderRadius: 12,
        padding: 12,
        background: "#111",
        color: "#b8b8b8",
        width: "100%",
        perspective: 1000,
      }}
    >
      {showCatalogGapBanner ? <CatalogGapBanner boxId={boxId} moduleId={moduleIdResolved} /> : null}
      {!catalogGap ? (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
          <button
            type="button"
            title={isFavorite ? "Quitar de favoritos (sidebar)" : "Añadir a favoritos en sidebar"}
            onClick={() => {
              const prev = useUserStore.getState().favoriteBoxes.map((f) => ({ ...f }));
              void runOptimisticMutation({
                apply: () =>
                  toggleFavoriteBox({
                    boxId,
                    label: labelForFavoriteBox(boxId),
                    href: pathname || defaultHrefForFavoriteBox(boxId),
                  }),
                revert: () => useUserStore.setState({ favoriteBoxes: prev }),
                request: () => persistFiferMutation({ kind: "favorite", moduleId: moduleIdResolved, boxId }),
                errorTitle: "Favorito no sincronizado",
                errorBody: (err) =>
                  `El cambio en sidebar se revirtió hasta que la red confirme. ${err.message}`,
              });
            }}
            style={{
              border: `1px solid ${FIFER_ELECTRIC_YELLOW}44`,
              background: isFavorite ? "rgba(234, 179, 8, 0.15)" : "transparent",
              color: isFavorite ? FIFER_ELECTRIC_YELLOW : "#71717a",
              borderRadius: 8,
              padding: "2px 8px",
              fontSize: 14,
              cursor: "pointer",
              lineHeight: 1.2,
            }}
          >
            {isFavorite ? "★" : "☆"}
          </button>
        </div>
      ) : null}
      {aiBlocked && resolvedLoading ? (
        <div
          data-fifer-wallet-bunker="strip"
          style={{
            marginBottom: 10,
            borderRadius: "0.75rem",
            border: `1px solid ${FIFER_ELECTRIC_YELLOW}44`,
            background: "var(--fifer-deep-navy, #0a0f1e)",
            padding: "10px 12px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 10,
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 12, color: "#d4d4d8", lineHeight: 1.4 }}>
            <strong style={{ color: FIFER_ELECTRIC_YELLOW }}>Financial Bunker:</strong> saldo agotado (0 Chispas). Las
            acciones de IA en este Box están bloqueadas hasta recargar.
          </span>
          <button
            type="button"
            onClick={() => topUp(100, "Recarga demo — Chispas IA")}
            style={{
              border: `1px solid ${FIFER_ELECTRIC_YELLOW}66`,
              background: "rgba(234, 179, 8, 0.1)",
              color: "#fef9c3",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Recargar saldo
          </button>
        </div>
      ) : null}
      {onToggleExpand || onToggleAiView ? (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          {onToggleAiView ? (
            <button
              type="button"
              onClick={aiBlocked ? undefined : onToggleAiView}
              disabled={aiBlocked}
              title={aiBlocked ? "Sin saldo: recarga Chispas IA para usar la vista IA" : undefined}
              style={{
                border: "1px solid #3f3f46",
                background: flip ? "#0c4a6e" : "#18181b",
                color: aiBlocked ? "#71717a" : "#e4e4e7",
                borderRadius: 8,
                padding: "4px 10px",
                fontSize: 12,
                cursor: aiBlocked ? "not-allowed" : "pointer",
                opacity: aiBlocked ? 0.75 : 1,
              }}
            >
              {flip ? "Contenido" : "IA"}
            </button>
          ) : null}
          {onToggleExpand ? (
            <button
              type="button"
              onClick={onToggleExpand}
              style={{
                border: "1px solid #3f3f46",
                background: expanded ? "#3f2a12" : "#18181b",
                color: "#e4e4e7",
                borderRadius: 8,
                padding: "4px 10px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {expanded ? "Estándar" : "Hero"}
            </button>
          ) : null}
        </div>
      ) : null}
      {(isRefining || isProExecuting) && !hasAnyError ? (
        <div className="mb-3 rounded-[0.75rem] border border-[#EAB308]/30 bg-[#0A0F1E]/80 p-3">
          {isRefining ? (
            <div className="flex items-center gap-2 text-[#FDE68A]">
              <Sparkles className="h-4 w-4 animate-pulse text-[#EAB308]" />
              <div className="min-w-0">
                <p className="text-[12px] font-semibold">Refinando tu idea... Pulido de Prompt</p>
                <p className="text-[11px] text-zinc-400">Etapa 1 del pipeline dual-stage</p>
              </div>
            </div>
          ) : null}
          {isProExecuting ? (
            <div className="flex items-center gap-2 text-[#FEF08A]">
              <span className="relative inline-flex">
                <span className="absolute inset-0 rounded-full bg-[#EAB308]/25 blur-md" />
                <Gem className="relative h-4 w-4 text-[#EAB308]" />
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold">Generando con Motor Pro...</p>
                <p className="text-[11px] text-zinc-400">Etapa 2 de ejecución de alta calidad</p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      <motion.div
        animate={{ rotateY: flip ? 180 : 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        style={{ transformStyle: "preserve-3d", width: "100%" }}
        layout
      >
        {showRefiningSkeleton ? (
          <div className="space-y-3">
            <RefiningSkeleton />
            <RefiningPromptPulse
              boxId={boxId}
              comparison={
                refiningMotorComparison ?? { candidates: [], primaryEstimatedCredits: 0 }
              }
            />
          </div>
        ) : circuitOpen ? (
          <DiscoveryBox
            boxId={boxId}
            reason="circuit-open"
            message={`Tras ${BOX_CIRCUIT_FAILURE_THRESHOLD} fallos consecutivos el Box quedó aislado.`}
            httpStatus={getHttpStatusFromError(resolvedError)}
            onHeal={onHeal}
            onReconnectData={onReconnectData}
          />
        ) : showFetchError ? (
          <DiscoveryBox
            boxId={boxId}
            reason={resolveDiscoveryReason(resolvedError, isDataCorruptionError)}
            message={resolvedError?.message}
            httpStatus={getHttpStatusFromError(resolvedError)}
            onHeal={onHeal}
            onReconnectData={onReconnectData}
          />
        ) : jitError ? (
          <BoxErrorBoundary
            key={`jit-${healNonce}`}
            renderFallback={({ error, httpStatus }) => (
              <DiscoveryBox
                boxId={boxId}
                reason="jit-fail"
                message={error.message}
                httpStatus={httpStatus}
                onHeal={onHeal}
                onReconnectData={onReconnectData}
              />
            )}
            onRenderFailure={() => {
              if (circuitApplies) boxCircuitBreaker.recordFailure(boxId);
            }}
          >
            <ThrowBoxError error={jitError} />
          </BoxErrorBoundary>
        ) : resolvedLoading ? (
          <GhostSkeleton />
        ) : vaultHighRiskLock && userEngine.report ? (
          <div
            className="w-full"
            data-fifer-locked="true"
            data-fifer-lock-reason="vault-high-risk"
          >
            <DiscoveryBox
              boxId={boxId}
              reason="vault-high-risk"
              engineReport={userEngine.report}
              onVaultKeySaved={onHeal}
              onHeal={onHeal}
              onReconnectData={onReconnectData}
            />
          </div>
        ) : isLocked ? (
          <div
            className="relative min-h-[160px] w-full"
            data-fifer-locked="true"
            data-fifer-lock-reason={
              missingByokCredentials ? "byok" : isUserSpace && userEngine.lockedByVault ? "vault-high-risk" : "wallet"
            }
          >
            <BoxLockedOverlay
              moduleName={manifest?.sourceModule ?? moduleIdResolved}
              reason={
                missingByokCredentials
                  ? `Integración ${
                      byokService === "google-ads" ? "Google Ads / Shopping" : "MercadoLibre"
                    } requiere credenciales BYOK en Perfil.`
                  : isUserSpace && userEngine.lockedByVault
                    ? "Motor de usuario (riesgo alto): vincula una API Key válida en Vault / Perfil antes de ejecutar."
                    : "Saldo de Chispas agotado (Financial Bunker). Las acciones de IA permanecen bloqueadas hasta recargar."
              }
            />
          </div>
        ) : showNoDataGhost ? (
          <DiscoveryBox boxId={boxId} reason="no-data" onHeal={onHeal} onReconnectData={onReconnectData} />
        ) : (
          <>
            {showProUpsellStrip ? (
              <JITUpsellBanner boxId={boxId} onUnlock={() => setIsPremium(true)} />
            ) : null}
            <BoxErrorBoundary
              key={healNonce}
              renderFallback={({ error, httpStatus }) => (
                <DiscoveryBox
                  boxId={boxId}
                  reason="render"
                  message={error.message}
                  httpStatus={httpStatus}
                  onHeal={onHeal}
                  onReconnectData={onReconnectData}
                />
              )}
              onRenderFailure={() => {
                if (circuitApplies) boxCircuitBreaker.recordFailure(boxId);
              }}
            >
              {mainContent()}
            </BoxErrorBoundary>
          </>
        )}
      </motion.div>
    </motion.section>
  );
}

/** Orquestación / tests: `true` si `boxId` no está en `BOX_CATALOG` (misma lógica que `data-fifer-catalog-gap`). */
export function detectBoxCatalogGap(boxId: string): boolean {
  return !isBoxRegisteredInCatalog(boxId);
}

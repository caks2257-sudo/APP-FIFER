import type { IFiferBoxManifest } from "../types/fifer-box";
import type { FiferNormalizedOutput } from "../types/fifer-engine";
import { BaseEngine } from "./BaseEngine";
import { withProfessionalContext } from "./content-engine-context";
import { FIFER_DEFAULT_USER_DNA } from "./user-dna-defaults";

/** Azul Contenido (`_xray_v0_local.md` / styleguide bioma). */
export const FIFER_CONTENT_ACCENT = "#1E3A5F" as const;
export const FIFER_CONTENT_SECONDARY = "#2563EB" as const;

export type ContentEngineStage = "refine" | "execute" | "full";

export interface ContentEngineContext {
  /** Intención cruda del usuario (no enviar tal cual a modelos de pago — Ley de Doble Capa). */
  userIntent: string;
  /** `refine` solo Master Prompt; `execute` requiere `masterPrompt` previo o usa refinamiento interno; `full` ambas etapas. */
  stage?: ContentEngineStage;
  /** Etapa 2: prompt intermedio aprobado (referencia `fifer-content` orquestadores). */
  masterPrompt?: string;
  /** Datos de producto/campaña opcionales (shape libre). */
  productBrief?: Record<string, unknown>;
}

type ContentPipelineStage = "preflight" | "refinement" | "execution" | "done" | "error";

type ContentMeta = {
  pipeline: Array<{ stage: ContentPipelineStage; isRefining: boolean; at: string }>;
};

export interface ContentEngineNormalized {
  source: "content_engine";
  title: string;
  masterPrompt?: string;
  executionArtifacts: Array<{ type: "reel" | "post" | "carousel"; caption: string; hook?: string }>;
  dnaSnapshot: typeof FIFER_DEFAULT_USER_DNA;
}

export interface ContentBoxResponseContract {
  data: ContentEngineNormalized | null;
  config: {
    engineId: string;
    module: "content";
    stage: ContentPipelineStage;
    isRefining: boolean;
    generatedAt: string;
    /** Shell: tarea con ejecución Pro (Motor Pro) — banner upgrade en `BoxLoader`. */
    requiresProExecution?: boolean;
  };
  error: { message: string; code?: string } | null;
  manifest?: Partial<IFiferBoxManifest>;
}

function nowIso(): string {
  return new Date().toISOString();
}

function buildContentManifestFragment(): Partial<IFiferBoxManifest> {
  return {
    boxId: "content-pipeline-dual-stage",
    sourceModule: "content",
    targetSlot: "content-editor",
    layout: { minWidth: 6, minHeight: 2, isResizable: true },
    permissions: {
      requiredRole: "user",
      requiresActiveSubscription: false,
    },
    dataDependencies: [
      {
        endpoint: "/api/v1/master/ai/proxy",
        requiresBYOK: true,
        method: "POST",
      },
    ],
    fallbackStrategy: "ghost",
    themeOverrides: {
      primary: FIFER_CONTENT_ACCENT,
      accent: FIFER_CONTENT_SECONDARY,
      border: `${FIFER_CONTENT_SECONDARY}33`,
    },
  };
}

/** Etapa de refinamiento sin el bloque User DNA (se antepone vía `withProfessionalContext`). */
function buildCoreRefinementPrompt(intent: string): string {
  const dna = FIFER_DEFAULT_USER_DNA;
  return [
    `[FIFER · Refinement · Stage 1]`,
    `Operator: ${dna.identityName} (${dna.roles.join(" · ")}).`,
    `Territory / trust: ${dna.territory} — ${dna.pillars.join(" · ")}.`,
    `Locale: ${dna.locale}.`,
    `User intent (raw): ${intent.trim()}`,
    `Produce a structured Master Prompt for editorial execution (Instagram / short-form).`,
    `Output: bullet objectives, tone (ejecutivo, español Chile), compliance guardrails, no API keys.`,
  ].join("\n");
}

function buildRefinementMasterPrompt(intent: string): string {
  return withProfessionalContext(buildCoreRefinementPrompt(intent));
}

function buildExecutionArtifacts(master: string): ContentEngineNormalized["executionArtifacts"] {
  const seed = master.slice(0, 120).replace(/\s+/g, " ");
  return [
    { type: "post" as const, caption: `Post feed — ${seed}`, hook: "Awareness" },
    { type: "carousel" as const, caption: `Carrusel — ${seed}`, hook: "Consideración" },
    { type: "reel" as const, caption: `Reel corto — ${seed}`, hook: "Conversión suave" },
  ];
}

export class ContentEngine extends BaseEngine {
  public readonly engineId = "content-engine";

  /**
   * Dual-Stage + JIT manifest: emite `isRefining` y fragmentos de manifiesto antes del `execute` final
   * (hidratación incremental del slot en el Shell).
   */
  async executeWithProgress<
    TPayload = ContentEngineContext,
    R = FiferNormalizedOutput<ContentBoxResponseContract, ContentMeta>,
  >(
    payload: TPayload,
    onProgress: (step: {
      stage?: string;
      isRefining?: boolean;
      manifest?: Partial<IFiferBoxManifest>;
    }) => void
  ): Promise<R> {
    const input = payload as ContentEngineContext;
    const stage = input.stage ?? "full";

    if (stage === "full") {
      const base = buildContentManifestFragment();
      onProgress({ stage: "preflight", isRefining: false, manifest: base });
      const wider: Partial<IFiferBoxManifest> = {
        ...base,
        layout: {
          minWidth: Math.max(base.layout?.minWidth ?? 6, 8),
          minHeight: base.layout?.minHeight ?? 2,
          isResizable: base.layout?.isResizable ?? true,
        },
      };
      onProgress({ stage: "refinement", isRefining: true, manifest: wider });
      await Promise.resolve();
      onProgress({ stage: "execution", isRefining: false, manifest: base });
    } else if (stage === "refine") {
      onProgress({ stage: "refinement", isRefining: true, manifest: buildContentManifestFragment() });
    }

    return this.execute<TPayload, R>(payload);
  }

  async execute<
    T = ContentEngineContext,
    R = FiferNormalizedOutput<ContentBoxResponseContract, ContentMeta>,
  >(payload: T): Promise<R> {
    const input = payload as ContentEngineContext;
    const pipeline: ContentMeta["pipeline"] = [];
    const push = (stage: ContentPipelineStage, isRefining: boolean) =>
      pipeline.push({ stage, isRefining, at: nowIso() });

    const stage = input.stage ?? "full";
    this.log("info", "execute", { stage });

    push("preflight", false);

    if (!input.userIntent?.trim() && !input.masterPrompt?.trim()) {
      const err = this.toDiscoveryError("Se requiere `userIntent` o `masterPrompt`.", "CONTENT_REFINE_FAILED");
      push("error", false);
      return {
        engineId: this.engineId,
        status: "error",
        data: {
          data: null,
          config: {
            engineId: this.engineId,
            module: "content",
            stage: "error",
            isRefining: false,
            generatedAt: nowIso(),
          },
          error: { message: err.message, code: err.code },
          manifest: buildContentManifestFragment(),
        },
        errors: [err.message],
        meta: { pipeline },
        timestamp: nowIso(),
      } as R;
    }

    const manifest = buildContentManifestFragment();

    if (stage === "refine") {
      push("refinement", true);
      const masterPrompt = buildRefinementMasterPrompt(input.userIntent ?? input.masterPrompt ?? "");
      push("done", false);
      const normalized: ContentEngineNormalized = {
        source: "content_engine",
        title: "Dual-Stage · Refinement",
        masterPrompt,
        executionArtifacts: [],
        dnaSnapshot: FIFER_DEFAULT_USER_DNA,
      };
      return {
        engineId: this.engineId,
        status: "success",
        data: {
          data: normalized,
          config: {
            engineId: this.engineId,
            module: "content",
            stage: "done",
            isRefining: true,
            generatedAt: nowIso(),
            requiresProExecution: false,
          },
          error: null,
          manifest,
        },
        meta: { pipeline },
        timestamp: nowIso(),
      } as R;
    }

    if (stage === "execute") {
      push("execution", false);
      const master = withProfessionalContext(
        (input.masterPrompt ?? buildCoreRefinementPrompt(input.userIntent ?? "")).trim()
      );
      if (!master) {
        const err = this.toDiscoveryError("Master Prompt vacío para ejecución.", "CONTENT_EXEC_FAILED");
        push("error", false);
        return {
          engineId: this.engineId,
          status: "error",
          data: {
            data: null,
            config: {
              engineId: this.engineId,
              module: "content",
              stage: "error",
              isRefining: false,
              generatedAt: nowIso(),
            },
            error: { message: err.message, code: err.code },
            manifest,
          },
          errors: [err.message],
          meta: { pipeline },
          timestamp: nowIso(),
        } as R;
      }
      const artifacts = buildExecutionArtifacts(master);
      push("done", false);
      const normalized: ContentEngineNormalized = {
        source: "content_engine",
        title: "Dual-Stage · Execution",
        masterPrompt: master,
        executionArtifacts: artifacts,
        dnaSnapshot: FIFER_DEFAULT_USER_DNA,
      };
      return {
        engineId: this.engineId,
        status: "success",
        data: {
          data: normalized,
          config: {
            engineId: this.engineId,
            module: "content",
            stage: "done",
            isRefining: false,
            generatedAt: nowIso(),
            requiresProExecution: true,
          },
          error: null,
          manifest,
        },
        meta: { pipeline },
        timestamp: nowIso(),
      } as R;
    }

    // full
    push("refinement", true);
    const masterPrompt = buildRefinementMasterPrompt(input.userIntent ?? "");
    push("execution", false);
    const artifacts = buildExecutionArtifacts(masterPrompt);
    push("done", false);

    const normalized: ContentEngineNormalized = {
      source: "content_engine",
      title: "Dual-Stage · Full pipeline",
      masterPrompt,
      executionArtifacts: artifacts,
      dnaSnapshot: FIFER_DEFAULT_USER_DNA,
    };

    return {
      engineId: this.engineId,
      status: "success",
      data: {
        data: normalized,
        config: {
          engineId: this.engineId,
          module: "content",
          stage: "done",
          isRefining: false,
          generatedAt: nowIso(),
          requiresProExecution: true,
        },
        error: null,
        manifest,
      },
      meta: { pipeline },
      timestamp: nowIso(),
    } as R;
  }
}

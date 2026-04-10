/**
 * Fifer AI Director — ruteo de modelos por complejidad de tarea + Financial Bunker (Chispas).
 * Dual-Stage Pipeline: Etapa 1 (refinamiento gratis, Gemini Flash) → Etapa 2 opcional (Pro/BYOK, modelo HIGH).
 * No ejecuta llamadas HTTP a proveedores en este módulo; expone `route` y mocks para quien invoque la API.
 *
 * **Dual-Memory Controller (Paso 2):** memoria conductual = solo ADN **destilado** (Resumen Ejecutivo) para UI/estrategia;
 * memoria transaccional = histórico completo de mocks financieros **solo** si el usuario invoca `/roi`, `/uf` o `/finanzas`.
 */
import { dispatchFiferAlert } from "@/store/useAlertStore";
import { useFinanceStore } from "@/store/useFinanceStore";
import { useUserStore } from "@/store/useUserStore";

export type TaskComplexity = "LOW" | "MEDIUM" | "HIGH";

export type AIProviderId = "google" | "anthropic" | "openai";

/** Mensaje fijo cuando `walletBalance` < costo del nivel (producto / UX). */
export const AI_DIRECTOR_INSUFFICIENT_FUNDS = "Saldo Insuficiente" as const;

/** Ruta lógica de modelo (IDs alineables con env / BYOK). */
export interface AIModelRoute {
  complexity: TaskComplexity;
  provider: AIProviderId;
  /** Identificador estable para prompts y billing. */
  modelId: string;
  displayName: string;
  /** Costo en Chispas por invocación (Financial Bunker). */
  chispasPerCall: number;
}

/**
 * Tabla de ruteo: LOW = formato/etiquetas, MEDIUM = análisis/resúmenes, HIGH = creativo/complejo.
 * Ajustar `chispasPerCall` según política de producto.
 */
export const AI_DIRECTOR_ROUTES: Record<TaskComplexity, AIModelRoute> = {
  LOW: {
    complexity: "LOW",
    provider: "google",
    modelId: "gemini-2.0-flash",
    displayName: "Gemini Flash",
    chispasPerCall: 1,
  },
  MEDIUM: {
    complexity: "MEDIUM",
    provider: "openai",
    modelId: "gpt-4o-mini",
    displayName: "GPT-4o mini",
    chispasPerCall: 3,
  },
  HIGH: {
    complexity: "HIGH",
    provider: "anthropic",
    modelId: "claude-3-5-sonnet-20241022",
    displayName: "Claude 3.5 Sonnet",
    chispasPerCall: 8,
  },
};

export class InsufficientBalanceError extends Error {
  override readonly name = "InsufficientBalanceError";

  constructor(
    public readonly route: AIModelRoute,
    public readonly walletBalance: number,
    public readonly requiredChispas: number
  ) {
    super(AI_DIRECTOR_INSUFFICIENT_FUNDS);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Orquestador principal: consulta `useFinanceStore` y devuelve la ruta del modelo.
 * @throws {InsufficientBalanceError} si no hay Chispas suficientes (`message` = "Saldo Insuficiente").
 */
export function getModelRouteForTask(complexity: TaskComplexity): AIModelRoute {
  const route = AI_DIRECTOR_ROUTES[complexity];
  const { walletBalance } = useFinanceStore.getState();
  if (walletBalance < route.chispasPerCall) {
    throw new InsufficientBalanceError(route, walletBalance, route.chispasPerCall);
  }
  return route;
}

/** Alias del orquestador con validación financiera (misma semántica que `getModelRouteForTask`). */
export const resolveModelForTask = getModelRouteForTask;

/** Consulta solo lectura al Financial Bunker (sin debitar). */
export function getFinanceSnapshotForAIDirector(): {
  walletBalance: number;
  isAiBlocked: boolean;
} {
  const s = useFinanceStore.getState();
  return {
    walletBalance: s.walletBalance,
    isAiBlocked: s.isAiBlocked(),
  };
}

/** True si hay Chispas suficientes para el costo del nivel (sin mutar saldo). */
export function canAffordComplexity(complexity: TaskComplexity): boolean {
  const route = AI_DIRECTOR_ROUTES[complexity];
  const { walletBalance } = useFinanceStore.getState();
  return walletBalance >= route.chispasPerCall;
}

export interface AIDirectorPreflight {
  ok: boolean;
  route: AIModelRoute;
  walletBalance: number;
  requiredChispas: number;
}

/**
 * Paso previo a disparar la petición: valida saldo vs modelo seleccionado.
 * Usar antes de `fetch` / SDK; el débito se hace con `debitChispasForAIDirector` o `runWithAIDirector`.
 */
export function preflightAIDirector(complexity: TaskComplexity): AIDirectorPreflight {
  const route = AI_DIRECTOR_ROUTES[complexity];
  const walletBalance = useFinanceStore.getState().walletBalance;
  const requiredChispas = route.chispasPerCall;
  return {
    ok: walletBalance >= requiredChispas,
    route,
    walletBalance,
    requiredChispas,
  };
}

export interface AIDirectorDebitMeta {
  boxId?: string;
  moduleId?: string;
}

/**
 * Registra el gasto en el ledger tras validar saldo (misma semántica que `spendSpark`).
 */
export function debitChispasForAIDirector(
  complexity: TaskComplexity,
  meta?: AIDirectorDebitMeta
): { ok: true; route: AIModelRoute } | { ok: false; route: AIModelRoute; walletBalance: number; requiredChispas: number } {
  const route = AI_DIRECTOR_ROUTES[complexity];
  const desc = `AI Director · ${complexity} · ${route.modelId}`;
  const spent = useFinanceStore.getState().spendSpark(route.chispasPerCall, desc, meta);
  if (!spent) {
    return {
      ok: false,
      route,
      walletBalance: useFinanceStore.getState().walletBalance,
      requiredChispas: route.chispasPerCall,
    };
  }
  return { ok: true, route };
}

export type AIDirectorRunFailureReason = "insufficient_funds";

export type AIDirectorRunResult<T> =
  | { ok: true; data: T; route: AIModelRoute }
  | {
      ok: false;
      reason: AIDirectorRunFailureReason;
      route: AIModelRoute;
      walletBalance: number;
      requiredChispas: number;
    };

/**
 * Orquesta: preflight → débito de Chispas → ejecuta `runner` con el `route` resuelto.
 * El runner debe contener la llamada real al proveedor (o mock).
 */
export async function runWithAIDirector<T>(
  complexity: TaskComplexity,
  runner: (ctx: { route: AIModelRoute }) => Promise<T>,
  meta?: AIDirectorDebitMeta
): Promise<AIDirectorRunResult<T>> {
  const debit = debitChispasForAIDirector(complexity, meta);
  if (!debit.ok) {
    return {
      ok: false,
      reason: "insufficient_funds",
      route: debit.route,
      walletBalance: debit.walletBalance,
      requiredChispas: debit.requiredChispas,
    };
  }

  const data = await runner({ route: debit.route });
  return { ok: true, data, route: debit.route };
}

// ——— Dual-Stage Pipeline (Fifer) ———

/** System prompt fijo para Etapa 1 (refinamiento, modelo LOW / Gemini Flash). */
export const DUAL_STAGE_REFINEMENT_SYSTEM_PROMPT =
  "Eres un experto Prompt Engineer. Tu objetivo es convertir la idea del usuario en una instrucción técnica detallada para crear una campaña de marketing de alto nivel.";

/**
 * Dual-Memory Controller · instrucción de sistema fija (estratega, no cronista).
 */
export const FIFER_STRATEGIST_SYSTEM_INSTRUCTION =
  "FIFER: Eres un estratega. Usa el DNA para conocer los gustos de Cristobal Kupfer (Arquitectura, ABKupfer), pero no repitas el pasado. Actúa sobre el presente.";

/**
 * @deprecated Usar `FIFER_STRATEGIST_SYSTEM_INSTRUCTION`.
 */
export const USER_DNA_COGNITIVE_BIAS_INSTRUCTION = FIFER_STRATEGIST_SYSTEM_INSTRUCTION;

/** Máximo de palabras para la memoria conductual (Resumen Ejecutivo del ADN). */
export const BEHAVIORAL_DNA_MAX_WORDS = 500;

const DEFAULT_USER_DNA_FALLBACK = `# User DNA (fallback)
Rol: gestión inmobiliaria / obra (Chicureo) + canal ABKupfer.
Coloca el archivo completo en src/modules/user/_xray_USER_DNA.md para personalización.`;

/**
 * Comandos que desbloquean **memoria transaccional**: histórico completo de mocks financieros (`useFinanceStore`).
 * `/uf` = contexto de unidad de fomento / tipo de consulta financiera en el producto.
 */
const TRANSACTIONAL_MEMORY_CMD = /\/(roi|uf|finanzas)\b/i;

/** True si el mensaje pide modo detallista con ledger completo. */
export function isTransactionalMemoryCommand(userInstruction: string): boolean {
  return TRANSACTIONAL_MEMORY_CMD.test(userInstruction.trim());
}

/** @deprecated Preferir `isTransactionalMemoryCommand`. */
export function isFinancialMemoryCommand(userInstruction: string): boolean {
  return isTransactionalMemoryCommand(userInstruction);
}

export function truncateToMaxWords(text: string, maxWords: number): string {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= maxWords) return parts.join(" ");
  return parts.slice(0, maxWords).join(" ") + " …";
}

/**
 * Extrae el bloque bajo `## Resumen ejecutivo` hasta el siguiente `##` (o fin de archivo).
 */
export function extractResumenEjecutivoFromDnaMarkdown(fullMd: string): string {
  const m = fullMd.match(/^##\s*Resumen ejecutivo[^\n]*\r?\n([\s\S]*?)(?=^##\s)/m);
  if (m?.[1]) return m[1].trim();
  const m2 = fullMd.match(/^##\s*Resumen ejecutivo[^\n]*\r?\n([\s\S]*)$/m);
  return m2?.[1]?.trim() ?? "";
}

async function loadRawUserDnaFile(): Promise<string> {
  let fileDna = "";
  if (typeof window === "undefined") {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const candidates = [
        path.resolve(process.cwd(), "..", "src", "modules", "user", "_xray_USER_DNA.md"),
        path.resolve(process.cwd(), "src", "modules", "user", "_xray_USER_DNA.md"),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          fileDna = fs.readFileSync(p, "utf8");
          break;
        }
      }
    } catch {
      /* noop */
    }
  } else {
    try {
      const res = await fetch("/api/user-dna", { cache: "no-store" });
      if (res.ok) fileDna = await res.text();
    } catch {
      /* noop */
    }
  }
  if (!fileDna.trim()) {
    fileDna = DEFAULT_USER_DNA_FALLBACK;
  }
  return fileDna;
}

/**
 * Memoria conductual (resumida): solo **Resumen Ejecutivo** del ADN = versión destilada para UI y estrategia.
 * Recortado a `BEHAVIORAL_DNA_MAX_WORDS` palabras. No inyecta el archivo completo ni pepitas.
 */
export async function loadBehavioralDnaForPrompt(): Promise<string> {
  return loadDistilledBehavioralDnaForPrompt();
}

/**
 * Alias explícito: ADN **destilado** (mismo criterio que `loadBehavioralDnaForPrompt`).
 */
export async function loadDistilledBehavioralDnaForPrompt(): Promise<string> {
  const full = await loadRawUserDnaFile();
  let block = extractResumenEjecutivoFromDnaMarkdown(full);
  if (!block.trim()) {
    block = full.replace(/^#\s+[^\n]+\n+/, "").slice(0, 4000);
  }
  return truncateToMaxWords(block, BEHAVIORAL_DNA_MAX_WORDS);
}

/**
 * Memoria transaccional (detallista): histórico completo del mock financiero (`useFinanceStore`).
 * Solo inyectar si `isTransactionalMemoryCommand` es true.
 */
export function buildFinancialLedgerSnapshotForPrompt(): string {
  const { walletBalance, transactions } = useFinanceStore.getState();
  const header = `Saldo actual: ${walletBalance} Chispas (unidad virtual).`;
  if (!transactions.length) {
    return `${header}\n\nNo hay movimientos en el histórico local.`;
  }
  const lines = transactions.map((tx) => {
    const when = new Date(tx.createdAt).toISOString();
    const sign = tx.amount > 0 ? "+" : "";
    const meta =
      tx.meta?.moduleId || tx.meta?.boxId
        ? ` meta:${[tx.meta.moduleId, tx.meta.boxId].filter(Boolean).join(",")}`
        : "";
    return `${when} | ${sign}${tx.amount} | ${tx.description} | ${tx.id}${meta}`;
  });
  return [
    header,
    "",
    `Histórico completo de transacciones (${transactions.length} movimientos, más reciente primero):`,
    ...lines,
  ].join("\n");
}

/**
 * Ensambla el system prompt de Etapa 1 con Dual-Memory Controller.
 */
export function buildStage1SystemPromptWithDualMemory(
  behavioralExecutiveBlock: string,
  financialLedgerBlock?: string
): string {
  const parts = [
    DUAL_STAGE_REFINEMENT_SYSTEM_PROMPT,
    "",
    FIFER_STRATEGIST_SYSTEM_INSTRUCTION,
    "",
    "--- Behavioral memory (ADN destilado — Resumen Ejecutivo; UI y estrategia; máx. 500 palabras) ---",
    behavioralExecutiveBlock.trim() || "(Sin resumen ejecutivo extraído.)",
  ];
  if (financialLedgerBlock?.trim()) {
    parts.push(
      "",
      "--- Transactional memory (histórico completo de mocks financieros — solo con /roi, /uf o /finanzas) ---",
      financialLedgerBlock.trim()
    );
  }
  return parts.join("\n");
}

/**
 * @deprecated Usar `buildStage1SystemPromptWithDualMemory` + `loadBehavioralDnaForPrompt`.
 */
export function buildStage1SystemPromptWithDNA(userDnaText: string): string {
  return buildStage1SystemPromptWithDualMemory(truncateToMaxWords(userDnaText, BEHAVIORAL_DNA_MAX_WORDS));
}

/**
 * Carga legacy: equivalente a memoria conductual (ya no adjunta ADN completo ni pepitas).
 * @deprecated Usar `loadBehavioralDnaForPrompt`.
 */
export async function loadUserDNAForPrompt(): Promise<string> {
  return loadBehavioralDnaForPrompt();
}

/**
 * Listo para llamadas HTTP a Etapa 1 (Gemini Flash u otro): system con Dual-Memory + user = instrucción.
 */
export async function prepareStage1PromptForFreeModel(
  userInstruction: string
): Promise<{ system: string; user: string }> {
  const behavioral = await loadDistilledBehavioralDnaForPrompt();
  const financial = isTransactionalMemoryCommand(userInstruction)
    ? buildFinancialLedgerSnapshotForPrompt()
    : "";
  const system = buildStage1SystemPromptWithDualMemory(behavioral, financial || undefined);
  return { system, user: userInstruction.trim() };
}

// ——— Aprendizaje pasivo (pepitas → useUserStore) ———

export type DNAInteractionPayload = {
  userMessage?: string;
  assistantMessage?: string;
  /** Resumen explícito (si existe, tiene prioridad como pepita). */
  summary?: string;
  moduleId?: string;
  boxId?: string;
};

/** Extrae una línea compacta para el ADN a partir del turno de conversación. */
export function extractKnowledgeNugget(interaction: DNAInteractionPayload): string | null {
  const s = interaction.summary?.trim();
  if (s) return s.slice(0, 400);
  const a = interaction.assistantMessage?.trim();
  if (a) {
    const first = a.split(/\n+/).find((l) => l.trim().length > 0);
    if (first) return first.trim().slice(0, 400);
  }
  const u = interaction.userMessage?.trim();
  if (u && u.length > 16) return `Preferencia o tema: ${u.slice(0, 220)}`;
  return null;
}

/**
 * Tras una conversación exitosa, guarda una pepita en el ADN persistido (localStorage)
 * para inyectarla en futuras llamadas (las pepitas no van al system prompt por defecto; Dual-Memory usa solo Resumen Ejecutivo).
 */
export function updateDNA(interaction: DNAInteractionPayload): string | null {
  const nugget = extractKnowledgeNugget(interaction);
  if (!nugget) return null;
  useUserStore.getState().appendDnaNugget(nugget);
  return nugget;
}

/** Dev: registra una interacción hacia el contador del Conserje (cada N turnos limpia el ADN en disco). */
export function pingDnaJanitorTick(): void {
  if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
    fetch("/api/dev/dna-janitor", { method: "POST" }).catch(() => {});
  }
}

/** Texto de feedback UI · Etapa 1. */
export const DUAL_STAGE_UI_REFINING = "Refinando idea...";

/** Texto de feedback UI · Etapa 2 (Pro / BYOK). */
export const DUAL_STAGE_UI_EXECUTING_PRO = "Ejecutando con motor Pro...";

export const DUAL_STAGE_STAGE_EVENT = "fifer-ai-director-stage" as const;

export interface DualStageStageDetail {
  stage: 1 | 2;
  message: string;
}

/** True si debe ejecutarse Etapa 2 (modelo de pago) según `useUserStore`. */
export function shouldRunDualStageExecution(): boolean {
  const { isPremium, hasCustomKey } = useUserStore.getState();
  return Boolean(isPremium || hasCustomKey);
}

export interface DualStageChatPipelineOptions {
  meta?: AIDirectorDebitMeta;
  /** Callback por etapa (además de alertas + CustomEvent en cliente). */
  onStageFeedback?: (payload: DualStageStageDetail) => void;
  /** Si false, no llama a `dispatchFiferAlert` (sí emite callback + evento DOM). */
  emitAlerts?: boolean;
}

export type DualStageChatPipelineResult =
  | { ok: true; tier: "free"; refinedPrompt: string; finalOutput: string }
  | {
      ok: true;
      tier: "pro";
      refinedPrompt: string;
      finalOutput: string;
      executionRoute: AIModelRoute;
    }
  | {
      ok: false;
      reason: "insufficient_funds";
      refinedPrompt: string;
      route: AIModelRoute;
      walletBalance: number;
      requiredChispas: number;
    }
  | { ok: false; reason: "empty_instruction" };

function emitDualStageFeedback(
  stage: 1 | 2,
  options?: DualStageChatPipelineOptions
): void {
  const message = stage === 1 ? DUAL_STAGE_UI_REFINING : DUAL_STAGE_UI_EXECUTING_PRO;
  options?.onStageFeedback?.({ stage, message });

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<DualStageStageDetail>(DUAL_STAGE_STAGE_EVENT, {
        detail: { stage, message },
      })
    );
  }

  if (options?.emitAlerts === false) return;

  dispatchFiferAlert({
    level: "INFO",
    title: message,
    body:
      stage === 1
        ? "Etapa 1 · refinamiento con Gemini Flash."
        : "Etapa 2 · generación final con modelo Pro.",
  });
}

/**
 * Mock de refinamiento (Etapa 1). Antes de una llamada real a Gemini Flash, usar `prepareStage1PromptForFreeModel` o
 * `buildStage1SystemPromptWithDualMemory` + `loadBehavioralDnaForPrompt`. Etapa 1 no debita Chispas (API gratuita).
 */
export async function mockDualStageRefinement(userInstruction: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 320));
  const behavioral = await loadDistilledBehavioralDnaForPrompt();
  const financial = isTransactionalMemoryCommand(userInstruction)
    ? buildFinancialLedgerSnapshotForPrompt()
    : "";
  const system = buildStage1SystemPromptWithDualMemory(behavioral, financial || undefined);
  const brief = userInstruction.trim();
  return [
    "[Instrucción técnica · campaña de marketing · Etapa 1 con User DNA inyectado]",
    "",
    "Objetivo: traducir el brief en entregables accionables (canales, mensajes, KPIs), sesgado al perfil del DNA.",
    "",
    "--- System (vista previa, primeros 600 caracteres) ---",
    system.slice(0, 600) + (system.length > 600 ? "…" : ""),
    "",
    `Brief del usuario: ${brief}`,
  ].join("\n");
}

/**
 * Mock de ejecución (Etapa 2). Sustituir por llamada real al proveedor del `route` (Claude / GPT-4).
 */
export async function mockDualStageExecution(
  refinedPrompt: string,
  route: AIModelRoute
): Promise<string> {
  await new Promise((r) => setTimeout(r, 420));
  return [
    `[Salida generada · ${route.displayName}]`,
    "",
    refinedPrompt.slice(0, 400) + (refinedPrompt.length > 400 ? "…" : ""),
  ].join("\n");
}

/**
 * Pipeline dual: siempre Etapa 1 (gratis); Etapa 2 solo si `isPremium || hasCustomKey` y saldo HIGH.
 * FREE: `finalOutput` = salida de Etapa 1.
 */
export async function runDualStageChatPipeline(
  userInstruction: string,
  options?: DualStageChatPipelineOptions
): Promise<DualStageChatPipelineResult> {
  const trimmed = userInstruction.trim();
  if (!trimmed) {
    return { ok: false, reason: "empty_instruction" };
  }

  emitDualStageFeedback(1, options);

  const refinedPrompt = await mockDualStageRefinement(trimmed);

  if (!shouldRunDualStageExecution()) {
    const finalOutput = refinedPrompt;
    updateDNA({
      userMessage: trimmed,
      assistantMessage: finalOutput,
      moduleId: options?.meta?.moduleId,
      boxId: options?.meta?.boxId,
    });
    pingDnaJanitorTick();
    return {
      ok: true,
      tier: "free",
      refinedPrompt,
      finalOutput,
    };
  }

  emitDualStageFeedback(2, options);

  const debit = debitChispasForAIDirector("HIGH", options?.meta);
  if (!debit.ok) {
    return {
      ok: false,
      reason: "insufficient_funds",
      refinedPrompt,
      route: debit.route,
      walletBalance: debit.walletBalance,
      requiredChispas: debit.requiredChispas,
    };
  }

  const finalOutput = await mockDualStageExecution(refinedPrompt, debit.route);

  updateDNA({
    userMessage: trimmed,
    assistantMessage: finalOutput,
    moduleId: options?.meta?.moduleId,
    boxId: options?.meta?.boxId,
  });
  pingDnaJanitorTick();

  return {
    ok: true,
    tier: "pro",
    refinedPrompt,
    finalOutput,
    executionRoute: debit.route,
  };
}

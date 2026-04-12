'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Loader2, RefreshCw, Send } from 'lucide-react';

import BoxErrorBoundary from '@/components/core/BoxErrorBoundary';
import type { V0BoxProps } from '@/components/v0-ingestion/box-types';
import type { HealthEndpointSnapshot } from '@/types/system-health-ui';
import { boxCircuitBreaker } from '@/utils/box-circuit-breaker';

import { AodsTelemetryLog, type AodsLogEvent } from './AodsTelemetryLog';
import { ManualHandoffModal, type ManualHandoffKind } from './ManualHandoffModal';

/** Debe coincidir con `registerBoxCircuit` en `box-circuit-breaker.ts`. */
const BOX_CIRCUIT_ID = 'fifer-aods-orchestrator' as const;

const INIT_PATH = '/api/v1/ai-orchestrator/init';
const IDEATE_PATH = '/api/v1/ai-orchestrator/ideate';
const ANALYZE_PATH = '/api/v1/ai-orchestrator/analyze';
const ACTIVATE_PATH = '/api/v1/ai-orchestrator/activate';
const UPDATE_PATH = '/api/v1/ai-orchestrator/update';
const DEPLOY_PATH = '/api/v1/ai-orchestrator/deploy';

const HEALTH_EXTERNAL_URL = '/api/v1/system-health?scope=external';
const HEALTH_ENGINES_URL = '/api/v1/system-health?scope=engines';
const BRIDGE_STATUS_URL = '/api/v1/external-bridge/status';

type OrchestratorPhase =
  | 'PHASE_MINUS_1_IDEATION'
  | 'PHASE_1_WAITING_NOTEBOOK'
  | 'PHASE_3_READY_FOR_ACTIVATOR'
  | 'PHASE_4_LOOP_READY'
  | 'PHASE_9_READY_TO_DEPLOY';

type IdeationChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type BridgeIntegrationRow = {
  envKey: string;
  mode: 'MOCK' | 'PROD';
  label?: string;
};

type AodsApiTelemetry = {
  openai: { tier: 'LIVE' | 'MOCK' | 'NEEDS_KEY'; latencyMs: number | null };
  google: { tier: 'LIVE' | 'MOCK' | 'NEEDS_KEY'; latencyMs: number | null };
  anthropic: { tier: 'LIVE' | 'MOCK' | 'NEEDS_KEY'; latencyMs: number | null };
  vercel: { tier: 'LIVE' | 'MOCK' | 'NEEDS_KEY'; latencyMs: number | null };
  supabase: { tier: 'LIVE' | 'MOCK' | 'NEEDS_KEY'; latencyMs: number | null };
};

function snapshotToTier(s: HealthEndpointSnapshot | undefined): 'LIVE' | 'MOCK' | 'NEEDS_KEY' {
  if (!s) return 'MOCK';
  if (s.credentialStatus === 'missing_key') return 'NEEDS_KEY';
  if (s.invalidKey || s.credentialStatus === 'invalid_key') return 'MOCK';
  if (s.pulse === 'down') return 'MOCK';
  return 'LIVE';
}

function pickAnthropicFromBridge(rows: BridgeIntegrationRow[] | undefined): {
  tier: 'LIVE' | 'MOCK';
  latencyMs: number | null;
} {
  const row = rows?.find(
    (r) =>
      r.envKey === 'ANTHROPIC_API_KEY' ||
      r.label?.toLowerCase().includes('anthropic'),
  );
  if (!row) return { tier: 'MOCK', latencyMs: null };
  return {
    tier: row.mode === 'PROD' ? 'LIVE' : 'MOCK',
    latencyMs: null,
  };
}

async function readApiError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string; detail?: string };
    if (data.detail) return `${data.error ?? 'Error'} (${data.detail})`;
    if (data.error) return data.error;
  } catch {
    /* ignore */
  }
  return `HTTP ${res.status}`;
}

function nowTime(): string {
  return new Date().toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function buildConsolidatedPlanMaestro(history: IdeationChatMessage[]): string {
  const parts = history.map(
    (m) => `[${m.role.toUpperCase()}]: ${m.content.trim()}`,
  );
  return `Plan Maestro consolidado (ideación Fase -1 → protocolo Fase 0):\n\n${parts.join('\n\n')}`;
}

function StatusBadge({ tier }: { tier: 'LIVE' | 'MOCK' | 'NEEDS_KEY' }) {
  if (tier === 'LIVE') {
    return (
      <span
        className="inline-flex shrink-0 rounded-md border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-400"
        title="Llave o sonda activa"
      >
        LIVE
      </span>
    );
  }
  if (tier === 'NEEDS_KEY') {
    return (
      <span
        className="inline-flex shrink-0 rounded-md border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300"
        title="Falta declarar o guardar la credencial en .env / Sala de Guerra (no es MOCK)"
      >
        KEY
      </span>
    );
  }
  return (
    <span
      className="inline-flex shrink-0 rounded-md border border-slate-600/40 bg-slate-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400"
      title="MOCK o sin llave efectiva"
    >
      MOCK
    </span>
  );
}

function ManualBadge() {
  return (
    <span
      className="inline-flex shrink-0 rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-300"
      title="Herramienta local o externa no sondable por HTTP desde este panel"
    >
      MANUAL
    </span>
  );
}

type ApiStatusGridProps = {
  telemetry: AodsApiTelemetry | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  refreshing: boolean;
};

function ApiStatusGrid({
  telemetry,
  loading,
  error,
  onRefresh,
  refreshing,
}: ApiStatusGridProps) {
  type CardRow =
    | {
        id: string;
        title: string;
        subtitle: string;
        kind: 'ping';
        tier: 'LIVE' | 'MOCK' | 'NEEDS_KEY';
        latencyMs: number | null;
      }
    | {
        id: string;
        title: string;
        subtitle: string;
        kind: 'manual';
      };

  const cards: CardRow[] = telemetry
    ? [
        {
          id: 'openai',
          title: 'OpenAI',
          subtitle: 'Estrategia',
          kind: 'ping',
          tier: telemetry.openai.tier,
          latencyMs: telemetry.openai.latencyMs,
        },
        {
          id: 'google',
          title: 'Google AI',
          subtitle: 'Ejecución Gemini',
          kind: 'ping',
          tier: telemetry.google.tier,
          latencyMs: telemetry.google.latencyMs,
        },
        {
          id: 'anthropic',
          title: 'Anthropic',
          subtitle: 'Análisis profundo',
          kind: 'ping',
          tier: telemetry.anthropic.tier,
          latencyMs: telemetry.anthropic.latencyMs,
        },
        {
          id: 'vercel',
          title: 'Vercel',
          subtitle: 'Despliegue',
          kind: 'ping',
          tier: telemetry.vercel.tier,
          latencyMs: telemetry.vercel.latencyMs,
        },
        {
          id: 'supabase',
          title: 'Supabase',
          subtitle: 'Base de datos',
          kind: 'ping',
          tier: telemetry.supabase.tier,
          latencyMs: telemetry.supabase.latencyMs,
        },
        {
          id: 'cursor',
          title: 'Cursor AI',
          subtitle: 'IDE local',
          kind: 'manual',
        },
        {
          id: 'notebooklm',
          title: 'NotebookLM',
          subtitle: 'Memoria',
          kind: 'manual',
        },
        {
          id: 'v0',
          title: 'v0.dev',
          subtitle: 'Generación UI',
          kind: 'manual',
        },
      ]
    : [];

  return (
    <section
      className="w-full rounded-lg border border-white/[0.06] bg-[#070b14]/80 p-4 ring-1 ring-slate-800/30"
      aria-label="Telemetría de APIs AODS"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Conexiones (War Room)
          </h3>
          <p className="text-[11px] text-slate-500">
            Cursor / NotebookLM / v0: puentes manuales vía modal imperativo
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading || refreshing}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#EAB308]/25 bg-[#0A0F1E] px-2.5 py-1.5 text-[11px] font-medium text-[#EAB308] transition hover:bg-[#EAB308]/10 disabled:opacity-50"
        >
          {refreshing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          )}
          Refrescar ping
        </button>
      </div>

      {error ? (
        <p className="mb-2 text-[11px] text-amber-200/90" role="status">
          {error}
        </p>
      ) : null}

      {loading && !telemetry ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-md border border-white/[0.04] bg-slate-800/40"
            />
          ))}
        </div>
      ) : null}

      {telemetry ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <div
              key={c.id}
              className="flex flex-col gap-2 rounded-md border border-white/[0.06] bg-[#0A0F1E] p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-100">{c.title}</p>
                  <p className="text-[10px] text-slate-500">{c.subtitle}</p>
                </div>
                {c.kind === 'ping' ? (
                  <StatusBadge tier={c.tier} />
                ) : (
                  <ManualBadge />
                )}
              </div>
              <p className="font-mono text-[11px] tabular-nums text-slate-400">
                {c.kind === 'ping'
                  ? c.latencyMs != null
                    ? `${Math.round(c.latencyMs)} ms`
                    : '—'
                  : 'N/A'}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

async function fetchAodsTelemetry(): Promise<{
  telemetry: AodsApiTelemetry;
  warnings: string[];
}> {
  const warnings: string[] = [];

  const [extRes, engRes, bridgeRes] = await Promise.all([
    fetch(HEALTH_EXTERNAL_URL, { credentials: 'same-origin', cache: 'no-store' }),
    fetch(HEALTH_ENGINES_URL, { credentials: 'same-origin', cache: 'no-store' }),
    fetch(BRIDGE_STATUS_URL, { credentials: 'same-origin', cache: 'no-store' }),
  ]);

  let openaiSnap: HealthEndpointSnapshot | undefined;
  let googleSnap: HealthEndpointSnapshot | undefined;
  let vercelSnap: HealthEndpointSnapshot | undefined;
  let supabaseSnap: HealthEndpointSnapshot | undefined;

  if (extRes.ok) {
    const extJson = (await extRes.json()) as {
      external?: {
        openai: HealthEndpointSnapshot;
        google: HealthEndpointSnapshot;
        vercel?: HealthEndpointSnapshot;
        supabase?: HealthEndpointSnapshot;
      };
    };
    openaiSnap = extJson.external?.openai;
    googleSnap = extJson.external?.google;
    vercelSnap = extJson.external?.vercel;
    supabaseSnap = extJson.external?.supabase;
  } else {
    warnings.push('No se pudo leer system-health (external).');
  }

  if (engRes.ok) {
    await engRes.json();
  } else {
    warnings.push('No se pudo leer system-health (engines).');
  }

  let bridgeRows: BridgeIntegrationRow[] | undefined;
  if (bridgeRes.ok) {
    const b = (await bridgeRes.json()) as { integrations?: BridgeIntegrationRow[] };
    bridgeRows = b.integrations;
  } else if (bridgeRes.status === 401) {
    warnings.push('Bridge: sin sesión; Anthropic en MOCK hasta login.');
  } else {
    warnings.push('No se pudo leer external-bridge/status.');
  }

  const anth = pickAnthropicFromBridge(bridgeRows);

  const telemetry: AodsApiTelemetry = {
    openai: {
      tier: snapshotToTier(openaiSnap),
      latencyMs: openaiSnap?.latencyMs ?? null,
    },
    google: {
      tier: snapshotToTier(googleSnap),
      latencyMs: googleSnap?.latencyMs ?? null,
    },
    anthropic: {
      tier: anth.tier,
      latencyMs: anth.latencyMs,
    },
    vercel: {
      tier: snapshotToTier(vercelSnap),
      latencyMs: vercelSnap?.latencyMs ?? null,
    },
    supabase: {
      tier: snapshotToTier(supabaseSnap),
      latencyMs: supabaseSnap?.latencyMs ?? null,
    },
  };

  return { telemetry, warnings };
}

function AiOrchestratorBoxInner() {
  const [phase, setPhase] = useState<OrchestratorPhase>('PHASE_MINUS_1_IDEATION');
  const prevPhaseRef = useRef<OrchestratorPhase>('PHASE_MINUS_1_IDEATION');

  const [sessionId, setSessionId] = useState<string | null>(null);

  const [chatHistory, setChatHistory] = useState<IdeationChatMessage[]>([]);
  const [ideationInput, setIdeationInput] = useState('');
  const ideationChatEndRef = useRef<HTMLDivElement>(null);

  const [planMaestro, setPlanMaestro] = useState('');
  const [notebookContext, setNotebookContext] = useState('');
  const [activatorPrompt, setActivatorPrompt] = useState('');
  const [progressReport, setProgressReport] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [updateCycleCount, setUpdateCycleCount] = useState(0);
  const [deployLoading, setDeployLoading] = useState(false);
  const [deploySuccess, setDeploySuccess] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [telemetry, setTelemetry] = useState<AodsApiTelemetry | null>(null);
  const [telemetryLoading, setTelemetryLoading] = useState(true);
  const [telemetryRefreshing, setTelemetryRefreshing] = useState(false);
  const [telemetryError, setTelemetryError] = useState<string | null>(null);

  const [logEvents, setLogEvents] = useState<AodsLogEvent[]>([]);
  const logId = useRef(0);

  const appendLog = useCallback((line: string) => {
    logId.current += 1;
    const id = `aods-${logId.current}-${Date.now()}`;
    const at = nowTime();
    setLogEvents((prev) => [...prev, { id, at, line }]);
  }, []);

  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualKind, setManualKind] = useState<ManualHandoffKind>('notebook');

  useEffect(() => {
    appendLog(
      'Fase -1 · Ideación: conversa con el arquitecto; al aprobar, se activa el protocolo (Fase 0).',
    );
  }, [appendLog]);

  useEffect(() => {
    ideationChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  useEffect(() => {
    const prev = prevPhaseRef.current;
    if (prev === phase) return;
    prevPhaseRef.current = phase;

    if (phase === 'PHASE_1_WAITING_NOTEBOOK') {
      setManualKind('notebook');
      setManualModalOpen(true);
      appendLog('Fase 1: se abre puente manual NotebookLM — pega el análisis y confirma «Entregado».');
    } else if (phase === 'PHASE_4_LOOP_READY' || phase === 'PHASE_9_READY_TO_DEPLOY') {
      setManualKind('cursor');
      setManualModalOpen(true);
      appendLog(
        phase === 'PHASE_9_READY_TO_DEPLOY'
          ? 'Fase 7/9: puente Cursor — pega el informe de progreso y confirma «Entregado».'
          : 'Fase 4: puente Cursor — copia el activador, trabaja en el IDE y entrega el informe.',
      );
    }
  }, [phase, appendLog]);

  const loadTelemetry = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setTelemetryRefreshing(true);
    else setTelemetryLoading(true);
    setTelemetryError(null);
    try {
      const { telemetry: t, warnings } = await fetchAodsTelemetry();
      setTelemetry(t);
      if (warnings.length) {
        setTelemetryError(warnings.join(' '));
      }
    } catch {
      setTelemetryError('No se pudo cargar la telemetría de APIs.');
      setTelemetry(null);
    } finally {
      setTelemetryLoading(false);
      setTelemetryRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadTelemetry(false);
  }, [loadTelemetry]);

  const handleSendIdeation = useCallback(async () => {
    const text = ideationInput.trim();
    if (!text || phase !== 'PHASE_MINUS_1_IDEATION') return;

    setIsLoading(true);
    setError(null);
    const userMsg: IdeationChatMessage = { role: 'user', content: text };
    const messagesForApi = [...chatHistory, userMsg];

    try {
      const res = await fetch(IDEATE_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesForApi.map((m) => ({ role: m.role, content: m.content })),
        }),
        credentials: 'same-origin',
      });

      if (!res.ok) {
        boxCircuitBreaker.recordFailure(BOX_CIRCUIT_ID);
        throw new Error(await readApiError(res));
      }
      boxCircuitBreaker.reset(BOX_CIRCUIT_ID);

      const data = (await res.json()) as { reply?: string; mock?: boolean };
      const reply = data.reply?.trim() ?? '';
      setChatHistory((prev) => [...prev, userMsg, { role: 'assistant', content: reply }]);
      setIdeationInput('');
      appendLog(
        `[Ideación] ${data.mock ? 'MOCK' : 'LIVE'} · hilo ${messagesForApi.length + 1} mensajes.`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error en ideación';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [ideationInput, chatHistory, phase, appendLog]);

  const handleApproveIdeaAndInit = useCallback(async () => {
    if (chatHistory.length < 2) return;

    const consolidated = buildConsolidatedPlanMaestro(chatHistory);
    if (consolidated.trim().length < 10) {
      setError('El plan consolidado es demasiado corto; continúa la ideación.');
      return;
    }

    setPlanMaestro(consolidated);
    setIsLoading(true);
    setError(null);
    appendLog('[AODS] «Aprobar Idea y Activar Protocolo» — POST /init (Fase 0 estricta).');

    try {
      const res = await fetch(INIT_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planMaestro: consolidated.trim(),
          chatHistory: chatHistory.map((m) => ({ role: m.role, content: m.content })),
        }),
        credentials: 'same-origin',
      });

      if (!res.ok) {
        boxCircuitBreaker.recordFailure(BOX_CIRCUIT_ID);
        throw new Error(await readApiError(res));
      }
      boxCircuitBreaker.reset(BOX_CIRCUIT_ID);

      const data = (await res.json()) as { sessionId?: string };
      if (!data.sessionId) {
        throw new Error('Respuesta sin sessionId.');
      }
      setSessionId(data.sessionId);
      setPhase('PHASE_1_WAITING_NOTEBOOK');
      appendLog(`[Fase 0] Sesión ${data.sessionId.slice(0, 8)}… persistida · motor en Fase 1 (NotebookLM).`);
      appendLog('[Protocolo] Plan Maestro consolidado inmutable en columna izquierda; telemetría War Room activa.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al inicializar la sesión';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [chatHistory, appendLog]);

  const handleAnalyzeNotebook = useCallback(async () => {
    if (!sessionId) {
      setError('Sesión no inicializada.');
      return;
    }
    if (!notebookContext.trim()) {
      setError('Pega el análisis de NotebookLM.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(ANALYZE_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          notebookContext: notebookContext.trim(),
        }),
        credentials: 'same-origin',
      });

      if (!res.ok) {
        boxCircuitBreaker.recordFailure(BOX_CIRCUIT_ID);
        throw new Error(await readApiError(res));
      }
      boxCircuitBreaker.reset(BOX_CIRCUIT_ID);

      setNotebookContext('');
      setPhase('PHASE_3_READY_FOR_ACTIVATOR');
      setManualModalOpen(false);
      appendLog('[NotebookLM] GEMINI_DOC procesado. Fase 3: genera el activador para Cursor.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al analizar el contexto';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, notebookContext, appendLog]);

  const handleGenerateActivator = useCallback(async () => {
    if (!sessionId) {
      setError('Sesión no inicializada.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(ACTIVATE_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
        credentials: 'same-origin',
      });

      if (!res.ok) {
        boxCircuitBreaker.recordFailure(BOX_CIRCUIT_ID);
        throw new Error(await readApiError(res));
      }
      boxCircuitBreaker.reset(BOX_CIRCUIT_ID);

      const data = (await res.json()) as { activatorPrompt?: string };
      if (!data.activatorPrompt) {
        throw new Error('Respuesta sin activatorPrompt.');
      }
      setActivatorPrompt(data.activatorPrompt);
      setUpdateSuccess(null);
      setProgressReport('');
      setUpdateCycleCount(0);
      setDeploySuccess(null);
      setPhase('PHASE_4_LOOP_READY');
      appendLog('[OpenAI] Prompt activador generado. Abriendo puente Cursor.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al generar el activador';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, appendLog]);

  const handleUpdateGeminiDoc = useCallback(async () => {
    if (!sessionId) {
      setError('Sesión no inicializada.');
      return;
    }
    if (!progressReport.trim()) {
      setError('Pega el informe de progreso desde Cursor.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setUpdateSuccess(null);
    try {
      const res = await fetch(UPDATE_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          progressReport: progressReport.trim(),
        }),
        credentials: 'same-origin',
      });

      if (!res.ok) {
        boxCircuitBreaker.recordFailure(BOX_CIRCUIT_ID);
        throw new Error(await readApiError(res));
      }
      boxCircuitBreaker.reset(BOX_CIRCUIT_ID);

      const data = (await res.json()) as { version?: number; message?: string };
      const v = data.version ?? 0;
      setUpdateSuccess(
        `Blueprint actualizado a v${v}. Listo para el siguiente paso.`,
      );
      setUpdateCycleCount((c) => c + 1);
      setProgressReport('');
      setPhase('PHASE_9_READY_TO_DEPLOY');
      setManualModalOpen(false);
      appendLog(`[Cursor] Fase 7 — POST /ai-orchestrator/update OK · blueprint v${v}.`);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error al actualizar el blueprint';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, progressReport, appendLog]);

  const handleDeploy = useCallback(async () => {
    if (!sessionId) {
      setError('Sesión no inicializada.');
      return;
    }
    if (updateCycleCount < 1) {
      setError('Registra al menos un informe de progreso (Fase 7) antes de desplegar.');
      return;
    }

    setDeployLoading(true);
    setDeploySuccess(null);
    setError(null);
    try {
      const res = await fetch(DEPLOY_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
        credentials: 'same-origin',
      });

      if (!res.ok) {
        boxCircuitBreaker.recordFailure(BOX_CIRCUIT_ID);
        throw new Error(await readApiError(res));
      }
      boxCircuitBreaker.reset(BOX_CIRCUIT_ID);

      setDeploySuccess(
        'Despliegue disparado exitosamente. Monitorea en el panel de Vercel.',
      );
      appendLog('[Vercel] Fase 9 — deploy hook ejecutado.');
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error al disparar el despliegue';
      setError(msg);
    } finally {
      setDeployLoading(false);
    }
  }, [sessionId, updateCycleCount, appendLog]);

  const showLoopUi =
    phase === 'PHASE_4_LOOP_READY' || phase === 'PHASE_9_READY_TO_DEPLOY';
  const deployUnlocked = updateCycleCount >= 1;

  const planLocked = phase !== 'PHASE_MINUS_1_IDEATION';

  const needsManualPanel =
    phase === 'PHASE_1_WAITING_NOTEBOOK' ||
    phase === 'PHASE_4_LOOP_READY' ||
    phase === 'PHASE_9_READY_TO_DEPLOY';

  return (
    <div className="flex w-full max-w-6xl flex-col gap-4 rounded-[0.75rem] border border-[#EAB308]/25 bg-[#0A0F1E] p-5 shadow-lg shadow-black/20 lg:p-6">
      <header className="w-full border-b border-[#EAB308]/20 pb-3">
        <h2 className="font-title text-lg font-bold tracking-tight text-[#EAB308]">
          AODS · Orquestador de desarrollo
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Fase -1 (ideación) → Fase 0 (protocolo) → NotebookLM → Cursor. Puentes manuales en el modal.
        </p>
      </header>

      {error && !manualModalOpen ? (
        <div
          className="w-full rounded-md border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3 lg:gap-6">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          {phase === 'PHASE_MINUS_1_IDEATION' ? (
            <section
              className="flex flex-col gap-3 rounded-lg border border-[#EAB308]/20 bg-[#070b14]/60 p-4 ring-1 ring-slate-800/25"
              aria-label="Chat de ideación Fase -1"
            >
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#EAB308]/90">
                  Fase -1 · Ideación
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Refina la idea con el arquitecto; al aprobar, el chat se cierra y el Plan Maestro queda
                  fijado como consola inmutable.
                </p>
              </div>

              <div className="max-h-[min(360px,50vh)] min-h-[200px] overflow-y-auto rounded-md border border-white/[0.06] bg-[#050810] p-3">
                {chatHistory.length === 0 ? (
                  <p className="text-center text-[12px] text-slate-600">
                    Escribe el primer mensaje para comenzar…
                  </p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {chatHistory.map((m, i) => (
                      <li
                        key={`${i}-${m.role}-${m.content.slice(0, 24)}`}
                        className={`rounded-md px-3 py-2 text-sm leading-relaxed ${
                          m.role === 'user'
                            ? 'ml-4 border border-[#EAB308]/20 bg-[#0A0F1E]/90 text-slate-100'
                            : 'mr-4 border border-slate-700/40 bg-slate-900/50 text-slate-300'
                        }`}
                      >
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          {m.role === 'user' ? 'Tú' : 'Arquitecto'}
                        </span>
                        <span className="whitespace-pre-wrap break-words">{m.content}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div ref={ideationChatEndRef} aria-hidden />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <textarea
                  className="min-h-[80px] flex-1 resize-y rounded-md border border-[#EAB308]/20 bg-[#050810] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-[#EAB308]/50 focus:outline-none focus:ring-1 focus:ring-[#EAB308]/30"
                  placeholder="Describe tu módulo, restricciones y dudas…"
                  value={ideationInput}
                  onChange={(e) => setIdeationInput(e.target.value)}
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSendIdeation();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => void handleSendIdeation()}
                  disabled={isLoading || !ideationInput.trim()}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-[#EAB308]/35 bg-[#0A0F1E] px-4 py-2.5 text-sm font-semibold text-[#EAB308] transition hover:bg-[#EAB308]/10 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Send className="h-4 w-4" aria-hidden />
                  )}
                  Enviar
                </button>
              </div>

              {chatHistory.length >= 2 ? (
                <button
                  type="button"
                  onClick={() => void handleApproveIdeaAndInit()}
                  disabled={isLoading}
                  className="w-full rounded-lg bg-[#EAB308] py-3 text-sm font-bold tracking-wide text-[#0A0F1E] shadow-md shadow-black/30 transition hover:bg-[#f5d04a] disabled:opacity-50"
                >
                  Aprobar Idea y Activar Protocolo
                </button>
              ) : (
                <p className="text-center text-[11px] text-slate-600">
                  Necesitas al menos 2 mensajes en el hilo para aprobar e iniciar el protocolo.
                </p>
              )}
            </section>
          ) : (
            <section className="flex flex-col gap-3 rounded-lg border border-white/[0.06] bg-[#050810]/90 p-4 ring-1 ring-slate-800/30">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Plan Maestro Consolidado
              </p>
              <p className="text-[11px] text-slate-600">
                Solo lectura · definido en Fase -1 y persistido al activar el protocolo (Fase 0).
              </p>
              <div className="max-h-[min(280px,40vh)] overflow-y-auto rounded-md border border-white/[0.05] bg-[#070b14] px-3 py-3 font-mono text-[12px] leading-relaxed text-slate-300">
                <pre className="whitespace-pre-wrap break-words">{planMaestro}</pre>
              </div>
              <p className="text-[11px] text-slate-500">
                Fase actual: <span className="font-mono text-[#EAB308]">{phase}</span>
              </p>
            </section>
          )}

          {phase !== 'PHASE_MINUS_1_IDEATION' ? (
            <ApiStatusGrid
              telemetry={telemetry}
              loading={telemetryLoading}
              error={telemetryError}
              refreshing={telemetryRefreshing}
              onRefresh={() => void loadTelemetry(true)}
            />
          ) : null}

          {phase === 'PHASE_3_READY_FOR_ACTIVATOR' ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-emerald-500/25 bg-emerald-950/15 px-4 py-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-950/30 text-emerald-400">
                <Check className="h-6 w-6" aria-hidden />
              </div>
              <h3 className="text-center font-semibold text-slate-100">GEMINI_DOC generado</h3>
              <p className="max-w-md text-center text-sm text-slate-400">
                El contexto de NotebookLM quedó estructurado. Genera el prompt activador para Cursor.
              </p>
              <button
                type="button"
                onClick={handleGenerateActivator}
                disabled={isLoading}
                className="mt-1 inline-flex items-center justify-center gap-2 rounded-md bg-[#EAB308] px-6 py-2.5 text-sm font-semibold text-[#0A0F1E] transition hover:bg-[#f5d04a] disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Redactando…
                  </>
                ) : (
                  'Generar prompt activador para Cursor'
                )}
              </button>
            </div>
          ) : null}

          {showLoopUi ? (
            <div className="flex flex-col gap-3">
              {phase === 'PHASE_9_READY_TO_DEPLOY' ? (
                <div
                  className="rounded-md border border-[#EAB308]/25 bg-[#EAB308]/5 px-3 py-2 text-xs text-slate-200"
                  role="status"
                >
                  <span className="font-semibold text-[#EAB308]">Fase 9 ·</span> blueprint
                  actualizado al menos una vez; despliegue habilitado. El loop Cursor continúa en el
                  modal.
                </div>
              ) : null}

              {updateSuccess ? (
                <p
                  className="rounded-md border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200"
                  role="status"
                >
                  {updateSuccess}
                </p>
              ) : null}

              <div
                className={`rounded-lg border border-white/10 bg-gradient-to-b from-neutral-950/90 to-black/80 p-4 shadow-inner shadow-black/40 ring-1 ring-white/[0.07] ${
                  deployUnlocked ? '' : 'opacity-90'
                }`}
              >
                <h3 className="mb-1 text-sm font-bold text-white">Fase 9 · Despliegue (Vercel)</h3>
                <p className="mb-3 text-[11px] leading-relaxed text-slate-400">
                  Tras al menos un ciclo Fase 7. Deploy hook del servidor.
                </p>
                <button
                  type="button"
                  onClick={handleDeploy}
                  disabled={deployLoading || !deployUnlocked}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
                >
                  {deployLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Desplegando…
                    </>
                  ) : (
                    <>Iniciar despliegue a producción (Vercel)</>
                  )}
                </button>
                {!deployUnlocked ? (
                  <p className="mt-2 text-[11px] text-slate-500">
                    Completa un informe en el modal (Fase 7) para habilitar el botón.
                  </p>
                ) : null}
                {deploySuccess ? (
                  <p
                    className="mt-3 rounded-md border border-emerald-500/25 bg-emerald-950/25 px-3 py-2 text-sm text-emerald-200"
                    role="status"
                  >
                    {deploySuccess}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="min-h-0 lg:col-span-1">
          <AodsTelemetryLog events={logEvents} />
          {needsManualPanel && !manualModalOpen ? (
            <button
              type="button"
              onClick={() => {
                setManualKind(phase === 'PHASE_1_WAITING_NOTEBOOK' ? 'notebook' : 'cursor');
                setManualModalOpen(true);
              }}
              className="mt-3 w-full rounded-md border border-[#EAB308]/35 bg-[#EAB308]/10 py-2 text-xs font-semibold text-[#EAB308] transition hover:bg-[#EAB308]/20"
            >
              Abrir puente manual
            </button>
          ) : null}
        </div>
      </div>

      <ManualHandoffModal
        open={manualModalOpen}
        onOpenChange={setManualModalOpen}
        kind={manualKind}
        isLoading={isLoading}
        error={error}
        notebookDraft={notebookContext}
        onNotebookDraftChange={(v) => {
          setNotebookContext(v);
          setError(null);
        }}
        copyPrompt={activatorPrompt}
        progressDraft={progressReport}
        onProgressDraftChange={(v) => {
          setProgressReport(v);
          setUpdateSuccess(null);
          setError(null);
        }}
        onSubmitNotebook={() => void handleAnalyzeNotebook()}
        onSubmitCursor={() => void handleUpdateGeminiDoc()}
      />
    </div>
  );
}

/**
 * Box cliente AODS — Nevado Técnico, `BoxErrorBoundary`, circuit breaker en llamadas API.
 * Acepta `V0BoxProps` para integrarse con `renderBoxById` / grillas.
 */
export function AiOrchestratorBox(_props: V0BoxProps) {
  void _props;
  return (
    <BoxErrorBoundary>
      <AiOrchestratorBoxInner />
    </BoxErrorBoundary>
  );
}

export default AiOrchestratorBox;

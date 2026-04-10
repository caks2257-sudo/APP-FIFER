"use client";

/**
 * Data Canvas — Vault (Supabase vía API Next).
 * Seguridad: solo `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` en cliente (`createFiferBrowserClient`);
 * escritura/lectura del lienzo va a `/api/v1/canvas/state` con Bearer de sesión. Nunca exponer `SUPABASE_SERVICE_ROLE_KEY` ni claves de servicio en el bundle.
 */
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Check, Cloud, Loader2 } from "lucide-react";
import { DataNode } from "@/components/core/DataNode";
import type { BoxProps } from "@/types/fifer-box";
import { useCanvasSync, type CanvasVaultSyncStatus } from "@/hooks/useCanvasSync";
import { CanvasLines, type Connection } from "@/components/v0-ingestion/CanvasLines";
import { useCanvasCommanderStore } from "@/store/useCanvasCommanderStore";
import {
  NodePropertyInspector,
  type NodeDataStatus,
} from "@/components/v0-ingestion/NodePropertyInspector";
import { adaptEngineResultToBoxProps, SHELL_ENGINE_IDS } from "@/utils/adapters/engine-bridge";
import { engineDispatcher } from "../../../../src/engines";
import type { ContentEngineContext } from "../../../../src/engines/ContentEngine";
import type { ScraperEnginePayload } from "../../../../src/engines/ScraperEngine";
import { FIFER_DEFAULT_USER_DNA } from "../../../../src/engines/user-dna-defaults";
import type { FiferNormalizedOutput } from "../../../../src/types/fifer-engine";
import type { ScrapingTargetModule } from "../../../../src/types/fifer-box";

const GRID_SIZE = 20;

const DATA_CANVAS_STORAGE_KEY = "fifer:scraping:data-canvas:state";
const DATA_CANVAS_LEGACY_KEY = "fifer:scraping:data-canvas:nodes";
const DATA_CANVAS_VAULT_KEY = "scraping-main";

type RunMode = "auto" | "manual";

type DroppedNode = {
  id: string;
  type: string;
  label: string;
  value: unknown;
  x: number;
  y: number;
  /** Default `auto`: propagación y ejecución en cadena. */
  runMode?: RunMode;
  /** Solo nodos `content`: sustituye la intención base enviada al motor. */
  promptOverride?: string;
};

type PersistedCanvasState = {
  nodes: DroppedNode[];
  connections: Connection[];
  /** Último `updated_at` aplicado desde Supabase (evita pisar lienzo local más reciente). */
  vaultSyncedAt?: string | null;
};

type UpstreamContext = {
  fromId: string;
  fromType: string;
  engineId: string;
  boxData: NonNullable<BoxProps["data"]>;
};

type EngineDispatcherRuntime = {
  dispatch: <TPayload = unknown, TResult = unknown>(engineId: string, payload: TPayload) => Promise<TResult>;
  registry?: Map<string, { executeWithProgress?: (p: unknown, onProgress: (s: unknown) => void) => Promise<unknown> }>;
};

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function loadPersistedState(): PersistedCanvasState | null {
  try {
    const rawV2 = window.localStorage.getItem(DATA_CANVAS_STORAGE_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as unknown;
      if (parsed && typeof parsed === "object" && Array.isArray((parsed as PersistedCanvasState).nodes)) {
        const p = parsed as PersistedCanvasState;
        return {
          nodes: p.nodes,
          connections: Array.isArray(p.connections) ? p.connections : [],
          vaultSyncedAt: typeof p.vaultSyncedAt === "string" ? p.vaultSyncedAt : null,
        };
      }
    }
    const rawLegacy = window.localStorage.getItem(DATA_CANVAS_LEGACY_KEY);
    if (rawLegacy) {
      const parsed = JSON.parse(rawLegacy) as unknown;
      if (Array.isArray(parsed)) {
        return { nodes: parsed as DroppedNode[], connections: [], vaultSyncedAt: null };
      }
    }
  } catch {
    // Ignora estado persistido inválido.
  }
  return null;
}

function resolveEngineId(nodeType: string): string {
  const t = nodeType.toLowerCase();
  if (t.includes("content")) return SHELL_ENGINE_IDS.content;
  return SHELL_ENGINE_IDS.finance;
}

function scrapingModuleForType(nodeType: string): ScrapingTargetModule {
  const t = nodeType.toLowerCase();
  if (t.includes("content")) return "content";
  if (t.includes("affiliate") || t.includes("ingestor")) return "affiliates";
  return "finance";
}

function isFinanceUpstream(ctx: UpstreamContext): boolean {
  const id = ctx.engineId.toLowerCase();
  if (id.includes("scraper") || id.includes("scraping")) return true;
  return ctx.fromType.toLowerCase().includes("finance");
}

function summarizeFinanceFromBoxData(data: NonNullable<BoxProps["data"]>): string {
  const raw = data as { normalized?: { title?: string; metrics?: Record<string, string | number> }; title?: string };
  const title = raw.normalized?.title ?? raw.title ?? "";
  const metrics = raw.normalized?.metrics ?? {};
  const metricLine = Object.entries(metrics)
    .slice(0, 6)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
  return [title, metricLine].filter(Boolean).join(" — ").slice(0, 1200) || JSON.stringify(data).slice(0, 400);
}

function summarizeBoxDataForNode(data: BoxProps["data"] | undefined): string {
  if (data == null) return "(sin datos)";
  const raw = data as { normalized?: { title?: string }; title?: string };
  const t = raw.normalized?.title ?? raw.title;
  if (typeof t === "string" && t.trim()) return t.slice(0, 280);
  try {
    return JSON.stringify(data).slice(0, 220);
  } catch {
    return "(datos)";
  }
}

function canvasHaystackForSearch(node: DroppedNode): string {
  const valueText =
    typeof node.value === "string" ? node.value : JSON.stringify(node.value ?? "");
  return [node.label, node.type, node.promptOverride ?? "", valueText].join(" ").slice(0, 2400);
}

function CanvasVaultCloudIndicator({
  status,
  hint,
}: {
  status: CanvasVaultSyncStatus;
  hint: string | null;
}) {
  const icon =
    status === "syncing" || status === "pulling" ? (
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-sky-300" aria-hidden />
    ) : status === "saved" ? (
      <Check className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
    ) : status === "error" || status === "offline" ? (
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
    ) : (
      <Cloud className="h-4 w-4 shrink-0 text-sky-400/90" aria-hidden />
    );

  const label =
    status === "syncing" || status === "pulling"
      ? "Sincronizando"
      : status === "saved"
        ? "En la nube"
        : status === "error"
          ? "Error"
          : status === "offline"
            ? "Offline"
            : "Vault listo";

  return (
    <motion.div
      className="pointer-events-auto absolute right-2 top-2 z-[4] flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-[#0A0F1E]/90 px-2 py-1.5 text-[10px] text-zinc-300 shadow-lg backdrop-blur-md"
      initial={{ opacity: 0.85, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      title={hint || "Estado de sincronización con Supabase (Vault)"}
      role="status"
    >
      {icon}
      <span className="max-w-[128px] truncate font-semibold uppercase tracking-wide">{label}</span>
    </motion.div>
  );
}

function buildScraperPayload(node: DroppedNode): ScraperEnginePayload {
  const targetModule = scrapingModuleForType(node.type);
  const url =
    typeof node.value === "string" && /^https?:\/\//i.test(node.value.trim())
      ? node.value.trim()
      : "https://example.com/fifer-canvas-demo";
  return { url, targetModule, providerId: "generic" };
}

function buildContentPayload(node: DroppedNode, upstream: UpstreamContext | undefined): ContentEngineContext {
  const fallbackIntent = `${node.label}: ${typeof node.value === "string" ? node.value : JSON.stringify(node.value)}`;
  const baseIntent = node.promptOverride?.trim() ? node.promptOverride.trim() : fallbackIntent;

  if (upstream && isFinanceUpstream(upstream)) {
    const financeText = summarizeFinanceFromBoxData(upstream.boxData);
    const dna = FIFER_DEFAULT_USER_DNA;
    const userIntent = [
      `[FIFER · Refinement · Stage 1 · ${dna.territory}]`,
      `Operator: ${dna.identityName} (${dna.roles.join(" · ")}).`,
      `Territory / trust: ${dna.territory} — ${dna.pillars.join(" · ")}.`,
      `Regla Insight de Valor (09_AI_PERSONA): cada dato financiero debe conectarse con acción o riesgo en Chicureo / obra.`,
      `Datos financieros upstream (nodo ${upstream.fromId}):`,
      financeText,
      `Intención del nodo destino: ${baseIntent}`,
    ].join("\n");

    return {
      userIntent,
      stage: "refine",
      productBrief: {
        upstreamModule: "finance",
        upstreamNodeId: upstream.fromId,
        canvasDataSnapshot: financeText,
      },
    };
  }

  return { userIntent: baseIntent, stage: "full" };
}

const CanvasNodeItem = memo(function CanvasNodeItem({
  node,
  onShiftConnect,
  isPendingSource,
  isProcessing,
  isSelected,
  isFlashHighlight,
  registerNodeEl,
  onSelect,
  onRunRequest,
}: {
  node: DroppedNode;
  onShiftConnect: (id: string) => void;
  isPendingSource: boolean;
  isProcessing: boolean;
  isSelected: boolean;
  isFlashHighlight: boolean;
  registerNodeEl: (id: string, el: HTMLDivElement | null) => void;
  onSelect: (id: string) => void;
  onRunRequest: (id: string) => void;
}) {
  function handlePointerDownCapture(e: PointerEvent<HTMLDivElement>) {
    if (!e.shiftKey) return;
    e.preventDefault();
    e.stopPropagation();
    onShiftConnect(node.id);
  }

  function handleClick(e: MouseEvent<HTMLDivElement>) {
    e.stopPropagation();
    onSelect(node.id);
  }

  function handleDoubleClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onRunRequest(node.id);
  }

  return (
    <div
      ref={(el) => registerNodeEl(node.id, el)}
      className={`absolute z-[2] rounded-[0.75rem] transition-all duration-200 ${
        isFlashHighlight
          ? "ring-[3px] ring-cyan-400/90 ring-offset-2 ring-offset-[#0B1220] motion-safe:animate-pulse"
          : isSelected
            ? "ring-[3px] ring-[#EAB308] ring-offset-2 ring-offset-[#0B1220]"
            : isPendingSource
              ? "ring-2 ring-[#EAB308]/70 ring-offset-2 ring-offset-[#0B1220]"
              : ""
      }`}
      style={{ left: node.x, top: node.y }}
      onPointerDownCapture={handlePointerDownCapture}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <DataNode
        id={node.id}
        type={node.type}
        label={node.label}
        value={node.value}
        isProcessing={isProcessing}
      />
    </div>
  );
});

export default function DataCanvasBox({}: BoxProps) {
  const [droppedNodes, setDroppedNodes] = useState<DroppedNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [vaultSyncedAt, setVaultSyncedAt] = useState<string | null>(null);
  const [flashNodeId, setFlashNodeId] = useState<string | null>(null);
  const [pendingFromId, setPendingFromId] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const [flowingConnectionIds, setFlowingConnectionIds] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, NodeDataStatus>>({});
  /** Último resultado del motor por nodo (para artefactos exportables); se limpia al re-ejecutar. */
  const [nodeEngineData, setNodeEngineData] = useState<Record<string, NonNullable<BoxProps["data"]>>>({});

  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const registerNodeEl = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) nodeRefs.current.set(id, el);
    else nodeRefs.current.delete(id);
  }, []);

  const setCanvasSearchIndex = useCanvasCommanderStore((s) => s.setCanvasSearchIndex);
  const pendingFocusNodeId = useCanvasCommanderStore((s) => s.pendingFocusNodeId);
  const clearPendingCanvasFocus = useCanvasCommanderStore((s) => s.clearPendingCanvasFocus);

  const droppedNodesRef = useRef(droppedNodes);
  const connectionsRef = useRef(connections);
  useEffect(() => {
    droppedNodesRef.current = droppedNodes;
  }, [droppedNodes]);
  useEffect(() => {
    connectionsRef.current = connections;
  }, [connections]);

  const upstreamByTarget = useRef<Map<string, UpstreamContext>>(new Map());
  const runChainRef = useRef(0);

  useEffect(() => {
    const loaded = loadPersistedState();
    if (!loaded) return;
    const validNodes = loaded.nodes.filter(
      (node) =>
        typeof node?.id === "string" &&
        typeof node?.type === "string" &&
        typeof node?.label === "string" &&
        typeof node?.x === "number" &&
        typeof node?.y === "number"
    );
    setDroppedNodes(validNodes);
    const validConnections = (loaded.connections ?? []).filter(
      (c) =>
        typeof c?.id === "string" &&
        typeof c?.fromId === "string" &&
        typeof c?.toId === "string" &&
        c.fromId !== c.toId
    );
    setConnections(validConnections);
    if (typeof loaded.vaultSyncedAt === "string" && loaded.vaultSyncedAt) {
      setVaultSyncedAt(loaded.vaultSyncedAt);
    }
  }, []);

  const onApplyRemoteCanvas = useCallback(
    (payload: { nodes: DroppedNode[]; connections: Connection[]; updatedAt: string }) => {
      const { nodes: remoteNodes, connections: remoteConnections } = payload;
      const validNodes = remoteNodes.filter(
        (node) =>
          typeof node?.id === "string" &&
          typeof node?.type === "string" &&
          typeof node?.label === "string" &&
          typeof node?.x === "number" &&
          typeof node?.y === "number"
      );
      const validConnections = (remoteConnections ?? []).filter(
        (c) =>
          typeof c?.id === "string" &&
          typeof c?.fromId === "string" &&
          typeof c?.toId === "string" &&
          c.fromId !== c.toId
      );
      setDroppedNodes(validNodes);
      setConnections(validConnections);
    },
    []
  );

  const { status: vaultSyncStatus, lastError: vaultSyncError } = useCanvasSync({
    canvasKey: DATA_CANVAS_VAULT_KEY,
    nodes: droppedNodes,
    connections,
    vaultSyncedAt,
    onVaultSyncedAtChange: setVaultSyncedAt,
    onApplyRemoteCanvas,
    enabled: true,
    debounceMs: 900,
  });

  useEffect(() => {
    setCanvasSearchIndex(
      droppedNodes.map((n) => ({
        id: n.id,
        label: n.label,
        type: n.type,
        haystack: canvasHaystackForSearch(n),
      }))
    );
  }, [droppedNodes, setCanvasSearchIndex]);

  useEffect(() => {
    if (!pendingFocusNodeId) return;
    const el = nodeRefs.current.get(pendingFocusNodeId);
    el?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    setSelectedNodeId(pendingFocusNodeId);
    setFlashNodeId(pendingFocusNodeId);
    clearPendingCanvasFocus();
    const t = window.setTimeout(() => setFlashNodeId(null), 2200);
    return () => window.clearTimeout(t);
  }, [pendingFocusNodeId, clearPendingCanvasFocus]);

  useEffect(() => {
    try {
      const payload: PersistedCanvasState = {
        nodes: droppedNodes,
        connections,
        vaultSyncedAt: vaultSyncedAt ?? undefined,
      };
      window.localStorage.setItem(DATA_CANVAS_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Si localStorage falla (quota, modo privado), el canvas sigue funcionando en memoria.
    }
  }, [droppedNodes, connections, vaultSyncedAt]);

  const addConnection = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return;
    setConnections((prev) => {
      const exists = prev.some((c) => c.fromId === fromId && c.toId === toId);
      if (exists) return prev;
      const id = `conn:${fromId}->${toId}:${Date.now().toString(36)}`;
      return [...prev, { id, fromId, toId }];
    });
    setPendingFromId(null);
  }, []);

  const handleShiftConnect = useCallback(
    (nodeId: string) => {
      if (!pendingFromId) {
        setPendingFromId(nodeId);
        return;
      }
      if (pendingFromId === nodeId) {
        setPendingFromId(null);
        return;
      }
      addConnection(pendingFromId, nodeId);
    },
    [addConnection, pendingFromId]
  );

  const runNode = useCallback(
    async (nodeId: string, visited: Set<string>) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = droppedNodesRef.current.find((n) => n.id === nodeId);
      if (!node) return;

      const runMode = node.runMode ?? "auto";
      if (runMode === "manual" && visited.size > 1) {
        return;
      }

      const chainId = runChainRef.current;
      setProcessingIds((prev) => (prev.includes(nodeId) ? prev : [...prev, nodeId]));

      setNodeEngineData((prev) => {
        const next = { ...prev };
        delete next[nodeId];
        return next;
      });
      setNodeStatuses((prev) => ({ ...prev, [nodeId]: "idle" }));

      const upstream = upstreamByTarget.current.get(nodeId);

      try {
        const engineId = resolveEngineId(node.type);
        const payload: ScraperEnginePayload | ContentEngineContext =
          engineId === SHELL_ENGINE_IDS.content
            ? buildContentPayload(node, upstream)
            : buildScraperPayload(node);

        const runtime = engineDispatcher as unknown as EngineDispatcherRuntime;
        const engine = runtime.registry?.get(engineId);
        let result: unknown;

        if (engineId === "content-engine" && engine?.executeWithProgress) {
          result = await engine.executeWithProgress(payload, () => {});
        } else {
          result = await runtime.dispatch(engineId, payload);
        }

        if (chainId !== runChainRef.current) return;

        const boxData = adaptEngineResultToBoxProps(engineId, result as FiferNormalizedOutput<unknown>);
        const displayValue = summarizeBoxDataForNode(boxData);

        setDroppedNodes((prev) =>
          prev.map((n) => (n.id === nodeId ? { ...n, value: displayValue } : n))
        );
        if (boxData != null) {
          setNodeEngineData((prev) => ({ ...prev, [nodeId]: boxData }));
        }
        setNodeStatuses((prev) => ({ ...prev, [nodeId]: "success" }));

        const outgoing = connectionsRef.current.filter((c) => c.fromId === nodeId);
        for (const conn of outgoing) {
          if (chainId !== runChainRef.current) return;

          setFlowingConnectionIds((prev) => (prev.includes(conn.id) ? prev : [...prev, conn.id]));
          upstreamByTarget.current.set(conn.toId, {
            fromId: nodeId,
            fromType: node.type,
            engineId,
            boxData: boxData ?? {},
          });

          await new Promise((r) => setTimeout(r, 380));

          const target = droppedNodesRef.current.find((n) => n.id === conn.toId);
          const targetMode = target?.runMode ?? "auto";
          if (target && targetMode === "auto") {
            await runNode(conn.toId, visited);
          }

          setFlowingConnectionIds((prev) => prev.filter((id) => id !== conn.id));
        }
      } catch {
        if (chainId === runChainRef.current) {
          setNodeStatuses((prev) => ({ ...prev, [nodeId]: "error" }));
          setNodeEngineData((prev) => {
            const next = { ...prev };
            delete next[nodeId];
            return next;
          });
        }
      } finally {
        setProcessingIds((prev) => prev.filter((id) => id !== nodeId));
      }
    },
    []
  );

  const handleRunRequest = useCallback(
    (nodeId: string) => {
      runChainRef.current += 1;
      upstreamByTarget.current.clear();
      void runNode(nodeId, new Set());
    },
    [runNode]
  );

  const updateNode = useCallback((id: string, patch: Partial<DroppedNode>) => {
    setDroppedNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }, []);

  const selectedNode = selectedNodeId ? droppedNodes.find((n) => n.id === selectedNodeId) : undefined;

  const handleCanvasBackgroundClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    setSelectedNodeId(null);
  }, []);

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const payload = event.dataTransfer.getData("application/fifer-node");
    if (!payload) return;

    try {
      const parsedNode = JSON.parse(payload) as Omit<DroppedNode, "x" | "y">;
      if (!parsedNode?.id) return;
      const canvasRect = event.currentTarget.getBoundingClientRect();
      const rawX = event.clientX - canvasRect.left;
      const rawY = event.clientY - canvasRect.top;
      const x = snapToGrid(rawX);
      const y = snapToGrid(rawY);
      const positionedNode: DroppedNode = { ...parsedNode, x, y };

      setDroppedNodes((prev) => {
        const existingIndex = prev.findIndex((node) => node.id === parsedNode.id);
        if (existingIndex === -1) return [...prev, positionedNode];
        return prev.map((node, index) => (index === existingIndex ? { ...node, x, y } : node));
      });
    } catch {
      // Ignora payloads inválidos para no romper la UI del lienzo.
    }
  }

  const blueprintStyle: CSSProperties = {
    backgroundColor: "rgba(11, 18, 32, 0.5)",
    backgroundImage: `
      radial-gradient(circle at 1px 1px, rgba(37, 99, 235, 0.22) 1px, transparent 0)
    `,
    backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
  };

  return (
    <div
      className="w-full rounded-[0.75rem] border border-dashed border-[#2563EB]/40 bg-[#0A0F1E] p-4 text-zinc-100 shadow-[0_18px_36px_rgba(0,0,0,0.35)]"
      data-fifer-box="data-canvas-box"
      data-fifer-biome="scraping"
    >
      <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-blue-300">Data Canvas</p>
      <h3 className="mt-1 text-base font-bold text-zinc-50">Lienzo de Analisis</h3>
      <p className="mt-1 text-[11px] text-zinc-500">
        Mantén <kbd className="rounded border border-zinc-600 bg-zinc-900/80 px-1 py-0.5 font-mono text-[10px]">Shift</kbd> y pulsa un nodo para marcar origen; repite en otro nodo para conectar.
      </p>
      <p className="mt-1 text-[11px] text-zinc-500">
        Clic en un nodo para abrir el inspector (run mode, overrides). Doble clic para ejecutar el motor; en modo{" "}
        <span className="text-zinc-400">auto</span> (por defecto) se propagan los datos a los enlaces salientes.
      </p>

      <div className="mt-4 flex flex-col gap-0 lg:flex-row lg:items-stretch">
        <div className="min-h-0 min-w-0 flex-1">
          <div
            className="relative z-0 min-h-[300px] rounded-[0.75rem] border border-dashed border-[#2563EB]/40 p-4"
            style={blueprintStyle}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            onClick={handleCanvasBackgroundClick}
          >
            <CanvasVaultCloudIndicator status={vaultSyncStatus} hint={vaultSyncError} />
            {droppedNodes.length === 0 ? (
              <div className="pointer-events-none absolute inset-0 z-[3] flex items-center justify-center">
                <p className="text-sm text-zinc-500">Arrastra nodos aqui</p>
              </div>
            ) : null}
            <CanvasLines
              nodes={droppedNodes.map((n) => ({ id: n.id, x: n.x, y: n.y, type: n.type }))}
              connections={connections}
              activeConnectionIds={flowingConnectionIds}
            />
            {droppedNodes.map((node) => (
              <CanvasNodeItem
                key={node.id}
                node={node}
                onShiftConnect={handleShiftConnect}
                isPendingSource={pendingFromId === node.id}
                isProcessing={processingIds.includes(node.id)}
                isSelected={selectedNodeId === node.id}
                isFlashHighlight={flashNodeId === node.id}
                registerNodeEl={registerNodeEl}
                onSelect={setSelectedNodeId}
                onRunRequest={handleRunRequest}
              />
            ))}
          </div>
        </div>

        <div
          className={`shrink-0 overflow-hidden border-white/10 transition-[max-width] duration-300 ease-out ${
            selectedNode
              ? "max-h-[min(520px,72vh)] w-full max-w-[100%] border-t lg:max-h-none lg:w-[min(100%,360px)] lg:max-w-[360px] lg:border-l lg:border-t-0"
              : "max-h-0 max-w-0 border-0 lg:max-h-none"
          }`}
        >
          {selectedNode ? (
            <NodePropertyInspector
              node={selectedNode}
              dataStatus={nodeStatuses[selectedNode.id] ?? "idle"}
              engineBoxData={nodeEngineData[selectedNode.id]}
              isProcessing={processingIds.includes(selectedNode.id)}
              onClose={() => setSelectedNodeId(null)}
              onRunModeChange={(mode) => updateNode(selectedNode.id, { runMode: mode })}
              onPromptOverrideChange={(value) => updateNode(selectedNode.id, { promptOverride: value })}
              onRunNow={() => handleRunRequest(selectedNode.id)}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

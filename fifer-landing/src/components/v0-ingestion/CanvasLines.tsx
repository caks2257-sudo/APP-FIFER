"use client";

import { memo, useMemo } from "react";

export type Connection = {
  id: string;
  fromId: string;
  toId: string;
};

export type CanvasLineNode = {
  id: string;
  x: number;
  y: number;
  type: string;
};

const NODE_CENTER_X = 100;
const NODE_CENTER_Y = 28;

function strokeForNodeType(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("finance")) return "#059669";
  return "#EAB308";
}

export type CanvasLinesProps = {
  nodes: CanvasLineNode[];
  connections: Connection[];
  /** Conexiones con transferencia activa — animación de flujo (partícula / dash). */
  activeConnectionIds?: ReadonlySet<string> | string[];
};

function CanvasLinesInner({ nodes, connections, activeConnectionIds }: CanvasLinesProps) {
  const activeSet = useMemo(() => {
    if (!activeConnectionIds) return new Set<string>();
    return activeConnectionIds instanceof Set ? activeConnectionIds : new Set(activeConnectionIds);
  }, [activeConnectionIds]);
  const nodeById = useMemo(() => {
    const m = new Map<string, CanvasLineNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  const lines = useMemo(() => {
    const out: {
      key: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      stroke: string;
      flowing: boolean;
    }[] = [];
    for (const c of connections) {
      const from = nodeById.get(c.fromId);
      const to = nodeById.get(c.toId);
      if (!from || !to) continue;
      out.push({
        key: c.id,
        x1: from.x + NODE_CENTER_X,
        y1: from.y + NODE_CENTER_Y,
        x2: to.x + NODE_CENTER_X,
        y2: to.y + NODE_CENTER_Y,
        stroke: strokeForNodeType(from.type),
        flowing: activeSet.has(c.id),
      });
    }
    return out;
  }, [connections, nodeById, activeSet]);

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[1] h-full w-full overflow-visible"
      aria-hidden
    >
      <defs>
        <filter id="fifer-canvas-flow-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {lines.map((line) => (
        <line
          key={line.key}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={line.stroke}
          strokeWidth={line.flowing ? 2.2 : 1.5}
          strokeOpacity={line.flowing ? 1 : 0.85}
          strokeLinecap="round"
          strokeDasharray={line.flowing ? "6 10" : undefined}
          strokeDashoffset={line.flowing ? 0 : undefined}
          filter={line.flowing ? "url(#fifer-canvas-flow-glow)" : undefined}
          className={line.flowing ? "fifer-canvas-line-flow" : undefined}
        />
      ))}
    </svg>
  );
}

export const CanvasLines = memo(CanvasLinesInner);

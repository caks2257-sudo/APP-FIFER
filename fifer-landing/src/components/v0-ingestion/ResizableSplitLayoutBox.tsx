"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { BoxLoader } from "@/components/core/BoxLoader";
import type { BoxProps } from "@/types/fifer-box";

export interface ResizableSplitLayoutBoxProps extends BoxProps {
  leftBoxId: string;
  rightBoxId: string;
}

const MIN_LEFT_WIDTH = 15;
const MAX_LEFT_WIDTH = 60;
const DEFAULT_LEFT_WIDTH = 40;

type SplitChildBridge = {
  moduleId?: string;
  data?: unknown;
  isLoading?: boolean;
  error?: string;
};

type SplitLayoutDataBridge = {
  sourceModule?: string;
  children?: {
    left?: SplitChildBridge;
    right?: SplitChildBridge;
  };
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export default function ResizableSplitLayoutBox({
  leftBoxId = "scraping-url-box",
  rightBoxId = "data-canvas-box",
  boxId,
  data,
}: ResizableSplitLayoutBoxProps) {
  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(DEFAULT_LEFT_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const desktopContainerRef = useRef<HTMLDivElement | null>(null);
  const bridge = (data ?? {}) as SplitLayoutDataBridge;
  const leftBridge = bridge.children?.left;
  const rightBridge = bridge.children?.right;
  const parentModuleId = bridge.sourceModule;

  const updateWidthFromClientX = useCallback((clientX: number) => {
    const container = desktopContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const nextWidth = ((clientX - rect.left) / rect.width) * 100;
    setLeftPanelWidth(clamp(nextWidth, MIN_LEFT_WIDTH, MAX_LEFT_WIDTH));
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (event: MouseEvent) => {
      updateWidthFromClientX(event.clientX);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, updateWidthFromClientX]);

  const handleResizerMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
    updateWidthFromClientX(event.clientX);
  };

  const renderChildBox = (childBoxId: string, childBridge?: SplitChildBridge) => {
    if (!childBoxId || childBoxId === boxId) {
      return (
        <p className="text-sm text-amber-200">
          Configuracion invalida del split: el box hijo no puede ser vacio ni referenciarse a si mismo.
        </p>
      );
    }

    return (
      <BoxLoader
        boxId={childBoxId}
        moduleId={childBridge?.moduleId ?? parentModuleId}
        dataOverride={childBridge?.data}
        loadingOverride={childBridge?.isLoading}
        errorOverride={childBridge?.error ? new Error(childBridge.error) : null}
      />
    );
  };

  return (
    <div
      className="h-[calc(100vh-theme(spacing.16))] w-full rounded-[0.75rem] border border-[#EAB308]/20 bg-[#0A0F1E] text-zinc-100"
      data-fifer-layout="resizable-split"
    >
      <div className="flex h-full flex-col md:hidden">
        <section className="max-h-[40vh] overflow-y-auto border-b border-[#EAB308]/15 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#EAB308]">Origen</p>
          <div className="mt-3 rounded-lg border border-[#EAB308]/10 bg-white/5 p-3">
            {renderChildBox(leftBoxId, leftBridge)}
          </div>
        </section>

        <section className="flex-1 overflow-y-auto p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#EAB308]">Receptor</p>
          <div className="mt-3 rounded-lg border border-[#EAB308]/10 bg-white/5 p-3">
            {renderChildBox(rightBoxId, rightBridge)}
          </div>
        </section>
      </div>

      <div ref={desktopContainerRef} className="relative hidden h-full md:flex">
        <section className="h-full overflow-y-auto p-4" style={{ width: `${leftPanelWidth}%` }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#EAB308]">Origen</p>
          <div className="mt-3 rounded-lg border border-[#EAB308]/10 bg-white/5 p-3">
            {renderChildBox(leftBoxId, leftBridge)}
          </div>
        </section>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Ajustar paneles"
          className="group flex h-full w-3 shrink-0 cursor-col-resize items-center justify-center bg-transparent"
          onMouseDown={handleResizerMouseDown}
        >
          <div
            className={`h-full w-px border-l border-r border-[#EAB308]/20 transition-colors ${
              isDragging ? "bg-[#EAB308]/40" : "bg-white/10 group-hover:bg-[#EAB308]/30"
            }`}
          />
        </div>

        <section className="h-full flex-1 overflow-y-auto p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#EAB308]">Receptor</p>
          <div className="mt-3 rounded-lg border border-[#EAB308]/10 bg-white/5 p-3">
            {renderChildBox(rightBoxId, rightBridge)}
          </div>
        </section>
      </div>
    </div>
  );
}

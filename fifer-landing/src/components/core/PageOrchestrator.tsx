"use client";

import { useLayoutEffect, useMemo, useState, type CSSProperties } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { BoxLoader } from "@/components/core/BoxLoader";
import { DraggableBoxWrapper } from "@/components/core/DraggableBoxWrapper";
import { runOptimisticMutation } from "@/lib/optimistic-mutation";
import { persistFiferMutation } from "@/lib/fifer-mutation-api";
import {
  useLayoutStore,
  makeRouteKey,
  entryToBoxState,
  type BoxLayoutState,
} from "@/store/useLayoutStore";
import type { SlotDictionary } from "@/types/architecture";
import type { IFiferBoxManifest } from "@/types/fifer-box";
import { FIFER_MASTER_DEEP_NAVY, resolveModuleBiome } from "@/lib/module-biome";
import { SHELL_ENGINE_IDS } from "@/lib/shell-engine-ids";

/**
 * Living OS (Master Shell): grid 12 columnas, DnD (`@dnd-kit`) por slot, persistencia en `useLayoutStore`.
 * Hidratación JIT desde motores: `adaptEngineResultToBoxProps` / `SHELL_ENGINE_IDS` (Chicureo → scraper, ABKupfer → content).
 */
export function PageOrchestrator({
  moduleId,
  routePath,
  slots,
  manifests,
}: {
  moduleId: string;
  routePath: string;
  slots: SlotDictionary;
  manifests?: Partial<Record<string, IFiferBoxManifest>>;
}) {
  const initFromMetadata = useLayoutStore((s) => s.initFromMetadata);
  const reorderBoxInSlot = useLayoutStore((s) => s.reorderBoxInSlot);
  const applySceneToRoute = useLayoutStore((s) => s.applySceneToRoute);
  const fiferScene = useLayoutStore((s) => s.fiferScene);
  const routes = useLayoutStore((s) => s.routes);

  const slotsKey = useMemo(() => JSON.stringify(slots), [slots]);
  const manifestBlob = useMemo(() => JSON.stringify(manifests ?? {}), [manifests]);

  useLayoutEffect(() => {
    initFromMetadata(moduleId, routePath, slots, manifests);
  }, [initFromMetadata, moduleId, routePath, slotsKey, manifestBlob, slots, manifests]);

  /** Fifer Scene Engine: tras hidratar metadata, aplica orden/expansión según escena (framer-motion en cajas). */
  useLayoutEffect(() => {
    applySceneToRoute(moduleId, routePath);
  }, [applySceneToRoute, moduleId, routePath, fiferScene]);

  const routeKey = makeRouteKey(moduleId, routePath);
  const routeSlice = routes[routeKey];

  const [activeSortableId, setActiveSortableId] = useState<string | null>(null);

  const biome = useMemo(() => resolveModuleBiome(moduleId), [moduleId]);
  const shellVars = useMemo(
    () =>
      ({
        "--fifer-primary": biome.primary,
        "--fifer-accent": biome.accent,
        "--fifer-deep-navy": biome.deepNavy,
      }) as CSSProperties,
    [biome]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const slotEntries = Object.entries(slots || {});

  function onDragStart(event: DragStartEvent) {
    setActiveSortableId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveSortableId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const a = active.data.current as { slotName?: string; boxId?: string } | undefined;
    const o = over.data.current as { slotName?: string; boxId?: string } | undefined;
    if (!a?.slotName || !a?.boxId || !o?.boxId) return;
    if (a.slotName !== o.slotName) return;

    const routeKey = makeRouteKey(moduleId, routePath);
    const snap = useLayoutStore.getState().routes[routeKey];
    const userLayoutSnapshot = snap ? (JSON.parse(JSON.stringify(snap.userLayout)) as typeof snap.userLayout) : undefined;
    const slotOrderSnapshot = snap ? (JSON.parse(JSON.stringify(snap.slotOrder)) as typeof snap.slotOrder) : undefined;

    void runOptimisticMutation({
      apply: () => reorderBoxInSlot(moduleId, routePath, a.slotName!, a.boxId!, o.boxId!),
      revert: () => {
        if (!userLayoutSnapshot || !slotOrderSnapshot) return;
        useLayoutStore.setState((s) => ({
          routes: {
            ...s.routes,
            [routeKey]: {
              userLayout: userLayoutSnapshot,
              slotOrder: slotOrderSnapshot,
            },
          },
        }));
      },
      request: () =>
        persistFiferMutation({
          kind: "reorder-slot",
          moduleId,
          routePath,
          slotName: a.slotName,
        }),
      errorTitle: "Orden no guardado",
      errorBody: (err) => `Las cajas volvieron a su posición anterior. ${err.message}`,
    });
  }

  function onDragCancel() {
    setActiveSortableId(null);
  }

  return (
    <main
      data-fifer-orchestrator="root"
      data-fifer-scene={fiferScene}
      data-living-os="true"
      data-fifer-shell-engine-bridge="engine-bridge.ts"
      data-fifer-engine-finance={SHELL_ENGINE_IDS.finance}
      data-fifer-engine-content={SHELL_ENGINE_IDS.content}
      data-fifer-module-primary-engine={
        moduleId === "finance"
          ? SHELL_ENGINE_IDS.finance
          : moduleId === "content"
            ? SHELL_ENGINE_IDS.content
            : ""
      }
      style={{
        ...shellVars,
        minHeight: "100dvh",
        padding: 24,
        background: FIFER_MASTER_DEEP_NAVY,
        color: "#f3f3f3",
      }}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        {slotEntries.length === 0 ? (
          <div style={{ gridColumn: "span 12", color: "#7a7a7a", border: "1px dashed #303030", padding: 14 }}>
            Ruta sin slots definidos en metadata.
          </div>
        ) : null}
        {slotEntries.map(([slotName, boxIds]) => {
          const order = routeSlice?.slotOrder[slotName];
          const layoutMap = routeSlice?.userLayout;
          const ordered: BoxLayoutState[] =
            order?.length && layoutMap
              ? order
                  .map((id) => {
                    const e = layoutMap[id];
                    return e ? entryToBoxState(id, e) : null;
                  })
                  .filter((b): b is BoxLayoutState => b !== null)
              : (boxIds || []).map(
                  (id, i) =>
                    ({
                      id,
                      slotName,
                      x: 0,
                      y: i,
                      width: 4,
                      height: 1,
                      expanded: false,
                      baseWidth: 4,
                      baseHeight: 1,
                      showAIFace: false,
                    }) satisfies BoxLayoutState
                );
          const sortableIds = ordered.map((b) => sortableBoxId(slotName, b.id));

          return (
            <section key={slotName} data-fifer-slot={slotName} style={{ marginBottom: 24 }}>
              <p style={{ margin: "0 0 8px 0", color: "#9ca3af", fontSize: 12 }}>{slotName}</p>
              <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
                <div
                  data-fifer-grid="main"
                  data-fifer-module={moduleId}
                  data-fifer-shell-engine={
                    moduleId === "finance"
                      ? SHELL_ENGINE_IDS.finance
                      : moduleId === "content"
                        ? SHELL_ENGINE_IDS.content
                        : undefined
                  }
                  className="grid grid-cols-12 items-start gap-3 auto-rows-[minmax(min-content,auto)]"
                >
                  {ordered.map((box) => (
                    <SortableBoxSlot
                      key={box.id}
                      moduleId={moduleId}
                      routePath={routePath}
                      slotName={slotName}
                      box={box}
                    />
                  ))}
                </div>
              </SortableContext>
            </section>
          );
        })}
        <DragOverlay>
          {activeSortableId ? <DragOverlayPreview sortableId={activeSortableId} /> : null}
        </DragOverlay>
      </DndContext>
    </main>
  );
}

function DragOverlayPreview({ sortableId }: { sortableId: string }) {
  const parts = sortableId.split("::");
  const boxId = parts.length >= 2 ? parts.slice(1).join("::") : sortableId;
  return (
    <div
      role="presentation"
      style={{
        minWidth: 160,
        maxWidth: 320,
        padding: "12px 14px",
        borderRadius: 12,
        border: "1px solid rgba(234, 179, 8, 0.45)",
        background: "rgba(17, 17, 17, 0.95)",
        color: "#e4e4e7",
        fontSize: 13,
        fontWeight: 600,
        boxShadow: "0 18px 44px rgba(0,0,0,0.45)",
      }}
    >
      {boxId}
    </div>
  );
}

function sortableBoxId(slotName: string, boxId: string): string {
  return `${slotName}::${boxId}`;
}

function SortableBoxSlot({
  moduleId,
  routePath,
  slotName,
  box,
}: {
  moduleId: string;
  routePath: string;
  slotName: string;
  box: BoxLayoutState;
}) {
  const sortableId = sortableBoxId(slotName, box.id);
  const toggleBoxExpansion = useLayoutStore((s) => s.toggleBoxExpansion);
  const toggleAIView = useLayoutStore((s) => s.toggleAIView);

  const gridColumn = `${box.x + 1} / span ${Math.min(12, box.width)}`;
  const gridRow = `${box.y + 1} / span ${Math.max(1, box.height)}`;

  return (
    <DraggableBoxWrapper
      sortableId={sortableId}
      slotName={slotName}
      boxId={box.id}
      gridColumn={gridColumn}
      gridRow={gridRow}
    >
      <BoxLoader
        moduleId={moduleId}
        boxId={box.id}
        slotName={slotName}
        routePathForLayout={routePath}
        expanded={box.expanded}
        showAIFace={box.showAIFace}
        onToggleExpand={() => toggleBoxExpansion(moduleId, routePath, slotName, box.id)}
        onToggleAiView={() => toggleAIView(moduleId, routePath, slotName, box.id)}
      />
    </DraggableBoxWrapper>
  );
}

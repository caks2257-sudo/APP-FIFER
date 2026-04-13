'use client';

import { useEffect, useMemo, type CSSProperties } from 'react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import type { DashboardWidget } from '@/components/dashboard/mockDashboardConfig';
import { useLayoutStore, type GridSpan } from '@/store/useLayoutStore';
import { renderDashboardWidget } from '@/components/dashboard/componentRegistry';
import DraggableBoxWrapper from './DraggableBoxWrapper';
import { FIFER_BOX_CATALOG_BY_ID } from '@/registry/fifer-box-catalog';

type PageOrchestratorProps = {
  widgets: DashboardWidget[];
  isRefining?: boolean;
  isLoading?: boolean;
  hasError?: boolean;
};

function resolveGridSpan(widget: DashboardWidget, gridSpanByWidgetId: Record<string, GridSpan>): GridSpan {
  const manifest = FIFER_BOX_CATALOG_BY_ID[widget.boxId];
  const o = gridSpanByWidgetId[widget.id];
  return {
    colSpan: o?.colSpan ?? widget.colSpan,
    rowSpan: o?.rowSpan ?? manifest.defaultDimensions.h,
  };
}

export default function PageOrchestrator({
  widgets,
  isRefining = false,
  isLoading = false,
  hasError = false,
}: PageOrchestratorProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const { slotOrder, setSlotOrder, syncWithWidgets, gridSpanByWidgetId, setGridSpanForWidget } = useLayoutStore();

  useEffect(() => {
    syncWithWidgets(widgets.map((widget) => widget.id));
  }, [widgets, syncWithWidgets]);

  const orderedWidgets = useMemo(() => {
    const map = new Map(widgets.map((widget) => [widget.id, widget]));
    return slotOrder.map((id) => map.get(id)).filter(Boolean) as DashboardWidget[];
  }, [widgets, slotOrder]);

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = slotOrder.indexOf(String(active.id));
    const newIndex = slotOrder.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    setSlotOrder(arrayMove(slotOrder, oldIndex, newIndex));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={slotOrder} strategy={rectSortingStrategy}>
        <div className="liquid-workspace-grid w-full">
          {orderedWidgets.map((widget) => {
            const manifest = FIFER_BOX_CATALOG_BY_ID[widget.boxId];
            const resolved = resolveGridSpan(widget, gridSpanByWidgetId);
            const gridStyle: CSSProperties = {
              gridColumn: `span ${resolved.colSpan}`,
              gridRow: `span ${resolved.rowSpan}`,
            };

            const colOrder = [4, 6, 8, 12] as const;
            const onCycleColSpan = () => {
              const idx = colOrder.indexOf(resolved.colSpan as (typeof colOrder)[number]);
              const i = idx < 0 ? 0 : idx;
              const next = colOrder[(i + 1) % colOrder.length];
              setGridSpanForWidget(widget.id, { colSpan: next, rowSpan: resolved.rowSpan });
            };
            const onCycleRowSpan = () => {
              const next = resolved.rowSpan >= 8 ? 1 : resolved.rowSpan + 1;
              setGridSpanForWidget(widget.id, { colSpan: resolved.colSpan, rowSpan: next });
            };

            return (
              <div key={widget.id} style={gridStyle} className="@container min-w-0">
                <DraggableBoxWrapper
                  id={widget.id}
                  isDraggable={manifest.isDraggable}
                  isResizable={manifest.isResizable}
                  onCycleColSpan={onCycleColSpan}
                  onCycleRowSpan={onCycleRowSpan}
                >
                  {renderDashboardWidget(widget, isRefining, isLoading, hasError)}
                </DraggableBoxWrapper>
              </div>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}

'use client';

import { useEffect, useMemo } from 'react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import type { DashboardWidget } from '@/components/dashboard/mockDashboardConfig';
import { useLayoutStore } from '@/store/useLayoutStore';
import { getWidgetColSpanClass, renderDashboardWidget } from '@/components/dashboard/componentRegistry';
import DraggableBoxWrapper from './DraggableBoxWrapper';

type PageOrchestratorProps = {
  widgets: DashboardWidget[];
  isRefining?: boolean;
  isLoading?: boolean;
  hasError?: boolean;
};

export default function PageOrchestrator({
  widgets,
  isRefining = false,
  isLoading = false,
  hasError = false,
}: PageOrchestratorProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const { slotOrder, setSlotOrder, syncWithWidgets } = useLayoutStore();

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
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full">
          {orderedWidgets.map((widget) => (
            <div key={widget.id} className={getWidgetColSpanClass(widget.colSpan)}>
              <DraggableBoxWrapper id={widget.id}>
                {renderDashboardWidget(widget, isRefining, isLoading, hasError)}
              </DraggableBoxWrapper>
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

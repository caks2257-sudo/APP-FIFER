'use client';

import type { CSSProperties, ReactNode } from 'react';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { GripVertical } from 'lucide-react';

type DraggableBoxWrapperProps = {
  id: string;
  children: ReactNode;
  isDraggable?: boolean;
  isResizable?: boolean;
  onCycleColSpan?: () => void;
  onCycleRowSpan?: () => void;
};

export default function DraggableBoxWrapper({
  id,
  children,
  isDraggable = true,
  isResizable = true,
  onCycleColSpan,
  onCycleRowSpan,
}: DraggableBoxWrapperProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !isDraggable,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? 'box-dragging z-50' : ''}
    >
      <div className="mb-2 flex flex-wrap items-center justify-end gap-1">
        {isDraggable ? (
          <button
            type="button"
            className="inline-flex cursor-grab items-center gap-1 rounded-md border border-white/5 bg-[#1E293B] px-2 py-1 text-[11px] text-[#9CA3AF] hover:text-[#EAB308]"
            {...attributes}
            {...listeners}
            aria-label="Reordenar widget"
          >
            <GripVertical className="h-3.5 w-3.5" />
            mover
          </button>
        ) : null}
        {isResizable ? (
          <>
            <button
              type="button"
              className="rounded-md border border-white/5 bg-[#1E293B] px-2 py-1 text-[11px] text-[#9CA3AF] hover:text-[#EAB308]"
              onClick={onCycleColSpan}
              aria-label="Cambiar ancho en grilla"
            >
              ancho
            </button>
            <button
              type="button"
              className="rounded-md border border-white/5 bg-[#1E293B] px-2 py-1 text-[11px] text-[#9CA3AF] hover:text-[#EAB308]"
              onClick={onCycleRowSpan}
              aria-label="Cambiar alto en grilla"
            >
              alto
            </button>
          </>
        ) : null}
      </div>
      {children}
    </div>
  );
}

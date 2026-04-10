'use client';

import type { ReactNode } from 'react';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { GripVertical } from 'lucide-react';

type DraggableBoxWrapperProps = {
  id: string;
  children: ReactNode;
};

export default function DraggableBoxWrapper({ id, children }: DraggableBoxWrapperProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'z-50 opacity-90' : ''}>
      <div className="mb-2 flex justify-end">
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
      </div>
      {children}
    </div>
  );
}

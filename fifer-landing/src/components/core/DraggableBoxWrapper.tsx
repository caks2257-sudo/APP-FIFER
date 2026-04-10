"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { FIFER_ELECTRIC_YELLOW, fiferLayoutSpring } from "@/components/core/fifer-theme";

export { FIFER_ELECTRIC_YELLOW } from "@/components/core/fifer-theme";

export type DraggableBoxWrapperProps = {
  sortableId: string;
  slotName: string;
  boxId: string;
  /** CSS grid placement (ej. `1 / span 4`). */
  gridColumn: string;
  gridRow: string;
  children: ReactNode;
};

/**
 * Envoltorio sortable para cualquier Box inyectado: `useSortable` + feedback con
 * framer-motion (layout + acento Electric Yellow al arrastrar).
 */
export function DraggableBoxWrapper({
  sortableId,
  slotName,
  boxId,
  gridColumn,
  gridRow,
  children,
}: DraggableBoxWrapperProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
    data: { slotName, boxId },
  });

  const dragTransform = CSS.Transform.toString(transform);

  return (
    <div
      ref={setNodeRef}
      style={{
        gridColumn,
        gridRow,
        zIndex: isDragging ? 20 : 1,
        transform: dragTransform,
        transition,
        position: "relative",
        minWidth: 0,
      }}
    >
      <motion.div
        layout
        layoutId={`fifer-box-${slotName}-${boxId}`}
        initial={false}
        animate={{
          boxShadow: isDragging
            ? `0 0 0 2px ${FIFER_ELECTRIC_YELLOW}, 0 18px 44px rgba(234, 179, 8, 0.14)`
            : "0 0 0 0px rgba(234, 179, 8, 0)",
        }}
        transition={{
          layout: fiferLayoutSpring,
          boxShadow: { duration: 0.22, ease: [0.4, 0, 0.2, 1] },
        }}
        style={{
          display: "flex",
          gap: 8,
          alignItems: "flex-start",
          minHeight: 0,
          borderRadius: 14,
          border: isDragging ? `1px solid ${FIFER_ELECTRIC_YELLOW}` : "1px solid transparent",
          background: isDragging ? "rgba(234, 179, 8, 0.04)" : "transparent",
        }}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          style={{
            cursor: isDragging ? "grabbing" : "grab",
            flexShrink: 0,
            border: `1px solid ${isDragging ? FIFER_ELECTRIC_YELLOW : "#333"}`,
            borderRadius: 8,
            padding: "4px 6px",
            background: isDragging ? "rgba(234, 179, 8, 0.12)" : "#0b1224",
            color: isDragging ? FIFER_ELECTRIC_YELLOW : "#888",
            touchAction: "none",
            transition: "border-color 0.2s ease, background 0.2s ease, color 0.2s ease",
          }}
          aria-label="Mover box"
        >
          ⋮⋮
        </button>
        <motion.div
          layout
          transition={fiferLayoutSpring}
          style={{
            flex: 1,
            minWidth: 0,
            borderRadius: 12,
            outline: "none",
          }}
        >
          {children}
        </motion.div>
      </motion.div>
    </div>
  );
}

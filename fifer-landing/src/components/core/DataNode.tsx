"use client";

import { GripVertical } from "lucide-react";
import { useState, type DragEvent } from "react";

export interface DataNodeProps {
  id: string;
  type: string;
  label: string;
  value: unknown;
  /** Motor en ejecución — borde Electric Yellow (`globals.css` · alineado a 09_AI_PERSONA / refinamiento). */
  isProcessing?: boolean;
}

export const DataNode: React.FC<DataNodeProps> = ({ id, type, label, value, isProcessing }) => {
  const [isDragging, setIsDragging] = useState(false);

  function handleDragStart(event: DragEvent<HTMLDivElement>) {
    setIsDragging(true);

    // Empaquetamos la metadata completa del nodo
    const payload = JSON.stringify({ id, type, label, value });

    // Usamos un MIME type personalizado para no interferir con dnd-kit
    event.dataTransfer.setData("application/fifer-node", payload);
    event.dataTransfer.effectAllowed = "copy";
  }

  function handleDragEnd() {
    setIsDragging(false);
  }

  // Convertimos el valor a string seguro para la visualización
  const displayValue = typeof value === "string" ? value : JSON.stringify(value);

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`
        group flex items-center gap-2 px-3 py-2
        bg-[#18181B]/80 backdrop-blur-md
        border border-[#EAB308]/20 rounded-[0.75rem]
        text-sm text-zinc-200 cursor-grab active:cursor-grabbing
        hover:border-[#EAB308]/60 hover:bg-[#18181B] transition-all duration-200
        ${isDragging ? "opacity-40 scale-95 shadow-none" : "opacity-100 shadow-md"}
        ${isProcessing ? "fifer-refining-border-pulse rounded-[0.75rem]" : ""}
      `}
      title="Arrastra este nodo a otro Fifer Box"
    >
      <GripVertical className="h-4 w-4 text-zinc-500 transition-colors group-hover:text-[#EAB308]" />
      <div className="flex flex-col overflow-hidden">
        <span className="mb-1 text-[10px] font-bold uppercase leading-none tracking-wider text-zinc-500">{label}</span>
        <span className="max-w-[200px] truncate font-medium leading-tight">{displayValue}</span>
      </div>
    </div>
  );
};

export default DataNode;

"use client";

import type { BoxProps } from "@/types/fifer-box";

/**
 * Box v0 mínimo (sandbox user_space) — ADN: #0A0F1E / #EAB308.
 */
export default function SampleScraperBox(props: BoxProps) {
  const title =
    typeof props.data?.title === "string" && props.data.title.trim()
      ? props.data.title
      : "Sample scraper";

  return (
    <div
      className="rounded-xl border border-[#EAB308]/35 bg-[#0A0F1E] p-4 shadow-inner"
      data-user-space-box="sample-scraper"
    >
      <p className="text-sm font-semibold tracking-tight text-[#EAB308]">{title}</p>
      <p className="mt-2 text-xs text-[#EAB308]/80">
        Motor user_space (mock). Datos vía contrato normalizado; sin datos sensibles en el árbol.
      </p>
    </div>
  );
}

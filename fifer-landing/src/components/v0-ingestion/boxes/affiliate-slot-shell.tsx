"use client";

import type { BoxProps } from "@/types/fifer-box";

/**
 * Placeholder JIT afiliados — sin UI de producto; solo cableado hasta v0.
 * Sustituir por artefactos dedicados por `boxId` cuando existan.
 */
export default function AffiliateSlotShell({ boxId }: BoxProps) {
  return (
    <output className="sr-only" aria-hidden data-fifer-affiliate-shell={boxId ?? ""} />
  );
}

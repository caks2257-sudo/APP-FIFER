import { clsx } from "clsx";
import type { CSSProperties } from "react";
import type { IFiferBoxManifest } from "@/types/fifer-box";

/** Tailwind JIT: clases completas para `col-span-*` (1–12). */
const COL_SPAN: Record<number, string> = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
  5: "col-span-5",
  6: "col-span-6",
  7: "col-span-7",
  8: "col-span-8",
  9: "col-span-9",
  10: "col-span-10",
  11: "col-span-11",
  12: "col-span-12",
};

const ROW_SPAN: Record<number, string> = {
  1: "row-span-1",
  2: "row-span-2",
  3: "row-span-3",
  4: "row-span-4",
  5: "row-span-5",
  6: "row-span-6",
};

/**
 * Slot en el lienzo Grid del panel: sin posiciones absolutas; solo span y tamaño mínimo.
 * `minWidth` ≤ 12 → columnas; si no, ancho mínimo en px vía style.
 * `minHeight` ≤ 6 → `row-span-*`; si mayor, `min-h-[npx]`.
 */
export function boxGridClassName(layout: IFiferBoxManifest["layout"]): string {
  const { minWidth, minHeight } = layout;
  const col =
    minWidth <= 12 && minWidth >= 1
      ? COL_SPAN[minWidth] ?? "col-span-12"
      : "col-span-12 min-w-0";

  let row = "";
  let minH = "";
  if (minHeight >= 1 && minHeight <= 6) {
    row = ROW_SPAN[minHeight] ?? "";
  } else if (minHeight > 6) {
    minH = `min-h-[${minHeight}px]`;
  }

  return clsx(col, row, minH, "relative flex min-h-0 flex-col");
}

export function boxGridInlineStyle(
  layout: IFiferBoxManifest["layout"]
): CSSProperties {
  const { minWidth } = layout;
  if (minWidth > 12) {
    return { minWidth: `${minWidth}px`, width: "100%", maxWidth: "100%" };
  }
  return {};
}

import { clsx } from "clsx";
import type { CSSProperties, ReactNode } from "react";
import type { BoxLoaderChildStack } from "./BoxLoaderIntegrationBoundary";

type Props = {
  childStack: BoxLoaderChildStack;
  /** Refuerzo de color de texto por variable (el `<section>` ya expone `--fifer-box-on-surface`). */
  style?: CSSProperties;
  children: ReactNode;
};

/**
 * Aísla el árbol del Box respecto al shell Lovable: v0 usa `contents` para no añadir flex extra;
 * Lovable usa `isolate` + `contain` + color base vía CSS variables para reducir choques con clases globales.
 */
export function BoxContentShell({ childStack, style, children }: Props) {
  return (
    <div
      data-fifer-box-content-root
      className={clsx(
        "min-w-0",
        childStack === "v0" &&
          "contents text-[color:var(--fifer-box-on-surface,#e4e4e7)] antialiased",
        childStack === "lovable" &&
          clsx(
            "isolate flex min-h-0 min-w-0 flex-1 flex-col rounded-[length:var(--fifer-box-radius,0.75rem)]",
            "border border-[color:var(--fifer-box-border,rgb(39_39_42))] bg-[color:var(--fifer-box-surface,transparent)]",
            "p-0 text-[color:var(--fifer-box-on-surface,#e4e4e7)] shadow-none ring-0 [contain:layout_style]",
            "antialiased"
          )
      )}
      style={style}
    >
      {children}
    </div>
  );
}

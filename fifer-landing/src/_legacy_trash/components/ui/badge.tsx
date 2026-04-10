import { clsx } from "clsx";
import React from "react";

export function Badge({
  className,
  children,
  tone = "default",
}: {
  className?: string;
  children: React.ReactNode;
  tone?: "default" | "yellow" | "muted";
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "default" && "bg-zinc-800 text-zinc-200",
        tone === "yellow" && "bg-fifer-yellow/15 text-fifer-yellow ring-1 ring-fifer-yellow/40",
        tone === "muted" && "bg-zinc-900 text-zinc-400",
        className
      )}
    >
      {children}
    </span>
  );
}

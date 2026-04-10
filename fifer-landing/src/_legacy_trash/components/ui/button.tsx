import { clsx } from "clsx";
import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={clsx(
        "inline-flex items-center justify-center rounded-xl font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fifer-yellow disabled:opacity-50",
        variant === "primary" &&
          "bg-fifer-yellow text-black hover:bg-[#ca8a04] active:bg-[#a16207]",
        variant === "secondary" &&
          "border border-zinc-600 bg-fifer-card text-zinc-100 hover:bg-zinc-800",
        variant === "ghost" && "bg-transparent text-zinc-200 hover:bg-zinc-800/80",
        variant === "destructive" && "bg-red-700 text-white hover:bg-red-600",
        size === "sm" && "px-3 py-1.5 text-sm",
        size === "md" && "px-4 py-2.5 text-sm",
        size === "lg" && "px-6 py-3 text-base",
        className
      )}
      {...props}
    />
  );
}

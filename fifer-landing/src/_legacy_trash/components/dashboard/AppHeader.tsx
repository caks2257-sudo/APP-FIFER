"use client";

import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

const titles: [string, string][] = [
  ["/settings", "Ajustes IA"],
  ["/finance", "Finanzas"],
  ["/affiliates", "Afiliados (Feed)"],
  ["/campaigns", "Campañas"],
  ["/dashboard", "Panel de control"],
];

export function AppHeader() {
  const pathname = usePathname() || "";
  const title =
    titles.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] ?? "FIFER";

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-[var(--dashboard-border)] bg-[var(--dashboard-header)]/95 px-4 backdrop-blur-md md:px-6">
      <h1 className="truncate text-lg font-semibold text-zinc-50">{title}</h1>
      <div className="flex items-center gap-2">
        <span className="hidden rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-400 sm:inline">
          API v1
        </span>
        <button
          type="button"
          className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          aria-label="Notificaciones"
        >
          <Bell className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

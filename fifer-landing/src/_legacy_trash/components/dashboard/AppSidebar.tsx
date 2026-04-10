"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  Megaphone,
  History,
  Users,
  Wallet,
  Settings,
  ArrowLeft,
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard },
  { href: "/campaigns", label: "Campañas", icon: Megaphone },
  { href: "/campaigns/history", label: "Historial campañas", icon: History },
  { href: "/affiliates", label: "Afiliados", icon: Users },
  { href: "/finance", label: "Finanzas", icon: Wallet },
  { href: "/settings", label: "Ajustes IA", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-[var(--dashboard-border)] bg-[var(--dashboard-sidebar)]">
      <div className="flex h-14 items-center gap-2 border-b border-[var(--dashboard-border)] px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-fifer-yellow/15 text-fifer-yellow">
          <LayoutDashboard className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <span className="block truncate text-sm font-semibold tracking-tight text-zinc-50">
            FIFER
          </span>
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">Command Center</span>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {nav.map((item) => {
          const active =
            pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(`${item.href}/`));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-fifer-yellow text-zinc-950 shadow-sm shadow-fifer-yellow/20"
                  : "text-zinc-400 hover:bg-zinc-800/80 hover:text-fifer-yellow"
              )}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-[var(--dashboard-border)] p-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs text-zinc-500 transition-colors hover:text-fifer-yellow"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Sitio público
        </Link>
      </div>
    </aside>
  );
}

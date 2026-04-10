"use client";

import type { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <AppHeader />
        <main className="flex-1 overflow-y-auto bg-[var(--dashboard-canvas)]">
          <div className="mx-auto max-w-6xl px-4 py-8 pb-16 md:px-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

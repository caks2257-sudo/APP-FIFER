"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { PageOrchestrator } from "@/components/core/PageOrchestrator";
import { moduleConfigs } from "@/modules";
import { FIFER_BOX_CATALOG_BY_ID } from "@/registry/box-catalog";
import type { IFiferBoxManifest } from "@/types/fifer-box";
import type { SlotDictionary } from "@/types/architecture";

function parseModuleRoute(pathname: string | null): { moduleId: string; routePath: string } {
  const parts = String(pathname || "/")
    .split("/")
    .filter(Boolean);
  if (parts.length === 0) return { moduleId: "dashboard", routePath: "/" };
  const moduleId = parts[0].toLowerCase();
  const routePath = `/${parts.slice(1).join("/")}`.replace(/\/+$/, "") || "/";
  return { moduleId, routePath };
}

export function DashboardStatsRail() {
  const pathname = usePathname();
  const ctx = useMemo(() => parseModuleRoute(pathname), [pathname]);

  const rail = useMemo(() => {
    const mod = moduleConfigs.find((m) => m.id === ctx.moduleId);
    const route = mod?.routes.find((r) => ((String(r.path || "/").replace(/\/+$/, "") || "/") === ctx.routePath));
    const preferredStatsSlot = route?.slots["slot-stats-grid"];
    const dynamicStatsSlot =
      preferredStatsSlot ??
      Object.entries(route?.slots ?? {}).find(([slotName]) => slotName.toLowerCase().includes("stats"))?.[1] ??
      [];
    const fallbackFromModule =
      mod?.routes
        .map((r) => r.slots["slot-stats-grid"])
        .find((slotBoxes) => Array.isArray(slotBoxes) && slotBoxes.length > 0) ?? [];

    const candidates = dynamicStatsSlot.length ? dynamicStatsSlot : fallbackFromModule;
    const slots: SlotDictionary = { "slot-stats-grid": candidates };
    const manifests: Partial<Record<string, IFiferBoxManifest>> = Object.fromEntries(
      candidates
        .map((boxId) => [boxId, FIFER_BOX_CATALOG_BY_ID[boxId]])
        .filter(([, manifest]) => Boolean(manifest))
    );
    return { slots, manifests };
  }, [ctx.moduleId, ctx.routePath]);

  if (!rail.slots["slot-stats-grid"]?.length) return null;

  return (
    <PageOrchestrator
      moduleId={ctx.moduleId}
      routePath={`${ctx.routePath}::stats`}
      slots={rail.slots}
      manifests={rail.manifests}
    />
  );
}

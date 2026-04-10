import { notFound } from "next/navigation";
import { moduleConfigs } from "@/modules";
import { PageOrchestrator } from "@/components/core/PageOrchestrator";

export default function DashboardDynamicRoute({
  params,
}: {
  params: { module: string; submodule?: string[] };
}) {
  const moduleId = String(params.module || "").toLowerCase();
  const subPath = `/${(params.submodule || []).join("/")}`.replace(/\/+$/, "") || "/";

  const mod = moduleConfigs.find((m) => m.id === moduleId);
  if (!mod) return notFound();

  const route = mod.routes.find((r) => {
    const normalized = String(r.path || "/").replace(/\/+$/, "") || "/";
    return normalized === subPath;
  });
  if (!route) return notFound();

  return (
    <PageOrchestrator moduleId={moduleId} routePath={subPath} slots={route.slots} />
  );
}

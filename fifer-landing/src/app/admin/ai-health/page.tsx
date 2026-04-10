import type { Metadata } from "next";
import { AiHealthAdminDashboard } from "@/components/admin/AiHealthAdminDashboard";
import { getAiHealthSnapshot } from "@/lib/admin/ai-health-snapshot";
import { refreshEngineCatalogFromDatabase } from "@/lib/ai/engine-catalog-db";
import { getActiveEngines } from "@/lib/ai/engine-manifest";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Health — FIFER Admin",
  robots: { index: false, follow: false },
};

export default async function AdminAiHealthPage() {
  await refreshEngineCatalogFromDatabase();
  const snapshot = getAiHealthSnapshot();
  const initialEngines = [...getActiveEngines()];
  return <AiHealthAdminDashboard initialSnapshot={snapshot} initialEngines={initialEngines} />;
}

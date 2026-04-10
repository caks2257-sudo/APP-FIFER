import type { Metadata } from "next";
import { AiTelemetryCommandCenter } from "@/components/admin/telemetry/AiTelemetryCommandCenter";
import { getTelemetryDashboardPayload } from "@/lib/admin/telemetry-dashboard-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Command Center — FIFER Admin",
  robots: { index: false, follow: false },
};

export default async function AdminTelemetryPage() {
  const payload = await getTelemetryDashboardPayload();
  return <AiTelemetryCommandCenter payload={payload} showNav />;
}

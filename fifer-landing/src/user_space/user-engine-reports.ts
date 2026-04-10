/**
 * Reportes de motores en user_space — mapa generado por autodescubrimiento.
 * Tras añadir o editar `engine_report.json`, ejecutar `npm run fifer:discover-engines`.
 */
import type { UserEngineReport } from "@/schemas/engine-report.schema";
import { USER_ENGINE_REPORTS as USER_ENGINE_REPORTS_MAP } from "@/user_space/user-engine-reports.generated";

export { USER_ENGINE_REPORTS } from "@/user_space/user-engine-reports.generated";
export type { UserEngineReport, UserEngineRisk } from "@/schemas/engine-report.schema";

/** Slugs con reporte en el mapa generado (deduplicación en orquestador; sin depender de `fs`). */
export function listActiveUserEngineSlugs(): Set<string> {
  const s = new Set<string>();
  for (const r of Object.values(USER_ENGINE_REPORTS_MAP)) {
    if (r?.id) s.add(r.id);
  }
  return s;
}

export function activeUserEngineSlugsFromReports(reports: Partial<Record<string, UserEngineReport>>): Set<string> {
  const out = new Set<string>();
  for (const r of Object.values(reports)) {
    if (r?.id) out.add(r.id);
  }
  return out;
}

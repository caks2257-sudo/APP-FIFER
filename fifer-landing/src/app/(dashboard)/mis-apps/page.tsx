import { LayoutGrid, Lock } from "lucide-react";
import Link from "next/link";
import { EvolutionAuditPanel } from "@/components/mis-apps/EvolutionAuditPanel";
import { MisAppsOrchestratorChat } from "@/components/mis-apps/MisAppsOrchestratorChat";
import type { UserEngineRisk } from "@/schemas/engine-report.schema";
import { USER_ENGINE_REPORTS } from "@/user_space/user-engine-reports";
import { USER_SPACE_BOX_CATALOG_ENTRIES, USER_SPACE_MOCK_SAMPLE_SCRAPER_BOX_ID } from "@/user_space/user-space-manifests";

function AuditStatusBadge({ risk }: { risk: UserEngineRisk }) {
  const styles: Record<UserEngineRisk, string> = {
    low: "border-emerald-500/35 bg-emerald-500/10 text-emerald-400",
    medium: "border-amber-500/35 bg-amber-500/10 text-amber-300",
    high: "border-red-500/40 bg-red-500/10 text-red-400",
  };
  const labels: Record<UserEngineRisk, string> = {
    low: "Seguro",
    medium: "Revisión IA",
    high: "Requiere API Key / Vault",
  };
  return (
    <span
      className={`rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase ${styles[risk]}`}
      title="Estado de auditoría (engine_report.json)"
    >
      {labels[risk]}
    </span>
  );
}

const MIS_APP_LINKS: Partial<Record<string, string>> = {
  [USER_SPACE_MOCK_SAMPLE_SCRAPER_BOX_ID]: "/scraping",
};

export default function MisAppsPage() {
  const discoveredApps = Object.entries(USER_ENGINE_REPORTS).filter(([, r]) => r != null) as [
    string,
    NonNullable<(typeof USER_ENGINE_REPORTS)[string]>,
  ][];

  return (
    <div className="grid grid-cols-12 gap-4" data-route="mis-apps">
      <div className="col-span-12 flex items-center justify-between gap-3 border-b border-[#EAB308]/15 pb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#EAB308]">Living OS</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-zinc-100">Mis Apps</h1>
          <p className="mt-1 max-w-2xl text-[13px] text-zinc-500">
            Dashboard de creación: tus motores en user_space y el orquestador para detectar cuándo hace falta un engine
            nuevo frente al catálogo oficial.
          </p>
        </div>
      </div>

      {process.env.NODE_ENV === "development" ? (
        <div className="col-span-12">
          <EvolutionAuditPanel />
        </div>
      ) : null}

      <div className="col-span-12 xl:col-span-8">
        <section aria-label="Apps del usuario">
          <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-zinc-500">Tus apps</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {discoveredApps.length === 0 ? (
              <li className="col-span-2 rounded-lg border border-zinc-700/50 bg-[#0f172a]/30 p-4 text-[12px] text-zinc-500">
                No hay motores descubiertos. Ejecuta <code className="text-zinc-400">npm run fifer:discover-engines</code> tras
                añadir <code className="text-zinc-400">engine_report.json</code> bajo <code className="text-zinc-400">user_space/.../engines/</code>.
              </li>
            ) : null}
            {discoveredApps.map(([boxId, report]) => {
              const catalog = USER_SPACE_BOX_CATALOG_ENTRIES[boxId as keyof typeof USER_SPACE_BOX_CATALOG_ENTRIES];
              const href = MIS_APP_LINKS[boxId];
              return (
                <li key={boxId}>
                  <article
                    className="flex h-full flex-col rounded-[0.75rem] border border-[#EAB308]/20 bg-[#111827]/50 p-4"
                    data-app-state="idle"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <LayoutGrid className="h-5 w-5 shrink-0 text-[#EAB308]" aria-hidden />
                      <div className="flex flex-col items-end gap-1">
                        <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase text-emerald-400">
                          idle
                        </span>
                        <AuditStatusBadge risk={report.risk} />
                      </div>
                    </div>
                    <h3 className="mt-3 font-semibold text-zinc-100">{report.name}</h3>
                    <p className="mt-1 flex-1 text-[12px] leading-relaxed text-zinc-500">
                      {catalog ? `Catálogo: ${catalog.variant}. ` : null}
                      boxId: <code className="text-[11px] text-zinc-400">{boxId}</code>
                    </p>
                    {href ? (
                      <Link
                        href={href}
                        className="mt-4 inline-flex w-fit items-center text-[12px] font-medium text-[#FDE68A] hover:text-[#EAB308]"
                      >
                        Abrir módulo →
                      </Link>
                    ) : null}
                  </article>
                </li>
              );
            })}
            <li>
              <article
                className="flex h-full flex-col rounded-[0.75rem] border border-zinc-700/60 bg-[#0f172a]/40 p-4 opacity-90"
                data-app-state="locked"
              >
                <div className="flex items-start justify-between gap-2">
                  <Lock className="h-5 w-5 shrink-0 text-zinc-500" aria-hidden />
                  <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium uppercase text-amber-400">
                    locked
                  </span>
                </div>
                <h3 className="mt-3 font-semibold text-zinc-300">Motor Pro · Analytics</h3>
                <p className="mt-1 flex-1 text-[12px] leading-relaxed text-zinc-600">
                  Requiere tier Pro / BYOK. Placeholder para futuros engines del espacio de usuario.
                </p>
                <span className="mt-4 text-[11px] text-zinc-600">No disponible en esta fase.</span>
              </article>
            </li>
          </ul>
        </section>
      </div>

      <div className="col-span-12 xl:col-span-4">
        <MisAppsOrchestratorChat />
      </div>
    </div>
  );
}

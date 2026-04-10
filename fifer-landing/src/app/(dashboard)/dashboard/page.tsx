import { municipalPermitsMock } from "@/mock-data/municipal_permits.mock";

/**
 * Dashboard principal (`/dashboard`).
 * Los datos mock están importados para cablear SmartBoxes sin fetch aún.
 */
export default function DashboardHomePage() {
  const profile = {
    nombre: "Arq. Valentina Rojas",
    rol: "Directora técnica de obra · Obras de urbanización",
    acreditacion: "Visadora DOM — Reg. RM-2024-7782 · Colegio de Arquitectos de Chile",
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="grid grid-cols-12 gap-4 rounded-xl border border-[#EAB308]/20 bg-[#0A0F1E]/90 p-4 shadow-sm">
        <div className="col-span-12 flex flex-col gap-2 border-b border-[#EAB308]/15 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-fifer-heading text-sm font-semibold tracking-tight text-white">
              {profile.nombre}
            </p>
            <p className="mt-0.5 font-fifer-body text-xs text-slate-400">{profile.rol}</p>
          </div>
          <p className="max-w-xl shrink-0 font-fifer-body text-xs leading-snug text-[#EAB308]/90">
            {profile.acreditacion}
          </p>
        </div>
      </header>

      <section
        className="grid grid-cols-12 gap-4"
        aria-label="Lienzo principal del tablero"
        data-dashboard-canvas
        data-mock-permits-count={municipalPermitsMock.length}
      >
        {/* TODO: Insertar SmartBoxes aquí para cuando integre los componentes generados. */}
      </section>
    </div>
  );
}

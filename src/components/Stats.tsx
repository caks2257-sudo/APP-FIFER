/** Bloque de estadísticas de marketing (distinto de StatsBox del registro). */
const figures = [
  { label: 'Equipos activos', value: '120+' },
  { label: 'Trámites gestionados', value: '48k' },
  { label: 'Tiempo ahorrado', value: '35%' },
];

export default function Stats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-12">
      {figures.map((f) => (
        <div
          key={f.label}
          className="rounded-xl border border-[#1F2937] bg-[#111827] px-6 py-8 text-center"
        >
          <p className="text-3xl font-bold text-[#EAB308]">{f.value}</p>
          <p className="mt-2 text-xs text-[#9CA3AF]">{f.label}</p>
        </div>
      ))}
    </div>
  );
}

const items = [
  { title: 'Expedientes unificados', body: 'Seguimiento de trámites y permisos en tiempo real.' },
  { title: 'Automatización', body: 'Menos fricción operativa en contenido y afiliados.' },
  { title: 'Reportes claros', body: 'Métricas listas para decisiones rápidas.' },
];

export default function Benefits() {
  return (
    <div className="grid gap-4 sm:grid-cols-3 py-8">
      {items.map((item) => (
        <div
          key={item.title}
          className="rounded-xl border border-[#1F2937] bg-[#111827] p-5 text-left"
        >
          <h3 className="text-sm font-semibold text-[#F9FAFB] mb-2">{item.title}</h3>
          <p className="text-xs text-[#9CA3AF] leading-relaxed">{item.body}</p>
        </div>
      ))}
    </div>
  );
}

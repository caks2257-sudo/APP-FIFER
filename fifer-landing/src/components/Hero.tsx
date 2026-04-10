export default function Hero() {
  return (
    <section className="relative overflow-hidden rounded-xl border border-[#1F2937] bg-[#111827] p-8 sm:p-12 mb-8">
      <div className="absolute inset-0 bg-gradient-to-br from-[#EAB308]/10 via-transparent to-transparent pointer-events-none rounded-xl" />
      <div className="relative max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-wider text-[#EAB308] mb-3">FIFER</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-[#F9FAFB] mb-4">
          Automatización deportiva y afiliados en un solo panel
        </h1>
        <p className="text-[#9CA3AF] text-sm sm:text-base leading-relaxed">
          Escala operaciones de contenido, permisos y expedientes con la misma experiencia Nevado Técnico que ves en el dashboard.
        </p>
      </div>
    </section>
  );
}

export default function CTA() {
  return (
    <div className="rounded-xl border border-[#1F2937] bg-gradient-to-r from-[#111827] to-[#0A0F1E] p-8 sm:p-10 text-center mb-8">
      <h2 className="text-xl font-semibold text-[#F9FAFB] mb-2">¿Listo para escalar con FIFER?</h2>
      <p className="text-sm text-[#9CA3AF] mb-6 max-w-lg mx-auto">
        Usa el mismo panel Nevado Técnico que ya tienes arriba: métricas, gráficos y actividad en un solo lugar.
      </p>
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-xl bg-[#EAB308] px-6 py-3 text-sm font-semibold text-[#0A0F1E] hover:bg-[#EAB308]/90 transition-colors"
      >
        Hablar con ventas
      </button>
    </div>
  );
}

const faqs = [
  { q: '¿Puedo integrar TikTok u otros canales?', a: 'Sí, el stack está preparado para conectores y OAuth.' },
  { q: '¿Hay período de prueba?', a: 'Consulta planes Pro y Enterprise para trials extendidos.' },
];

export default function FAQ() {
  return (
    <div className="space-y-3 py-8 max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold text-[#F9FAFB] text-center mb-6">Preguntas frecuentes</h2>
      {faqs.map((item) => (
        <details
          key={item.q}
          className="group rounded-xl border border-[#1F2937] bg-[#111827] px-4 py-3 open:bg-[#0A0F1E]/80"
        >
          <summary className="cursor-pointer text-sm font-medium text-[#F9FAFB] list-none flex justify-between items-center">
            {item.q}
            <span className="text-[#EAB308] text-lg leading-none group-open:rotate-45 transition-transform">
              +
            </span>
          </summary>
          <p className="mt-3 text-xs text-[#9CA3AF] leading-relaxed">{item.a}</p>
        </details>
      ))}
    </div>
  );
}

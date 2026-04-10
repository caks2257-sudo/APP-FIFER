const quotes = [
  { quote: 'Redujimos el tiempo de revisión a la mitad.', author: 'Ops — Club Norte' },
  { quote: 'El panel Nevado nos da claridad sin ruido visual.', author: 'CMO — Liga Regional' },
];

export default function Testimonials() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {quotes.map((q) => (
        <blockquote
          key={q.author}
          className="rounded-xl border border-[#1F2937] bg-[#111827] p-6"
        >
          <p className="text-sm text-[#F9FAFB] leading-relaxed">&ldquo;{q.quote}&rdquo;</p>
          <footer className="mt-4 text-xs text-[#6B7280]">{q.author}</footer>
        </blockquote>
      ))}
    </div>
  );
}

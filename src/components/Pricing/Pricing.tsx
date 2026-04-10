const plans = [
  { name: 'Starter', price: '$29', desc: 'Para equipos en crecimiento' },
  { name: 'Pro', price: '$79', desc: 'Automatización completa', highlight: true },
  { name: 'Enterprise', price: 'Custom', desc: 'SLA y soporte dedicado' },
];

export default function Pricing() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {plans.map((plan) => (
        <div
          key={plan.name}
          className={`rounded-xl border p-6 flex flex-col ${
            plan.highlight
              ? 'border-[#EAB308] bg-[#0A0F1E] shadow-lg shadow-[#EAB308]/10'
              : 'border-[#1F2937] bg-[#111827]'
          }`}
        >
          <h3 className="text-lg font-semibold text-[#F9FAFB]">{plan.name}</h3>
          <p className="mt-1 text-xs text-[#9CA3AF]">{plan.desc}</p>
          <p className="mt-4 text-2xl font-bold text-[#EAB308]">{plan.price}</p>
          <button
            type="button"
            className="mt-6 rounded-xl bg-[#EAB308] px-4 py-2.5 text-sm font-medium text-[#0A0F1E] hover:bg-[#EAB308]/90 transition-colors"
          >
            Elegir plan
          </button>
        </div>
      ))}
    </div>
  );
}

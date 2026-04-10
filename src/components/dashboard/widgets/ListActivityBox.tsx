type ListActivityBoxProps = {
  title: string;
  items: Array<{
    id: string;
    name: string;
    status: 'Aprobado' | 'En revision' | 'Pendiente';
    updatedAt: string;
  }>;
  isRefining?: boolean;
};

const statusStyles: Record<ListActivityBoxProps['items'][number]['status'], string> = {
  Aprobado: 'bg-[#EAB308]/15 text-[#EAB308]',
  'En revision': 'bg-[#334155] text-[#CBD5E1]',
  Pendiente: 'bg-[#1F2937] text-[#94A3B8]',
};

export default function ListActivityBox({ title, items, isRefining = false }: ListActivityBoxProps) {
  return (
    <article
      className={`rounded-xl border border-white/5 bg-[#1E293B] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${
        isRefining ? 'animate-pulse ring-1 ring-[#EAB308]/20' : ''
      }`}
    >
      <h2 className="font-title text-base font-semibold text-[#F9FAFB]">{title}</h2>
      <ul className="mt-5 space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-lg border border-white/5 bg-[#0A0F1E]/60 px-3 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-data text-sm font-medium text-[#E2E8F0]">{item.name}</p>
              <span className={`rounded-full px-2 py-1 font-data text-xs ${statusStyles[item.status]}`}>
                {item.status}
              </span>
            </div>
            <p className="mt-2 font-data text-xs text-[#94A3B8]">{item.updatedAt}</p>
          </li>
        ))}
      </ul>
    </article>
  );
}

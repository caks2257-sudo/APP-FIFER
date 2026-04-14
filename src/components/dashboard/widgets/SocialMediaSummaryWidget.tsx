"use client";

type SocialMediaSummaryWidgetProps = {
  context?: string;
};

const ABKUPFER_SOCIAL = [
  { channel: "Instagram", handle: "@abkupfer_pisos", reach: "12.4k", engagement: "4.2%", trend: "+8%" },
  { channel: "Facebook", handle: "AB Kupfer Pisos", reach: "6.1k", engagement: "2.1%", trend: "+3%" },
  { channel: "LinkedIn", handle: "AB Kupfer SpA", reach: "2.8k", engagement: "1.4%", trend: "+1%" },
] as const;

export function SocialMediaSummaryWidget({ context }: SocialMediaSummaryWidgetProps) {
  const isAbkupfer = context === "ab-kupfer";
  const rows = isAbkupfer ? ABKUPFER_SOCIAL : [];

  return (
    <div className="@container flex h-full w-full flex-col rounded-xl border border-gray-800 bg-[#0A1128] p-5 shadow-lg">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-gray-200">Redes y alcance</h3>
        {isAbkupfer ? (
          <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200/90">
            AB Kupfer
          </span>
        ) : null}
      </div>
      {!isAbkupfer ? (
        <p className="text-sm text-gray-500">Selecciona contexto de app para ver métricas.</p>
      ) : (
        <>
          <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
            {rows.map((row) => (
              <li
                key={row.channel}
                className="flex flex-col gap-1 rounded-lg border border-white/5 bg-black/20 px-3 py-2.5 @[360px]:flex-row @[360px]:items-center @[360px]:justify-between"
              >
                <div>
                  <p className="text-xs font-semibold text-gray-200">{row.channel}</p>
                  <p className="text-[11px] text-gray-500">{row.handle}</p>
                </div>
                <div className="flex flex-wrap gap-3 text-[11px] text-gray-400">
                  <span>
                    Alcance: <span className="font-mono text-gray-200">{row.reach}</span>
                  </span>
                  <span>
                    Eng.: <span className="font-mono text-emerald-300/90">{row.engagement}</span>
                  </span>
                  <span className="text-emerald-400/80">{row.trend} vs. mes ant.</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] p-3">
            <button
              type="button"
              disabled
              className="w-full cursor-not-allowed rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-left text-[11px] font-medium leading-snug text-amber-100/90"
            >
              ¿Vender estos pisos en automático?{" "}
              <span className="text-amber-200">[Conectar Shopify/Web Scraping]</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

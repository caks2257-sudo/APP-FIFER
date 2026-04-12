'use client';

import { useEffect, useRef } from 'react';

export type AodsLogEvent = {
  id: string;
  at: string;
  line: string;
};

type AodsTelemetryLogProps = {
  events: AodsLogEvent[];
  title?: string;
};

/**
 * Feed tipo consola — columna derecha AODS (Nevado Técnico).
 */
export function AodsTelemetryLog({
  events,
  title = 'Telemetría AODS',
}: AodsTelemetryLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events.length]);

  return (
    <aside
      className="flex h-full min-h-[280px] flex-col rounded-lg border border-white/[0.06] bg-[#04060d] ring-1 ring-slate-800/40"
      aria-label={title}
    >
      <div className="shrink-0 border-b border-white/[0.06] px-3 py-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </h3>
        <p className="text-[10px] text-slate-600">Eventos de sesión (consola)</p>
      </div>
      <div className="max-h-[min(520px,calc(100vh-220px))] min-h-[200px] flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 font-mono text-[11px] leading-relaxed">
        {events.length === 0 ? (
          <p className="px-1 text-slate-600">Esperando eventos…</p>
        ) : (
          events.map((e) => (
            <div
              key={e.id}
              className="border-b border-white/[0.04] py-1.5 pl-1 text-slate-300 last:border-b-0"
            >
              <span className="mr-2 shrink-0 text-[10px] text-slate-600">{e.at}</span>
              <span className="break-words text-emerald-400/90">{e.line}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} aria-hidden />
      </div>
    </aside>
  );
}

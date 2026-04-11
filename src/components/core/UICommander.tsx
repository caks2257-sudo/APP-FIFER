'use client';

import { useEffect, useMemo, useState } from 'react';
import { DASHBOARD_REFERENCE_WIDGETS } from '@/config/dashboardReferenceWidgets';
import { useLayoutStore } from '@/store/useLayoutStore';

const knownCommands = [
  '/uf',
  '/status',
  '/refine all',
  '/lock finance',
  '/unlock finance',
  '/hero content',
  '/limpiar-layout',
] as const;

export default function UICommander() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const triggerRefineAll = useLayoutStore((state) => state.triggerRefineAll);
  const setBoxLocked = useLayoutStore((state) => state.setBoxLocked);
  const setHeroMode = useLayoutStore((state) => state.setHeroMode);
  const clearLayoutForCommander = useLayoutStore((state) => state.clearLayoutForCommander);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const matches = useMemo(
    () => knownCommands.filter((command) => command.includes(query.trim().toLowerCase())),
    [query],
  );

  function runCommand() {
    const parsed = query.trim().toLowerCase();
    if (!knownCommands.includes(parsed as (typeof knownCommands)[number])) {
      setToast(`Comando no reconocido: ${parsed || '(vacío)'}`);
      return;
    }

    if (parsed === '/refine all') {
      triggerRefineAll(3000);
    } else if (parsed === '/limpiar-layout') {
      clearLayoutForCommander(DASHBOARD_REFERENCE_WIDGETS);
      setToast('Layout limpio — applyLayoutSanityForCommander (grid 12).');
      setQuery('');
      setIsOpen(false);
      return;
    } else if (parsed === '/lock finance') {
      setBoxLocked('finance-cashflow-chart', true);
    } else if (parsed === '/unlock finance') {
      setBoxLocked('finance-cashflow-chart', false);
    } else if (parsed === '/hero content') {
      setHeroMode('content-ingestion-form', true);
    } else if (parsed === '/status') {
      setToast('Estado del dashboard solicitado.');
      setQuery('');
      setIsOpen(false);
      return;
    } else if (parsed === '/uf') {
      setToast('Consulta de UF en cola.');
      setQuery('');
      setIsOpen(false);
      return;
    }

    setQuery('');
    setIsOpen(false);
    setToast(`Comando ejecutado: ${parsed}`);
  }

  if (!isOpen) {
    return toast ? (
      <div className="fixed bottom-6 right-6 z-[120] rounded-lg border border-[#EAB308]/30 bg-[#0A0F1E]/95 px-4 py-2 text-sm text-[#EAB308] shadow-lg">
        {toast}
      </div>
    ) : null;
  }

  return (
    <>
      <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      <div className="fixed left-1/2 top-24 z-[120] w-[min(680px,92vw)] -translate-x-1/2 rounded-2xl border border-white/10 bg-[#0A0F1E]/90 p-4 shadow-2xl">
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') runCommand();
          }}
          placeholder="/limpiar-layout, /refine all, /lock finance, /hero content..."
          className="w-full rounded-xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-[#F9FAFB] outline-none focus:border-[#EAB308]/60"
        />
        <div className="mt-3 space-y-1">
          {matches.map((command) => (
            <button
              key={command}
              type="button"
              onClick={() => {
                setQuery(command);
                if (command === '/limpiar-layout') {
                  clearLayoutForCommander(DASHBOARD_REFERENCE_WIDGETS);
                  setToast('Layout limpio — applyLayoutSanityForCommander (grid 12).');
                } else {
                  setToast(`Comando ejecutado: ${command}`);
                }
                setIsOpen(false);
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-[#CBD5E1] hover:bg-[#1E293B]"
            >
              {command}
            </button>
          ))}
        </div>
      </div>
      {toast && (
        <div className="fixed bottom-6 right-6 z-[120] rounded-lg border border-[#EAB308]/30 bg-[#0A0F1E]/95 px-4 py-2 text-sm text-[#EAB308] shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}

'use client';

import { MessageSquare, Send, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useOrchestratorIdeationStore } from '@/store/useOrchestratorIdeationStore';
import { useLayoutStore } from '@/store/useLayoutStore';
import { boxCircuitBreaker } from '@/utils/box-circuit-breaker';
import type { LayoutCommand } from '@/types/layout-command';

const IDEATE_PATH = '/api/v1/ai-orchestrator/ideate';
const ORCHESTRATOR_BOX_CIRCUIT = 'fifer-aods-orchestrator' as const;

export type MinimalistContextChatProps = {
  appContext: string;
};

function isOrchestratorContext(appContext: string): boolean {
  return appContext.trim().toLowerCase() === 'orquestador';
}

export default function MinimalistContextChat({ appContext }: MinimalistContextChatProps) {
  const orchestratorMode = isOrchestratorContext(appContext);

  const messages = useOrchestratorIdeationStore((s) => s.messages);
  const copilotLoading = useOrchestratorIdeationStore((s) => s.copilotLoading);
  const setCopilotLoading = useOrchestratorIdeationStore((s) => s.setCopilotLoading);
  const applyIdeationExchange = useOrchestratorIdeationStore((s) => s.applyIdeationExchange);

  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const sendingRef = useRef(false);
  const responseEndRef = useRef<HTMLDivElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    responseEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [response, loading]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, orchestratorMode]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || sendingRef.current) return;
    sendingRef.current = true;

    if (orchestratorMode) {
      setCopilotLoading(true);
      const messagesForApi = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: trimmed },
      ];
      try {
        const res = await fetch(IDEATE_PATH, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: messagesForApi }),
          credentials: 'same-origin',
        });
        const data = (await res.json()) as {
          reply?: string;
          mock?: boolean;
          error?: string;
        };
        if (!res.ok) {
          boxCircuitBreaker.recordFailure(ORCHESTRATOR_BOX_CIRCUIT);
          setResponse(data.error ?? `Error HTTP ${res.status}`);
          return;
        }
        boxCircuitBreaker.reset(ORCHESTRATOR_BOX_CIRCUIT);
        const reply = data.reply?.trim() ?? '';
        applyIdeationExchange(trimmed, reply);
        setInput('');
        setResponse('');
      } catch {
        setResponse('Error de red. Intenta de nuevo.');
      } finally {
        setCopilotLoading(false);
        sendingRef.current = false;
      }
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/shared-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, appContext }),
      });
      const data = (await res.json()) as {
        reply?: string;
        layoutCommand?: LayoutCommand;
        error?: unknown;
      };
      if (!res.ok) {
        const err = data.error;
        setResponse(
          typeof err === 'string'
            ? err
            : err !== undefined
              ? JSON.stringify(err)
              : 'No se pudo obtener respuesta.',
        );
        return;
      }
      if (data.layoutCommand) {
        useLayoutStore.getState().applyLayoutCommand(data.layoutCommand);
      }
      setResponse(data.reply ?? '');
      setInput('');
    } catch {
      setResponse('Error de red. Intenta de nuevo.');
    } finally {
      setLoading(false);
      sendingRef.current = false;
    }
  }, [appContext, input, orchestratorMode, messages, applyIdeationExchange, setCopilotLoading]);

  const inputDisabled = orchestratorMode ? copilotLoading : loading;

  return (
    <div className="relative z-10 w-full max-w-7xl shrink-0">
      {!isExpanded ? (
        <button
          type="button"
          aria-label={`Abrir copiloto contextual — ${appContext}`}
          className="group flex w-full items-center justify-center rounded-2xl border border-white/10 bg-[#0A0F1E]/40 px-4 py-3 shadow-sm backdrop-blur-xl transition hover:border-white/15"
          onClick={() => setIsExpanded(true)}
        >
          <MessageSquare
            className="h-6 w-6 shrink-0 text-white/80 transition duration-200 group-hover:text-[#EAB308] group-hover:drop-shadow-[0_0_12px_rgba(234,179,8,0.65)]"
            aria-hidden
          />
        </button>
      ) : (
        <div
          className="flex w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0A0F1E]/40 text-white shadow-lg backdrop-blur-xl"
          role="dialog"
          aria-label="Copiloto contextual"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <div className="flex items-center gap-2 text-sm font-medium text-white/90">
              <MessageSquare className="h-4 w-4 shrink-0 text-[#EAB308]" aria-hidden />
              <span className="truncate">Copiloto — {appContext}</span>
            </div>
            <button
              type="button"
              aria-label="Cerrar"
              className="rounded-lg p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
              onClick={() => setIsExpanded(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-52 min-h-[5rem] overflow-y-auto px-3 py-2 text-sm leading-relaxed text-white/85">
            {orchestratorMode ? (
              <>
                {messages.length === 0 && !copilotLoading ? (
                  <span className="text-white/45">
                    Escribe abajo; el visor del orquestador se sincroniza al recibir respuesta.
                  </span>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {messages.map((m, i) => (
                      <li
                        key={`${i}-${m.role}-${m.content.slice(0, 20)}`}
                        className={`rounded-md px-2 py-1.5 text-[13px] ${
                          m.role === 'user'
                            ? 'border border-[#EAB308]/15 bg-black/20 text-slate-100'
                            : 'border border-white/5 bg-white/[0.04] text-slate-300'
                        }`}
                      >
                        <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          {m.role === 'user' ? 'Tú' : 'Arquitecto'}
                        </span>
                        <span className="whitespace-pre-wrap break-words">{m.content}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {copilotLoading ? (
                  <p className="mt-2 text-[12px] text-[#EAB308]/90">Pensando…</p>
                ) : null}
                {response ? (
                  <p className="mt-2 text-[12px] text-amber-200/90" role="status">
                    {response}
                  </p>
                ) : null}
                <div ref={threadEndRef} aria-hidden />
              </>
            ) : loading ? (
              <span className="text-white/50">Pensando…</span>
            ) : response ? (
              response
            ) : (
              <span className="text-white/45">Escribe un mensaje para el copiloto.</span>
            )}
            {!orchestratorMode ? <div ref={responseEndRef} aria-hidden /> : null}
          </div>

          <div className="flex gap-2 border-t border-white/10 p-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Mensaje…"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-white/25 focus:outline-none focus:ring-1 focus:ring-white/20"
              disabled={inputDisabled}
            />
            <button
              type="button"
              aria-label="Enviar"
              disabled={inputDisabled || !input.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white transition hover:bg-white/15 disabled:opacity-40"
              onClick={() => void handleSend()}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { MessageSquare, Send, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import type {
  CashFlowReport,
  FintocAccount,
} from '@/components/dashboard/widgets/contracts';
import { useOrchestratorIdeationStore } from '@/store/useOrchestratorIdeationStore';
import { useLayoutStore } from '@/store/useLayoutStore';
import { useUIStore } from '@/store/ui-store';
import { boxCircuitBreaker } from '@/utils/box-circuit-breaker';
import type { LayoutCommand } from '@/types/layout-command';
import { warRoomConfigSchema, type WarRoomConfig } from '@/types/war-room';

const IDEATE_PATH = '/api/v1/ai-orchestrator/ideate';
const ORCHESTRATOR_BOX_CIRCUIT = 'fifer-aods-orchestrator' as const;

type SharedChatMessage = { role: 'user' | 'assistant'; content: string };

export type MinimalistContextChatProps = {
  appContext: string;
};

function isOrchestratorContext(appContext: string): boolean {
  return appContext.trim().toLowerCase() === 'orquestador';
}

function parsePathContext(pathname: string): { locale: string; currentContext: string } {
  const segments = pathname.split('/').filter(Boolean);
  const locale = segments[0] ?? 'es-CL';
  const currentContext = segments[1] ?? 'dashboard';
  return { locale, currentContext };
}

export default function MinimalistContextChat({ appContext }: MinimalistContextChatProps) {
  const orchestratorMode = isOrchestratorContext(appContext);
  const pathname = usePathname();
  const router = useRouter();
  const { locale, currentContext } = parsePathContext(pathname);

  const messages = useOrchestratorIdeationStore((s) => s.messages);
  const copilotLoading = useOrchestratorIdeationStore((s) => s.copilotLoading);
  const setCopilotLoading = useOrchestratorIdeationStore((s) => s.setCopilotLoading);
  const applyIdeationExchange = useOrchestratorIdeationStore((s) => s.applyIdeationExchange);

  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  /** Diálogo textual del copiloto (dashboard); los widgets van al overlay global. */
  const [chatThread, setChatThread] = useState<SharedChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const sendingRef = useRef(false);
  const responseEndRef = useRef<HTMLDivElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    responseEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatThread.length, loading, response]);

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
    const classifierMessages = [
      ...chatThread.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: trimmed },
    ];
    setChatThread((prev) => [...prev, { role: 'user', content: trimmed }]);
    try {
      const res = await fetch('/api/v1/ai-orchestrator/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: classifierMessages,
          currentContext,
          locale,
          appContext,
        }),
      });
      const raw: unknown = await res.json();
      const data = raw as Record<string, unknown>;
      if (!res.ok) {
        const err = data.error;
        useUIStore.getState().setOverlayWidgets(null);
        setChatThread((prev) => [
          ...prev,
          {
            role: 'assistant',
            content:
              typeof err === 'string'
                ? err
                : err !== undefined
                  ? JSON.stringify(err)
                  : 'No se pudo obtener respuesta.',
          },
        ]);
        return;
      }

      const action = typeof data.action === 'string' ? data.action : '';

      // Solo NAVIGATE cambia la ruta; STREAM_UI / overlay nunca deben usar router.push.
      if (action === 'NAVIGATE' && typeof data.targetUrl === 'string') {
        useUIStore.getState().setOverlayWidgets(null);
        router.push(data.targetUrl);
        setChatThread((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `Redirigiendo a ${data.targetUrl}…`,
          },
        ]);
        setInput('');
        return;
      }

      if (action === 'TEXT_ONLY') {
        useUIStore.getState().setOverlayWidgets(null);
        const reply =
          typeof data.reply === 'string' && data.reply.trim() !== ''
            ? data.reply
            : typeof data.reasoning === 'string' && data.reasoning.trim() !== ''
              ? data.reasoning
              : 'No pude generar una respuesta en este momento.';
        setChatThread((prev) => [...prev, { role: 'assistant', content: reply }]);
        setInput('');
        return;
      }

      if (action === 'STREAM_UI' || action === 'GUIDED_OVERLAY') {
        const widgetsRaw = data.visualWidgets;
        let widgets = Array.isArray(widgetsRaw)
          ? widgetsRaw.filter((w): w is string => typeof w === 'string')
          : [];
        const financeRaw = data.finance;
        const finance =
          financeRaw != null && typeof financeRaw === 'object'
            ? (financeRaw as {
                fintocAccount?: FintocAccount;
                cashFlowReport?: CashFlowReport;
              })
            : undefined;
        const warRoomWidgetIds = new Set(['constructorWarRoom', 'appBlueprintWarRoom']);
        const overlayContext =
          typeof data.visualWidgetContext === 'string' && data.visualWidgetContext.trim() !== ''
            ? data.visualWidgetContext.trim()
            : null;
        let warRoomConfig: WarRoomConfig | null = null;
        if (widgets.some((w) => warRoomWidgetIds.has(w))) {
          const parsed = warRoomConfigSchema.safeParse(data.warRoomConfig);
          if (parsed.success) {
            warRoomConfig = parsed.data;
          } else {
            widgets = widgets.filter((w) => !warRoomWidgetIds.has(w));
          }
        }
        const hasWarRoomWidget = widgets.some((w) => warRoomWidgetIds.has(w));
        const replyText =
          typeof data.reply === 'string' && data.reply.trim() !== ''
            ? data.reply
            : typeof data.reasoning === 'string'
              ? data.reasoning
              : '';
        setChatThread((prev) => [...prev, { role: 'assistant', content: replyText }]);
        if (widgets.length > 0) {
          useUIStore.getState().setOverlayWidgets(
            widgets,
            finance,
            hasWarRoomWidget ? warRoomConfig : null,
            overlayContext,
          );
        } else {
          useUIStore.getState().setOverlayWidgets(null);
        }
        setInput('');
        return;
      }

      if (data.layoutCommand && typeof data.layoutCommand === 'object') {
        const cmd = data.layoutCommand as LayoutCommand;
        useLayoutStore.getState().applyLayoutCommand(cmd);
      }

      const replyText =
        typeof data.reply === 'string' && data.reply.trim() !== ''
          ? data.reply
          : typeof data.reasoning === 'string'
            ? data.reasoning
            : '';
      const vw = data.visualWidget;
      if (
        vw != null &&
        typeof vw === 'object' &&
        'kind' in vw &&
        (vw as { kind?: string }).kind === 'bank' &&
        'account' in vw &&
        (vw as { account?: FintocAccount }).account
      ) {
        useUIStore.getState().setOverlayWidgets(
          ['BankConnectionWidget'],
          { fintocAccount: (vw as { account: FintocAccount }).account },
        );
      } else if (
        vw != null &&
        typeof vw === 'object' &&
        'kind' in vw &&
        (vw as { kind?: string }).kind === 'cashflow' &&
        'report' in vw &&
        (vw as { report?: CashFlowReport }).report
      ) {
        useUIStore.getState().setOverlayWidgets(
          ['CashFlowWidget'],
          { cashFlowReport: (vw as { report: CashFlowReport }).report },
        );
      } else {
        useUIStore.getState().setOverlayWidgets(null);
      }

      setChatThread((prev) => [...prev, { role: 'assistant', content: replyText }]);
      setInput('');
    } catch {
      useUIStore.getState().setOverlayWidgets(null);
      setChatThread((prev) => [
        ...prev,
        { role: 'assistant', content: 'Error de red. Intenta de nuevo.' },
      ]);
    } finally {
      setLoading(false);
      sendingRef.current = false;
    }
  }, [
    appContext,
    input,
    orchestratorMode,
    messages,
    chatThread,
    applyIdeationExchange,
    setCopilotLoading,
    currentContext,
    locale,
    router,
  ]);

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
            ) : chatThread.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {chatThread.map((m, i) => (
                  <li
                    key={`${i}-${m.role}-${m.content.slice(0, 24)}`}
                    className={`rounded-md px-2 py-1.5 text-[13px] ${
                      m.role === 'user'
                        ? 'border border-[#EAB308]/15 bg-black/20 text-slate-100'
                        : 'border border-white/5 bg-white/[0.04] text-slate-300'
                    }`}
                  >
                    <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      {m.role === 'user' ? 'Tú' : 'Copiloto'}
                    </span>
                    <span className="whitespace-pre-wrap break-words">{m.content}</span>
                  </li>
                ))}
              </ul>
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

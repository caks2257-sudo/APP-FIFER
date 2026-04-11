'use client';

import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import BoxErrorBoundary from '@/components/core/BoxErrorBoundary';
import { runDualStageChatPipeline } from '@/lib/ai/runDualStageChatPipeline';
import { useUserDnaStore } from '@/store/useUserDnaStore';
import type { AppPreferences } from '@/types/user-dna';

export type SmartInsightWidgetProps = {
  moduleId: string;
  boxId: string;
  /** Contexto serializable del Box (métricas, payload BDUI, etc.). */
  contextData: unknown;
  systemInstruction: string;
};

type InsightStatus = 'idle' | 'refining' | 'success' | 'error';

const EMPTY_MODULE_PREFS: AppPreferences = {};

function SmartInsightWidgetInner({
  moduleId,
  boxId,
  contextData,
  systemInstruction,
}: SmartInsightWidgetProps) {
  const dna = useUserDnaStore((s) => s.fractalDNA[moduleId] ?? EMPTY_MODULE_PREFS);
  const core = useUserDnaStore((s) => s.coreProfile);

  /** `status` / `insight` / `errorMessage` solo mutan dentro de `generateInsight` (handlers de click), nunca en render. */
  const [status, setStatus] = useState<InsightStatus>('idle');
  const [insight, setInsight] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const generateInsight = useCallback(async () => {
    setErrorMessage('');
    setStatus('refining');
    try {
      const text = await runDualStageChatPipeline({
        moduleId,
        boxId,
        systemInstruction,
        contextData,
        dna,
        core,
      });
      setInsight(text);
      setStatus('success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al generar el insight';
      setErrorMessage(msg);
      setStatus('error');
    }
  }, [boxId, contextData, core, dna, moduleId, systemInstruction]);

  return (
    <div
      className="w-full rounded-xl border border-white/10 bg-[#0F172A]/80 p-4"
      data-box-id={boxId}
      data-module-id={moduleId}
    >
      {status === 'idle' && (
        <button
          type="button"
          onClick={() => void generateInsight()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#EAB308]/40 bg-[#0A0F1E] px-4 py-3 font-data text-sm font-medium text-[#F9FAFB] transition hover:border-[#EAB308]/70 hover:bg-[#0A0F1E]/90"
        >
          <Sparkles className="h-4 w-4 text-[#EAB308]" aria-hidden />
          Generar Insight Estratégico
        </button>
      )}

      {status === 'refining' && (
        <div
          className="flex flex-col items-center justify-center gap-3 py-8"
          role="status"
          aria-live="polite"
        >
          <motion.div
            animate={{ scale: [1, 1.08, 1], rotate: [0, 6, -6, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sparkles className="h-10 w-10 text-[#EAB308]" aria-hidden />
          </motion.div>
          <p className="font-data text-sm text-[#94A3B8]">Pulido de Prompt y Análisis...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-3">
          <div
            className="rounded-lg border-2 border-[#EAB308] bg-[#0A0F1E] p-4 font-data text-sm leading-relaxed text-[#E2E8F0]"
            role="region"
            aria-label="Insight estratégico"
          >
            {insight}
          </div>
          <button
            type="button"
            onClick={() => void generateInsight()}
            className="text-xs font-medium text-[#EAB308]/90 underline-offset-2 hover:text-[#EAB308] hover:underline"
          >
            Regenerar
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-3">
          <p className="font-data text-sm text-red-300/90">{errorMessage}</p>
          <button
            type="button"
            onClick={() => void generateInsight()}
            className="rounded-lg border border-white/15 bg-[#1E293B] px-4 py-2 font-data text-sm text-[#F9FAFB] hover:bg-[#334155]"
          >
            Reintentar
          </button>
        </div>
      )}
    </div>
  );
}

/** Cerebro fractal: ADN + pipeline dual-stage, aislado con `BoxErrorBoundary`. */
export function SmartInsightWidget(props: SmartInsightWidgetProps) {
  return (
    <BoxErrorBoundary>
      <SmartInsightWidgetInner {...props} />
    </BoxErrorBoundary>
  );
}

export default SmartInsightWidget;

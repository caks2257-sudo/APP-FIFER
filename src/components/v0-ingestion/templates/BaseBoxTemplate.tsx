'use client';

import type { FC } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Loader2, Sparkles } from 'lucide-react';
import type { BoxProps } from '@/types/fifer-box';

/**
 * FIFER BASE BOX TEMPLATE - NEVADO TÉCNICO EDITION
 *
 */
export const BaseBoxTemplate: FC<BoxProps> = ({
  data,
  config,
  isLoading,
  isRefining,
  isLocked,
  children,
}) => {
  const hasData = Boolean(data && Object.keys(data).length > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative h-full min-h-[200px] w-full overflow-hidden rounded-[0.75rem] border border-[#EAB308]/20 bg-[#0A0F1E] p-4 transition-all duration-300 hover:border-[#EAB308]/40"
    >
      <AnimatePresence>
        {isRefining && (
          <motion.div
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0A0F1E]/90 p-6 text-center backdrop-blur-sm"
          >
            <Sparkles className="mb-3 h-8 w-8 animate-pulse text-[#EAB308]" />
            <h4 className="text-lg font-bold tracking-tight text-[#EAB308]">Pulido de Prompt...</h4>
            <p className="max-w-[200px] text-sm text-gray-400">Optimizando el motor FIFER para tus datos.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {isLocked && (
        <div className="absolute inset-0 z-30 m-2 flex items-center justify-center rounded-[0.5rem] border-2 border-dashed border-[#EAB308]/30 bg-[#0A0F1E]/80 backdrop-blur-md">
          <div className="text-center">
            <AlertCircle className="mx-auto mb-2 h-10 w-10 text-[#EAB308]" />
            <span className="font-medium text-white">Módulo Bloqueado</span>
          </div>
        </div>
      )}

      <div className={`flex h-full flex-col ${isLoading ? 'opacity-30' : 'opacity-100'}`}>
        <header className="mb-4 flex items-start justify-between">
          <h3 className="font-title text-sm font-bold uppercase tracking-wider text-[#EAB308]">
            {config?.title ?? 'Nuevo Módulo FIFER'}
          </h3>
        </header>

        <main className="min-h-0 flex-1 overflow-auto">
          {hasData ? (
            <div className="space-y-3 font-sans text-white">
              {children ?? <p>Datos listos para procesamiento BDUI.</p>}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm italic text-gray-500">
              Esperando señal de datos...
            </div>
          )}
        </main>
      </div>

      {isLoading && !isRefining && (
        <div className="absolute bottom-4 right-4">
          <Loader2 className="h-5 w-5 animate-spin text-[#EAB308]" />
        </div>
      )}
    </motion.div>
  );
};

export default BaseBoxTemplate;

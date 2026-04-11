import type { ReactNode } from 'react';

/**
 * Contrato BDUI compartido para cajas FIFER (plantillas y orquestación).
 */
export type BoxProps = {
  data?: Record<string, unknown>;
  config?: Record<string, unknown> & { title?: string };
  isLoading?: boolean;
  isRefining?: boolean;
  isLocked?: boolean;
  /** Cuerpo BDUI cuando hay datos (sustituye el placeholder por defecto del template). */
  children?: ReactNode;
};

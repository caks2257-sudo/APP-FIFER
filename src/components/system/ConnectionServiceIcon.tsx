'use client';

import type { LucideIcon } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

type Props = {
  name: string;
  className?: string;
};

/**
 * Resuelve un nombre de icono Lucide (p. ej. desde el Bridge) con fallback seguro.
 */
export default function ConnectionServiceIcon({ name, className }: Props) {
  const Cmp = (LucideIcons as unknown as Record<string, LucideIcon | undefined>)[name];
  const Icon = Cmp ?? LucideIcons.KeyRound;
  return <Icon className={className ?? 'h-9 w-9 shrink-0 text-[#EAB308]/85'} aria-hidden />;
}

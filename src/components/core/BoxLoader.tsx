import type { ReactNode } from 'react';
import type { BoxModule } from '@/registry/box-catalog';
import DiscoveryBox from './DiscoveryBox';

const moduleColor: Record<BoxModule, string> = {
  finance: '#10B981',
  content: '#3B82F6',
  contracts: '#EAB308',
  system: '#ef4444',
  inmobiliario: '#0F172A',
  bots: '#312E81',
};

function GhostSkeleton({ module }: { module: BoxModule }) {
  return (
    <div
      className="h-[220px] w-full animate-pulse rounded-xl border border-white/5 bg-[#1E293B]"
      style={{ boxShadow: `inset 0 0 0 1px ${moduleColor[module]}22` }}
    />
  );
}

function JITUpsellBanner() {
  return (
    <div className="flex h-[220px] w-full items-center justify-center rounded-xl border border-[#EAB308]/30 bg-[#1E293B] px-6 text-center">
      <p className="font-data text-sm text-[#EAB308]">Modulo PRO bloqueado. Activa JIT para desbloquear esta vista.</p>
    </div>
  );
}

type BoxLoaderProps = {
  module: BoxModule;
  isLoading?: boolean;
  hasError?: boolean;
  isLocked?: boolean;
  children: ReactNode;
};

export default function BoxLoader({
  module,
  isLoading = false,
  hasError = false,
  isLocked = false,
  children,
}: BoxLoaderProps) {
  if (isLoading) return <GhostSkeleton module={module} />;
  if (hasError) return <DiscoveryBox reason="error" />;
  if (isLocked) return <JITUpsellBanner />;
  return <>{children}</>;
}

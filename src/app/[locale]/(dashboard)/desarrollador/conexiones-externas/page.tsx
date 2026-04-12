'use client';

import BoxErrorBoundary from '@/components/core/BoxErrorBoundary';
import ExternalConnectionsPanel from '@/components/system/ExternalConnectionsPanel';
import { useExternalBridge } from '@/hooks/useExternalBridge';
import { useUserDnaStore } from '@/store/useUserDnaStore';

export default function ConexionesExternasPage() {
  const profile = useUserDnaStore((s) => s.coreProfile);
  const { loading, error, integrations, refresh } = useExternalBridge();

  if (profile.role !== 'admin') {
    return (
      <div className="rounded-lg border border-red-500/40 bg-[#0A0F1E]/90 p-6 text-center text-sm text-red-200">
        Acceso Denegado
      </div>
    );
  }

  return (
    <BoxErrorBoundary>
      <div className="min-h-[60vh] rounded-xl border border-[#EAB308]/20 bg-[#0A0F1E] p-6 md:p-8">
        <ExternalConnectionsPanel
          integrations={integrations}
          loading={loading}
          error={error}
          onRefresh={refresh}
        />
      </div>
    </BoxErrorBoundary>
  );
}

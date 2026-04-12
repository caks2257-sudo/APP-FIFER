'use client';

import { useCallback, useEffect, useState } from 'react';

export type ExternalBridgeCategory =
  | 'INTELIGENCIA_ARTIFICIAL'
  | 'FINANZAS_PAGOS'
  | 'ECOMMERCE'
  | 'INFRAESTRUCTURA'
  | 'REDES_SOCIALES';

export type ExternalBridgeIntegrationClient = {
  integrationId: string;
  envKey: string;
  label: string;
  category: ExternalBridgeCategory;
  mode: 'MOCK' | 'PROD';
  source: string;
  /** Lucide icon name (servidor) */
  iconKey?: string;
  groupId?: string;
  groupLabel?: string;
  fromDiscovery?: boolean;
};

type StatusPayload = {
  schemaVersion?: string;
  integrations?: ExternalBridgeIntegrationClient[];
  summary?: { mockCount: number; prodCount: number };
};

export function useExternalBridge() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<
    ExternalBridgeIntegrationClient[]
  >([]);
  const [summary, setSummary] = useState({ mockCount: 0, prodCount: 0 });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/external-bridge/status', {
        cache: 'no-store',
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as StatusPayload;
      setIntegrations(data.integrations ?? []);
      setSummary(
        data.summary ?? {
          mockCount: 0,
          prodCount: 0,
        },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red');
      setIntegrations([]);
      setSummary({ mockCount: 0, prodCount: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    loading,
    error,
    integrations,
    summary,
    refresh,
  };
}

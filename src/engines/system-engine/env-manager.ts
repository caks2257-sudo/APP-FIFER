'use server';

import { measureIntegrationLatency } from '@/engines/external-bridge-engine/pinger';

export type IntegrationHealthStatus = 'LIVE' | 'MOCK';
export type IntegrationPillar =
  | 'INFRAESTRUCTURA'
  | 'FINANZAS_PAGOS'
  | 'REDES_SOCIALES'
  | 'INTELIGENCIA_ARTIFICIAL';

export type IntegrationStatusRow = {
  id: 'tasklet' | 'fintoc' | 'make' | 'langgraph';
  name: string;
  pillar: IntegrationPillar;
  role: string;
  status: IntegrationHealthStatus;
  latencyMs: number;
};

function hasValue(raw: string | undefined): boolean {
  return Boolean(raw && raw.trim().length > 0);
}

function resolveStatus(...values: Array<string | undefined>): IntegrationHealthStatus {
  return values.some((v) => hasValue(v)) ? 'LIVE' : 'MOCK';
}

/**
 * §14 + §16 + §25.2.2
 * Lee sólo presencia de llaves/URLs en entorno. Nunca expone secretos.
 */
export async function getIntegrationsStatus(): Promise<IntegrationStatusRow[]> {
  const rows: Omit<IntegrationStatusRow, 'latencyMs'>[] = [
    {
      id: 'tasklet',
      name: 'Tasklet',
      pillar: 'INFRAESTRUCTURA',
      role: 'Orquestación de tareas operativas',
      status: resolveStatus(process.env.TASKLET_API_KEY, process.env.TASKLET_WEBHOOK_URL),
    },
    {
      id: 'fintoc',
      name: 'Fintoc',
      pillar: 'FINANZAS_PAGOS',
      role: 'Sincronización bancaria y conciliación',
      status: resolveStatus(
        process.env.FINTOC_API_KEY,
        process.env.FINTOC_SECRET_KEY,
        process.env.FINTOC_WEBHOOK_SECRET,
      ),
    },
    {
      id: 'make',
      name: 'Make',
      pillar: 'REDES_SOCIALES',
      role: 'Automatizaciones y conectores externos',
      status: resolveStatus(process.env.MAKE_API_KEY, process.env.MAKE_WEBHOOK_URL),
    },
    {
      id: 'langgraph',
      name: 'LangGraph',
      pillar: 'INTELIGENCIA_ARTIFICIAL',
      role: 'Navegación autónoma y flujos de agentes',
      status: resolveStatus(process.env.LANGGRAPH_API_KEY, process.env.LANGGRAPH_WEBHOOK_URL),
    },
  ];

  const withLatency = await Promise.all(
    rows.map(async (row) => ({
      ...row,
      latencyMs: await measureIntegrationLatency(row.id, row.status),
    })),
  );

  return withLatency;
}

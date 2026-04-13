/**
 * Sondas HTTP internas para `system-health` — extensible sin acoplar la UI a ids fijos.
 */
export type InternalHealthApiProbe = {
  id: string;
  path: string;
  label: string;
};

export const INTERNAL_HEALTH_API_PROBES: readonly InternalHealthApiProbe[] = [
  {
    id: 'fifer-core',
    path: '/api/python/health',
    label: 'GET FIFER core (proxy → NEXT_PUBLIC_FIFER_API_BASE/api/v1/core/health)',
  },
  { id: 'misbots', path: '/api/v1/misbots', label: 'GET /api/v1/misbots' },
  { id: 'contratos', path: '/api/v1/contratos', label: 'GET /api/v1/contratos' },
];

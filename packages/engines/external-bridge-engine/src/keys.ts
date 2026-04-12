/**
 * Variables de entorno reconocidas por el Bridge (servidor).
 * Nunca importar secretos en componentes cliente.
 */

export type BridgeIntegrationId = 'payments' | 'billing' | 'banking';

/**
 * Macro-Pilares obligatorios (§14 ADN) — taxonomía única del hub / External Bridge.
 * Debe coincidir con el orden del panel y con los bloques físicos del `.env` (§15).
 */
export const BRIDGE_MACRO_PILLARS = [
  'INTELIGENCIA_ARTIFICIAL',
  'FINANZAS_PAGOS',
  'ECOMMERCE',
  'INFRAESTRUCTURA',
  'REDES_SOCIALES',
] as const;

export type BridgeConnectionCategory = (typeof BRIDGE_MACRO_PILLARS)[number];

export type BridgeEnvBinding = {
  integrationId: BridgeIntegrationId;
  /** Nombre de variable en process.env */
  envKey: string;
  label: string;
  category: BridgeConnectionCategory;
};

export const BRIDGE_ENV_BINDINGS: BridgeEnvBinding[] = [
  {
    integrationId: 'payments',
    envKey: 'FLOW_API_KEY',
    label: 'Flow (pagos Chile)',
    category: 'FINANZAS_PAGOS',
  },
  {
    integrationId: 'billing',
    envKey: 'STRIPE_SECRET_KEY',
    label: 'Stripe (facturación)',
    category: 'FINANZAS_PAGOS',
  },
  {
    integrationId: 'banking',
    envKey: 'FINTOC_SECRET_KEY',
    label: 'Fintoc (banca / cuentas)',
    category: 'FINANZAS_PAGOS',
  },
];

export const PLACEHOLDER_KEY_MARKERS = new Set([
  '',
  'INSERT_KEY_HERE',
  'insert_key_here',
  'REPLACE_ME',
]);

export function isPlaceholderSecret(value: string | undefined | null): boolean {
  if (value == null) return true;
  const t = value.trim();
  if (!t) return true;
  if (PLACEHOLDER_KEY_MARKERS.has(t)) return true;
  if (PLACEHOLDER_KEY_MARKERS.has(t.toUpperCase())) return true;
  return false;
}

/**
 * Credenciales del External Bridge ya resueltas (mapa envKey → valor en claro).
 * Origen típico: JSON en Google Secret Manager o variables locales (.env / .env.local).
 */
export type ExternalBridgeVault = Readonly<Partial<Record<string, string>>>;

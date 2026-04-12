import {
  BRIDGE_ENV_BINDINGS,
  type BridgeIntegrationId,
  isPlaceholderSecret,
} from './keys';

export type ResolvedKey = {
  integrationId: BridgeIntegrationId;
  envKey: string;
  /** Valor efectivo o null si MOCK */
  secret: string | null;
  mode: 'MOCK' | 'PROD';
  /** Origen del valor efectivo cuando PROD */
  source: 'env' | 'vault' | 'none';
};

export type BridgeProxyConstructorOptions = {
  /** process.env slice o objeto inyectado en tests */
  env?: NodeJS.ProcessEnv;
  /** Valores por clave desde almacén cifrado (servidor), ya descifrados */
  vaultByEnvKey?: Partial<Record<string, string>>;
};

/**
 * Proxy central: inyecta variables de entorno y overrides de vault.
 * No registrar ni loguear valores de secretos.
 */
export class BridgeProxy {
  private readonly env: NodeJS.ProcessEnv;

  private readonly vaultByEnvKey: Partial<Record<string, string>>;

  constructor(options?: BridgeProxyConstructorOptions) {
    this.env = options?.env ?? process.env;
    this.vaultByEnvKey = options?.vaultByEnvKey ?? {};
  }

  resolveKey(envKey: string): ResolvedKey {
    const binding = BRIDGE_ENV_BINDINGS.find((b) => b.envKey === envKey);
    const integrationId: BridgeIntegrationId =
      binding?.integrationId ?? 'payments';

    const fromVault = this.vaultByEnvKey[envKey]?.trim();
    const fromEnv = this.env[envKey]?.trim();

    const raw = fromVault || fromEnv || '';
    if (isPlaceholderSecret(raw)) {
      return {
        integrationId,
        envKey,
        secret: null,
        mode: 'MOCK',
        source: 'none',
      };
    }

    return {
      integrationId,
      envKey,
      secret: raw,
      mode: 'PROD',
      source: fromVault ? 'vault' : 'env',
    };
  }

  snapshotAll(): ResolvedKey[] {
    const seen = new Set<string>();
    const out: ResolvedKey[] = [];
    for (const b of BRIDGE_ENV_BINDINGS) {
      if (seen.has(b.envKey)) continue;
      seen.add(b.envKey);
      out.push(this.resolveKey(b.envKey));
    }
    return out;
  }
}

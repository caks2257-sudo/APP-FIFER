export class VaultError extends Error {
  override name = "VaultError";
  constructor(
    message: string,
    public readonly details: {
      code: "missing_provider" | "unsupported_provider" | "missing_key";
      provider?: string;
      source?: "user_byok" | "admin_env";
    }
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export type AiProviderKey = "openai" | "leonardo" | "elevenlabs";

/**
 * Admin-First BYOK Vault.
 * 1) Futuro: intentar BYOK por usuario.
 * 2) Actual: fallback a `FIFER_ADMIN_*` en variables de entorno.
 */
export class AIVault {
  private static readonly ADMIN_ENV_BY_PROVIDER: Record<AiProviderKey, string> = {
    openai: "FIFER_ADMIN_OPENAI_KEY",
    leonardo: "FIFER_ADMIN_LEONARDO_KEY",
    elevenlabs: "FIFER_ADMIN_ELEVENLABS_KEY",
  };

  private static async resolveUserByok(
    _provider: AiProviderKey,
    _userId?: string
  ): Promise<string | null> {
    // TODO(BYOK): buscar llave cifrada por `userId` en base de datos segura.
    // Ejemplo futuro:
    // const row = await db.user_api_keys.findFirst({ where: { userId: _userId, provider: _provider } });
    // return row?.encrypted_key ? decrypt(row.encrypted_key) : null;
    return null;
  }

  /**
   * Resuelve llave de proveedor para uso interno del motor.
   * NUNCA expone ni exporta llaves fuera de esta interfaz.
   */
  static async resolveKey(provider: AiProviderKey, userId?: string): Promise<string> {
    const userKey = await AIVault.resolveUserByok(provider, userId);
    if (userKey && userKey.trim()) return userKey.trim();

    const envName = AIVault.ADMIN_ENV_BY_PROVIDER[provider];
    const adminKey = process.env[envName];
    if (!adminKey || !adminKey.trim()) {
      throw new VaultError(`Llave no configurada para proveedor ${provider}`, {
        code: "missing_key",
        provider,
        source: "admin_env",
      });
    }
    return adminKey.trim();
  }

  // Compatibilidad temporal con llamadas por instancia existentes.
  async resolveKey(provider: AiProviderKey, userId?: string): Promise<string> {
    return AIVault.resolveKey(provider, userId);
  }
}

export const aiVault = new AIVault();

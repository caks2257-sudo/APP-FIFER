/**
 * Registro central de Micro-Cores (motores) — Constitución v6.0 Fase 3–4.
 * Resolver en runtime sin tumbar la app: use() lanza Error controlado si falta o está apagado.
 */

export type EngineRegistrationOptions = {
  /** Por defecto true. false = motor registrado pero fuera de servicio. */
  enabled?: boolean;
};

type EngineSlot = {
  module: unknown;
  enabled: boolean;
};

const slots = new Map<string, EngineSlot>();

export class EngineRegistry {
  /**
   * Registra o sustituye un motor. Por defecto queda en servicio (`enabled: true`).
   */
  static register(
    engineId: string,
    engineModule: unknown,
    options?: EngineRegistrationOptions
  ): void {
    if (!engineId.trim()) {
      throw new Error(
        "[FIFER EngineRegistry] engineId no puede estar vacío."
      );
    }
    slots.set(engineId, {
      module: engineModule,
      enabled: options?.enabled !== false,
    });
  }

  /**
   * Activa o desactiva un motor ya registrado. Si no existe, no crea entrada.
   */
  static setEnabled(engineId: string, enabled: boolean): void {
    const slot = slots.get(engineId);
    if (!slot) return;
    slot.enabled = enabled;
  }

  static isRegistered(engineId: string): boolean {
    return slots.has(engineId);
  }

  static isInService(engineId: string): boolean {
    const slot = slots.get(engineId);
    return Boolean(slot?.enabled);
  }

  /**
   * Resuelve el motor tipado. Si no existe o está fuera de servicio, lanza Error explícito
   * (no assert ni excepciones no documentadas).
   */
  static use<T>(engineId: string): T {
    const slot = slots.get(engineId);
    if (!slot || !slot.enabled) {
      throw new Error(
        `[FIFER EngineRegistry] El motor '${engineId}' no está registrado o está fuera de servicio.`
      );
    }
    return slot.module as T;
  }

  /** Solo pruebas o herramientas internas: vacía el registro. */
  static __resetForTests(): void {
    slots.clear();
  }
}

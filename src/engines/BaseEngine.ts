import type { FiferNormalizedOutput, IFiferEngine } from "../types/fifer-engine";
import type { FiferEngineSerializableError } from "./discovery-types";
import { buildEngineError } from "./discovery-types";

export type EngineLogLevel = "info" | "warn" | "error";

/**
 * Contrato base para Universal Engines (§0.8 `.cursorrules`).
 * Logging estilo FIFER + errores serializables compatibles con `DiscoveryBox`.
 */
export abstract class BaseEngine implements IFiferEngine {
  abstract readonly engineId: string;

  protected get logTag(): string {
    return `[FIFER][Engine][${this.engineId}]`;
  }

  protected log(level: EngineLogLevel, message: string, meta?: Record<string, unknown>): void {
    const line = `${this.logTag} ${message}`;
    if (level === "info") {
      console.info(line, meta && Object.keys(meta).length ? meta : "");
      return;
    }
    if (level === "warn") {
      console.warn(line, meta && Object.keys(meta).length ? meta : "");
      return;
    }
    console.error(line, meta && Object.keys(meta).length ? meta : "");
  }

  protected toDiscoveryError(
    message: string,
    code: FiferEngineSerializableError["code"],
    httpStatus?: number
  ): FiferEngineSerializableError {
    return buildEngineError(message, code, httpStatus);
  }

  /**
   * Punto de entrada unificado (prompt maestro: `context`).
   * Las subclases tipan el payload vía genéricos en `execute` concreto.
   */
  abstract execute<T = unknown, R extends FiferNormalizedOutput = FiferNormalizedOutput>(payload: T): Promise<R>;
}

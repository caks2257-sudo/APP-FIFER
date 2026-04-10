/**
 * Alineado con `fifer-landing/src/components/core/DiscoveryBox.tsx` (`DiscoveryReason`).
 * El motor no importa desde Next para evitar dependencias circulares.
 */
export type FiferDiscoveryReason =
  | "error"
  | "no-data"
  | "jit-fail"
  | "render"
  | "wallet-empty"
  | "data-corrupt"
  | "circuit-open"
  | "credentials";

export type FiferEngineErrorCode =
  | "INVALID_URL"
  | "MISSING_URL"
  | "PROVIDER_UNKNOWN"
  | "CONTENT_REFINE_FAILED"
  | "CONTENT_EXEC_FAILED"
  | "CREDENTIALS_REQUIRED"
  | "UNKNOWN";

export interface FiferEngineSerializableError {
  message: string;
  code: FiferEngineErrorCode;
  /** Razón Ghost/Discovery para el shell (BoxLoader / DiscoveryBox). */
  discoveryReason: FiferDiscoveryReason;
  httpStatus?: number;
}

export function mapCodeToDiscoveryReason(code: FiferEngineErrorCode): FiferDiscoveryReason {
  switch (code) {
    case "MISSING_URL":
    case "INVALID_URL":
      return "no-data";
    case "CREDENTIALS_REQUIRED":
      return "credentials";
    case "CONTENT_REFINE_FAILED":
    case "CONTENT_EXEC_FAILED":
      return "error";
    case "PROVIDER_UNKNOWN":
      return "error";
    case "UNKNOWN":
    default:
      return "error";
  }
}

export function buildEngineError(
  message: string,
  code: FiferEngineErrorCode,
  httpStatus?: number
): FiferEngineSerializableError {
  return {
    message,
    code,
    discoveryReason: mapCodeToDiscoveryReason(code),
    httpStatus,
  };
}

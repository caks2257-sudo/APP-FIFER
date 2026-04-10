/** Errores HTTP explícitos para Discovery / integraciones (401 credenciales, 403 token). */

export class FiferHttpError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number, options?: ErrorOptions) {
    super(message, options);
    this.name = "FiferHttpError";
    this.statusCode = statusCode;
  }
}

const HTTP_IN_MESSAGE = /HTTP\s+(\d{3})\b/i;

export function parseHttpStatusFromMessage(message: string): number | undefined {
  const m = message.match(HTTP_IN_MESSAGE);
  if (!m) return undefined;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : undefined;
}

export function getHttpStatusFromError(err: unknown): number | undefined {
  if (err instanceof FiferHttpError) return err.statusCode;
  if (err && typeof err === "object" && "statusCode" in err) {
    const raw = (err as { statusCode: unknown }).statusCode;
    const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
    if (Number.isFinite(n) && n >= 400 && n < 600) return n;
  }
  if (err instanceof Error) {
    return parseHttpStatusFromMessage(err.message);
  }
  return undefined;
}

/** Convierte mensajes tipo `HTTP 401` del API master en `FiferHttpError` cuando aplica. */
export function toFiferDataBridgeError(message: string, fallbackMessage?: string): Error {
  const text = message || fallbackMessage || "API error";
  const status = parseHttpStatusFromMessage(text);
  if (status === 401 || status === 403) {
    return new FiferHttpError(text, status);
  }
  return new Error(text);
}

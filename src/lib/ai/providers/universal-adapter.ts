export type UniversalAiStatus = "ok" | "degraded";

export type UniversalAiEnvelope<T = unknown> = {
  ok: boolean;
  status: UniversalAiStatus;
  provider: string;
  taskType: "text" | "image" | "audio";
  data: T | null;
  error: string | null;
};

/**
 * Adaptador Universal backend: entrega contrato limpio y estable para frontend,
 * incluso cuando un proveedor externo falla.
 */
export function adaptAiProviderResponse<T>(
  provider: string,
  taskType: "text" | "image" | "audio",
  result: T
): UniversalAiEnvelope<T> {
  return {
    ok: true,
    status: "ok",
    provider,
    taskType,
    data: result,
    error: null,
  };
}

export function adaptAiProviderError(
  provider: string,
  taskType: "text" | "image" | "audio",
  err: unknown
): UniversalAiEnvelope<never> {
  const message = err instanceof Error ? err.message : "unknown_provider_error";
  return {
    ok: false,
    status: "degraded",
    provider,
    taskType,
    data: null,
    error: message,
  };
}

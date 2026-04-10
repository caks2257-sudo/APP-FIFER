/**
 * Aduana universal — `schema.safeParse(rawPayload)` antes de confiar en APIs externas.
 * @see `routeApiResponseToFiferBoxData` para el enrutador por módulo (bridge HTTP).
 */
import { z, type ZodError, type ZodTypeAny } from "zod";
import type { BoxProps } from "@/types/fifer-box";
import { FiferDataError } from "@/types/schemas";
import { toBoxPropsData } from "@/utils/adapters/to-box-props";
import { buildZodDegradedNormalized } from "@/utils/adapters/safe-fallback";
import type { FiferBoxDataNormalized } from "@/utils/adapters/types";

export type ToFiferBoxDataSchemaOptions = {
  /** Si true, lanza `FiferDataError` cuando `safeParse` falla (ErrorBoundary). Default false. */
  throwOnInvalid?: boolean;
  /** Fuente para el fallback degradado (default `generic`). */
  fallbackSource?: FiferBoxDataNormalized["source"];
  /** Título en fallback degradado. */
  fallbackTitle?: string;
};

/** Datos seguros para React cuando el esquema no coincide (tipado como `BoxProps["data"]`). */
export type SafeFallbackData = BoxProps["data"];

export type ToFiferBoxDataSchemaSuccess<T> = {
  success: true;
  data: T;
};

export type ToFiferBoxDataSchemaFailure = {
  success: false;
  data: SafeFallbackData;
  error: ZodError;
};

export type ToFiferBoxDataSchemaResult<T> =
  | ToFiferBoxDataSchemaSuccess<T>
  | ToFiferBoxDataSchemaFailure;

/**
 * Intenta `schema.safeParse(rawPayload)`.
 * - Éxito → `{ success: true, data }` (payload tipado).
 * - Fallo → log estructurado + `{ success: false, data: fallback degradado, error }`, o `throw new FiferDataError` si `throwOnInvalid`.
 */
export function toFiferBoxData<T extends ZodTypeAny>(
  rawPayload: unknown,
  schema: T,
  options?: ToFiferBoxDataSchemaOptions
): ToFiferBoxDataSchemaResult<z.infer<T>> {
  const parsed = schema.safeParse(rawPayload);

  if (parsed.success) {
    return { success: true, data: parsed.data };
  }

  const err = parsed.error;
  const structured = {
    issueCount: err.issues.length,
    issues: err.issues.map((i) => ({
      path: i.path.length ? i.path.join(".") : "root",
      code: i.code,
      message: i.message,
    })),
  };

  if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    console.error("[FIFER][UniversalAdapter] schema.safeParse failed", structured);
  } else {
    console.error("[FIFER][UniversalAdapter] schema.safeParse failed", {
      issueCount: structured.issueCount,
    });
  }

  if (options?.throwOnInvalid) {
    throw new FiferDataError("Payload no coincide con el esquema", err);
  }

  const normalized = buildZodDegradedNormalized(
    options?.fallbackSource ?? "generic",
    options?.fallbackTitle ?? "Datos",
    err,
    rawPayload
  );

  const fallbackData: SafeFallbackData = toBoxPropsData(normalized);

  return {
    success: false,
    data: fallbackData,
    error: err,
  };
}

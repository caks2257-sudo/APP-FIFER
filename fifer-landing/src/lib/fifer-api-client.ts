/**
 * Cliente HTTP hacia el motor Node FIFER (`npm run api` en la raíz del monorepo).
 * Inyecta `x-fifer-api-key` y traduce 401/403 del Gateway a estado de candado en UI.
 */
const BACKEND_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_FIFER_API_BASE_URL) ||
  "http://127.0.0.1:3999";

export type FiferEngineFetchResult<T = unknown> = {
  data?: T;
  isLocked: boolean;
  error?: string;
};

/**
 * Fetcher estandarizado hacia los Engines de FIFER.
 * Inyecta el API Key y maneja las respuestas de seguridad del Gateway.
 */
export async function fetchFiferEngine<T = unknown>(
  endpoint: string,
  apiKey?: string
): Promise<FiferEngineFetchResult<T>> {
  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (apiKey) {
      headers["x-fifer-api-key"] = apiKey;
    }

    const res = await fetch(`${BACKEND_URL.replace(/\/$/, "")}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (res.status === 401 || res.status === 403) {
      return { isLocked: true, error: "Acceso denegado por el Gateway" };
    }

    if (!res.ok) {
      return { isLocked: false, error: `Error HTTP: ${res.status}` };
    }

    const json = (await res.json()) as { data?: T };
    return { isLocked: false, data: json.data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error de red";
    return { isLocked: false, error: message };
  }
}

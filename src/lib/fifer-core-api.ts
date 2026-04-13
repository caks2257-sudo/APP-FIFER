/**
 * Cliente global del core FastAPI (Cloud Run).
 * Base: `process.env.NEXT_PUBLIC_FIFER_API_BASE` (origen sin barra final).
 * Rutas del servicio: `${BASE}/api/v1/core/...` (alineado con core-service `main.py`).
 *
 * Proxy opcional (mismo origen, sin CORS): `/api/python/*` → rewrite en `next.config.mjs`.
 */

/** Prefijo HTTP expuesto por el backend (siempre con barra inicial, sin barra final). */
export const FIFER_CORE_API_PREFIX = '/api/v1/core' as const;

/** Rewrite Next hacia Cloud Run (ruta relativa al host del front). */
export const FIFER_CORE_PROXY_PREFIX = '/api/python' as const;

/** Rutas relativas bajo `/api/v1/core` (sin barra inicial). */
export const FIFER_CORE_ROUTES = {
  health: 'health',
  authSync: 'auth/sync',
  voicesList: 'voices',
  voiceSelect: 'select-voice',
  voiceClone: 'clone-voice',
} as const;

/** `api/v1/core` sin slashes extremos (concatenación segura con `base`). */
const FIFER_API_PREFIX_TRIMMED = FIFER_CORE_API_PREFIX.replace(/^\/+|\/+$/g, '');

/**
 * Normaliza el origen: trim, sin barras finales y sin duplicar `/api/v1/core` en la base.
 */
export function normalizeFiferApiBaseUrl(raw: string): string {
  let t = raw.trim().replace(/\/+$/, '');
  t = t.replace(/\/api\/v1\/core$/i, '').replace(/\/+$/, '');
  return t;
}

/**
 * Origen público del core (`https://....run.app`).
 */
export function getFiferApiBase(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_FIFER_API_BASE?.trim();
  if (!raw) return undefined;
  return normalizeFiferApiBaseUrl(raw);
}

/**
 * Une segmentos de ruta sin duplicar `/`.
 */
function joinUrlPath(...parts: string[]): string {
  return parts
    .map((p) => p.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
}

/**
 * URL absoluta: `${NEXT_PUBLIC_FIFER_API_BASE}/api/v1/core/<ruta>`.
 * @param relativePath — ej. `health`, `auth/sync`, `voices`
 */
export function buildFiferCoreApiUrl(relativePath: string): string {
  const base = getFiferApiBase();
  if (!base) {
    throw new Error(
      'NEXT_PUBLIC_FIFER_API_BASE no está definida: no se puede construir la URL del core FIFER.',
    );
  }
  const suffix = joinUrlPath(relativePath);
  const core = FIFER_API_PREFIX_TRIMMED;
  return suffix ? `${base}/${core}/${suffix}` : `${base}/${core}`;
}

/**
 * Ruta same-origin hacia el proxy Next (`/api/python/...` → Cloud Run).
 */
export function buildFiferCoreProxyUrl(relativePath: string): string {
  const suffix = joinUrlPath(relativePath);
  const proxy = FIFER_CORE_PROXY_PREFIX.replace(/\/+$/, '');
  return suffix ? `${proxy}/${suffix}` : proxy;
}

/**
 * Cabeceras por defecto para JSON; con `FormData` no fuerza `Content-Type` (boundary multipart).
 */
export function buildFiferCoreRequestHeaders(init?: RequestInit): Headers {
  const out = new Headers();
  out.set('Accept', 'application/json');
  if (init?.headers) {
    const incoming = new Headers(init.headers as HeadersInit);
    incoming.forEach((value, key) => {
      out.set(key, value);
    });
  }
  if (init?.body instanceof FormData) {
    out.delete('Content-Type');
  } else if (
    init?.body != null &&
    typeof init.body === 'string' &&
    !out.has('Content-Type')
  ) {
    out.set('Content-Type', 'application/json; charset=utf-8');
  }
  return out;
}

/**
 * `fetch` al core en Cloud Run con cabeceras acordes a producción.
 */
export function fiferCoreApiFetch(
  relativePath: string,
  init?: RequestInit,
): Promise<Response> {
  const url = buildFiferCoreApiUrl(relativePath);
  const headers = buildFiferCoreRequestHeaders(init);
  return fetch(url, {
    ...init,
    headers,
    cache: init?.cache ?? 'no-store',
  });
}

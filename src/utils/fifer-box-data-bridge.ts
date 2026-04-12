/**
 * Puente BDUI: rutas API → forma `data` consumible por UI / Zod (`contratosListPayloadSchema`,
 * `InmobiliarioDataSchema`).
 */

import { contratosListPayloadSchema } from '@/schemas/schemas';
import { BotDataSchema, InmobiliarioDataSchema } from '@/types/schemas';

/**
 * STRESS QA — poner en `false` tras probar el circuito / auto-healing.
 * Fuerza error en la ruta de normalización de contratos (§0.25).
 */
export const STRESS_CONTRATOS_API_SABOTAGE = false;

export const FIFER_BOX_DATA_ROUTES = {
  /** @deprecated Usar `fiferContratosMain` en nuevos flujos ADN. */
  contractsChicureoLocales: '/api/v1/contracts/chicureo',
  /** App Control de Contratos — misma API, shape ADN Central. */
  fiferContratosMain: '/api/v1/contracts/chicureo',
  /** Dashboard Inmobiliario — mock local hasta backend dedicado. */
  fiferInmobiliarioMain: '/api/v1/inmobiliario',
  /** Cockpit Mis Bots — mock local hasta orquestación real. */
  fiferMisbotsMain: '/api/v1/misbots',
  /** App Desarrollador — pestaña APIs externas (motor `system-health`, filtrado). */
  fiferDevExternal: '/api/v1/system-health?scope=external',
  /** App Desarrollador — APIs internas. */
  fiferDevInternal: '/api/v1/system-health?scope=internal',
  /** App Desarrollador — matriz de motores (`ai-fallback`, `ai-fallback:image-gen`, `ai-fallback:comms`). */
  fiferDevEngines: '/api/v1/system-health?scope=engines',
  /** App Desarrollador — Sala de Guerra (motores + latencias Bridge + log env-manager). */
  fiferDevWarRoom: '/api/v1/war-room',
} as const;

export type FiferBoxDataRouteKey = keyof typeof FIFER_BOX_DATA_ROUTES;

/**
 * Estado degradado elegante (§0.25) cuando la API falla o el payload no valida.
 */
export function buildDegradedNormalized(
  reason: string,
  errorCode = 'BRIDGE_DEGRADED',
): Record<string, unknown> {
  return {
    contratos: [],
    degraded: true,
    errorMessage: reason,
    errorCode,
    schemaVersion: '1.0-degraded',
  };
}

/** Degradación segura inmobiliario (no mezcla con shape de contratos). */
export function buildDegradedInmobiliarioNormalized(
  reason: string,
  errorCode = 'BRIDGE_DEGRADED',
): Record<string, unknown> {
  return {
    propiedades: [],
    degraded: true,
    errorMessage: reason,
    errorCode,
    schemaVersion: '1.0-inmobiliario-degraded',
  };
}

/** Degradación segura Mis Bots (shape aislado de contratos / inmobiliario). */
export function buildDegradedBotsNormalized(
  reason: string,
  errorCode = 'BRIDGE_DEGRADED',
): Record<string, unknown> {
  return {
    bots: [],
    degraded: true,
    errorMessage: reason,
    errorCode,
    schemaVersion: '1.0-misbots-degraded',
  };
}

/** Degradación segura — sonda system-health / App Desarrollador. */
export function buildDegradedSystemHealthNormalized(
  reason: string,
  errorCode = 'BRIDGE_DEGRADED',
): Record<string, unknown> {
  return {
    degraded: true,
    errorMessage: reason,
    errorCode,
    schemaVersion: '1.0-system-health-degraded',
  };
}

type SystemHealthDevRouteKey = 'fiferDevExternal' | 'fiferDevInternal' | 'fiferDevEngines';

function normalizeWarRoomPayload(json: unknown): Record<string, unknown> {
  if (json == null || typeof json !== 'object') {
    return buildDegradedSystemHealthNormalized('Payload war-room vacío', 'EMPTY');
  }
  const root = json as Record<string, unknown>;
  if (root.degraded === true) {
    return {
      degraded: true,
      errorMessage: typeof root.errorMessage === 'string' ? root.errorMessage : 'Degradado',
      errorCode: typeof root.errorCode === 'string' ? root.errorCode : 'HTTP_ERROR',
      schemaVersion:
        typeof root.schemaVersion === 'string' ? root.schemaVersion : '1.0-war-room-degraded',
    };
  }
  if (root.schemaVersion !== '1.0-war-room') {
    return buildDegradedSystemHealthNormalized('schemaVersion war-room inválido', 'SHAPE');
  }
  return {
    schemaVersion: root.schemaVersion,
    capturedAt: root.capturedAt,
    tab: 'war-room',
    engines: root.engines,
    bridgeLatencies: root.bridgeLatencies,
    envManagerLog: root.envManagerLog,
    architectureHealth: root.architectureHealth,
  };
}

function normalizeSystemHealthTabPayload(
  routeKey: SystemHealthDevRouteKey,
  json: unknown,
): Record<string, unknown> {
  if (json == null || typeof json !== 'object') {
    return buildDegradedSystemHealthNormalized('Payload system-health vacío', 'EMPTY');
  }
  const root = json as Record<string, unknown>;
  if (root.degraded === true) {
    return {
      degraded: true,
      errorMessage: typeof root.errorMessage === 'string' ? root.errorMessage : 'Degradado',
      errorCode: typeof root.errorCode === 'string' ? root.errorCode : 'HTTP_ERROR',
      schemaVersion:
        typeof root.schemaVersion === 'string' ? root.schemaVersion : '1.0-system-health-degraded',
    };
  }
  if (typeof root.schemaVersion !== 'string') {
    return buildDegradedSystemHealthNormalized('schemaVersion ausente en system-health', 'SHAPE');
  }
  const out: Record<string, unknown> = {
    schemaVersion: root.schemaVersion,
    capturedAt: root.capturedAt,
    tab: root.tab,
  };
  if (routeKey === 'fiferDevExternal' && root.external != null && typeof root.external === 'object') {
    out.external = root.external;
    return out;
  }
  if (routeKey === 'fiferDevInternal' && root.internal != null && typeof root.internal === 'object') {
    out.internal = root.internal;
    return out;
  }
  if (routeKey === 'fiferDevEngines' && root.engines != null && typeof root.engines === 'object') {
    out.engines = root.engines;
    return out;
  }
  return buildDegradedSystemHealthNormalized('Shape system-health no coincide con la pestaña', 'SHAPE');
}

function mapRawContratoRow(item: unknown): Record<string, unknown> | null {
  if (item == null || typeof item !== 'object') return null;
  const o = item as Record<string, unknown>;
  const id = String(o.id ?? '').trim();
  if (!id) return null;

  const localNombre = String(o.localNombre ?? o.local ?? o.propertyLabel ?? '').trim();
  const arrendatario = String(o.arrendatario ?? o.tenantName ?? o.tenant ?? '').trim();
  const montoUFRaw = o.montoUF ?? o.monto ?? o.rentUf ?? o.monthlyRentUf;
  const montoUF =
    typeof montoUFRaw === 'number' && Number.isFinite(montoUFRaw)
      ? montoUFRaw
      : Number(montoUFRaw);
  const vencimiento = String(o.vencimiento ?? '').trim();
  const allowedEstado = ['Vigente', 'Por Vencer', 'Alerta'] as const;
  const estadoRaw = String(o.estado ?? 'Vigente');
  const estado = (allowedEstado as readonly string[]).includes(estadoRaw)
    ? (estadoRaw as (typeof allowedEstado)[number])
    : 'Vigente';

  return {
    id,
    localNombre: localNombre || '—',
    arrendatario: arrendatario || '—',
    montoUF: Number.isFinite(montoUF) && montoUF >= 0 ? montoUF : 0,
    vencimiento: vencimiento || '1970-01-01',
    estado,
  };
}

function normalizeContratosPayload(json: unknown): Record<string, unknown> {
  if (STRESS_CONTRATOS_API_SABOTAGE) {
    throw new Error('API Contratos Offline - Simulación de Stress');
  }
  if (json == null || typeof json !== 'object') return { contratos: [] };

  const root = json as Record<string, unknown>;
  const inner =
    root.data != null && typeof root.data === 'object'
      ? (root.data as Record<string, unknown>)
      : root;

  const rawList = inner.contratos ?? inner.leases;
  const list = Array.isArray(rawList) ? rawList : [];
  const contratos = list
    .map(mapRawContratoRow)
    .filter((x): x is Record<string, unknown> => x != null);

  const out: Record<string, unknown> = { contratos };
  if (typeof inner.schemaVersion === 'string') out.schemaVersion = inner.schemaVersion;
  if (root.degraded === true) {
    out.degraded = true;
    if (typeof root.errorMessage === 'string') out.errorMessage = root.errorMessage;
    if (typeof root.errorCode === 'string') out.errorCode = root.errorCode;
  }
  return out;
}

function mapRawInmobiliarioRow(item: unknown): Record<string, unknown> | null {
  if (item == null || typeof item !== 'object') return null;
  const o = item as Record<string, unknown>;
  const id = String(o.id ?? '').trim();
  if (!id) return null;

  const nombreProyecto = String(o.nombreProyecto ?? o.nombre ?? o.proyecto ?? '').trim();
  const unidadesRaw = o.unidadesDisponibles ?? o.unidades ?? o.disponibles;
  const unidadesNum =
    typeof unidadesRaw === 'number' && Number.isFinite(unidadesRaw)
      ? Math.trunc(unidadesRaw)
      : Number(unidadesRaw);
  const unidadesDisponibles =
    Number.isFinite(unidadesNum) && unidadesNum >= 0 ? unidadesNum : 0;

  const allowedEstado = ['Disponible', 'En construcción', 'Comercialización', 'Agotado'] as const;
  const estadoRaw = String(o.estado ?? 'Disponible');
  const estado = (allowedEstado as readonly string[]).includes(estadoRaw)
    ? (estadoRaw as (typeof allowedEstado)[number])
    : 'Disponible';

  return {
    id,
    nombreProyecto: nombreProyecto || '—',
    unidadesDisponibles,
    estado,
  };
}

function normalizeInmobiliarioPayload(json: unknown): Record<string, unknown> {
  if (json == null || typeof json !== 'object') return { propiedades: [] };

  const root = json as Record<string, unknown>;
  const inner =
    root.data != null && typeof root.data === 'object'
      ? (root.data as Record<string, unknown>)
      : root;

  const rawList = inner.propiedades ?? inner.properties;
  const list = Array.isArray(rawList) ? rawList : [];
  const propiedades = list
    .map(mapRawInmobiliarioRow)
    .filter((x): x is Record<string, unknown> => x != null);

  const out: Record<string, unknown> = { propiedades };
  if (typeof inner.schemaVersion === 'string') out.schemaVersion = inner.schemaVersion;
  if (root.degraded === true) {
    out.degraded = true;
    if (typeof root.errorMessage === 'string') out.errorMessage = root.errorMessage;
    if (typeof root.errorCode === 'string') out.errorCode = root.errorCode;
  }
  return out;
}

function mapRawBotRow(item: unknown): Record<string, unknown> | null {
  if (item == null || typeof item !== 'object') return null;
  const o = item as Record<string, unknown>;
  const id = String(o.id ?? '').trim();
  if (!id) return null;

  const nombre = String(o.nombre ?? o.name ?? o.label ?? '').trim();
  const allowedEstado = ['activo', 'pausado'] as const;
  const estadoRaw = String(o.estado ?? 'activo').toLowerCase();
  const estado = (allowedEstado as readonly string[]).includes(estadoRaw)
    ? (estadoRaw as (typeof allowedEstado)[number])
    : 'activo';

  const modeloAsignado = String(
    o.modeloAsignado ?? o.modelo ?? o.model ?? 'gemini-flash',
  ).trim();

  const costoRaw = o.costoPromedioUF ?? o.costoUF ?? o.costo ?? 0;
  const costoNum =
    typeof costoRaw === 'number' && Number.isFinite(costoRaw) ? costoRaw : Number(costoRaw);
  const costoPromedioUF =
    Number.isFinite(costoNum) && costoNum >= 0 ? costoNum : 0;

  return {
    id,
    nombre: nombre || '—',
    estado,
    modeloAsignado: modeloAsignado || 'gemini-flash',
    costoPromedioUF,
  };
}

function normalizeBotsPayload(json: unknown): Record<string, unknown> {
  if (json == null || typeof json !== 'object') return { bots: [] };

  const root = json as Record<string, unknown>;
  const inner =
    root.data != null && typeof root.data === 'object'
      ? (root.data as Record<string, unknown>)
      : root;

  const rawList = inner.bots ?? inner.flota ?? inner.items;
  const list = Array.isArray(rawList) ? rawList : [];
  const bots = list
    .map(mapRawBotRow)
    .filter((x): x is Record<string, unknown> => x != null);

  const out: Record<string, unknown> = { bots };
  if (typeof inner.schemaVersion === 'string') out.schemaVersion = inner.schemaVersion;
  if (root.degraded === true) {
    out.degraded = true;
    if (typeof root.errorMessage === 'string') out.errorMessage = root.errorMessage;
    if (typeof root.errorCode === 'string') out.errorCode = root.errorCode;
  }
  return out;
}

/**
 * Normaliza la respuesta JSON del backend al shape esperado por `contratosListPayloadSchema`.
 */
export function routeApiResponseToFiferBoxData(
  routeKey: FiferBoxDataRouteKey,
  json: unknown,
): Record<string, unknown> {
  switch (routeKey) {
    case 'contractsChicureoLocales':
    case 'fiferContratosMain':
      return normalizeContratosPayload(json);
    case 'fiferInmobiliarioMain':
      return normalizeInmobiliarioPayload(json);
    case 'fiferMisbotsMain':
      return normalizeBotsPayload(json);
    case 'fiferDevExternal':
    case 'fiferDevInternal':
    case 'fiferDevEngines':
      return normalizeSystemHealthTabPayload(routeKey, json);
    case 'fiferDevWarRoom':
      return normalizeWarRoomPayload(json);
    default:
      return {};
  }
}

/**
 * Normaliza con validación Zod; si falla, devuelve payload degradado (sin lanzar).
 */
export function routeContratosApiWithValidation(json: unknown): Record<string, unknown> {
  const normalized = normalizeContratosPayload(json);
  const parsed = contratosListPayloadSchema.safeParse(normalized);
  if (!parsed.success) {
    return buildDegradedNormalized('Payload no cumple ContratosDataSchema', 'ZOD_MISMATCH');
  }
  return parsed.data as unknown as Record<string, unknown>;
}

/**
 * Normaliza con validación Zod inmobiliario; si falla, devuelve payload degradado (sin lanzar).
 */
export function routeInmobiliarioApiWithValidation(json: unknown): Record<string, unknown> {
  const normalized = normalizeInmobiliarioPayload(json);
  const parsed = InmobiliarioDataSchema.safeParse(normalized);
  if (!parsed.success) {
    return buildDegradedInmobiliarioNormalized(
      'Payload no cumple InmobiliarioDataSchema',
      'ZOD_MISMATCH',
    );
  }
  return parsed.data as unknown as Record<string, unknown>;
}

/**
 * Normaliza con validación Zod Mis Bots; si falla, devuelve payload degradado (sin lanzar).
 */
export function routeBotsApiWithValidation(json: unknown): Record<string, unknown> {
  const normalized = normalizeBotsPayload(json);
  const parsed = BotDataSchema.safeParse(normalized);
  if (!parsed.success) {
    return buildDegradedBotsNormalized('Payload no cumple BotDataSchema', 'ZOD_MISMATCH');
  }
  return parsed.data as unknown as Record<string, unknown>;
}

/**
 * Fetch unificado por ruta del bridge: éxito → normalización + Zod; HTTP/Zod → degradado seguro.
 * Pensado para hidratación client-side de Boxes (p. ej. `FiferInmobiliarioMain`).
 */
export async function fetchRealBoxDataForBridge(
  routeKey: FiferBoxDataRouteKey,
): Promise<Record<string, unknown>> {
  const url = FIFER_BOX_DATA_ROUTES[routeKey];
  try {
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    const json: unknown = await res.json().catch(() => null);

    if (!res.ok) {
      if (routeKey === 'fiferInmobiliarioMain') {
        return buildDegradedInmobiliarioNormalized(`API inmobiliario HTTP ${res.status}`, 'HTTP_ERROR');
      }
      if (routeKey === 'fiferMisbotsMain') {
        return buildDegradedBotsNormalized(`API misbots HTTP ${res.status}`, 'HTTP_ERROR');
      }
      if (
        routeKey === 'fiferDevExternal' ||
        routeKey === 'fiferDevInternal' ||
        routeKey === 'fiferDevEngines'
      ) {
        return buildDegradedSystemHealthNormalized(
          `API system-health HTTP ${res.status}`,
          'HTTP_ERROR',
        );
      }
      if (routeKey === 'fiferDevWarRoom') {
        return buildDegradedSystemHealthNormalized(`API war-room HTTP ${res.status}`, 'HTTP_ERROR');
      }
      return buildDegradedNormalized(`API contratos HTTP ${res.status}`, 'HTTP_ERROR');
    }

    switch (routeKey) {
      case 'fiferInmobiliarioMain':
        return routeInmobiliarioApiWithValidation(json ?? {});
      case 'fiferMisbotsMain':
        return routeBotsApiWithValidation(json ?? {});
      case 'contractsChicureoLocales':
      case 'fiferContratosMain':
        return routeContratosApiWithValidation(json ?? {});
      case 'fiferDevExternal':
      case 'fiferDevInternal':
      case 'fiferDevEngines':
        return normalizeSystemHealthTabPayload(routeKey, json ?? {});
      case 'fiferDevWarRoom':
        return normalizeWarRoomPayload(json ?? {});
      default:
        return {};
    }
  } catch {
    if (routeKey === 'fiferInmobiliarioMain') {
      return buildDegradedInmobiliarioNormalized('Red o parseo JSON inmobiliario', 'FETCH_ERROR');
    }
    if (routeKey === 'fiferMisbotsMain') {
      return buildDegradedBotsNormalized('Red o parseo JSON misbots', 'FETCH_ERROR');
    }
    if (
      routeKey === 'fiferDevExternal' ||
      routeKey === 'fiferDevInternal' ||
      routeKey === 'fiferDevEngines'
    ) {
      return buildDegradedSystemHealthNormalized('Red o parseo JSON system-health', 'FETCH_ERROR');
    }
    if (routeKey === 'fiferDevWarRoom') {
      return buildDegradedSystemHealthNormalized('Red o parseo JSON war-room', 'FETCH_ERROR');
    }
    return buildDegradedNormalized('Red o parseo JSON contratos', 'FETCH_ERROR');
  }
}

const FIFER_DEV_BOX_ID_TO_ROUTE: Record<
  'fifer-dev-external' | 'fifer-dev-war-room' | 'fifer-dev-internal' | 'fifer-dev-engines',
  SystemHealthDevRouteKey | 'fiferDevWarRoom'
> = {
  'fifer-dev-external': 'fiferDevExternal',
  'fifer-dev-war-room': 'fiferDevWarRoom',
  'fifer-dev-internal': 'fiferDevInternal',
  'fifer-dev-engines': 'fiferDevEngines',
};

/**
 * Hidratación App Desarrollador: una URL por pestaña, mismo motor `system-health` con `scope`.
 */
export async function fetchDeveloperBoxDataForBridge(boxId: string): Promise<Record<string, unknown>> {
  const routeKey = FIFER_DEV_BOX_ID_TO_ROUTE[boxId as keyof typeof FIFER_DEV_BOX_ID_TO_ROUTE];
  if (!routeKey) {
    return buildDegradedSystemHealthNormalized(`Box desarrollador desconocido: ${boxId}`, 'UNKNOWN_BOX');
  }
  return fetchRealBoxDataForBridge(routeKey);
}

export function contractsChicureoFetchUrl(): string {
  return FIFER_BOX_DATA_ROUTES.contractsChicureoLocales;
}

export function fiferContratosMainFetchUrl(): string {
  return FIFER_BOX_DATA_ROUTES.fiferContratosMain;
}

export function fiferInmobiliarioMainFetchUrl(): string {
  return FIFER_BOX_DATA_ROUTES.fiferInmobiliarioMain;
}

export function fiferMisbotsMainFetchUrl(): string {
  return FIFER_BOX_DATA_ROUTES.fiferMisbotsMain;
}

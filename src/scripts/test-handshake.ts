/**
 * Handshake de validación con GPS lógico: resuelve el motor vía `docs/registry/LOCATION_MAP.json`
 * y valida la InternalApiKey con `validateInternalRequest`.
 *
 * Ejecutar desde la raíz del repo (usa tsconfig.handshake.json: .env, alias @/, CommonJS):
 *   npx ts-node -P tsconfig.handshake.json src/scripts/test-handshake.ts
 *
 * Opcional: `FIFER_HANDSHAKE_LOGICAL` — coordenada a probar (default: FIFER://ENGINE/NORMATIVA).
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { validateInternalRequest } from '@/lib/api-manager'
import type { ValidateInternalRequestFailure } from '@/lib/api-manager'

const LOCATION_MAP_REL = join('docs', 'registry', 'LOCATION_MAP.json')

/** Coordenada lógica del motor bajo prueba (p. ej. FIFER://ENGINE/NORMATIVA). */
const LOGICAL_ADDRESS =
  process.env.FIFER_HANDSHAKE_LOGICAL?.trim() || 'FIFER://ENGINE/NORMATIVA'

/** Coordenada inventada para la prueba negativa de GPS (no debe existir en el mapa). */
const UNKNOWN_LOGICAL_FOR_GPS_TEST = 'FIFER://ENGINE/__HANDSHAKE_GPS_NEGATIVE__'

/** Pega aquí la llave `fifer_iak_...` que generaste (o usa FIFER_HANDSHAKE_TEST_KEY en .env). */
const TEST_KEY =
  process.env.FIFER_HANDSHAKE_TEST_KEY?.trim() || 'PEGAR_AQUI_LA_LLAVE'

/** Cambia a 'FULL_ACCESS' para prueba negativa de scope (INSUFFICIENT_SCOPE con llave READ_ONLY). */
const REQUIRED_SCOPE = 'READ_ONLY' as const

type LocationMapEntry = {
  path: string
  type: string
  /** Slug que debe coincidir con `InternalApiKey.targetAppOrEngine` para este destino. */
  targetAppOrEngine?: string
}

type LocationMap = Record<string, LocationMapEntry>

type ResolvedGps = LocationMapEntry & {
  logical: string
  /** Ruta absoluta en disco respecto al cwd del proceso. */
  absolutePath: string
}

const NAV_ERROR =
  'ERROR DE NAVEGACIÓN: La coordenada lógica no existe en el LOCATION_MAP'

function loadLocationMap(): LocationMap {
  const mapPath = join(process.cwd(), LOCATION_MAP_REL)
  if (!existsSync(mapPath)) {
    throw new Error(
      `[handshake] No se encontró LOCATION_MAP en ${mapPath}. Ejecuta el script desde la raíz del repositorio.`,
    )
  }
  const raw = readFileSync(mapPath, 'utf8')
  return JSON.parse(raw) as LocationMap
}

/**
 * Resuelve una coordenada FIFER://... contra el mapa. Lanza NAV_ERROR si no existe.
 */
function resolveLogicalCoordinate(
  logical: string,
  map: LocationMap,
): ResolvedGps {
  const entry = map[logical]
  if (!entry) {
    throw new Error(NAV_ERROR)
  }
  const absolutePath = resolve(process.cwd(), entry.path)
  return { ...entry, logical, absolutePath }
}

function calleeFromGps(entry: LocationMapEntry, logical: string): string {
  if (entry.targetAppOrEngine?.trim()) {
    return entry.targetAppOrEngine.trim()
  }
  const last = logical.split('/').pop()
  if (!last) {
    throw new Error(
      '[handshake] Coordenada lógica inválida: no se pudo inferir el slug del callee.',
    )
  }
  return last.toLowerCase()
}

function describeFailure(reason: ValidateInternalRequestFailure['reason']): string {
  switch (reason) {
    case 'MISSING_KEY':
      return 'No se envió llave (TEST_KEY vacía o FIFER_HANDSHAKE_TEST_KEY sin definir).'
    case 'NOT_FOUND':
      return 'Llave no encontrada en InternalApiKey o error de consulta a Supabase (revisa URL, service role y que la llave exista).'
    case 'TARGET_MISMATCH':
      return 'La llave pertenece a otro motor/app (targetAppOrEngine distinto del callee resuelto por GPS).'
    case 'INSUFFICIENT_SCOPE':
      return 'El scope de la llave no alcanza para el scope requerido (ej. se pidió FULL_ACCESS y la llave es READ_ONLY).'
    default:
      return String(reason)
  }
}

function runGpsNegativeTest(map: LocationMap): void {
  console.info('\n[handshake] Simulación de robustez (GPS): coordenada NO registrada')
  console.info('  · Dirección probada:', UNKNOWN_LOGICAL_FOR_GPS_TEST)
  try {
    resolveLogicalCoordinate(UNKNOWN_LOGICAL_FOR_GPS_TEST, map)
    console.error(
      '[handshake] FALLO DE SEGURIDAD: se aceptó una coordenada que no está en LOCATION_MAP.',
    )
    process.exitCode = 1
  } catch (e) {
    if (e instanceof Error && e.message === NAV_ERROR) {
      console.info('  · Resultado esperado:', NAV_ERROR)
      console.info('[handshake] OK — el mapa de ubicación bloqueó la coordenada fantasma.\n')
      return
    }
    throw e
  }
}

async function simulateEngineHandshake(): Promise<void> {
  const map = loadLocationMap()

  runGpsNegativeTest(map)

  console.info('[handshake] Resolución GPS (positiva)')
  console.info('  · Dirección lógica:', LOGICAL_ADDRESS)

  const gps = resolveLogicalCoordinate(LOGICAL_ADDRESS, map)
  console.info('  · Ruta física (relativa repo):', gps.path)
  console.info('  · Ruta física (absoluta):', gps.absolutePath)
  console.info('  · Tipo en mapa:', gps.type)

  const callee = calleeFromGps(gps, LOGICAL_ADDRESS)
  console.info('  · Callee para InternalApiKey (slug):', callee)
  console.info('[handshake] Scope requerido:', REQUIRED_SCOPE)

  const result = await validateInternalRequest(TEST_KEY, REQUIRED_SCOPE, callee)

  if (result.ok) {
    console.info('[handshake] OK — trazabilidad:')
    console.info('  · Dueño (ownerId):', result.ownerId)
    console.info('  · Motor destino (targetAppOrEngine):', result.targetAppOrEngine)
    console.info('  · Nombre de la llave:', result.name)
    console.info('  · Scope de la llave:', result.scope)
    console.info('  · keyId:', result.keyId)
    return
  }

  console.error('[handshake] FALLÓ')
  console.error('  · Razón:', result.reason)
  console.error('  · Detalle:', describeFailure(result.reason))
}

simulateEngineHandshake().catch((err: unknown) => {
  console.error('[handshake] Error no controlado:', err)
  process.exitCode = 1
})

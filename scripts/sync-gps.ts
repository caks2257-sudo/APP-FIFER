/**
 * GPS sync — genera docs/registry/LOCATION_MAP.json a partir de anclas
 * "## UBICACIÓN LÓGICA" en cada _blueprints/_xray_*.md bajo el árbol src/.
 *
 * Ejecutar desde la raíz del repositorio:
 *   npm run sync:gps
 *   npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" scripts/sync-gps.ts
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const REPO_ROOT = process.cwd()
const SRC_ROOT = join(REPO_ROOT, 'src')
const MAP_REL = join('docs', 'registry', 'LOCATION_MAP.json')
const MAP_ABS = join(REPO_ROOT, MAP_REL)

type ModuleKind = 'APP' | 'SUB_APP' | 'ENGINE' | 'SUB_ENGINE'

type MapEntry = {
  path: string
  type: ModuleKind
  targetAppOrEngine?: string
}

type PreviousMap = Record<string, MapEntry & Record<string, unknown>>

const HEADER_RE = /^##\s+UBICACIÓN\s+LÓGICA\b/im

const TARGET_RE =
  /\*\*targetAppOrEngine\*\*\s*[:：]?\s*`?([A-Za-z0-9_.-]+)`?/i

function toPosix(p: string): string {
  return p.split(sep).join('/')
}

function classifyModule(moduleRoot: string): ModuleKind {
  const rel = toPosix(relative(REPO_ROOT, moduleRoot))

  if (rel.includes('/sub-engines/')) return 'SUB_ENGINE'
  if (rel.startsWith('src/engines/')) return 'ENGINE'

  if (rel.startsWith('src/app/(dashboard)/')) {
    const rest = rel.slice('src/app/(dashboard)/'.length)
    const segments = rest.split('/').filter(Boolean)
    if (segments.length <= 1) return 'APP'
    return 'SUB_APP'
  }

  // p.ej. src/lib con _blueprints para un espejo de Comms / API interna
  return 'ENGINE'
}

function findModuleRoots(dir: string): string[] {
  const roots: string[] = []

  function walk(current: string): void {
    let hasBlueprints = false
    try {
      const entries = readdirSync(current, { withFileTypes: true })
      for (const e of entries) {
        if (e.isDirectory() && e.name === '_blueprints') {
          hasBlueprints = true
          break
        }
      }
      if (hasBlueprints) roots.push(current)

      for (const e of entries) {
        if (!e.isDirectory()) continue
        const name = e.name
        if (name === 'node_modules' || name === '.next' || name === '.git')
          continue
        if (name === '_blueprints') continue
        walk(join(current, name))
      }
    } catch {
      /* unreadable */
    }
  }

  walk(dir)
  return roots
}

function listXrayMarkdown(blueprintsDir: string): string[] {
  try {
    return readdirSync(blueprintsDir, { withFileTypes: true })
      .filter((e) => e.isFile() && /^_xray_.*\.md$/i.test(e.name))
      .map((e) => join(blueprintsDir, e.name))
  } catch {
    return []
  }
}

function extractLogicalUri(content: string): string | null {
  const m = content.match(HEADER_RE)
  if (!m || m.index === undefined) return null
  const slice = content.slice(m.index, m.index + 1200)
  const uri =
    slice.match(/`?(FIFER:\/\/[A-Za-z0-9_./:-]+)`?/) ||
    slice.match(/\b(FIFER:\/\/[A-Za-z0-9_./:-]+)\b/)
  return uri ? uri[1].replace(/^`|`$/g, '') : null
}

function extractTargetAppOrEngine(content: string): string | undefined {
  const m = content.match(TARGET_RE)
  return m?.[1]?.trim()
}

function resolveAnchorForModule(moduleRoot: string): {
  uri: string
  targetAppOrEngine?: string
} | null {
  const bp = join(moduleRoot, '_blueprints')
  const files = listXrayMarkdown(bp).sort()
  let uri: string | null = null
  let targetAppOrEngine: string | undefined

  for (const f of files) {
    const text = readFileSync(f, 'utf8')
    const u = extractLogicalUri(text)
    if (u) {
      if (uri && uri !== u) {
        console.error(
          `[sync-gps] Conflicto de anclas en ${toPosix(relative(REPO_ROOT, moduleRoot))}: "${uri}" vs "${u}"`,
        )
        process.exit(1)
      }
      uri = u
    }
    const t = extractTargetAppOrEngine(text)
    if (t) targetAppOrEngine = t
  }

  if (!uri) return null
  return { uri, targetAppOrEngine }
}

function loadPreviousMap(): PreviousMap {
  if (!existsSync(MAP_ABS)) return {}
  try {
    return JSON.parse(readFileSync(MAP_ABS, 'utf8')) as PreviousMap
  } catch {
    return {}
  }
}

function main(): void {
  if (!existsSync(SRC_ROOT)) {
    console.error('[sync-gps] No existe src/ en la raíz del repositorio.')
    process.exit(1)
  }

  const previous = loadPreviousMap()
  const moduleRoots = findModuleRoots(SRC_ROOT)
  const next: Record<string, MapEntry> = {}
  const uriOwners = new Map<string, string>()

  for (const root of moduleRoots) {
    const resolved = resolveAnchorForModule(root)
    if (!resolved) continue

    const { uri, targetAppOrEngine: fromFile } = resolved
    const relPath = toPosix(relative(REPO_ROOT, root))
    const kind = classifyModule(root)

    const prev = previous[uri] as MapEntry | undefined
    const targetAppOrEngine =
      fromFile ?? prev?.targetAppOrEngine

    const existingOwner = uriOwners.get(uri)
    if (existingOwner && existingOwner !== relPath) {
      console.error(
        `[sync-gps] URI duplicada ${uri}:\n  - ${existingOwner}\n  - ${relPath}`,
      )
      process.exit(1)
    }
    uriOwners.set(uri, relPath)

    const entry: MapEntry = { path: relPath, type: kind }
    if (targetAppOrEngine) entry.targetAppOrEngine = targetAppOrEngine

    next[uri] = entry
  }

  const sortedKeys = Object.keys(next).sort()
  const ordered: Record<string, MapEntry> = {}
  for (const k of sortedKeys) ordered[k] = next[k]

  mkdirSync(join(REPO_ROOT, 'docs', 'registry'), { recursive: true })
  writeFileSync(MAP_ABS, JSON.stringify(ordered, null, 2) + '\n', 'utf8')

  console.log(
    `[sync-gps] Escritos ${sortedKeys.length} anclas → ${toPosix(MAP_REL)}`,
  )
  for (const k of sortedKeys) {
    const e = ordered[k]
    const extra = e.targetAppOrEngine
      ? ` targetAppOrEngine=${e.targetAppOrEngine}`
      : ''
    console.log(`  ${k} → ${e.path} [${e.type}]${extra}`)
  }
}

main()

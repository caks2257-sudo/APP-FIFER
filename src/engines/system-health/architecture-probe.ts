/**
 * Escáner estructural (§17 ADN) — lectura de constitución, GPS y compliance Auto-Healing.
 * En serverless sin árbol de repo en disco, devuelve readMode `bundle` sin lanzar.
 */

import { readFile, readdir, stat } from 'fs/promises';
import path from 'path';

import {
  ARCHITECTURE_HEALTH_SCHEMA_VERSION,
  type ArchitectureHealthSnapshot,
} from './architecture-types';

export {
  ARCHITECTURE_HEALTH_SCHEMA_VERSION,
  type ArchitectureHealthSnapshot,
} from './architecture-types';

const REL_CURSORRULES = '.cursorrules';
const REL_LOCATION_MAP = path.join('docs', 'registry', 'LOCATION_MAP.json');
const REL_AUTO_HEALING = path.join('docs', 'blueprints', 'AUTO_HEALING_COMPLIANCE.md');
const REL_ENGINES_ROOT = path.join('src', 'engines');

function repoPath(rel: string): string {
  return path.join(process.cwd(), rel);
}

function extractAdnVersionFromHead(text: string): string | null {
  const lines = text.split(/\r?\n/);
  const head = lines.slice(0, 2).join('\n');
  const m = head.match(/\bv\d+\.\d+\b/);
  return m ? m[0] : null;
}

function firstLine(text: string): string | null {
  const line = text.split(/\r?\n/).find((l) => l.trim().length > 0);
  return line != null ? line.trim() : null;
}

function bundleSnapshot(reason: string): ArchitectureHealthSnapshot {
  return {
    schemaVersion: ARCHITECTURE_HEALTH_SCHEMA_VERSION,
    capturedAt: new Date().toISOString(),
    readMode: 'bundle',
    reason,
    constitution: { versionLabel: null, headline: null },
    gps: { anchorCount: null },
    autoHealing: { exists: null, bytes: null, modifiedAtIso: null },
    orphanedEngines: [],
    orphanScanSkipped: true,
  };
}

function normalizeMapPath(p: string): string {
  return p.replace(/\\/g, '/');
}

/**
 * Carpetas de primer nivel en `src/engines/` que no aparecen en ningún `path` de `LOCATION_MAP.json`.
 */
async function scanOrphanedEngines(
  mapPaths: Set<string>,
): Promise<{ orphans: string[]; skipped: boolean }> {
  try {
    const root = repoPath(REL_ENGINES_ROOT);
    const dirents = await readdir(root, { withFileTypes: true });
    const dirs = dirents.filter((d) => d.isDirectory()).map((d) => d.name);
    const orphans: string[] = [];
    for (const name of dirs) {
      const rel = normalizeMapPath(`src/engines/${name}`);
      const covered = [...mapPaths].some((mp) => {
        const n = normalizeMapPath(mp);
        return n === rel || n.startsWith(`${rel}/`);
      });
      if (!covered) orphans.push(name);
    }
    return { orphans: orphans.sort((a, b) => a.localeCompare(b)), skipped: false };
  } catch {
    return { orphans: [], skipped: true };
  }
}

/**
 * Sonda única — no lanza; siempre devuelve un snapshot serializable.
 */
export async function runArchitectureProbe(): Promise<ArchitectureHealthSnapshot> {
  try {
    const capturedAt = new Date().toISOString();
    let anyFs = false;

    let versionLabel: string | null = null;
    let headline: string | null = null;
    let anchorCount: number | null = null;
    let ahExists: boolean | null = null;
    let ahBytes: number | null = null;
    let ahModified: string | null = null;

    try {
      const cr = await readFile(repoPath(REL_CURSORRULES), 'utf8');
      anyFs = true;
      versionLabel = extractAdnVersionFromHead(cr);
      headline = firstLine(cr);
    } catch {
      // sin .cursorrules en cwd
    }

    const mapPaths = new Set<string>();
    try {
      const raw = await readFile(repoPath(REL_LOCATION_MAP), 'utf8');
      anyFs = true;
      const parsed = JSON.parse(raw) as unknown;
      if (parsed != null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const rec = parsed as Record<string, unknown>;
        anchorCount = Object.keys(rec).length;
        for (const v of Object.values(rec)) {
          if (v != null && typeof v === 'object' && !Array.isArray(v) && 'path' in v) {
            const p = (v as { path?: string }).path;
            if (typeof p === 'string' && p.length) mapPaths.add(p);
          }
        }
      }
    } catch {
      // mapa ausente o JSON inválido
    }

    let orphanedEngines: string[] = [];
    let orphanScanSkipped = false;
    try {
      const { orphans, skipped } = await scanOrphanedEngines(mapPaths);
      orphanedEngines = orphans;
      orphanScanSkipped = skipped;
      if (orphans.length || !skipped) anyFs = true;
    } catch {
      orphanScanSkipped = true;
    }

    try {
      const p = repoPath(REL_AUTO_HEALING);
      const s = await stat(p);
      anyFs = true;
      ahExists = true;
      ahBytes = s.size;
      ahModified = s.mtime.toISOString();
    } catch {
      ahExists = false;
      ahBytes = null;
      ahModified = null;
    }

    const readMode: 'filesystem' | 'bundle' = anyFs ? 'filesystem' : 'bundle';
    const reason =
      readMode === 'bundle'
        ? 'Solo lectura (Bundle): el runtime no pudo leer el repositorio en disco (típico en despliegues serverless sin archivos fuera del bundle).'
        : undefined;

    return {
      schemaVersion: ARCHITECTURE_HEALTH_SCHEMA_VERSION,
      capturedAt,
      readMode,
      reason,
      constitution: {
        versionLabel,
        headline,
      },
      gps: { anchorCount },
      autoHealing: {
        exists: ahExists,
        bytes: ahBytes,
        modifiedAtIso: ahModified,
      },
      orphanedEngines,
      ...(orphanScanSkipped ? { orphanScanSkipped: true } : {}),
    };
  } catch (e) {
    return bundleSnapshot(
      `Solo lectura (Bundle): ${e instanceof Error ? e.message : 'error inesperado en sonda arquitectónica'}`,
    );
  }
}

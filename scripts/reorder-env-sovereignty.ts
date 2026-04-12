/**
 * Limpieza de soberanía §14–§15: reordena `.env` por Macro-Pilares + Núcleo.
 * Solo `writeEnvFile` con NODE_ENV=development (env-manager).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { readEnvFile, writeEnvFile } from '../src/engines/system-engine/sub-engines/env-manager/index';

type Bucket =
  | 'INTELIGENCIA_ARTIFICIAL'
  | 'FINANZAS_PAGOS'
  | 'ECOMMERCE'
  | 'INFRAESTRUCTURA'
  | 'REDES_SOCIALES'
  | 'CONFIGURACION_NUCLEO';

const HEADER = `# FIFER ECOSYSTEM — Master configuration (orden Macro-Pilares §14–§15)`;

const BLOCK: Record<Bucket, string> = {
  INTELIGENCIA_ARTIFICIAL: '# === [INTELIGENCIA ARTIFICIAL] ===',
  FINANZAS_PAGOS: '# === [FINANZAS & PAGOS] ===',
  ECOMMERCE: '# === [E-COMMERCE] ===',
  INFRAESTRUCTURA: '# === [INFRAESTRUCTURA] ===',
  REDES_SOCIALES: '# === [REDES SOCIALES] ===',
  CONFIGURACION_NUCLEO: '# === [CONFIGURACIÓN DEL NÚCLEO] ===',
};

function bucketForKey(key: string): Bucket {
  const k = key.toUpperCase();

  if (
    k.startsWith('GOOGLE_AI') ||
    k.includes('OPENAI') ||
    k.includes('ANTHROPIC') ||
    k.includes('GROQ') ||
    k.includes('ELEVENLABS') ||
    k.includes('RUNWAY') ||
    k.includes('LEONARDO_AI') ||
    k === 'GOOGLE_API_KEY'
  ) {
    return 'INTELIGENCIA_ARTIFICIAL';
  }

  if (k.startsWith('FLOW_') || k.startsWith('STRIPE_') || k.startsWith('FINTOC_') || k === 'MIN_COMMISSION_THRESHOLD') {
    return 'FINANZAS_PAGOS';
  }

  if (
    k.startsWith('AMAZON_') ||
    k.startsWith('CLICKBANK_') ||
    k.startsWith('SHAREASALE_') ||
    k.startsWith('ADMITAD_') ||
    k.startsWith('IMPACT_') ||
    k.startsWith('ALIEXPRESS') ||
    k.includes('MERCADOLIBRE') ||
    k.includes('MERCADOPAGO')
  ) {
    return 'ECOMMERCE';
  }

  if (
    k === 'DATABASE_URL' ||
    k === 'DIRECT_URL' ||
    k.startsWith('NEXT_PUBLIC_SUPABASE_') ||
    k.startsWith('SUPABASE_') ||
    k.startsWith('VERCEL_') ||
    k === 'REDIS_URL'
  ) {
    return 'INFRAESTRUCTURA';
  }

  if (
    k.startsWith('YOUTUBE_') ||
    k.startsWith('TIKTOK_') ||
    k.startsWith('FACEBOOK_') ||
    k.startsWith('FB_') ||
    k.startsWith('META_') ||
    k.startsWith('INSTAGRAM_') ||
    k.startsWith('LINKEDIN_') ||
    k === 'NEXT_PUBLIC_SITE_URL'
  ) {
    return 'REDES_SOCIALES';
  }

  return 'CONFIGURACION_NUCLEO';
}

function extractKey(line: string): string | null {
  const t = line.trim();
  if (!t || t.startsWith('#')) return null;
  const eq = t.indexOf('=');
  if (eq <= 0) return null;
  const key = t.slice(0, eq).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return null;
  return key;
}

function parseDotEnv(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

type Entry =
  | { kind: 'comment'; line: string; bucket: Bucket }
  | { kind: 'kv'; line: string; key: string; bucket: Bucket };

function stripLegacyBanner(lines: string[]): string[] {
  const out = lines.filter((l) => l.trim() !== '');
  while (out.length > 0) {
    const t = out[0]!.trim();
    if (t.startsWith('#') && (t.includes('====') || t.includes('🛡️'))) {
      out.shift();
      continue;
    }
    if (t.startsWith('# ---') && /\d+\.\s/.test(t)) {
      out.shift();
      continue;
    }
    break;
  }
  return out;
}

function buildEntries(raw: string): Entry[] {
  const lines = stripLegacyBanner(raw.split(/\r?\n/));
  const forward: Array<{ kind: 'comment' | 'kv'; line: string; key?: string }> = [];
  for (const line of lines) {
    const k = extractKey(line);
    if (k) forward.push({ kind: 'kv', line, key: k });
    else forward.push({ kind: 'comment', line });
  }

  function bucketAfterComment(index: number): Bucket {
    for (let j = index + 1; j < forward.length; j++) {
      const row = forward[j];
      if (row.kind === 'kv' && row.key) return bucketForKey(row.key);
    }
    return 'CONFIGURACION_NUCLEO';
  }

  const out: Entry[] = [];
  for (let i = 0; i < forward.length; i++) {
    const row = forward[i];
    if (row.kind === 'kv' && row.key) {
      out.push({ kind: 'kv', line: row.line, key: row.key, bucket: bucketForKey(row.key) });
    } else {
      out.push({ kind: 'comment', line: row.line, bucket: bucketAfterComment(i) });
    }
  }
  return out;
}

async function run() {
  const cwd = process.cwd();
  const pathEnv = join(cwd, '.env');
  const rawBefore = readFileSync(pathEnv, 'utf8');
  const valuesBefore = parseDotEnv(rawBefore);
  const keysBefore = Object.keys(valuesBefore).sort();

  const entries = buildEntries(rawBefore);

  const byBucket: Record<Bucket, Entry[]> = {
    INTELIGENCIA_ARTIFICIAL: [],
    FINANZAS_PAGOS: [],
    ECOMMERCE: [],
    INFRAESTRUCTURA: [],
    REDES_SOCIALES: [],
    CONFIGURACION_NUCLEO: [],
  };

  for (const e of entries) {
    byBucket[e.bucket].push(e);
  }

  const order: Bucket[] = [
    'INTELIGENCIA_ARTIFICIAL',
    'FINANZAS_PAGOS',
    'ECOMMERCE',
    'INFRAESTRUCTURA',
    'REDES_SOCIALES',
    'CONFIGURACION_NUCLEO',
  ];

  const parts: string[] = [HEADER, ''];
  let blocksWithContent = 0;
  for (const b of order) {
    const chunk = byBucket[b];
    if (chunk.length === 0) continue;
    blocksWithContent += 1;
    parts.push(BLOCK[b], '');
    for (const e of chunk) {
      parts.push(e.line);
    }
    parts.push('');
  }

  const newContent = parts.join('\n').replace(/\n+$/, '\n');

  const valuesAfter = parseDotEnv(newContent);
  const keysAfter = Object.keys(valuesAfter).sort();

  if (keysBefore.length !== keysAfter.length) {
    console.error('Mismatch key count', { keysBefore: keysBefore.length, keysAfter: keysAfter.length });
    process.exit(1);
  }
  for (const k of keysBefore) {
    if (valuesBefore[k] !== valuesAfter[k]) {
      console.error('Value altered for', k);
      process.exit(1);
    }
  }

  const fileFromManager = await readEnvFile();
  if (fileFromManager !== rawBefore) {
    console.error('[reorder-env] readEnvFile !== disk read');
    process.exit(1);
  }

  await writeEnvFile(newContent);

  console.log(
    JSON.stringify({
      ok: true,
      categoryBlocksWithContent: blocksWithContent,
      buckets: order.map((b) => ({ bucket: b, lineCount: byBucket[b].length })),
    }),
  );
}

void run().catch((e) => {
  console.error(e);
  process.exit(1);
});

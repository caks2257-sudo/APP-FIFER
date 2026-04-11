/**
 * Scaffolding Engine — nueva App bajo (dashboard) + 5 planos _blueprints.
 * Uso: npm run fifer:create-app -- --name "ControlFinanzas"
 * Opcional: --permission pro | --permission=admin (sin TTY: default free; slug desarrollador → admin).
 */
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildXrayDatabaseBlueprint } from './xray-database-blueprint.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function parseDisplayName(argv: string[]): string {
  const idx = argv.indexOf('--name');
  if (idx !== -1 && argv[idx + 1]) {
    return String(argv[idx + 1]).trim();
  }
  const prefixed = argv.find((a) => a.startsWith('--name='));
  if (prefixed) {
    return prefixed.slice('--name='.length).trim();
  }
  throw new Error(
    'Falta --name. Ejemplo: npm run fifer:create-app -- --name "ControlFinanzas"',
  );
}

function toAppFolderSegment(displayName: string): string {
  const slug = displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .replace(/^-+|-+$/g, '');
  if (!slug) {
    throw new Error(
      'El nombre normalizado quedó vacío. Usa letras o números (ej. ControlFinanzas).',
    );
  }
  return slug;
}

type FiferAppAccessTier =
  | 'public'
  | 'free'
  | 'pro'
  | 'admin'
  | 'user-custom';

const ACCESS_TIERS: FiferAppAccessTier[] = [
  'public',
  'free',
  'pro',
  'admin',
  'user-custom',
];

function parsePermissionFlag(argv: string[]): FiferAppAccessTier | null {
  const eq = argv.find((a) => a.startsWith('--permission='));
  if (eq) {
    const v = eq.slice('--permission='.length).trim().toLowerCase();
    return ACCESS_TIERS.includes(v as FiferAppAccessTier)
      ? (v as FiferAppAccessTier)
      : null;
  }
  const idx = argv.indexOf('--permission');
  if (idx !== -1 && argv[idx + 1]) {
    const v = String(argv[idx + 1]).trim().toLowerCase();
    return ACCESS_TIERS.includes(v as FiferAppAccessTier)
      ? (v as FiferAppAccessTier)
      : null;
  }
  return null;
}

function appendAppRegistryEntry(
  content: string,
  entry: {
    id: string;
    label: string;
    href: string;
    iconKey: string;
    permission: FiferAppAccessTier;
    category: string;
  },
): string {
  const marker = 'export const appRegistry: FiferAppDefinition[] = [';
  const mpos = content.indexOf(marker);
  if (mpos === -1) {
    throw new Error(
      'No se pudo localizar export const appRegistry en src/registry/app-registry.ts',
    );
  }
  const innerStart = mpos + marker.length;
  let depth = 1;
  let closeIdx = -1;
  for (let i = innerStart; i < content.length; i++) {
    const c = content[i];
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) {
        closeIdx = i;
        break;
      }
    }
  }
  if (closeIdx === -1) {
    throw new Error('No se encontró el cierre del array appRegistry.');
  }
  const body = content.slice(innerStart, closeIdx).trimEnd();
  const needsComma = body.length > 0 && !body.endsWith(',');
  const tail = content.slice(closeIdx);
  const block = `${needsComma ? ',' : ''}\n  {\n    id: ${JSON.stringify(entry.id)},\n    label: ${JSON.stringify(entry.label)},\n    href: ${JSON.stringify(entry.href)},\n    iconKey: ${JSON.stringify(entry.iconKey)},\n    permission: ${JSON.stringify(entry.permission)},\n    category: ${JSON.stringify(entry.category)},\n  },`;
  return content.slice(0, innerStart) + body + block + '\n' + tail;
}

function registryHasAppId(content: string, id: string): boolean {
  if (!/^[a-z0-9]+$/i.test(id)) {
    return content.includes(`id: ${JSON.stringify(id)}`);
  }
  return new RegExp(`\\bid:\\s*'${id}'`).test(content);
}

async function resolveAccessTier(
  argv: string[],
  folderSegment: string,
): Promise<FiferAppAccessTier> {
  if (folderSegment === 'desarrollador') return 'admin';
  const fromFlag = parsePermissionFlag(argv);
  if (fromFlag) return fromFlag;
  if (!input.isTTY) return 'free';
  const rl = createInterface({ input, output });
  try {
    const raw = await rl.question(
      'Nivel de permiso (public|free|pro|admin|user-custom) [free]: ',
    );
    const v = raw.trim().toLowerCase() || 'free';
    if (ACCESS_TIERS.includes(v as FiferAppAccessTier)) return v as FiferAppAccessTier;
    console.warn(`Valor no reconocido «${raw}», se usa free.`);
    return 'free';
  } finally {
    rl.close();
  }
}

function toPageComponentBase(displayName: string): string {
  const parts = displayName
    .trim()
    .split(/[\s-_]+/)
    .filter(Boolean)
    .map((p) => p.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean);
  if (parts.length === 0) return 'FiferApp';
  const pascal = parts
    .map((p) => p[0].toUpperCase() + p.slice(1).toLowerCase())
    .join('');
  return /^[A-Z]/.test(pascal) ? pascal : `Fifer${pascal}`;
}

function resolveDashboardDir(root: string): string {
  const nested = path.join(root, 'fifer-landing', 'src', 'app', '(dashboard)');
  const flat = path.join(root, 'src', 'app', '(dashboard)');
  if (existsSync(nested)) return nested;
  if (existsSync(flat)) return flat;
  throw new Error(
    'No se encontró la ruta del dashboard. Se esperaba src/app/(dashboard) o fifer-landing/src/app/(dashboard) desde la raíz del proyecto.',
  );
}

function blueprintUi(displayName: string): string {
  return `# Plano Visual - ${displayName}

## Grid 12
- (Definir layout de 12 columnas para esta app: spans, breakpoints y densidad.)

## Paleta
- **Deep Navy** — fondos y contenedores principales.
- **Electric Yellow** — acentos, bordes activos y datos destacados.
`;
}

function blueprintData(displayName: string): string {
  return `# Plano de Datos - ${displayName}

## Esquemas Zod
- (Listar schemas de entrada/salida y versionado.)

## Endpoints
- (Rutas API, métodos, contratos y fuentes de verdad.)
`;
}

function blueprintRouting(displayName: string): string {
  return `# Plano de Enrutamiento - ${displayName}

## Rutas
- (Rutas Next.js / segmentos / parámetros dinámicos y enlaces desde el shell del dashboard.)
`;
}

function blueprintHealing(displayName: string): string {
  return `# Plano de Resiliencia - ${displayName}

## Circuit Breaker
- **Threshold:** 3 fallos consecutivos antes de abrir el circuito.
- (Política de half-open, cooldown y degradación controlada.)
`;
}

function pageTsxContent(
  displayName: string,
  componentBase: string,
  folderSegment: string,
): string {
  const fn = `${componentBase}Page`;
  const systemInstruction = JSON.stringify(
    `Genera insights de valor operativo para el módulo «${displayName}» (id: ${folderSegment}). Prioriza riesgos, oportunidades y próximos pasos concretos alineados con FIFER v6.0.`,
  );
  return `'use client';

import BaseBoxTemplate from '@/components/v0-ingestion/templates/BaseBoxTemplate';
import BoxErrorBoundary from '@/components/core/BoxErrorBoundary';
import SmartInsightWidget from '@/components/core/SmartInsightWidget';
import { useUserDnaStore } from '@/store/useUserDnaStore';

export default function ${fn}() {
  const profile = useUserDnaStore((s) => s.coreProfile);
  if (profile.role !== 'admin') {
    return (
      <div className="rounded-lg border border-red-500/40 bg-[#0A0F1E]/90 p-6 text-center text-sm text-red-200">
        Acceso Denegado
      </div>
    );
  }

  return (
    <BoxErrorBoundary>
      {/* Const. v6.0 — inmunidad: el circuito registra fallos con boxCircuitBreaker.recordFailure (p. ej. useBoxData / shells de box). */}
      {/* Ancho y centrado: heredado de src/app/(dashboard)/layout.tsx (max-w-7xl mx-auto). */}
      <BaseBoxTemplate config={{ title: ${JSON.stringify(displayName)} }} />
      <SmartInsightWidget
        moduleId="${folderSegment}"
        boxId="${folderSegment}-page"
        contextData={{}}
        systemInstruction={${systemInstruction}}
      />
    </BoxErrorBoundary>
  );
}
`;
}

async function main(): Promise<void> {
  let displayName: string;
  try {
    displayName = parseDisplayName(process.argv.slice(2));
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
    return;
  }

  if (!displayName) {
    console.error('El nombre no puede estar vacío.');
    process.exit(1);
    return;
  }

  let folderSegment: string;
  let componentBase: string;
  try {
    folderSegment = toAppFolderSegment(displayName);
    componentBase = toPageComponentBase(displayName);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
    return;
  }

  let dashboardDir: string;
  try {
    dashboardDir = resolveDashboardDir(repoRoot);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
    return;
  }

  const dashboardLayoutPath = path.join(dashboardDir, 'layout.tsx');
  if (!existsSync(dashboardLayoutPath)) {
    console.error(
      `No existe el layout del grupo (dashboard); no se puede crear la app de forma nativa. Se esperaba: ${dashboardLayoutPath}`,
    );
    process.exit(1);
    return;
  }

  const appDir = path.join(dashboardDir, folderSegment);
  const blueprintsDir = path.join(appDir, '_blueprints');

  if (existsSync(appDir)) {
    console.error(
      `La carpeta de la app ya existe; no se sobrescribe: ${appDir}`,
    );
    process.exit(1);
    return;
  }

  try {
    mkdirSync(blueprintsDir, { recursive: true });
    writeFileSync(
      path.join(appDir, 'page.tsx'),
      pageTsxContent(displayName, componentBase, folderSegment),
      'utf8',
    );
    writeFileSync(
      path.join(blueprintsDir, '_xray_UI.md'),
      blueprintUi(displayName),
      'utf8',
    );
    writeFileSync(
      path.join(blueprintsDir, '_xray_DATA.md'),
      blueprintData(displayName),
      'utf8',
    );
    writeFileSync(
      path.join(blueprintsDir, '_xray_ROUTING.md'),
      blueprintRouting(displayName),
      'utf8',
    );
    writeFileSync(
      path.join(blueprintsDir, '_xray_HEALING.md'),
      blueprintHealing(displayName),
      'utf8',
    );
    writeFileSync(
      path.join(blueprintsDir, '_xray_DATABASE.md'),
      buildXrayDatabaseBlueprint({
        kind: 'app',
        displayName,
      }),
      'utf8',
    );
  } catch (e) {
    console.error(
      'Error al escribir archivos:',
      e instanceof Error ? e.message : e,
    );
    process.exit(1);
    return;
  }

  const registryPath = path.join(repoRoot, 'src', 'registry', 'app-registry.ts');
  if (!existsSync(registryPath)) {
    console.error(`No existe el registro maestro: ${registryPath}`);
    process.exit(1);
    return;
  }

  let permission: FiferAppAccessTier;
  try {
    permission = await resolveAccessTier(process.argv.slice(2), folderSegment);
  } catch (e) {
    console.error(
      'Error al resolver permiso:',
      e instanceof Error ? e.message : e,
    );
    process.exit(1);
    return;
  }

  try {
    let reg = readFileSync(registryPath, 'utf8');
    if (registryHasAppId(reg, folderSegment)) {
      console.warn(
        `El id «${folderSegment}» ya existe en appRegistry; no se duplica la entrada.`,
      );
    } else {
      reg = appendAppRegistryEntry(reg, {
        id: folderSegment,
        label: displayName,
        href: `/${folderSegment}`,
        iconKey: 'LayoutGrid',
        permission,
        category: 'apps',
      });
      writeFileSync(registryPath, reg, 'utf8');
      console.log(`  Registro: añadido a appRegistry (${permission}).`);
      console.log(
        '  Nota: para mostrarla en la Sidebar, añade un nodo en sidebarNavigationSource (app-registry.ts).',
      );
    }
  } catch (e) {
    console.error(
      'Error al actualizar app-registry.ts:',
      e instanceof Error ? e.message : e,
    );
    process.exit(1);
    return;
  }

  console.log('App FIFER creada correctamente.');
  console.log(`  Ruta: ${appDir}`);
  console.log(`  Blueprints: ${blueprintsDir}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

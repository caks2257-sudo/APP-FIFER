import fs from 'node:fs';
import path from 'node:path';

type ModuleKind = 'app' | 'engine';

type ModuleTarget = {
  kind: ModuleKind;
  moduleId: string;
  modulePath: string;
  absPath: string;
  blueprintsPath: string;
};

const ROOT = process.cwd();
const STARTER_BLUEPRINTS = path.join(ROOT, 'v0_pack', 'starter-kit', '_blueprints');
const APPS_ROOT = path.join(ROOT, 'src', 'app', '[locale]', '(dashboard)');
const ENGINES_ROOT = path.join(ROOT, 'src', 'engines');
const OUTPUT_FILES = [
  '_xray_UI.md',
  '_xray_DATA.md',
  '_xray_ROUTING.md',
  '_xray_HEALING.md',
  '_xray_DATABASE.md',
] as const;

function toPosix(input: string) {
  return input.split(path.sep).join('/');
}

function existsDir(target: string) {
  return fs.existsSync(target) && fs.statSync(target).isDirectory();
}

function hasSignals(dir: string, kind: ModuleKind) {
  const blueprints = path.join(dir, '_blueprints');
  if (existsDir(blueprints)) return true;
  if (kind === 'app') return fs.existsSync(path.join(dir, 'page.tsx'));
  return fs.existsSync(path.join(dir, 'index.ts'));
}

function collectModuleDirs(root: string, kind: ModuleKind) {
  const found: string[] = [];

  function walk(current: string) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    if (hasSignals(current, kind)) found.push(current);

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === '_blueprints') continue;
      if (entry.name.startsWith('.')) continue;
      walk(path.join(current, entry.name));
    }
  }

  walk(root);
  return [...new Set(found)].sort((a, b) => a.localeCompare(b));
}

function readFilesSafe(dir: string) {
  if (!existsDir(dir)) return [] as string[];
  return fs
    .readdirSync(dir)
    .filter((name) => name.startsWith('_xray_') && name.endsWith('.md'))
    .map((name) => path.join(dir, name));
}

function extractLogicalLocation(files: string[], fallback: string) {
  const pattern = /FIFER:\/\/[^\s`]+/;
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const match = content.match(pattern);
    if (match?.[0]) return match[0];
  }
  return fallback;
}

function sanitizeKeyword(raw: string) {
  return raw
    .toLowerCase()
    .replace(/[#@]/g, ' ')
    .replace(/[^a-z0-9\s\-_/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractKeywordsFromSection(content: string) {
  const marker = '## CAPACIDADES DE NAVEGACIÓN (AODS_KEYWORDS)';
  const start = content.indexOf(marker);
  if (start === -1) return [];
  const chunk = content.slice(start + marker.length);
  const nextSection = chunk.search(/\n##\s+/);
  const section = nextSection >= 0 ? chunk.slice(0, nextSection) : chunk;

  const items = section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('-'))
    .map((line) => line.slice(1).trim().replace(/^`|`$/g, ''))
    .map(sanitizeKeyword)
    .filter(Boolean);

  return [...new Set(items)];
}

function extractKeywords(files: string[], kind: ModuleKind) {
  const preferred = kind === 'app' ? '_xray_ROUTING.md' : '_xray_LOGIC.md';
  const preferredFile = files.find((file) => file.endsWith(preferred));
  const ordered = preferredFile
    ? [preferredFile, ...files.filter((f) => f !== preferredFile)]
    : files;

  for (const file of ordered) {
    const content = fs.readFileSync(file, 'utf8');
    const keys = extractKeywordsFromSection(content);
    if (keys.length > 0) return keys;
  }
  return ['sin keywords registradas'];
}

function renderTemplate(template: string, target: ModuleTarget, logicalLocation: string, keywords: string[]) {
  const keywordLines = keywords.map((k) => `- \`${k}\``).join('\n');
  return template
    .replaceAll('{{LOGICAL_LOCATION}}', logicalLocation)
    .replaceAll('{{AODS_KEYWORDS}}', keywordLines)
    .replaceAll('{{MODULE_ID}}', target.moduleId)
    .replaceAll('{{MODULE_PATH}}', target.modulePath)
    .replaceAll('{{MODULE_KIND}}', target.kind);
}

function fallbackLogicalLocation(target: ModuleTarget) {
  if (target.kind === 'app') return `FIFER://APP/${target.modulePath.replace(/\//g, '_').toUpperCase()}`;
  return `FIFER://engines/${target.modulePath}`;
}

function buildTargets() {
  const appTargets = collectModuleDirs(APPS_ROOT, 'app').map<ModuleTarget>((absPath) => {
    const modulePath = toPosix(path.relative(APPS_ROOT, absPath));
    return {
      kind: 'app',
      moduleId: `app:${modulePath.replace(/\//g, '-')}`,
      modulePath,
      absPath,
      blueprintsPath: path.join(absPath, '_blueprints'),
    };
  });

  const engineTargets = collectModuleDirs(ENGINES_ROOT, 'engine').map<ModuleTarget>((absPath) => {
    const modulePath = toPosix(path.relative(ENGINES_ROOT, absPath));
    return {
      kind: 'engine',
      moduleId: `engine:${modulePath.replace(/\//g, '-')}`,
      modulePath,
      absPath,
      blueprintsPath: path.join(absPath, '_blueprints'),
    };
  });

  return [...appTargets, ...engineTargets];
}

function main() {
  if (!existsDir(STARTER_BLUEPRINTS)) {
    throw new Error(`Starter kit no encontrado: ${STARTER_BLUEPRINTS}`);
  }

  const templates = new Map<string, string>();
  for (const name of OUTPUT_FILES) {
    const templatePath = path.join(STARTER_BLUEPRINTS, name);
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Plantilla faltante: ${templatePath}`);
    }
    templates.set(name, fs.readFileSync(templatePath, 'utf8'));
  }

  const targets = buildTargets();
  let written = 0;

  for (const target of targets) {
    fs.mkdirSync(target.blueprintsPath, { recursive: true });
    const existingXrays = readFilesSafe(target.blueprintsPath);
    const logicalLocation = extractLogicalLocation(existingXrays, fallbackLogicalLocation(target));
    const keywords = extractKeywords(existingXrays, target.kind);

    for (const fileName of OUTPUT_FILES) {
      const template = templates.get(fileName);
      if (!template) continue;
      const compiled = renderTemplate(template, target, logicalLocation, keywords);
      fs.writeFileSync(path.join(target.blueprintsPath, fileName), `${compiled.trimEnd()}\n`, 'utf8');
      written += 1;
    }
  }

  console.log(`sync-blueprints: módulos=${targets.length} archivos=${written}`);
}

main();

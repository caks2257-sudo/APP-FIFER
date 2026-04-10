import fs from "node:fs";
import path from "node:path";

type CliArgs = Record<string, string | boolean>;

const DASHBOARD_SLOT_BY_PURPOSE: Record<string, string> = {
  analytics: "slot-stats-grid",
  stats: "slot-stats-grid",
  kpi: "slot-stats-grid",
  reporting: "slot-stats-grid",
  hero: "slot-hero",
  summary: "slot-hero",
  operations: "slot-main",
  workflow: "slot-main",
  ingestion: "slot-main",
  table: "slot-main-content",
  list: "slot-main-content",
  timeline: "slot-main-content",
  media: "slot-gallery",
  gallery: "slot-gallery",
  monitoring: "slot-stats-grid",
  tracking: "slot-stats-grid",
  map: "slot-stats-grid",
  form: "slot-main",
  formulario: "slot-main",
};

function toPascalCase(input: string): string {
  return input
    .split(/[^a-zA-Z0-9]+/g)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
    .join("");
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function ensureDir(p: string): void {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function writeIfMissing(filePath: string, content: string): void {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content, "utf8");
  }
}

function updateFile(filePath: string, updater: (input: string) => string): void {
  const current = fs.readFileSync(filePath, "utf8");
  const next = updater(current);
  if (next !== current) fs.writeFileSync(filePath, next, "utf8");
}

function suggestTargetSlotByPurpose(purpose?: string): string {
  if (!purpose) return "slot-main";
  const key = purpose.trim().toLowerCase();
  return DASHBOARD_SLOT_BY_PURPOSE[key] ?? "slot-main";
}

function normalizeRoutePath(rawPath: string): string {
  const cleaned = String(rawPath || "").trim().replace(/^\/+/, "").replace(/\/+$/, "");
  if (!cleaned) return "/";
  return `/${cleaned}`;
}

function suggestBoxIdForRoute(moduleId: string, routePath: string, purpose?: string): string {
  const routeToken = normalizeRoutePath(routePath).replace(/^\//, "") || "overview";
  const purposeKey = String(purpose ?? "").trim().toLowerCase();
  if (purposeKey === "monitoring" || routeToken === "tracking") {
    return `${moduleId}-delivery-map`;
  }
  return `${moduleId}-${routeToken.replace(/[^a-z0-9-]/g, "-")}-box`;
}

function upsertRouteInModuleConfig(
  moduleConfigInput: string,
  routePath: string,
  targetSlot: string,
  boxId: string
): string {
  const normalizedRoutePath = normalizeRoutePath(routePath);
  if (moduleConfigInput.includes(`path: "${normalizedRoutePath}"`)) {
    return moduleConfigInput;
  }

  const routesToken = "routes: [";
  const routesStart = moduleConfigInput.indexOf(routesToken);
  if (routesStart < 0) {
    throw new Error("No se encontro el bloque `routes` en module.config.ts");
  }
  const arrayStart = moduleConfigInput.indexOf("[", routesStart);
  if (arrayStart < 0) {
    throw new Error("No se encontro apertura del array `routes`.");
  }
  let depth = 0;
  let arrayEnd = -1;
  for (let i = arrayStart; i < moduleConfigInput.length; i += 1) {
    const ch = moduleConfigInput[i];
    if (ch === "[") depth += 1;
    if (ch === "]") {
      depth -= 1;
      if (depth === 0) {
        arrayEnd = i;
        break;
      }
    }
  }
  if (arrayEnd < 0) throw new Error("No se encontro cierre del array `routes`.");

  const routeEntry = `    {
      path: "${normalizedRoutePath}",
      slots: {
        "${targetSlot}": ["${boxId}"],
      },
      rolesRequired: [],
    },
`;

  const before = moduleConfigInput.slice(0, arrayEnd);
  const after = moduleConfigInput.slice(arrayEnd);
  const withSpacing = before.endsWith("\n") ? before : `${before}\n`;
  return `${withSpacing}${routeEntry}${after}`;
}

function createModuleScaffold(args: CliArgs): void {
  const moduleId = String(args.module ?? "").trim().toLowerCase();
  if (!moduleId) {
    throw new Error("Falta --module <module-id>.");
  }

  const moduleName = String(args.name ?? toPascalCase(moduleId));
  const icon = String(args.icon ?? "boxes");
  const biomePrimary = String(args.biomePrimary ?? "#1D4ED8");
  const biomeAccent = String(args.biomeAccent ?? "#64748B");
  const purpose = String(args.purpose ?? "operations");
  const targetSlot = String(args.slot ?? suggestTargetSlotByPurpose(purpose));
  const initialBoxId = String(args.boxId ?? `${moduleId}-status-overview`);

  const root = path.resolve(__dirname, "..");
  const modulesDir = path.join(root, "src", "modules");
  const moduleDir = path.join(modulesDir, moduleId);
  const moduleConfigFile = path.join(moduleDir, "module.config.ts");
  const xrayFile = path.join(moduleDir, "_xray_v0_local.md");
  const boxesDir = path.join(moduleDir, "boxes");
  const boxesReadme = path.join(boxesDir, "README.md");
  const localBoxSeed = path.join(boxesDir, `${initialBoxId}.seed.md`);

  ensureDir(moduleDir);
  ensureDir(boxesDir);

  const configSymbol = `${toPascalCase(moduleId)}ModuleConfig`;
  const moduleConfigContent = `import {
  ModuleConfigRegistrySchema,
  ModuleConfigSchema,
  type ModuleConfigRegistry,
} from "@/schema/registry.schema";

const ${toPascalCase(moduleId)}Core = ModuleConfigSchema.parse({
  id: "${moduleId}",
  biomePrimary: "${biomePrimary}",
  biomeAccent: "${biomeAccent}",
});

export const ${configSymbol}: ModuleConfigRegistry = ModuleConfigRegistrySchema.parse({
  id: ${toPascalCase(moduleId)}Core.id,
  nombre: "${moduleName}",
  icono: "${icon}",
  biome: {
    primary: ${toPascalCase(moduleId)}Core.biomePrimary,
    accent: ${toPascalCase(moduleId)}Core.biomeAccent,
    surface: "#111827",
    onPrimary: "#F8FAFC",
  },
  themeOverrides: {
    primary: ${toPascalCase(moduleId)}Core.biomePrimary,
    accent: ${toPascalCase(moduleId)}Core.biomeAccent,
    surface: "#111827",
    onPrimary: "#F8FAFC",
  },
  routes: [
    {
      path: "/",
      slots: {
        "${targetSlot}": ["${initialBoxId}"],
      },
      rolesRequired: [],
    },
  ],
});
`;
  writeIfMissing(moduleConfigFile, moduleConfigContent);

  const xrayContent = `> AUTO-GENERATED by scripts/fifer-factory.ts

# X-Ray v0 local - ${moduleName} (\`${moduleId}\`)

## Bioma local

| Token | Valor |
|-------|-------|
| \`biomePrimary\` | \`${biomePrimary}\` |
| \`biomeAccent\` | \`${biomeAccent}\` |

## Slot sugerido por propósito

- purpose: \`${purpose}\`
- targetSlot: \`${targetSlot}\`
- initialBoxId: \`${initialBoxId}\`

## boxes/

Usa esta carpeta para contratos locales de piezas v0-ingestion del módulo.

---
*Auditoria X-Ray · Ultima sincronizacion: 2026-04-09*
`;
  writeIfMissing(xrayFile, xrayContent);

  writeIfMissing(
    boxesReadme,
    `# ${moduleId}/boxes\n\nContratos locales y semillas para boxes del modulo \`${moduleId}\`.\n`
  );
  writeIfMissing(
    localBoxSeed,
    `boxId: ${initialBoxId}\nsourceModule: ${moduleId}\ntargetSlot: ${targetSlot}\n`
  );

  const modulesIndexPath = path.join(modulesDir, "index.ts");
  updateFile(modulesIndexPath, (input) => {
    const importLine = `import { ${configSymbol} } from "./${moduleId}/module.config";`;
    const hasImport = input.includes(importLine);
    const hasConfig = input.includes(`${configSymbol},`);
    let out = input;
    if (!hasImport) {
      out = `${out.trimEnd()}\n${importLine}\n`;
    }
    if (!hasConfig) {
      out = out.replace(/moduleConfigs:\s*ModuleConfig\[\]\s*=\s*\[\s*/m, (match) => `${match}${configSymbol},\n  `);
    }
    return out;
  });

  const moduleRegistryPath = path.join(root, "src", "registry", "module-registry.ts");
  updateFile(moduleRegistryPath, (input) => {
    const importLine = `import { ${configSymbol} } from "@/modules/${moduleId}/module.config";`;
    let out = input;
    if (!out.includes(importLine)) {
      out = `${out.trimEnd()}\n${importLine}\n`;
    }
    if (!out.includes(`${configSymbol},`)) {
      out = out.replace(
        /MASTER_MODULE_REGISTRY:\s*ReadonlyArray<ModuleConfigRegistry>\s*=\s*Object\.freeze\(\[\s*/m,
        (match) => `${match}${configSymbol},\n  `
      );
    }
    return out;
  });

  console.log(`[fifer-factory] modulo creado: src/modules/${moduleId}`);
  console.log(`[fifer-factory] targetSlot sugerido: ${targetSlot}`);
  console.log(
    `[fifer-factory] recuerda registrar boxId "${initialBoxId}" en src/components/v0-ingestion/registry.ts y src/registry/box-catalog.ts`
  );
}

function addRouteToModule(args: CliArgs): void {
  const moduleId = String(args.module ?? "").trim().toLowerCase();
  const routePath = String(args.route ?? "").trim();
  if (!moduleId) throw new Error("Falta --module <module-id>.");
  if (!routePath) throw new Error("Falta --route <path>.");

  const purpose = String(args.purpose ?? "operations");
  const targetSlot = String(args.slot ?? suggestTargetSlotByPurpose(purpose));
  const boxId = String(args.boxId ?? suggestBoxIdForRoute(moduleId, routePath, purpose));

  const root = path.resolve(__dirname, "..");
  const moduleDir = path.join(root, "src", "modules", moduleId);
  const moduleConfigFile = path.join(moduleDir, "module.config.ts");
  const boxesDir = path.join(moduleDir, "boxes");
  if (!fs.existsSync(moduleConfigFile)) {
    throw new Error(`No existe module.config.ts para "${moduleId}".`);
  }

  const currentConfig = fs.readFileSync(moduleConfigFile, "utf8");
  const nextConfig = upsertRouteInModuleConfig(currentConfig, routePath, targetSlot, boxId);
  if (nextConfig !== currentConfig) {
    fs.writeFileSync(moduleConfigFile, nextConfig, "utf8");
  }

  ensureDir(boxesDir);
  const normalizedRoutePath = normalizeRoutePath(routePath);
  const seedPath = path.join(boxesDir, `${boxId}.seed.md`);
  writeIfMissing(
    seedPath,
    `boxId: ${boxId}\nsourceModule: ${moduleId}\nroutePath: ${normalizedRoutePath}\ntargetSlot: ${targetSlot}\npurpose: ${purpose}\n`
  );

  console.log(`[fifer-factory] ruta añadida: ${moduleId}${normalizedRoutePath}`);
  console.log(`[fifer-factory] targetSlot sugerido: ${targetSlot}`);
  console.log(`[fifer-factory] boxId sugerido: ${boxId}`);
  console.log(`[fifer-factory] placeholder local: src/modules/${moduleId}/boxes/${boxId}.seed.md`);
  console.log(`[fifer-factory] registra boxId en registry.ts + box-catalog.ts para cerrar circuito`);
}

function printHelp(): void {
  console.log(`FIFER App Factory

Uso:
  npx tsx scripts/fifer-factory.ts suggest-slot --purpose <purpose>
  npx tsx scripts/fifer-factory.ts create-module --module <id> [--name <nombre>] [--purpose <purpose>]
      [--slot <slot>] [--boxId <box-id>] [--biomePrimary <#hex>] [--biomeAccent <#hex>] [--icon <lucide-id>]
  npx tsx scripts/fifer-factory.ts add-route --module <id> --route <path> --purpose <purpose>
      [--slot <slot>] [--boxId <box-id>]
`);
}

function main(): void {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  if (!command || command === "help" || command === "--help") {
    printHelp();
    return;
  }
  if (command === "suggest-slot") {
    const purpose = String(args.purpose ?? "");
    const slot = suggestTargetSlotByPurpose(purpose);
    console.log(slot);
    return;
  }
  if (command === "create-module") {
    createModuleScaffold(args);
    return;
  }
  if (command === "add-route") {
    addRouteToModule(args);
    return;
  }

  throw new Error(`Comando no soportado: ${command}`);
}

main();

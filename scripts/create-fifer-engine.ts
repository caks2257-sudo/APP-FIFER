/**
 * Fábrica de Micro-Cores — scaffolding de motores bajo src/engines/
 * Plantillas _blueprints alineadas con scripts/audit-engines.ts (Auditor).
 *
 * Persistencia: use `--with-persistence` si el motor mantiene tablas/modelos propios;
 * el blueprint `_xray_DATABASE.md` se genera siempre (§8); sin persistencia propia, documentar N/A en el plano.
 */
import fs from "fs";
import path from "path";
import { buildXrayDatabaseBlueprint } from "./xray-database-blueprint.js";

const PROJECT_ROOT = path.resolve(__dirname, "..");
const ENGINES_ROOT = path.join(PROJECT_ROOT, "src", "engines");

/** Mismas cadenas que en audit-engines.ts */
const CONTRACT_TEMPLATE = `# Contrato Zod (Motor)

**Estado:** Contrato Zod pendiente de tipar.

Documentar aquí los esquemas Zod de entrada/salida, validaciones y límites del motor una vez definidos.
`;

const LOGIC_TEMPLATE = `# Lógica y dependencias

**Estado:** Lógica y dependencias del motor — pendiente de documentación detallada.

Describir flujo principal, módulos internos, imports críticos y efectos secundarios (I/O, red, persistencia).
`;

const HEALING_TEMPLATE = `# Healing & resiliencia (CRÍTICO)

## Estrategia AI Fallback Cascade

1. **Primario** (ej. Gemini)
2. **Secundario** (ej. Claude)
3. **Terciario** (ej. OpenAI)

**Rompecircuitos interno:** Pendiente de auditoría manual.

Completar umbrales, timeouts, reintentos y señales de degradación tras revisión humana.
`;

function parseNameArg(): string {
  const argv = process.argv.slice(2);
  let name: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--name" && argv[i + 1]) {
      name = argv[i + 1];
      break;
    }
    const m = /^--name=(.+)$/.exec(argv[i]);
    if (m) name = m[1];
  }
  if (!name?.trim()) {
    console.error(
      "Uso: npm run fifer:create-engine -- --name \"mi-motor-kebab\" [--with-persistence]\n" +
        "     npx tsx scripts/create-fifer-engine.ts --name mi-motor-kebab"
    );
    process.exit(1);
  }
  return name.trim();
}

function parseWithPersistenceFlag(): boolean {
  const argv = process.argv.slice(2);
  return argv.includes("--with-persistence");
}

function assertValidEngineSlug(slug: string): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    console.error(
      `[ERROR] Nombre inválido "${slug}". Use kebab-case minúsculas (ej. dom-scraper).`
    );
    process.exit(1);
  }
}

function toPascalCase(kebab: string): string {
  return kebab
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

function indexTsContent(slug: string, className: string): string {
  return `/**
 * Motor \`${slug}\` — Micro-Core FIFER (Constitución v6.0)
 */

const ENGINE_ID = "${slug}" as const;

export class ${className}Engine {
  readonly id = ENGINE_ID;
}

try {
  // Inmunidad módulo: evita que errores síncronos en fase de carga tumbe el importador.
  void ENGINE_ID;
} catch (error) {
  console.error(\`[FIFER Engine] \${ENGINE_ID} — error en fase de carga:\`, error);
}
`;
}

function main(): void {
  const rawName = parseNameArg();
  assertValidEngineSlug(rawName);

  if (!fs.existsSync(ENGINES_ROOT)) {
    fs.mkdirSync(ENGINES_ROOT, { recursive: true });
  }

  const motorDir = path.join(ENGINES_ROOT, rawName);
  if (fs.existsSync(motorDir)) {
    console.error(
      `[ERROR] Ya existe src/engines/${rawName}. Elija otro nombre o elimine la carpeta manualmente.`
    );
    process.exit(1);
  }

  fs.mkdirSync(motorDir, { recursive: true });

  const blueprints = path.join(motorDir, "_blueprints");
  fs.mkdirSync(blueprints, { recursive: true });

  fs.writeFileSync(
    path.join(blueprints, "_xray_CONTRACT.md"),
    CONTRACT_TEMPLATE,
    "utf8"
  );
  fs.writeFileSync(
    path.join(blueprints, "_xray_LOGIC.md"),
    LOGIC_TEMPLATE,
    "utf8"
  );
  fs.writeFileSync(
    path.join(blueprints, "_xray_HEALING.md"),
    HEALING_TEMPLATE,
    "utf8"
  );

  let databaseMd = buildXrayDatabaseBlueprint({
    kind: "engine",
    slug: rawName,
  });
  if (parseWithPersistenceFlag()) {
    databaseMd =
      databaseMd +
      "\n## Persistencia propia (flag `--with-persistence`)\n\n" +
      "- Completar modelo, campos, relaciones y políticas RLS antes del primer deploy.\n" +
      "- Registrar migraciones en la tabla de MIGRATIONS.\n";
  }

  fs.writeFileSync(
    path.join(blueprints, "_xray_DATABASE.md"),
    databaseMd,
    "utf8"
  );

  const pascal = toPascalCase(rawName);
  fs.writeFileSync(
    path.join(motorDir, "index.ts"),
    indexTsContent(rawName, pascal),
    "utf8"
  );

  console.log(
    `[OK] Motor creado: src/engines/${rawName}/ (index.ts + _blueprints/)`
  );
}

main();

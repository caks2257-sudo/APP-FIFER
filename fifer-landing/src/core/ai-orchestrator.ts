/**
 * AI Orchestrator — análisis simulado de intención vs engines oficiales (`FIFER_BOX_CATALOG`)
 * y borrador de propuesta para motores en `user_space/`.
 */

import { FIFER_BOX_CATALOG } from "@/registry/box-catalog";
import type { UserEngineReport, UserEngineRisk } from "@/schemas/engine-report.schema";
import { listActiveUserEngineSlugs } from "@/user_space/user-engine-reports";
/** Árbol de carpetas sugerido para scaffolding. */
export type EngineFolderNode = {
  kind: "dir" | "file";
  name: string;
  children?: EngineFolderNode[];
};

export type EngineProposal = {
  slug: string;
  title: string;
  rationale: string;
  /** Módulos oficiales del catálogo que encajan con el texto (p. ej. `scraping`). */
  matchedOfficialModules: string[];
  suggestedFolderTree: EngineFolderNode[];
  /** Borrador válido frente a `EngineReportSchema` (listo para `engine_report.json`). */
  engineReportDraft: UserEngineReport;
  inputs: UserEngineReport["inputs"];
  outputs: UserEngineReport["outputs"];
};

export type OrchestratorAnalysisResult = {
  userPrompt: string;
  needsNewEngine: boolean;
  coverageSummary: string;
  proposal?: EngineProposal;
};

/** Módulos de negocio presentes en el catálogo core (excluye `user-space`). */
export function listOfficialEngineModules(): string[] {
  const s = new Set<string>();
  for (const m of FIFER_BOX_CATALOG) {
    if (m.sourceModule !== "user-space") s.add(m.sourceModule);
  }
  return Array.from(s).sort();
}

const MODULE_KEYWORDS: Record<string, readonly string[]> = {
  finance: ["finanz", "uf", "cashflow", "presupuesto", "cobro", "factura", "pago", "banco"],
  content: ["contenido", "google shopping", "catálogo", "sku", "pipeline", "meta"],
  affiliates: ["afiliad", "comisi", "oferta", "cpa"],
  logistics: ["logístic", "flota", "entrega", "delivery", "envío"],
  scraping: ["scrap", "scraping", "url", "crawler", "html", "página web", "sitio web", "descargar página"],
};

function slugify(s: string): string {
  const base = s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return base || "custom-engine";
}

/** Tokens con mayúscula inicial (marcas / nombres propios). */
export function extractCapitalizedTokens(prompt: string): string[] {
  const caps = prompt.match(/\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}\b/g) || [];
  const unique: string[] = [];
  for (const w of caps) {
    if (!unique.includes(w)) unique.push(w);
  }
  return unique;
}

function detectModulesFromText(text: string): string[] {
  const t = text.toLowerCase();
  const hit: string[] = [];
  for (const [mod, keys] of Object.entries(MODULE_KEYWORDS)) {
    if (keys.some((k) => t.includes(k))) hit.push(mod);
  }
  return hit;
}

function wantsDedicatedSiteEngine(text: string): boolean {
  return /\b(mi web|nuestra web|sitio de|web de|dominio)\b/i.test(text);
}

function buildFolderTree(slug: string): EngineFolderNode[] {
  /** Carpeta sandbox literal del repo (ver `user-space-manifests.ts`). */
  const userRoot = "src/user_space/[user_id_mock]";
  return [
    {
      kind: "dir",
      name: userRoot,
      children: [
        {
          kind: "dir",
          name: `engines/${slug}`,
          children: [
            { kind: "file", name: "index.ts" },
            { kind: "file", name: "engine_report.json" },
          ],
        },
        {
          kind: "dir",
          name: `apps`,
          children: [{ kind: "file", name: `${slug}-box.tsx` }],
        },
      ],
    },
  ];
}

function buildProposal(params: {
  slug: string;
  title: string;
  rationale: string;
  matchedOfficialModules: string[];
  risk: UserEngineRisk;
}): EngineProposal {
  const { slug, title, rationale, matchedOfficialModules, risk } = params;
  const inputs: UserEngineReport["inputs"] = [
    { id: "targetUrl", label: "URL base o listado a ingestar", type: "url" },
    { id: "selectors", label: "Selectores CSS / reglas (opcional)", type: "json" },
    { id: "vaultSecretRef", label: "Referencia Vault si el sitio exige auth", type: "secret_ref" },
  ];
  const outputs: UserEngineReport["outputs"] = [
    { id: "normalizedRows", label: "Filas normalizadas FIFER (`FiferBoxDataNormalized`)", type: "object[]" },
    { id: "engineManifest", label: "Fragmento de manifiesto para el grid", type: "partial_manifest" },
  ];
  return {
    slug,
    title,
    rationale,
    matchedOfficialModules,
    suggestedFolderTree: buildFolderTree(slug),
    engineReportDraft: {
      id: slug,
      name: title,
      function: "execute",
      risk,
      inputs,
      outputs,
      version: "0.1.0-draft",
    },
    inputs,
    outputs,
  };
}

/**
 * Compara el pedido del usuario con los módulos oficiales del catálogo.
 * Si la intención requiere un motor dedicado en user_space, devuelve `EngineProposal`.
 */
function walkFolderTree(nodes: EngineFolderNode[], prefix = ""): string[] {
  const out: string[] = [];
  for (const n of nodes) {
    out.push(`${prefix}${n.kind === "dir" ? "📁 " : "📄 "}${n.name}`);
    if (n.children?.length) out.push(...walkFolderTree(n.children, `${prefix}  `));
  }
  return out;
}

/** Texto listo para `.tmp` / consola — plan de scaffolding legible por Cursor. */
export function formatScaffoldPreviewText(proposal: EngineProposal): string {
  return [
    `# FIFER — Scaffold simulado (user_space)`,
    `generatedAt: ${new Date().toISOString()}`,
    "",
    `slug: ${proposal.slug}`,
    `title: ${proposal.title}`,
    "",
    "## Rationale",
    proposal.rationale,
    "",
    "## Matched official modules (hint)",
    proposal.matchedOfficialModules.length ? proposal.matchedOfficialModules.join(", ") : "(ninguno)",
    "",
    "## Folder tree",
    ...walkFolderTree(proposal.suggestedFolderTree),
    "",
    "## engine_report.json (draft)",
    JSON.stringify(proposal.engineReportDraft, null, 2),
    "",
    "## Inputs / Outputs",
    JSON.stringify({ inputs: proposal.inputs, outputs: proposal.outputs }, null, 2),
  ].join("\n");
}

export function analyzeOrchestratorIntent(prompt: string): OrchestratorAnalysisResult {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return {
      userPrompt: "",
      needsNewEngine: false,
      coverageSummary: "Escribe una instrucción para analizar intención y catálogo.",
    };
  }

  const brands = extractCapitalizedTokens(trimmed);
  const modules = detectModulesFromText(trimmed);
  const officialList = listOfficialEngineModules();
  const activeSlugs = listActiveUserEngineSlugs();

  const customSite =
    modules.includes("scraping") && (brands.length > 0 || wantsDedicatedSiteEngine(trimmed));

  if (customSite) {
    const brandHint = brands[0] ?? "custom-site";
    const slug = slugify(`${brandHint}-engine`);
    if (activeSlugs.has(slug)) {
      return {
        userPrompt: trimmed,
        needsNewEngine: false,
        coverageSummary: `Ya hay un motor activo en user_space con id "${slug}" (engine_report.json). Amplía ese engine o elige otro nombre de sitio.`,
      };
    }
    return {
      userPrompt: trimmed,
      needsNewEngine: true,
      coverageSummary:
        "Hay boxes oficiales de scraping, pero un sitio con identidad propia encaja mejor con un motor dedicado en user_space (selectores, branding, riesgo).",
      proposal: buildProposal({
        slug,
        title: `Motor dedicado · ${brandHint}`,
        rationale:
          "El catálogo oficial cubre scraping genérico; la petición implica un destino concreto (marca o “mi web”), típico de un engine sandbox por usuario.",
        matchedOfficialModules: modules.filter((m) => officialList.includes(m)),
        risk: "low",
      }),
    };
  }

  if (modules.length === 0) {
    const slug = slugify(trimmed.slice(0, 32));
    if (activeSlugs.has(slug)) {
      return {
        userPrompt: trimmed,
        needsNewEngine: false,
        coverageSummary: `Ya hay un motor activo en user_space con id "${slug}" (engine_report.json).`,
      };
    }
    return {
      userPrompt: trimmed,
      needsNewEngine: true,
      coverageSummary:
        "No se detectó coincidencia clara con los módulos oficiales del catálogo (finanzas, contenido, afiliados, logística, scraping).",
      proposal: buildProposal({
        slug,
        title: "Motor custom (intención no mapeada)",
        rationale:
          "Ninguna palabra clave encaja con los engines oficiales documentados en `FIFER_BOX_CATALOG`; se propone un motor nuevo en user_space.",
        matchedOfficialModules: [],
        risk: "medium",
      }),
    };
  }

  return {
    userPrompt: trimmed,
    needsNewEngine: false,
    coverageSummary: `Los engines oficiales del catálogo cubren la intención detectada (${modules.join(", ")}). Puedes componer Boxes existentes sin crear un motor nuevo.`,
  };
}

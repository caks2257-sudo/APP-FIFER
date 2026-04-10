import { moduleConfigs } from "@/modules";
import { FIFER_BOX_CATALOG } from "@/registry/box-catalog";
import { MASTER_MODULE_REGISTRY } from "@/registry/module-registry";

const CMD_SLASH = "/";

export type UICommandResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export type CommanderContext = {
  moduleId: string;
  routePath: string;
};

export type ParsedUICommand =
  | { kind: "noop" }
  | { kind: "expand_all_current" }
  | { kind: "expand_module"; moduleId: string; routePath: string }
  | { kind: "collapse_all_current" }
  | { kind: "collapse_module"; moduleId: string; routePath: string }
  | { kind: "move_to_start"; subject: string };

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const MODULE_ALIASES: Record<string, string> = {
  finanzas: "finance",
  finance: "finance",
  auditoria: "finance",
  dashboard: "dashboard",
  tablero: "dashboard",
  inicio: "dashboard",
  contenido: "content",
  content: "content",
  generar: "content",
  afiliados: "affiliates",
  affiliates: "affiliates",
};

export function parseDashboardPathname(pathname: string): CommanderContext | null {
  const parts = pathname.replace(/^\/+/, "").split("/").filter(Boolean);
  if (parts.length === 0) return null;
  const moduleId = parts[0].toLowerCase();
  const sub = parts.slice(1);
  const routePath =
    sub.length > 0 ? `/${sub.join("/")}`.replace(/\/+$/, "") || "/" : "/";
  return { moduleId, routePath };
}

export function resolveModuleFromAlias(keyword: string): { moduleId: string; routePath: string } | null {
  const k = stripDiacritics(keyword)
    .toLowerCase()
    .replace(/^el\s+/, "")
    .replace(/^la\s+/, "")
    .trim();
  if (!k) return null;

  const byAlias = MODULE_ALIASES[k];
  if (byAlias) {
    const mod = moduleConfigs.find((m) => m.id === byAlias);
    if (mod?.routes[0]) {
      const p = String(mod.routes[0].path || "/").replace(/\/+$/, "") || "/";
      return { moduleId: mod.id, routePath: p };
    }
  }

  const mod =
    moduleConfigs.find((m) => m.id === k) ||
    moduleConfigs.find((m) => stripDiacritics(m.nombre).toLowerCase().includes(k));
  if (mod?.routes[0]) {
    const p = String(mod.routes[0].path || "/").replace(/\/+$/, "") || "/";
    return { moduleId: mod.id, routePath: p };
  }
  return null;
}

/** Puntuación simple para emparejar texto libre con `boxId` (ej. "reporte" → `finance-transactions-grid`). */
export function scoreBoxIdAgainstSubject(boxId: string, subject: string): number {
  const idn = boxId.toLowerCase();
  const sub = stripDiacritics(subject)
    .toLowerCase()
    .trim()
    .replace(/^el\s+|la\s+|los\s+|las\s+/g, "");
  if (sub.length < 2) return 0;
  if (idn.includes(sub)) return 100;
  const words = sub.split(/\s+/).filter((w) => w.length > 1);
  let score = 0;
  for (const w of words) {
    if (idn.includes(w)) score += 12;
  }
  if (sub.includes("report") || sub.includes("informe")) {
    if (idn.includes("transaction") || idn.includes("grid") || idn.includes("report")) score += 45;
  }
  if (sub.includes("cash") || sub.includes("flujo") || sub.includes("caja")) {
    if (idn.includes("cashflow") || idn.includes("chart")) score += 45;
  }
  if (sub.includes("kpi") || sub.includes("resumen")) {
    if (idn.includes("kpi") || idn.includes("summary")) score += 40;
  }
  if (sub.includes("ia") || sub.includes("insight")) {
    if (idn.includes("ia") || idn.includes("insight")) score += 40;
  }
  return score;
}

export function findBoxInLayoutSlice(
  slice: { slotOrder: Record<string, string[]> },
  subject: string
): { boxId: string; slotName: string } | null {
  let best: { boxId: string; slotName: string; score: number } | null = null;
  for (const slotName of Object.keys(slice.slotOrder)) {
    const order = slice.slotOrder[slotName] || [];
    for (const boxId of order) {
      const score = scoreBoxIdAgainstSubject(boxId, subject);
      if (score > (best?.score ?? 0)) best = { boxId, slotName, score };
    }
  }
  if (!best || best.score < 8) return null;
  return { boxId: best.boxId, slotName: best.slotName };
}

/** Fila contextual Cmd+K (slash) derivada de pathname + integraciones. */
export type SpotlightContextSlashRow = {
  key: string;
  title: string;
  description: string;
  command: string;
  /** Prioridad visual Autosanación (401). */
  highlight?: "autosanacion";
};

export function pathnameSuggestsContentModule(pathname: string | null | undefined): boolean {
  return (pathname || "").toLowerCase().includes("/content");
}

export function pathnameSuggestsFinanceModule(pathname: string | null | undefined): boolean {
  return (pathname || "").toLowerCase().includes("/finance");
}

export function anyIntegration401Active(integration401ByBox: Record<string, boolean>): boolean {
  return Object.values(integration401ByBox).some(Boolean);
}

/** Unión estable: manifiestos `FIFER_BOX_CATALOG` + slots de todas las rutas en `MASTER_MODULE_REGISTRY`. */
export function collectRegisteredBoxIds(): string[] {
  const s = new Set<string>();
  for (const m of FIFER_BOX_CATALOG) s.add(m.boxId);
  for (const mod of Object.values(MASTER_MODULE_REGISTRY)) {
    for (const route of mod.routes) {
      for (const ids of Object.values(route.slots)) {
        for (const bid of ids) s.add(bid);
      }
    }
  }
  return Array.from(s).sort((a, b) => a.localeCompare(b));
}

export type BoxRouteLocation = { moduleId: string; routePath: string };

/**
 * Primera ruta del registro maestro que declara el `boxId`; si no, manifiesto FIFER (`sourceModule` + `/`).
 */
export function findRouteForBoxId(boxId: string): BoxRouteLocation | null {
  for (const mod of MASTER_MODULE_REGISTRY) {
    const moduleId = mod.id;
    for (const route of mod.routes) {
      for (const ids of Object.values(route.slots)) {
        if (ids.includes(boxId)) {
          const p = String(route.path || "/").replace(/\/+$/, "") || "/";
          return { moduleId, routePath: p };
        }
      }
    }
  }
  const m = FIFER_BOX_CATALOG.find((x) => x.boxId === boxId);
  if (m) {
    return { moduleId: m.sourceModule, routePath: "/" };
  }
  return null;
}

/** Filas Cmd+K: `/mostrar <boxId>` por cada caja del catálogo + registro (sin comandos fijos por módulo). */
export type CommanderRegistryRow = {
  key: string;
  kind: "slash";
  title: string;
  description: string;
  command: string;
};

export function buildMostrarBoxQuickRows(): CommanderRegistryRow[] {
  return collectRegisteredBoxIds().map((boxId) => ({
    key: `registry-mostrar-${boxId}`,
    kind: "slash" as const,
    title: `${CMD_SLASH}mostrar ${boxId}`,
    description: "Navegar al módulo y centrar la caja en el grid.",
    command: `${CMD_SLASH}mostrar ${boxId}`,
  }));
}

/**
 * Sugerencias dinámicas Spotlight — no altera `parseUICommandInput` ni comandos no reconocidos.
 */
export function buildSpotlightContextSlashRows(
  pathname: string | null | undefined,
  options: { prioritizeRepairCredentials: boolean }
): SpotlightContextSlashRow[] {
  const rows: SpotlightContextSlashRow[] = [];
  if (options.prioritizeRepairCredentials) {
    rows.push({
      key: "ctx-reparar-credenciales",
      title: "/reparar-credenciales",
      description: "Autosanación — Vault / Perfil (401 activo en integraciones).",
      command: "/reparar-credenciales",
      highlight: "autosanacion",
    });
  }
  if (pathnameSuggestsContentModule(pathname)) {
    rows.push(
      {
        key: "ctx-generar-copy",
        title: "/generar-copy",
        description: "Pipeline de copy · módulo contenido.",
        command: "/generar-copy",
      },
      {
        key: "ctx-sync-inventario",
        title: "/sync-inventario",
        description: "Sincronizar inventario ABKupfer desde esta vista.",
        command: "/sync-inventario",
      }
    );
  }
  if (pathnameSuggestsFinanceModule(pathname)) {
    rows.push(
      {
        key: "ctx-estado-municipal",
        title: "/estado-municipal",
        description: "Estado municipal y trazas Chicureo.",
        command: "/estado-municipal",
      },
      {
        key: "ctx-flujo-caja",
        title: "/flujo-caja",
        description: "Flujo de caja y posición UF.",
        command: "/flujo-caja",
      }
    );
  }
  return rows;
}

export function parseUICommandInput(raw: string): ParsedUICommand {
  const input = raw.trim();
  if (!input.length) return { kind: "noop" };

  const moveRe = /^mover\s+(.+?)\s+al\s+(inicio|principio|primero)\s*\.?$/i;
  const mm = input.match(moveRe);
  if (mm) {
    return { kind: "move_to_start", subject: mm[1].trim() };
  }

  const expandOnly = /^(ampliar|expandir|maximizar)\s*\.?$/i;
  if (expandOnly.test(input)) return { kind: "expand_all_current" };

  const expandRe = /^(ampliar|expandir|maximizar)\s+(el\s+|la\s+)?(.+)$/i;
  const em = input.match(expandRe);
  if (em) {
    const target = em[3].trim().toLowerCase();
    const t = stripDiacritics(target);
    if (t === "todo" || t === "todos" || t === "todo el panel" || t === "panel") {
      return { kind: "expand_all_current" };
    }
    const resolved = resolveModuleFromAlias(target);
    if (resolved) return { kind: "expand_module", ...resolved };
    return { kind: "expand_all_current" };
  }

  const collapseOnly = /^(reducir|colapsar|minimizar)\s*\.?$/i;
  if (collapseOnly.test(input)) return { kind: "collapse_all_current" };

  const collapseRe = /^(reducir|colapsar|minimizar)\s+(el\s+|la\s+)?(.+)$/i;
  const cm = input.match(collapseRe);
  if (cm) {
    const target = cm[3].trim().toLowerCase();
    const t = stripDiacritics(target);
    if (t === "todo" || t === "todos" || t === "panel") return { kind: "collapse_all_current" };
    const resolved = resolveModuleFromAlias(target);
    if (resolved) return { kind: "collapse_module", ...resolved };
    return { kind: "collapse_all_current" };
  }

  return { kind: "noop" };
}

/**
 * Action Registry — comandos slash (`/uf`, `/stock`, …) → stores / mocks / alertas.
 * Extensión: añadir claves en `SLASH_COMMAND_DEFINITIONS` + rama en `executeSlashCommand`.
 */
import { FIFER_VAULT_PROFILE_HREF } from "@/config/fifer-vault";
import { contentMockData } from "@/mocks/content-data";
import { financeMockData } from "@/mocks/finance-data";
import { FIFER_SCENE_LABELS, parseSceneName } from "@/store/scene-engine";
import { useLayoutStore } from "@/store/useLayoutStore";
import type { UICommandResult } from "@/store/useLayoutStore";
import { findRouteForBoxId } from "@/lib/ui-commander";
import { buildStockCommandOutput, buildUfCommandOutput } from "@/utils/converters";

function dashboardHrefFromLocation(loc: { moduleId: string; routePath: string }): string {
  const p = loc.routePath.replace(/\/+$/, "") || "/";
  if (p === "/") return `/${loc.moduleId}`;
  const sub = p.startsWith("/") ? p.slice(1) : p;
  return `/${loc.moduleId}/${sub}`;
}

export const FIFER_SLASH_PREFIX = "/";

/** Namespace estable para evitar colisiones con rutas Next o IDs de box. */
export const COMMAND_REG_NAMESPACE = "fifer.cmd.slash";

export type SlashCommandCategory = "ui" | "data" | "notify" | "ai";

export interface SlashCommandDefinition {
  /** Clave única (p. ej. `uf`). */
  id: string;
  category: SlashCommandCategory;
  /** Texto de ayuda bajo el input cuando el comando está reconocido. */
  hintEnter: string;
  /** Si true, el shell muestra spinner Electric Yellow antes del resultado. */
  requiresAi?: boolean;
}

/**
 * Catálogo extensible. Nuevos comandos: añadir aquí + `case` en `executeSlashCommand`.
 */
export const SLASH_COMMAND_DEFINITIONS: Record<string, SlashCommandDefinition> = {
  uf: {
    id: `${COMMAND_REG_NAMESPACE}.uf`,
    category: "data",
    hintEnter:
      "Enter: Unit Master — valor UF del día, cartera Chicureo en CLP. Opcional: /uf 12,5 (UF→CLP).",
  },
  stock: {
    id: `${COMMAND_REG_NAMESPACE}.stock`,
    category: "data",
    hintEnter: "Enter: inventario ABKupfer + estimación de cajas (m² → cajas Unit Master).",
  },
  status: {
    id: `${COMMAND_REG_NAMESPACE}.status`,
    category: "data",
    hintEnter: "Presiona Enter para el estado de proyectos Chicureo + marca ABKupfer.",
  },
  expand: {
    id: `${COMMAND_REG_NAMESPACE}.expand`,
    category: "ui",
    hintEnter: "Presiona Enter para expandir todas las cajas en la vista actual.",
  },
  collapse: {
    id: `${COMMAND_REG_NAMESPACE}.collapse`,
    category: "ui",
    hintEnter: "Presiona Enter para colapsar todas las cajas en la vista actual.",
  },
  demo: {
    id: `${COMMAND_REG_NAMESPACE}.demo`,
    category: "ui",
    hintEnter: "Presiona Enter para alternar Modo Demo / Real (layout store).",
  },
  ai: {
    id: `${COMMAND_REG_NAMESPACE}.ai`,
    category: "ai",
    hintEnter: "Presiona Enter para simular consulta IA (carga breve · Electric Yellow).",
    requiresAi: true,
  },
  "nuevo-modulo": {
    id: `${COMMAND_REG_NAMESPACE}.nuevo-modulo`,
    category: "ui",
    hintEnter: "Enter: crea módulo en fifer-landing/src/modules/<nombre> (dev). Uso: /nuevo-modulo nombre-kebab",
  },
  "v0-ready": {
    id: `${COMMAND_REG_NAMESPACE}.v0-ready`,
    category: "ui",
    hintEnter:
      "Enter: ejecuta v0-sync (01–13 → v0_pack), abre la carpeta en el explorador y avisa cuando esté listo para v0 (solo dev).",
  },
  escena: {
    id: `${COMMAND_REG_NAMESPACE}.escena`,
    category: "ui",
    hintEnter:
      "Enter: modo de enfoque — /escena construccion | comercial | estrategia (reordena y destaca cajas).",
  },
  "generar-copy": {
    id: `${COMMAND_REG_NAMESPACE}.generar-copy`,
    category: "ui",
    hintEnter: "Enter: abre la ruta de generación de copy (contenido).",
  },
  "sync-inventario": {
    id: `${COMMAND_REG_NAMESPACE}.sync-inventario`,
    category: "ui",
    hintEnter: "Enter: vista contenido para sincronizar inventario ABKupfer.",
  },
  "estado-municipal": {
    id: `${COMMAND_REG_NAMESPACE}.estado-municipal`,
    category: "ui",
    hintEnter: "Enter: auditoría finanzas · estado municipal Chicureo.",
  },
  "flujo-caja": {
    id: `${COMMAND_REG_NAMESPACE}.flujo-caja`,
    category: "ui",
    hintEnter: "Enter: flujo de caja y paneles UF en finanzas.",
  },
  "reparar-credenciales": {
    id: `${COMMAND_REG_NAMESPACE}.reparar-credenciales`,
    category: "ui",
    hintEnter: "Enter: Vault / Perfil para reconectar credenciales (autosanación 401).",
  },
  "limpiar-layout": {
    id: `${COMMAND_REG_NAMESPACE}.limpiar-layout`,
    category: "ui",
    hintEnter:
      "Enter: sanar grid 12 cols — solapes o box fuera de catálogo → posiciones por manifiesto (no borra datos de usuario).",
  },
  mostrar: {
    id: `${COMMAND_REG_NAMESPACE}.mostrar`,
    category: "ui",
    hintEnter:
      "Enter: ir al dashboard y centrar la caja. Uso: /mostrar <boxId> (p. ej. /mostrar affiliate-hero-summary).",
  },
};

/** Descripciones cortas para Quick-Learning / Global Commander (input vacío). */
export const SLASH_COMMAND_SHORT_LABELS: Record<string, string> = {
  uf: "Conversor de precisión UF ↔ CLP",
  stock: "Inventario ABKupfer · m² → cajas",
  status: "Proyectos Chicureo y marca ABKupfer",
  expand: "Expandir todas las cajas de la vista",
  collapse: "Colapsar cajas al tamaño estándar",
  demo: "Alternar Modo Demo / Real",
  ai: "Simular consulta IA (preview)",
  "nuevo-modulo": "Scaffold módulo (X-Ray + module.config) — solo dev",
  "v0-ready": "v0-sync + abrir v0_pack — auditoría antes de subir a v0 (solo dev)",
  escena: "Escena objetivo: construcción / comercial / estrategia",
  "limpiar-layout": "Sanar layout (solapes / catálogo) — solo posiciones en grid",
  mostrar: "Ir a la ruta del módulo y centrar una caja por boxId",
};

export const SLASH_COMMAND_FREQUENT_ORDER = [
  "uf",
  "stock",
  "status",
  "expand",
  "collapse",
  "demo",
  "ai",
  "nuevo-modulo",
  "v0-ready",
  "escena",
  "limpiar-layout",
] as const;

export function isRegisteredSlashCommand(slug: string): boolean {
  return Boolean(slug && SLASH_COMMAND_DEFINITIONS[slug.toLowerCase()]);
}

export function parseSlashCommand(raw: string): { slug: string; args: string[] } | null {
  const t = raw.trim();
  if (!t.startsWith(FIFER_SLASH_PREFIX)) return null;
  const inner = t.slice(FIFER_SLASH_PREFIX.length).trim();
  if (!inner.length) return null;
  const parts = inner.split(/\s+/).filter(Boolean);
  const slug = parts[0]!.toLowerCase();
  const args = parts.slice(1);
  return { slug, args };
}

/** Línea de sugerencia bajo el input; `null` si no aplica. */
export function getSlashCommandHint(input: string): string | null {
  const p = parseSlashCommand(input);
  if (!p) return null;
  const def = SLASH_COMMAND_DEFINITIONS[p.slug];
  return def?.hintEnter ?? null;
}

export interface SlashCommandExecutionDeps {
  executeUICommand: (naturalLanguage: string) => UICommandResult;
  toggleDemoMode: () => void;
  dispatchFiferAlert: (payload: {
    level: "INFO" | "WARNING" | "IA_INSIGHT";
    title: string;
    body?: string;
  }) => void;
  /** Navegación App Router (Spotlight contextual). */
  navigate?: (href: string) => void;
}

export interface SlashCommandExecutionResult {
  ok: boolean;
  message: string;
  requiresAi?: boolean;
  /** Tras `navigate`, desplazar al elemento `[data-box-id]`. */
  scrollToBoxId?: string;
}

function toastFromUI(r: UICommandResult): SlashCommandExecutionResult {
  return { ok: r.ok, message: r.message };
}

/** Estado proyectos inmobiliarios + línea de marca contenido. */
export function getChicureoAbkupferStatusSummary(): string {
  const proj = financeMockData.projects
    .map((p) => `• ${p.name} — ${p.status} (${p.progress}%) · ${p.fee}${p.alerts.length ? ` · ${p.alerts[0]}` : ""}`)
    .join("\n");
  return [
    "Chicureo (inmobiliaria)",
    proj,
    "",
    `ABKupfer · ${contentMockData.brand} · SKUs: ${contentMockData.inventory.length}`,
  ].join("\n");
}

/**
 * Ejecuta un comando slash reconocido. Slugs desconocidos → error explícito (no colisión con NL).
 */
export function executeSlashCommand(
  slug: string,
  _args: string[],
  deps: SlashCommandExecutionDeps
): SlashCommandExecutionResult {
  const s = slug.toLowerCase();

  switch (s) {
    case "expand":
      return toastFromUI(deps.executeUICommand("ampliar todo"));
    case "collapse":
      return toastFromUI(deps.executeUICommand("colapsar todo"));
    case "demo":
      deps.toggleDemoMode();
      return { ok: true, message: "Modo Demo / Real alternado (Financial Bunker & datos)." };
    case "uf": {
      const body = buildUfCommandOutput(_args);
      deps.dispatchFiferAlert({ level: "INFO", title: "Unit Master · UF & CLP", body });
      return { ok: true, message: body };
    }
    case "stock": {
      const body = buildStockCommandOutput();
      deps.dispatchFiferAlert({
        level: "WARNING",
        title: "Inventario ABKupfer · stock",
        body,
      });
      return { ok: true, message: body };
    }
    case "status": {
      const body = getChicureoAbkupferStatusSummary();
      deps.dispatchFiferAlert({ level: "INFO", title: "Estado Chicureo & ABKupfer", body });
      return { ok: true, message: body };
    }
    case "ai":
      return {
        ok: true,
        message: "Consulta IA encolada (preview). Conecta motor LLM en siguiente iteración.",
        requiresAi: true,
      };
    case "escena": {
      const raw = _args[0]?.trim() ?? "";
      const scene = parseSceneName(raw);
      if (!scene) {
        return {
          ok: false,
          message: "Uso: /escena construccion | comercial | estrategia (también: ventas, finanzas, roi…)",
        };
      }
      useLayoutStore.getState().setFiferScene(scene);
      return {
        ok: true,
        message: `Escena ${scene}: ${FIFER_SCENE_LABELS[scene]}`,
      };
    }
    case "generar-copy": {
      if (!deps.navigate) return { ok: false, message: "Navegación no disponible." };
      deps.navigate("/content/generar");
      return { ok: true, message: "Abriendo generación de copy…" };
    }
    case "sync-inventario": {
      if (!deps.navigate) return { ok: false, message: "Navegación no disponible." };
      deps.navigate("/content/generar");
      return { ok: true, message: "Inventario — sincroniza desde la vista de contenido." };
    }
    case "estado-municipal": {
      if (!deps.navigate) return { ok: false, message: "Navegación no disponible." };
      deps.navigate("/finance/auditoria");
      return { ok: true, message: "Abriendo auditoría · estado municipal…" };
    }
    case "flujo-caja": {
      if (!deps.navigate) return { ok: false, message: "Navegación no disponible." };
      deps.navigate("/finance/auditoria");
      return { ok: true, message: "Abriendo flujo de caja / UF…" };
    }
    case "reparar-credenciales": {
      if (!deps.navigate) return { ok: false, message: "Navegación no disponible." };
      useLayoutStore.getState().clearIntegration401Flags();
      deps.navigate(FIFER_VAULT_PROFILE_HREF);
      return { ok: true, message: "Vault / Perfil — reconectar credenciales." };
    }
    case "limpiar-layout": {
      const r = useLayoutStore.getState().applyLayoutSanityForCommander();
      return { ok: r.ok, message: r.message };
    }
    case "mostrar": {
      const boxId = _args[0]?.trim();
      if (!boxId) {
        return {
          ok: false,
          message: "Uso: /mostrar <boxId> (ej. /mostrar fifer-finance-snapshot). Listado en Cmd+K.",
        };
      }
      const loc = findRouteForBoxId(boxId);
      if (!loc) {
        return {
          ok: false,
          message: `No hay ruta registrada para la caja "${boxId}". Revisa MASTER_MODULE_REGISTRY o FIFER_BOX_CATALOG.`,
        };
      }
      if (!deps.navigate) return { ok: false, message: "Navegación no disponible." };
      const href = dashboardHrefFromLocation(loc);
      deps.navigate(href);
      return {
        ok: true,
        message: `Navegando a ${href} — caja ${boxId}.`,
        scrollToBoxId: boxId,
      };
    }
    default:
      return {
        ok: false,
        message: `Comando /${slug} no registrado. Añádelo en registry/command-registry.ts`,
      };
  }
}

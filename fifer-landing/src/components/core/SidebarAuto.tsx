"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, type CSSProperties } from "react";
import {
  ABKUPFER_SECTION_ID,
  CHICUREO_SECTION_ID,
  getAbkupferQuickLinks,
  getChicureoQuickLinks,
} from "@/config/sidebar-navigation";
import { parseDashboardPathname } from "@/lib/ui-commander";
import { useResolvedModuleConfigs } from "@/hooks/useUserDNA";
import { useUserStore } from "@/store/useUserStore";
import { FIFER_ELECTRIC_YELLOW } from "@/components/core/fifer-theme";

function joinModuleRoute(moduleId: string, routePath: string): string {
  const clean = String(routePath || "").replace(/^\/+/, "").trim();
  return clean ? `/${moduleId}/${clean}` : `/${moduleId}`;
}

function linkActive(pathname: string, href: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  const h = href.replace(/\/+$/, "") || "/";
  return p === h || p.startsWith(h + "/");
}

/**
 * Sidebar contextual: favoritos, Chicureo (finanzas), ABKupfer (contenido), módulos metadata-driven.
 */
export function SidebarAuto({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname() || "";
  const resolvedModules = useResolvedModuleConfigs();

  const currentContext = useUserStore((s) => s.currentContext);
  const setCurrentContext = useUserStore((s) => s.setCurrentContext);
  const sidebarExpandedSections = useUserStore((s) => s.sidebarExpandedSections);
  const setSidebarSectionExpanded = useUserStore((s) => s.setSidebarSectionExpanded);
  const favoriteBoxes = useUserStore((s) => s.favoriteBoxes);
  const removeFavoriteBox = useUserStore((s) => s.removeFavoriteBox);

  const ctx = useMemo(() => parseDashboardPathname(pathname), [pathname]);
  const moduleId = ctx?.moduleId ?? null;
  const routePath = ctx?.routePath ?? "/";

  const prevModuleRef = useRef<string | null>(null);

  useEffect(() => {
    if (!moduleId) {
      setCurrentContext({ kind: "general" });
      return;
    }
    setCurrentContext({ kind: "module", moduleId, routePath });
  }, [moduleId, routePath, setCurrentContext]);

  useLayoutEffect(() => {
    if (moduleId === "finance" && prevModuleRef.current !== "finance") {
      setSidebarSectionExpanded(CHICUREO_SECTION_ID, true);
    }
    if (moduleId === "content" && prevModuleRef.current !== "content") {
      setSidebarSectionExpanded(ABKUPFER_SECTION_ID, true);
    }
    prevModuleRef.current = moduleId;
  }, [moduleId, setSidebarSectionExpanded]);

  const chicureoOpen =
    moduleId === "finance" ? (sidebarExpandedSections[CHICUREO_SECTION_ID] ?? true) : false;
  const abkupferOpen =
    moduleId === "content" ? (sidebarExpandedSections[ABKUPFER_SECTION_ID] ?? true) : false;

  const chicureoLinks = useMemo(() => getChicureoQuickLinks(), []);
  const abkupferLinks = useMemo(() => getAbkupferQuickLinks(), []);

  const headerStyle = {
    fontSize: 10,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    color: "#94a3b8",
    fontWeight: 600,
    margin: "0 0 8px 0",
  };

  const navBtnStyle = (active: boolean): CSSProperties => ({
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "8px 10px",
    borderRadius: 8,
    border: `1px solid ${active ? FIFER_ELECTRIC_YELLOW : "#2a2a2a"}`,
    background: active ? "#facc15" : "#111",
    color: active ? "#111" : "#ddd",
    textDecoration: "none",
    fontSize: 13,
  });

  return (
    <aside
      data-fifer-sidebar="contextual"
      data-fifer-context={currentContext.kind === "module" ? currentContext.moduleId : "general"}
      style={{
        width: collapsed ? 72 : 280,
        padding: 16,
        borderRight: "1px solid #222",
        minHeight: "100vh",
        transition: "width .2s ease",
        background: "var(--dashboard-sidebar, #0f1014)",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ flex: 1, minHeight: 0 }}>
      {!collapsed && favoriteBoxes.length > 0 ? (
        <section style={{ marginBottom: 20 }}>
          <p style={headerStyle}>Favoritos</p>
          <nav style={{ display: "grid", gap: 6 }}>
            {favoriteBoxes.map((f) => {
              const active = linkActive(pathname, f.href);
              return (
                <div
                  key={f.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    borderRadius: 8,
                    border: `1px solid ${active ? FIFER_ELECTRIC_YELLOW : "#2a2a2a"}`,
                    background: active ? "rgba(250, 204, 21, 0.12)" : "#111",
                    padding: "4px 6px 4px 8px",
                  }}
                >
                  <Link href={f.href} style={{ flex: 1, minWidth: 0, textDecoration: "none", color: "#e2e8f0" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, display: "block" }}>{f.label}</span>
                    <span style={{ fontSize: 10, color: "#64748b", fontFamily: "ui-monospace, monospace" }}>
                      {f.boxId}
                    </span>
                  </Link>
                  <button
                    type="button"
                    title="Quitar de favoritos"
                    onClick={() => removeFavoriteBox(f.boxId)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#94a3b8",
                      cursor: "pointer",
                      fontSize: 14,
                      padding: 4,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </nav>
        </section>
      ) : null}

      {!collapsed && moduleId === "finance" ? (
        <section style={{ marginBottom: 18 }}>
          <button
            type="button"
            onClick={() => setSidebarSectionExpanded(CHICUREO_SECTION_ID, !chicureoOpen)}
            style={{
              width: "100%",
              textAlign: "left",
              background: "transparent",
              border: "none",
              color: FIFER_ELECTRIC_YELLOW,
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              padding: "4px 0 8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>Proyectos Chicureo</span>
            <span aria-hidden style={{ opacity: 0.8 }}>
              {chicureoOpen ? "▼" : "▶"}
            </span>
          </button>
          {chicureoOpen ? (
            <nav style={{ display: "grid", gap: 6, paddingLeft: 4, borderLeft: `2px solid ${FIFER_ELECTRIC_YELLOW}44` }}>
              {chicureoLinks.map((l) => (
                <Link
                  key={l.href + l.label}
                  href={l.href}
                  style={{
                    ...navBtnStyle(linkActive(pathname, l.href)),
                    fontSize: 12,
                  }}
                >
                  <span style={{ display: "block", fontWeight: 600 }}>{l.label}</span>
                  {l.description ? (
                    <span style={{ fontSize: 10, color: "#64748b", fontWeight: 400 }}>{l.description}</span>
                  ) : null}
                </Link>
              ))}
            </nav>
          ) : null}
        </section>
      ) : null}

      {!collapsed && moduleId === "content" ? (
        <section style={{ marginBottom: 18 }}>
          <button
            type="button"
            onClick={() => setSidebarSectionExpanded(ABKUPFER_SECTION_ID, !abkupferOpen)}
            style={{
              width: "100%",
              textAlign: "left",
              background: "transparent",
              border: "none",
              color: FIFER_ELECTRIC_YELLOW,
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              padding: "4px 0 8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>Inventario ABKupfer</span>
            <span aria-hidden style={{ opacity: 0.8 }}>
              {abkupferOpen ? "▼" : "▶"}
            </span>
          </button>
          {abkupferOpen ? (
            <nav style={{ display: "grid", gap: 6, paddingLeft: 4, borderLeft: `2px solid ${FIFER_ELECTRIC_YELLOW}44` }}>
              {abkupferLinks.map((l) => (
                <Link
                  key={l.href + l.label}
                  href={l.href}
                  style={{
                    ...navBtnStyle(linkActive(pathname, l.href)),
                    fontSize: 12,
                  }}
                >
                  <span style={{ display: "block", fontWeight: 600 }}>{l.label}</span>
                  {l.description ? (
                    <span style={{ fontSize: 10, color: "#64748b", fontWeight: 400 }}>{l.description}</span>
                  ) : null}
                </Link>
              ))}
            </nav>
          ) : null}
        </section>
      ) : null}

      {resolvedModules.map((mod) => (
        <section key={mod.id} style={{ marginBottom: 16 }}>
          {!collapsed ? <p style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>{mod.nombre}</p> : null}
          <nav style={{ display: "grid", gap: 6 }}>
            {mod.routes.map((route) => {
              const href = joinModuleRoute(mod.id, route.path);
              const active = pathname === href;
              return (
                <Link
                  key={`${mod.id}:${route.path}`}
                  href={href}
                  style={{
                    ...navBtnStyle(active),
                    fontSize: collapsed ? 11 : 14,
                  }}
                >
                  {collapsed ? route.path.slice(1, 2).toUpperCase() : route.path}
                </Link>
              );
            })}
          </nav>
        </section>
      ))}
      </div>

      {!collapsed ? (
        <div
          style={{
            marginTop: "auto",
            paddingTop: 14,
            borderTop: "1px solid #27272a",
          }}
        >
          <Link
            href="/system-status"
            style={{
              display: "block",
              fontSize: 11,
              color: linkActive(pathname, "/system-status") ? FIFER_ELECTRIC_YELLOW : "#71717a",
              textDecoration: "none",
              padding: "6px 8px",
              borderRadius: 8,
              fontWeight: linkActive(pathname, "/system-status") ? 600 : 400,
            }}
          >
            Estado del sistema
          </Link>
        </div>
      ) : null}
    </aside>
  );
}

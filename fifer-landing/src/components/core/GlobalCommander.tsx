"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { moduleConfigs } from "@/modules";
import {
  anyIntegration401Active,
  buildMostrarBoxQuickRows,
  buildSpotlightContextSlashRows,
  parseDashboardPathname,
} from "@/lib/ui-commander";
import {
  executeSlashCommand,
  FIFER_SLASH_PREFIX,
  getSlashCommandHint,
  parseSlashCommand,
  SLASH_COMMAND_FREQUENT_ORDER,
  SLASH_COMMAND_SHORT_LABELS,
} from "@/registry/command-registry";
import { useCommanderSpaceDictation } from "@/hooks/useCommanderSpaceDictation";
import { dispatchFiferAlert } from "@/store/useAlertStore";
import { useLayoutStore, type UICommandResult } from "@/store/useLayoutStore";
import { useUserStore } from "@/store/useUserStore";
import { FIFER_ELECTRIC_YELLOW } from "@/components/core/fifer-theme";

export type CommandSuggestion = {
  /** Texto visible (Living OS / módulo). */
  label: string;
  /** Orden enviada a `executeUICommand`. */
  command: string;
};

/** Fila unificada: slash (/) · contexto pathname · lenguaje natural. */
type QuickSuggestionRow = {
  key: string;
  kind: "slash" | "natural" | "context";
  /** Línea principal (p. ej. `/uf` o título natural). */
  title: string;
  description: string;
  command: string;
  highlight?: "autosanacion";
};

type DisplayItem =
  | { kind: "header"; label: string }
  | { kind: "row"; row: QuickSuggestionRow };

function buildSlashQuickRows(): QuickSuggestionRow[] {
  return SLASH_COMMAND_FREQUENT_ORDER.filter((slug) => SLASH_COMMAND_SHORT_LABELS[slug]).map((slug) => ({
    key: `slash-${slug}`,
    kind: "slash" as const,
    title: `${FIFER_SLASH_PREFIX}${slug}`,
    description: SLASH_COMMAND_SHORT_LABELS[slug] ?? "",
    command: `${FIFER_SLASH_PREFIX}${slug}`,
  }));
}

function buildContextQuickRows(
  pathname: string | null,
  prioritizeRepairCredentials: boolean
): QuickSuggestionRow[] {
  return buildSpotlightContextSlashRows(pathname, { prioritizeRepairCredentials }).map((r) => ({
    key: r.key,
    kind: "context" as const,
    title: r.title,
    description: r.description,
    command: r.command,
    highlight: r.highlight,
  }));
}

function rowMatchesQuery(row: QuickSuggestionRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = `${row.title} ${row.description} ${row.command}`.toLowerCase();
  return hay.includes(q);
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  const q = query.trim().toLowerCase();
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const i = lower.indexOf(q);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark
        style={{
          background: `${FIFER_ELECTRIC_YELLOW}55`,
          color: "inherit",
          borderRadius: 3,
          padding: "0 1px",
        }}
      >
        {text.slice(i, i + q.length)}
      </mark>
      {text.slice(i + q.length)}
    </>
  );
}

/**
 * Spotlight bar — centro de mando (⌘K / Ctrl+K). Conectado a `executeUICommand`.
 */
export function GlobalCommander() {
  const pathname = usePathname();
  const router = useRouter();
  const setCommanderContext = useLayoutStore((s) => s.setCommanderContext);
  const executeUICommand = useLayoutStore((s) => s.executeUICommand);
  const toggleDemoMode = useLayoutStore((s) => s.toggleDemoMode);
  const setGlobalLoading = useLayoutStore((s) => s.setLoading);
  const lastResult = useLayoutStore((s) => s.lastCommandResult);
  const hasIntegration401 = useLayoutStore((s) => anyIntegration401Active(s.integration401ByBox));

  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<UICommandResult | null>(null);
  const [value, setValue] = useState("");
  const [slashHint, setSlashHint] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const appendDictatedText = useCallback((text: string) => {
    const t = text.trim();
    if (!t) return;
    setValue((v) => (v ? `${v} ${t}` : t));
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const speech = useCommanderSpaceDictation({
    enabled: open,
    onCommit: appendDictatedText,
  });

  const ctx = useMemo(() => parseDashboardPathname(pathname || ""), [pathname]);
  const activeModuleId =
    ctx && moduleConfigs.some((m) => m.id === ctx.moduleId) ? ctx.moduleId : null;

  const contextRows = useMemo(
    () => buildContextQuickRows(pathname || "", hasIntegration401),
    [pathname, hasIntegration401]
  );

  const slashCoreRows = useMemo(() => buildSlashQuickRows(), []);
  const registryMostrarRows = useMemo<QuickSuggestionRow[]>(
    () => buildMostrarBoxQuickRows() as QuickSuggestionRow[],
    []
  );

  const quickBase = useMemo(() => {
    const contextCommands = new Set(contextRows.map((r) => r.command));
    const slashCore = slashCoreRows.filter((r) => !contextCommands.has(r.command));
    const registry = registryMostrarRows.filter((r) => !contextCommands.has(r.command));
    return { context: contextRows, slashCore, registry };
  }, [contextRows, slashCoreRows, registryMostrarRows]);

  const emptyQuery = value.trim().length === 0;

  const contextFiltered = useMemo(
    () => quickBase.context.filter((r) => rowMatchesQuery(r, value)),
    [value, quickBase]
  );
  const slashCoreFiltered = useMemo(
    () => quickBase.slashCore.filter((r) => rowMatchesQuery(r, value)),
    [value, quickBase]
  );
  const registryFiltered = useMemo(
    () => quickBase.registry.filter((r) => rowMatchesQuery(r, value)),
    [value, quickBase]
  );
  const naturalFiltered = useMemo<QuickSuggestionRow[]>(() => [], []);
  const selectableRows = useMemo(
    () => [...contextFiltered, ...slashCoreFiltered, ...registryFiltered, ...naturalFiltered],
    [contextFiltered, slashCoreFiltered, registryFiltered, naturalFiltered]
  );

  const displayRows = useMemo((): DisplayItem[] => {
    if (!emptyQuery) {
      return selectableRows.map((r) => ({ kind: "row", row: r }));
    }
    const out: DisplayItem[] = [];
    const auto = contextFiltered.filter((r) => r.highlight === "autosanacion");
    const ctxRest = contextFiltered.filter((r) => r.highlight !== "autosanacion");
    if (auto.length) {
      out.push({ kind: "header", label: "Autosanación prioritaria" });
      auto.forEach((r) => out.push({ kind: "row", row: r }));
    }
    if (ctxRest.length) {
      out.push({ kind: "header", label: "Conciencia de contexto" });
      ctxRest.forEach((r) => out.push({ kind: "row", row: r }));
    }
    if (slashCoreFiltered.length) {
      out.push({ kind: "header", label: "Comandos frecuentes" });
      slashCoreFiltered.forEach((r) => out.push({ kind: "row", row: r }));
    }
    if (registryFiltered.length) {
      out.push({ kind: "header", label: "Cajas (FIFER + registro maestro)" });
      registryFiltered.forEach((r) => out.push({ kind: "row", row: r }));
    }
    if (naturalFiltered.length) {
      out.push({ kind: "header", label: "Órdenes en lenguaje natural" });
      naturalFiltered.forEach((r) => out.push({ kind: "row", row: r }));
    }
    return out;
  }, [
    emptyQuery,
    contextFiltered,
    slashCoreFiltered,
    registryFiltered,
    naturalFiltered,
    selectableRows,
  ]);

  useEffect(() => {
    const valid = ctx && moduleConfigs.some((m) => m.id === ctx.moduleId);
    setCommanderContext(valid ? ctx : null);
  }, [ctx, setCommanderContext]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setValue("");
      setSlashHint(null);
      setAiLoading(false);
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const el = document.getElementById(`fifer-sugg-${activeIndex}`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIndex, open, displayRows.length]);

  useEffect(() => {
    setSlashHint(getSlashCommandHint(value));
  }, [value]);

  const handleCommand = useCallback(
    async (cmd: string) => {
      const q = cmd.trim();
      if (!q.length) return;

      useUserStore.getState().appendSearchInterestSignal(q);

      if (q.startsWith(FIFER_SLASH_PREFIX)) {
        const parsed = parseSlashCommand(q);
        if (!parsed) {
          setToast({ ok: false, message: "Escribe un comando después de / (ej. /uf, /stock)." });
          return;
        }
        if (parsed.slug === "nuevo-modulo") {
          const modName = parsed.args[0]?.trim();
          if (!modName) {
            setToast({ ok: false, message: "Uso: /nuevo-modulo nombre-kebab (ej. /nuevo-modulo campanas)." });
            setOpen(false);
            return;
          }
          try {
            const res = await fetch("/api/dev/seed-module", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: modName }),
            });
            const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; message?: string };
            if (!res.ok) {
              setToast({
                ok: false,
                message: typeof data.error === "string" ? data.error : "Error al crear el módulo.",
              });
            } else {
              dispatchFiferAlert({
                level: "INFO",
                title: "Module Seed Worker",
                body: typeof data.message === "string" ? data.message : `Módulo ${modName} generado.`,
              });
              setToast({
                ok: true,
                message: typeof data.message === "string" ? data.message : "Módulo creado.",
              });
            }
          } catch {
            setToast({ ok: false, message: "No se pudo ejecutar el seed (¿servidor dev activo?)." });
          }
          setOpen(false);
          return;
        }
        if (parsed.slug === "v0-ready") {
          try {
            const res = await fetch("/api/dev/v0-ready", { method: "POST" });
            const data = (await res.json().catch(() => ({}))) as {
              ok?: boolean;
              error?: string;
              message?: string;
              v0PackPath?: string;
            };
            if (!res.ok) {
              setToast({
                ok: false,
                message: typeof data.error === "string" ? data.error : "Error al ejecutar v0-sync.",
              });
            } else {
              const line =
                typeof data.message === "string"
                  ? data.message
                  : "📦 v0_pack v7.1 — espejo 01–13 actualizado. Listo para subir a v0.dev";
              dispatchFiferAlert({
                level: "INFO",
                title: line,
                body: typeof data.v0PackPath === "string" ? data.v0PackPath : undefined,
              });
              setToast({ ok: true, message: line });
            }
          } catch {
            setToast({ ok: false, message: "No se pudo ejecutar v0-ready (¿servidor dev activo?)." });
          }
          setOpen(false);
          return;
        }
        const result = executeSlashCommand(parsed.slug, parsed.args, {
          executeUICommand,
          toggleDemoMode,
          navigate: (href) => router.push(href),
          dispatchFiferAlert: (payload) => {
            dispatchFiferAlert({
              level: payload.level,
              title: payload.title,
              body: payload.body,
            });
          },
        });
        if (result.requiresAi) {
          setGlobalLoading(true);
          setAiLoading(true);
          await new Promise((r) => setTimeout(r, 900));
          setGlobalLoading(false);
          setAiLoading(false);
        }
        if (result.scrollToBoxId && typeof document !== "undefined") {
          const bid = result.scrollToBoxId;
          window.setTimeout(() => {
            document.querySelector(`[data-box-id="${bid}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 240);
        }
        setToast({ ok: result.ok, message: result.message });
        setOpen(false);
        return;
      }

      const r = executeUICommand(q);
      setToast(r);
      setOpen(false);
    },
    [executeUICommand, toggleDemoMode, setGlobalLoading, router]
  );

  const submitCommand = useCallback(() => {
    const v = value.trim();
    if (!v) return;
    const rows = selectableRows;
    const idx = Math.min(Math.max(activeIndex, 0), Math.max(rows.length - 1, 0));
    const sel = rows.length > 0 ? rows[idx] : undefined;
    if (sel) {
      if (v.startsWith(FIFER_SLASH_PREFIX) && v.length > sel.command.length) {
        void handleCommand(v);
        return;
      }
      void handleCommand(sel.command);
      return;
    }
    void handleCommand(v);
  }, [value, selectableRows, activeIndex, handleCommand]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submitCommand();
  };

  function onInputKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (selectableRows.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, selectableRows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    }
  }

  const rowIndexByKey = useMemo(() => {
    const m: Record<string, number> = {};
    selectableRows.forEach((r, i) => {
      m[r.key] = i;
    });
    return m;
  }, [selectableRows]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      {toast && !open ? (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          style={{
            position: "fixed",
            bottom: 72,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10060,
            maxWidth: "min(420px, 92vw)",
            padding: "10px 16px",
            borderRadius: "0.75rem",
            border: `1px solid ${toast.ok ? `${FIFER_ELECTRIC_YELLOW}55` : "#7f1d1d"}`,
            background: "var(--fifer-navy, #0a0f1e)",
            color: toast.ok ? "#fef9c3" : "#fecaca",
            fontSize: 13,
            boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
          }}
        >
          {toast.message}
        </motion.div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 10040,
          padding: "8px 14px",
          borderRadius: 999,
          border: `1px solid ${FIFER_ELECTRIC_YELLOW}55`,
          background: "rgba(10, 15, 30, 0.85)",
          backdropFilter: "blur(10px)",
          color: "#e4e4e7",
          fontSize: 12,
          cursor: "pointer",
          boxShadow: "0 0 0 1px rgba(234,179,8,0.12), var(--fifer-glow, 0 0 20px rgba(234, 179, 8, 0.2))",
        }}
        aria-label="Abrir Global Commander"
      >
        Comandos <kbd style={{ opacity: 0.7, marginLeft: 6 }}>⌘K</kbd>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Global Commander"
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10050,
              background: "rgba(0,0,0,0.52)",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              paddingTop: "10vh",
              WebkitBackdropFilter: "blur(12px)",
            }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.985, filter: "blur(14px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -4, scale: 0.99, filter: "blur(10px)" }}
              transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.85 }}
              style={{
                width: "min(540px, 94vw)",
                borderRadius: "0.75rem",
                border: `1px solid rgba(234, 179, 8, 0.35)`,
                background:
                  "linear-gradient(165deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 38%, #0A0F1E 100%)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                boxShadow: `0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(234,179,8,0.12), 0 0 32px rgba(234, 179, 8, 0.18)`,
                overflow: "hidden",
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: `1px solid ${FIFER_ELECTRIC_YELLOW}22`,
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: FIFER_ELECTRIC_YELLOW,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <span>Global Commander</span>
                {activeModuleId ? (
                  <span style={{ color: "#94a3b8", letterSpacing: "0.04em", textTransform: "none", fontWeight: 500 }}>
                    Módulo: {activeModuleId}
                  </span>
                ) : null}
              </div>
              <form onSubmit={onSubmit}>
                <input
                  ref={inputRef}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={onInputKeyDown}
                  placeholder="Natural o /uf · /limpiar-layout · /expand · /demo …"
                  aria-describedby="fifer-commander-hint"
                  aria-autocomplete="list"
                  aria-controls="fifer-command-suggestions"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "18px 20px",
                    fontSize: 17,
                    border: "none",
                    outline: "none",
                    background: "var(--fifer-glass, rgba(255,255,255,0.05))",
                    color: "#f8fafc",
                  }}
                />
                {speech.listening ? (
                  <div
                    role="status"
                    aria-live="polite"
                    style={{
                      padding: "8px 20px 6px",
                      fontSize: 12,
                      color: "#fef9c3",
                      borderBottom: `1px solid ${FIFER_ELECTRIC_YELLOW}33`,
                      background: "rgba(234, 179, 8, 0.06)",
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>Escuchando…</span>
                    {speech.interimPreview ? (
                      <span style={{ display: "block", marginTop: 6, color: "#e2e8f0", fontWeight: 400 }}>
                        {speech.interimPreview}
                      </span>
                    ) : (
                      <span style={{ display: "block", marginTop: 4, opacity: 0.75 }}>
                        Suelta Espacio para insertar el texto en el comando.
                      </span>
                    )}
                  </div>
                ) : null}
                {speech.lastError && open ? (
                  <p style={{ margin: 0, padding: "6px 20px", fontSize: 11, color: "#fca5a5" }}>
                    Voz: {speech.lastError}
                  </p>
                ) : null}
                {!speech.supported && open ? (
                  <p style={{ margin: 0, padding: "6px 20px 0", fontSize: 11, color: "#64748b" }}>
                    Dictado no disponible (usa Chrome o Edge para Web Speech API).
                  </p>
                ) : null}
                {speech.supported && open && !speech.listening ? (
                  <p style={{ margin: 0, padding: "8px 20px 0", fontSize: 11, color: "#64748b" }}>
                    Mantén pulsada{" "}
                    <kbd
                      style={{
                        padding: "2px 8px",
                        borderRadius: 6,
                        border: `1px solid ${FIFER_ELECTRIC_YELLOW}44`,
                        background: "rgba(0,0,0,0.35)",
                        color: "#e2e8f0",
                        fontFamily: "ui-monospace, monospace",
                        fontSize: 11,
                      }}
                    >
                      Espacio
                    </kbd>{" "}
                    para dictar el comando (es-CL).
                  </p>
                ) : null}
                {aiLoading ? (
                  <motion.div
                    role="status"
                    aria-live="polite"
                    initial={{ opacity: 0.7 }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                      height: 3,
                      marginTop: 0,
                      background: `linear-gradient(90deg, transparent, ${FIFER_ELECTRIC_YELLOW}, transparent)`,
                      boxShadow: `0 0 16px ${FIFER_ELECTRIC_YELLOW}66`,
                    }}
                  />
                ) : null}
                {slashHint && !aiLoading ? (
                  <p
                    id="fifer-commander-hint"
                    style={{
                      margin: 0,
                      padding: "8px 20px 10px",
                      fontSize: 12,
                      color: "#fef9c3",
                      borderLeft: `3px solid ${FIFER_ELECTRIC_YELLOW}`,
                      background: "rgba(234, 179, 8, 0.08)",
                    }}
                  >
                    {slashHint}
                  </p>
                ) : null}
              </form>
              <div
                style={{
                  padding: "12px 16px 18px",
                  maxHeight: 280,
                  overflow: "auto",
                  borderTop: `1px solid ${FIFER_ELECTRIC_YELLOW}14`,
                }}
              >
                <p style={{ margin: "0 0 10px 0", fontSize: 10, letterSpacing: "0.08em", color: "#94a3b8" }}>
                  {emptyQuery ? "Quick-Learning — elige o filtra con el teclado" : "Coincidencias"}
                </p>
                {displayRows.length === 0 && !emptyQuery ? (
                  <p style={{ margin: "0 0 8px 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                    Sin coincidencias en la lista. Pulsa Enter para enviar lo que escribiste.
                  </p>
                ) : null}
                <ul
                  id="fifer-command-suggestions"
                  role="listbox"
                  aria-label="Sugerencias de comandos"
                  style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}
                >
                  {displayRows.map((item, idx) => {
                    if (item.kind === "header") {
                      return (
                        <li
                          key={`hdr-${item.label}-${idx}`}
                          role="presentation"
                          style={{ listStyle: "none", paddingTop: idx > 0 ? 8 : 0 }}
                        >
                          <p
                            style={{
                              margin: 0,
                              fontSize: 10,
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                              color: "#94a3b8",
                              fontWeight: 600,
                            }}
                          >
                            {item.label}
                          </p>
                        </li>
                      );
                    }
                    const row = item.row;
                    const si = rowIndexByKey[row.key] ?? 0;
                    const isActive = activeIndex === si;
                    const isAutosan = row.highlight === "autosanacion";
                    const borderCol = isAutosan
                      ? isActive
                        ? `${FIFER_ELECTRIC_YELLOW}`
                        : `${FIFER_ELECTRIC_YELLOW}88`
                      : isActive
                        ? FIFER_ELECTRIC_YELLOW
                        : `${FIFER_ELECTRIC_YELLOW}28`;
                    const bgCol = isAutosan
                      ? isActive
                        ? "rgba(234, 179, 8, 0.22)"
                        : "rgba(234, 179, 8, 0.1)"
                      : isActive
                        ? "rgba(234, 179, 8, 0.12)"
                        : "rgba(10, 15, 30, 0.72)";
                    return (
                      <li key={row.key} id={`fifer-sugg-${si}`} role="option" aria-selected={isActive}>
                        <button
                          type="button"
                          onClick={() => {
                            setValue(row.command);
                            void handleCommand(row.command);
                          }}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "10px 12px",
                            borderRadius: "0.5rem",
                            border: `1px solid ${borderCol}`,
                            boxShadow: isAutosan ? `0 0 20px rgba(234, 179, 8, 0.2)` : undefined,
                            background: bgCol,
                            color: "#e2e8f0",
                            fontSize: 13,
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: 10,
                          }}
                        >
                          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                            <span style={{ fontWeight: 600, color: "#f8fafc" }}>
                              <HighlightMatch text={row.title} query={value} />
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                color: "#64748b",
                                fontFamily: "ui-monospace, monospace",
                                lineHeight: 1.35,
                              }}
                            >
                              <HighlightMatch text={row.description} query={value} />
                            </span>
                          </span>
                          {isActive ? (
                            <kbd
                              style={{
                                flexShrink: 0,
                                fontSize: 10,
                                padding: "3px 7px",
                                borderRadius: 6,
                                border: `1px solid ${FIFER_ELECTRIC_YELLOW}55`,
                                background: "rgba(0,0,0,0.35)",
                                color: "#fef9c3",
                                fontFamily: "ui-monospace, monospace",
                              }}
                            >
                              [Enter]
                            </kbd>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {lastResult && open ? (
                  <p
                    style={{
                      marginTop: 14,
                      marginBottom: 0,
                      fontSize: 12,
                      color: lastResult.ok ? FIFER_ELECTRIC_YELLOW : "#f87171",
                    }}
                  >
                    Último resultado: {lastResult.message}
                  </p>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>,
    document.body
  );
}

"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Command, Search, Sparkles } from "lucide-react";
import { parseUICommandInput } from "@/lib/ui-commander";
import {
  executeSlashCommand,
  FIFER_SLASH_PREFIX,
  parseSlashCommand,
  type SlashCommandExecutionDeps,
} from "@/registry/command-registry";
import { useLayoutStore } from "@/store/useLayoutStore";
import { dispatchFiferAlert } from "@/store/useAlertStore";
import { useCanvasCommanderStore } from "@/store/useCanvasCommanderStore";

type QuickCommand = {
  kind: "quick";
  label: string;
  value: string;
};

type CanvasCommandRow = {
  kind: "canvas";
  label: string;
  subtitle: string;
  nodeId: string;
};

type CommandRow = QuickCommand | CanvasCommandRow;

const QUICK_COMMANDS: QuickCommand[] = [
  { kind: "quick", label: "Valor UF", value: "/uf" },
  { kind: "quick", label: "Estado general", value: "/status" },
  { kind: "quick", label: "Revisar stock", value: "/stock" },
  { kind: "quick", label: "Expandir panel", value: "expandir todo" },
  { kind: "quick", label: "Colapsar panel", value: "colapsar todo" },
];

function filterQuick(q: string): QuickCommand[] {
  const t = q.trim().toLowerCase();
  if (!t) return QUICK_COMMANDS;
  return QUICK_COMMANDS.filter((item) => `${item.label} ${item.value}`.toLowerCase().includes(t));
}

export function LivingCommandBar() {
  const executeUICommand = useLayoutStore((s) => s.executeUICommand);
  const toggleDemoMode = useLayoutStore((s) => s.toggleDemoMode);
  const setGlobalLoading = useLayoutStore((s) => s.setLoading);
  const canvasEntries = useCanvasCommanderStore((s) => s.entries);
  const requestCanvasNodeFocus = useCanvasCommanderStore((s) => s.requestCanvasNodeFocus);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const canvasRows = useMemo((): CanvasCommandRow[] => {
    const q = query.trim().toLowerCase();
    const filtered = !q
      ? canvasEntries.slice(0, 8)
      : canvasEntries.filter(
          (e) =>
            e.haystack.toLowerCase().includes(q) ||
            e.label.toLowerCase().includes(q) ||
            e.type.toLowerCase().includes(q)
        );
    return filtered.map((e) => ({
      kind: "canvas" as const,
      label: e.label,
      subtitle: `${e.type} · ${e.id.slice(0, 10)}`,
      nodeId: e.id,
    }));
  }, [canvasEntries, query]);

  const quickRows = useMemo(() => filterQuick(query), [query]);

  const rows = useMemo((): CommandRow[] => {
    const q = query.trim();
    if (q) return [...canvasRows, ...quickRows];
    return [...quickRows, ...canvasRows];
  }, [canvasRows, quickRows, query]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (activeIndex >= rows.length) setActiveIndex(Math.max(0, rows.length - 1));
  }, [rows.length, activeIndex]);

  async function handleRow(row: CommandRow) {
    if (row.kind === "canvas") {
      requestCanvasNodeFocus(row.nodeId);
      dispatchFiferAlert({
        level: "INFO",
        title: "Nodo localizado",
        body: `Se resaltó «${row.label}» en el Data Canvas.`,
      });
      setOpen(false);
      return;
    }

    await handleCommand(row.value);
  }

  async function handleCommand(raw: string) {
    const text = raw.trim();
    if (!text) return;

    if (text.startsWith(FIFER_SLASH_PREFIX)) {
      const parsed = parseSlashCommand(text);
      if (!parsed) {
        dispatchFiferAlert({
          level: "WARNING",
          title: "Comando inválido",
          body: "Usa comandos tipo /uf, /status o /stock.",
        });
        return;
      }

      const slashDeps: SlashCommandExecutionDeps = {
        executeUICommand,
        toggleDemoMode,
        navigate: () => {},
        dispatchFiferAlert: (payload) => {
          dispatchFiferAlert(payload);
        },
      };
      const result = executeSlashCommand(parsed.slug, parsed.args, slashDeps);
      if (result.requiresAi) {
        setGlobalLoading(true);
        await new Promise((resolve) => setTimeout(resolve, 600));
        setGlobalLoading(false);
      }
      dispatchFiferAlert({
        level: result.ok ? "INFO" : "WARNING",
        title: result.message,
      });
      setOpen(false);
      return;
    }

    const parsed = parseUICommandInput(text);
    const result = parsed.kind === "noop" ? executeUICommand(text) : executeUICommand(text);
    dispatchFiferAlert({
      level: result.ok ? "INFO" : "WARNING",
      title: result.message,
    });
    setOpen(false);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const row = rows[activeIndex];
    if (row) {
      void handleRow(row);
      return;
    }
    void handleCommand(query);
  }

  function onInputKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, Math.max(0, rows.length - 1)));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-[10040] inline-flex items-center gap-2 rounded-full border border-[#EAB308]/60 bg-[#0A0F1E]/85 px-4 py-2 text-xs text-zinc-100 shadow-[0_0_24px_rgba(234,179,8,0.18)] backdrop-blur-xl transition hover:border-[#EAB308]"
      >
        <Command className="h-3.5 w-3.5 text-[#EAB308]" />
        <span>Cmd + K</span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="cmd-overlay"
            className="fixed inset-0 z-[10050] flex items-start justify-center bg-black/55 px-4 pt-[9vh] backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="w-full max-w-2xl overflow-hidden rounded-[0.75rem] border border-[#EAB308]/35 bg-[#0A0F1E]/92 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl"
              initial={{ opacity: 0, y: -14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
            >
              <div className="flex items-center justify-between border-b border-[#EAB308]/20 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#EAB308]">
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  Living OS Commander
                </span>
                <span className="text-zinc-400">03_PROTOCOL_SHELL</span>
              </div>

              <form onSubmit={onSubmit} className="border-b border-[#EAB308]/10">
                <label className="sr-only" htmlFor="living-os-command-input">
                  Barra de comandos global
                </label>
                <div className="flex items-center gap-3 px-4 py-3">
                  <Search className="h-4 w-4 text-zinc-400" />
                  <input
                    id="living-os-command-input"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={onInputKeyDown}
                    placeholder="Buscar nodo (Chicureo, Roble…) o /uf, expandir todo…"
                    className="w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
                    autoFocus
                  />
                </div>
              </form>

              <ul className="max-h-64 space-y-2 overflow-auto p-3">
                {rows.map((item, index) => {
                  const active = index === activeIndex;
                  if (item.kind === "canvas") {
                    return (
                      <motion.li
                        key={`canvas-${item.nodeId}`}
                        layout="position"
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.18 }}
                      >
                        <button
                          type="button"
                          onClick={() => void handleRow(item)}
                          className={`flex w-full flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left text-sm transition ${
                            active
                              ? "border-[#EAB308]/80 bg-[#EAB308]/15 text-[#FEF9C3]"
                              : "border-cyan-500/25 bg-[#0F172A]/55 text-zinc-200 hover:border-cyan-400/45"
                          }`}
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300/90">
                            Lienzo
                          </span>
                          <span className="font-medium">{item.label}</span>
                          <span className="text-xs text-zinc-500">{item.subtitle}</span>
                        </button>
                      </motion.li>
                    );
                  }
                  return (
                    <motion.li
                      key={`quick-${item.value}`}
                      layout="position"
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      <button
                        type="button"
                        onClick={() => void handleRow(item)}
                        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                          active
                            ? "border-[#EAB308]/80 bg-[#EAB308]/15 text-[#FEF9C3]"
                            : "border-[#EAB308]/20 bg-[#0F172A]/50 text-zinc-200 hover:border-[#EAB308]/45"
                        }`}
                      >
                        <span>{item.label}</span>
                        <code className="text-xs text-zinc-400">{item.value}</code>
                      </button>
                    </motion.li>
                  );
                })}
              </ul>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

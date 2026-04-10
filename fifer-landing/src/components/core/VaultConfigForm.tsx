"use client";

import { useCallback, useMemo, useState } from "react";
import type { UserEngineReport } from "@/schemas/engine-report.schema";
import { useUserStore } from "@/store/useUserStore";
import { useDualStageShellStore } from "@/store/useDualStageShellStore";
import { USER_ENGINE_LOADERS } from "@/user_space/user-engine-loaders";
import { KeyRound, Loader2 } from "lucide-react";

function pickCredentialInput(report: UserEngineReport) {
  const inputs = report.inputs ?? [];
  const byType = inputs.find((i) => {
    const t = (i.type || "").toLowerCase();
    return t === "api_key" || t === "secret" || t === "bearer" || t === "token";
  });
  if (byType) return byType;
  const byId = inputs.find((i) => /api|key|token|secret|credential/i.test(i.id));
  if (byId) return byId;
  return inputs[0];
}

export function VaultConfigForm({
  boxId,
  report,
  onConfigured,
}: {
  boxId: string;
  report: UserEngineReport;
  /** Tras guardar cifrado en Vault + limpiar circuito / rehidratación (padre). */
  onConfigured?: () => void;
}) {
  const setCustomKey = useUserStore((s) => s.setCustomKey);
  const field = useMemo(() => pickCredentialInput(report), [report]);
  const label = field?.label ?? field?.id ?? "API Key";
  const fieldId = field?.id ?? "apiKey";

  const [value, setValue] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const runTest = useCallback(async () => {
    setTestMessage(null);
    const loader = USER_ENGINE_LOADERS[boxId];
    if (!loader) {
      setTestMessage("No hay cargador de motor para este Box.");
      return;
    }
    const raw = value.trim();
    if (raw.length < 8) {
      setTestMessage("Ingresa una clave de al menos 8 caracteres.");
      return;
    }
    const setTask = useDualStageShellStore.getState().setRefiningTaskForBox;
    const clearTask = useDualStageShellStore.getState().clearRefiningTaskForBox;
    setTask(boxId, "Validando API Key contra el motor…");
    setIsTesting(true);
    try {
      const mod = await loader();
      await mod.execute({ boxId, provisionalApiKey: raw });
      setTestMessage("Conexión verificada: el motor aceptó la clave.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setTestMessage(`Fallo la prueba: ${msg}`);
    } finally {
      clearTask(boxId);
      setIsTesting(false);
    }
  }, [boxId, value]);

  const onSave = useCallback(async () => {
    setSaveError(null);
    const raw = value.trim();
    if (raw.length < 8) {
      setSaveError("La clave debe tener al menos 8 caracteres.");
      return;
    }
    setIsSaving(true);
    try {
      await setCustomKey(boxId, raw);
      setValue("");
      onConfigured?.();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSaving(false);
    }
  }, [boxId, onConfigured, setCustomKey, value]);

  return (
    <div
      className="mt-4 rounded-lg border border-[#EAB308]/25 bg-[#0A0F1E] p-3.5"
      data-fifer-vault-form="true"
      data-engine-id={report.id}
    >
      <div className="mb-2 flex items-center gap-2 text-[#EAB308]">
        <KeyRound className="h-4 w-4 shrink-0" aria-hidden />
        <span className="text-[12px] font-semibold uppercase tracking-wide">AIVault · BYOK</span>
      </div>
      <p className="mb-2 text-[12px] leading-snug text-zinc-500">
        Motor <span className="text-zinc-400">{report.name}</span> — campo requerido según reporte:{" "}
        <code className="text-[11px] text-[#FDE68A]">{fieldId}</code>
      </p>
      <label className="mb-1 block text-[11px] font-medium text-zinc-400" htmlFor={`vault-${boxId}-${fieldId}`}>
        {label}
      </label>
      <input
        id={`vault-${boxId}-${fieldId}`}
        name={fieldId}
        type="password"
        autoComplete="off"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Pega tu clave (se cifra antes de guardar en el dispositivo)"
        className="mb-3 w-full rounded-md border border-zinc-700 bg-[#050810] px-3 py-2 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:border-[#EAB308]/60 focus:outline-none focus:ring-1 focus:ring-[#EAB308]/40"
      />
      {saveError ? (
        <p className="mb-2 text-[12px] text-red-400" role="alert">
          {saveError}
        </p>
      ) : null}
      {testMessage ? (
        <p className="mb-2 text-[12px] text-zinc-400" role="status">
          {testMessage}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isSaving || isTesting}
          onClick={() => void onSave()}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#EAB308]/55 bg-[#EAB308]/15 px-3.5 py-2 text-[13px] font-semibold text-[#FEF9C3] transition hover:bg-[#EAB308]/25 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Guardar en Vault
        </button>
        <button
          type="button"
          disabled={isSaving || isTesting}
          onClick={() => void runTest()}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-600 bg-zinc-900 px-3.5 py-2 text-[13px] font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
        >
          {isTesting ? <Loader2 className="h-4 w-4 animate-spin text-[#EAB308]" aria-hidden /> : null}
          Probar conexión
        </button>
      </div>
    </div>
  );
}

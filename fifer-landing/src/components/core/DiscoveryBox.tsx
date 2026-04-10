"use client";

import Link from "next/link";
import { healComponent } from "@/lib/box-heal";
import { FIFER_VAULT_PROFILE_HREF } from "@/config/fifer-vault";
import type { UserEngineReport } from "@/schemas/engine-report.schema";
import { VaultConfigForm } from "@/components/core/VaultConfigForm";

export type DiscoveryReason =
  | "error"
  | "no-data"
  | "jit-fail"
  | "render"
  | "wallet-empty"
  | "data-corrupt"
  | "circuit-open"
  | "credentials"
  | "vault-high-risk";

const REASON_COPY: Record<DiscoveryReason, { title: string; hint: string }> = {
  error: {
    title: "Ghost Mode · interrupción de datos",
    hint: "La fuente o la red no respondió. Puedes intentar sanar el componente.",
  },
  "no-data": {
    title: "Ghost Mode · sin payload",
    hint: "El Box no recibió datos todavía. Sanar reintenta la hidratación JIT.",
  },
  "jit-fail": {
    title: "Ghost Mode · módulo v0",
    hint: "No se pudo cargar el artefacto desde v0-ingestion. Reintenta tras limpiar caché.",
  },
  render: {
    title: "Ghost Mode · render",
    hint: "El micro-UI falló al pintar. El aislamiento protege el resto del lienzo.",
  },
  "wallet-empty": {
    title: "Financial Bunker · saldo agotado",
    hint: "No hay Chispas IA disponibles. Recarga saldo para reanudar análisis y acciones asistidas en este Box.",
  },
  "data-corrupt": {
    title: "Ghost Mode · validación Zod",
    hint: "Datos corruptos detectados, intentando reparar estructura… Usa Reparar con IA o reconecta la fuente.",
  },
  "circuit-open": {
    title: "Rompecircuitos · Box aislado",
    hint: "Este Box falló repetidamente; el circuito se abrió para proteger el lienzo. Revisa integración o datos; Sanar intenta un reinicio controlado.",
  },
  credentials: {
    title: "Ghost Mode · credenciales de API",
    hint: "El motor no pudo autenticarse con la integración. Reconecta la API o actualiza claves en Vault / Perfil.",
  },
  "vault-high-risk": {
    title: "AIVault · motor de alto riesgo",
    hint: "Este motor exige BYOK: guarda tu API Key cifrada en el dispositivo (AES-GCM) antes de ejecutar. Puedes probar la conexión sin guardar.",
  },
};

function credentialsCopy(httpStatus: 401 | 403): { title: string; hint: string } {
  if (httpStatus === 401) {
    return {
      title: "Ghost Mode · credenciales (401)",
      hint: "Sesión inválida o API key ausente. Actualiza credenciales en Vault / Perfil antes de reintentar la integración.",
    };
  }
  return {
    title: "Ghost Mode · autorización (403)",
    hint: "Token vencido o sin permisos. Reautoriza o ajusta scopes en Vault / Perfil.",
  };
}

export function DiscoveryBox({
  boxId,
  reason,
  message,
  /** Prioridad sobre inferencia por mensaje: errores HTTP de integración comercial. */
  httpStatus: httpStatusProp,
  vaultProfileHref = FIFER_VAULT_PROFILE_HREF,
  onHeal,
  onReconnectData,
  onTopUp,
  engineReport,
  onVaultKeySaved,
}: {
  boxId: string;
  reason: DiscoveryReason;
  message?: string;
  httpStatus?: number;
  vaultProfileHref?: string;
  /** Reintenta hidratación / remontaje (p. ej. `router.refresh`). */
  onHeal?: () => void;
  /** Vuelve a pedir datos al origen sin depender del render del Box. */
  onReconnectData?: () => void;
  /** Recarga virtual de Chispas (modo demo / futuro BYOK). */
  onTopUp?: () => void;
  /** Solo `reason === "vault-high-risk"`: reporte del motor (`engine_report.json`). */
  engineReport?: UserEngineReport;
  /** Tras `setCustomKey` + rehidratación (p. ej. `onHeal` en `BoxLoader`). */
  onVaultKeySaved?: () => void;
}) {
  const status =
    httpStatusProp === 401 || httpStatusProp === 403 ? httpStatusProp : undefined;
  const copy =
    reason === "credentials"
      ? REASON_COPY.credentials
      : status
        ? credentialsCopy(status)
        : REASON_COPY[reason];

  function handleHealClick() {
    healComponent({ boxId });
    onHeal?.();
  }

  function handleReconnectClick() {
    onReconnectData?.();
  }

  const showCredentialsCta = reason === "credentials" || status === 401 || status === 403;

  return (
    <div
      role="status"
      data-fifer-ghost="discovery"
      data-box-id={boxId}
      data-fifer-http-status={status ?? ""}
      className="w-full rounded-[0.75rem] border border-[#EAB308]/20 bg-[#0A0F1E] p-4 font-sans text-zinc-200"
    >
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#EAB308]">{copy.title}</p>
      <p className="mb-2 text-[13px] leading-snug text-zinc-400">{copy.hint}</p>
      {message ? (
        <pre className="mb-3 max-h-[72px] overflow-auto whitespace-pre-wrap break-words text-[11px] text-zinc-500">
          {message}
        </pre>
      ) : null}
      {reason === "vault-high-risk" && engineReport ? (
        <VaultConfigForm boxId={boxId} report={engineReport} onConfigured={onVaultKeySaved} />
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2.5">
        {showCredentialsCta ? (
          <Link
            href={vaultProfileHref}
            className="inline-flex items-center justify-center rounded-lg border border-[#EAB308]/55 bg-[#EAB308]/15 px-3.5 py-2 text-[13px] font-semibold text-[#FEF9C3] transition hover:bg-[#EAB308]/25"
          >
            Reconectar API
          </Link>
        ) : null}
        {reason === "wallet-empty" && onTopUp ? (
          <button
            type="button"
            onClick={onTopUp}
            className="rounded-lg border border-[#EAB308]/55 bg-[#EAB308]/15 px-3.5 py-2 text-[13px] font-semibold text-[#FEF9C3] hover:bg-[#EAB308]/25"
          >
            Recargar saldo
          </button>
        ) : (
          <button
            type="button"
            onClick={handleHealClick}
            className="rounded-lg border border-[#EAB308]/55 bg-[#EAB308]/10 px-3.5 py-2 text-[13px] font-semibold text-[#FEF9C3] hover:bg-[#EAB308]/20"
          >
            {reason === "circuit-open" ? "Sanar" : "Reparar con IA"}
          </button>
        )}
        {onReconnectData ? (
          <button
            type="button"
            onClick={handleReconnectClick}
            className="rounded-lg border border-zinc-600 bg-zinc-900 px-3.5 py-2 text-[13px] font-semibold text-zinc-200 hover:bg-zinc-800"
          >
            Reconectar Datos
          </button>
        ) : null}
      </div>
    </div>
  );
}

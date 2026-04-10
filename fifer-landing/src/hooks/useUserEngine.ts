"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FiferBoxDataNormalized } from "@/utils/adapters/types";
import { isUserSpaceBoxId } from "@/user_space/user-space-box-ids";
import { USER_ENGINE_LOADERS } from "@/user_space/user-engine-loaders";
import { USER_ENGINE_REPORTS, type UserEngineReport } from "@/user_space/user-engine-reports";
import { useUserStore } from "@/store/useUserStore";

/** Dual-Stage Etapa 1 — tiempo mínimo de “Pulido de Prompt” antes de `execute()` (`03_PROTOCOL_SHELL.md` §2.1). */
const REFINING_STAGE_MS = 420;

export type UserEngineSnapshot = {
  data: FiferBoxDataNormalized | null;
  isLoading: boolean;
  isRefining: boolean;
  error: Error | null;
  /** `engine_report.json`: riesgo alto sin API key en Vault (BYOK) → Shell en `locked`. */
  lockedByVault: boolean;
  /** Igual que `lockedByVault` — semántica explícita para el cascarón (`data-fifer-lock-reason`). */
  isLocked: boolean;
  /** No-null solo cuando `risk === "high"` y falta clave en AIVault. */
  lockReason: "vault-high-risk" | null;
  report: UserEngineReport | undefined;
};

/**
 * Ejecuta el motor alojado en `user_space` (`execute()`), con Etapa 1 `isRefining` obligatoria
 * antes de entregar datos al Shell. Fuera de `u-*` devuelve estado inerte.
 */
export function useUserEngine(boxId: string, replayNonce: number = 0): UserEngineSnapshot {
  const vaultCipher = useUserStore((s) => s.vaultKeyCipherByEngineId[boxId]);
  const hasVaultKey = Boolean(vaultCipher);
  const [data, setData] = useState<FiferBoxDataNormalized | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const runGenerationRef = useRef(0);

  const isUser = isUserSpaceBoxId(boxId);
  const report = USER_ENGINE_REPORTS[boxId];
  const loader = USER_ENGINE_LOADERS[boxId];
  const lockedByVault = Boolean(isUser && report?.risk === "high" && !hasVaultKey);
  const lockReason: "vault-high-risk" | null = lockedByVault ? "vault-high-risk" : null;

  useEffect(() => {
    if (!isUser) {
      setData(null);
      setIsLoading(false);
      setIsRefining(false);
      setError(null);
      return;
    }
    if (!loader || lockedByVault) {
      setData(null);
      setIsLoading(false);
      setIsRefining(false);
      setError(null);
      return;
    }

    const myGen = ++runGenerationRef.current;
    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      setIsRefining(true);
      setError(null);
      setData(null);
      try {
        await new Promise((r) => setTimeout(r, REFINING_STAGE_MS));
        if (cancelled || myGen !== runGenerationRef.current) return;
        const mod = await loader();
        if (cancelled || myGen !== runGenerationRef.current) return;
        const result = await mod.execute({ boxId });
        if (cancelled || myGen !== runGenerationRef.current) return;
        setData(result);
      } catch (e) {
        if (cancelled || myGen !== runGenerationRef.current) return;
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (cancelled || myGen !== runGenerationRef.current) return;
        setIsRefining(false);
        setIsLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
      runGenerationRef.current += 1;
    };
  }, [boxId, isUser, loader, lockedByVault, vaultCipher, replayNonce]);

  return useMemo(
    () => ({
      data,
      isLoading,
      isRefining,
      error,
      lockedByVault,
      isLocked: lockedByVault,
      lockReason,
      report,
    }),
    [data, isLoading, isRefining, error, lockedByVault, lockReason, report]
  );
}

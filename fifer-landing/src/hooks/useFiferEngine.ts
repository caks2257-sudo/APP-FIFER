"use client";

import { useCallback, useMemo, useState } from "react";
import type { IFiferBoxManifest } from "@/types/fifer-box";
import { engineDispatcher } from "../../../src/engines";

type EnginePipelineStep = {
  stage?: string;
  isRefining?: boolean;
  at?: string;
  manifest?: Partial<IFiferBoxManifest>;
};

type EngineProgressHandler = (step: EnginePipelineStep) => void;

type EngineRuntimeState<TData = unknown> = {
  data: TData | null;
  isLoading: boolean;
  isRefining: boolean;
  error: Error | null;
  /** Último fragmento de manifiesto (JIT / Dual-Stage). */
  lastEngineManifest: Partial<IFiferBoxManifest> | null;
  /** Motor Pro sugerido por `ContentEngine` (`requiresProExecution`). */
  requiresProMotor: boolean;
};

type ProgressCapableEngine = {
  executeWithProgress?: <TPayload = unknown, TResult = unknown>(
    payload: TPayload,
    onProgress: EngineProgressHandler
  ) => Promise<TResult>;
};

type EngineDispatcherRuntime = {
  dispatch: <TPayload = unknown, TResult = unknown>(engineId: string, payload: TPayload) => Promise<TResult>;
  registry?: Map<string, ProgressCapableEngine>;
};

type UseFiferEngineOptions = {
  onRefiningChange?: (isRefining: boolean) => void;
};

export type FiferEngineBridge<TData = unknown> = EngineRuntimeState<TData> & {
  run: <TPayload = unknown, TResult = unknown>(engineId: string, payload: TPayload) => Promise<TResult>;
  runEngine: <TPayload = unknown, TResult = unknown>(engineId: string, payload: TPayload) => Promise<TResult>;
};

function extractNormalizedRow<T>(resultLike: { data?: unknown }): T | null {
  const d = resultLike.data;
  if (d && typeof d === "object" && "config" in d && "data" in d) {
    return ((d as { data?: T | null }).data ?? null) as T | null;
  }
  return (d as T) ?? null;
}

export function useFiferEngine<TData = unknown>(options?: UseFiferEngineOptions): FiferEngineBridge<TData> {
  const [data, setData] = useState<TData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastEngineManifest, setLastEngineManifest] = useState<Partial<IFiferBoxManifest> | null>(null);
  const [requiresProMotor, setRequiresProMotor] = useState(false);

  const setRefiningState = useCallback(
    (next: boolean) => {
      setIsRefining(next);
      options?.onRefiningChange?.(next);
    },
    [options]
  );

  const runEngine = useCallback(
    async <TPayload = unknown, TResult = unknown>(engineId: string, payload: TPayload): Promise<TResult> => {
      const runtime = engineDispatcher as unknown as EngineDispatcherRuntime;

      setIsLoading(true);
      setRefiningState(false);
      setError(null);
      setLastEngineManifest(null);
      setRequiresProMotor(false);

      try {
        const engine = runtime.registry?.get(engineId);
        const onProgress: EngineProgressHandler = (step) => {
          if (typeof step.isRefining === "boolean") {
            setRefiningState(step.isRefining);
          }
          if (step.manifest && typeof step.manifest === "object") {
            setLastEngineManifest(step.manifest);
          }
        };

        const result = engine?.executeWithProgress
          ? await engine.executeWithProgress<TPayload, TResult>(payload, onProgress)
          : await runtime.dispatch<TPayload, TResult>(engineId, payload);

        const resultLike = result as { data?: unknown; status?: string };
        const shell = resultLike.data as
          | { data?: TData | null; config?: { requiresProExecution?: boolean }; manifest?: Partial<IFiferBoxManifest> }
          | undefined;

        if (resultLike.status === "success" && shell && typeof shell === "object") {
          setLastEngineManifest(shell.manifest ?? null);
          setRequiresProMotor(Boolean(shell.config?.requiresProExecution));
        }

        const normalizedData = extractNormalizedRow<TData>(resultLike);
        setData(normalizedData);
        return result;
      } catch (rawError) {
        const resolvedError = rawError instanceof Error ? rawError : new Error(String(rawError));
        setError(resolvedError);
        setLastEngineManifest(null);
        setRequiresProMotor(false);
        throw resolvedError;
      } finally {
        setIsLoading(false);
        setRefiningState(false);
      }
    },
    [setRefiningState]
  );

  return useMemo(
    () => ({
      data,
      isLoading,
      isRefining,
      error,
      lastEngineManifest,
      requiresProMotor,
      run: runEngine,
      runEngine,
    }),
    [data, isLoading, isRefining, error, lastEngineManifest, requiresProMotor, runEngine]
  );
}

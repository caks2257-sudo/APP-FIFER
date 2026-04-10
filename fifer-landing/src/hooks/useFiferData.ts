"use client";

import { useEffect, useState } from "react";
import { useLayoutStore } from "@/store/useLayoutStore";
import { fetchRealBoxDataForBridge } from "@/lib/fifer-box-data-bridge";
import type { BoxProps } from "@/types/fifer-box";
import {
  MOCK_AFFILIATE_FEED_DATA,
  MOCK_CONTENT_PIPELINE_DATA,
  MOCK_CONTENT_PRODUCTS_DATA,
  MOCK_FINANCE_DASHBOARD_DATA,
  MOCK_FINANCE_SNAPSHOT_DATA,
} from "@/mocks";
import { GOOGLE_ADS_MOCK_INTEGRATION_ERROR } from "@/lib/integration-messages";
import { FIFER_DATA_CORRUPTION_MESSAGE, FiferDataValidationError, validateFiferBoxData } from "@/types/schemas";
import { boxDataHasAdapterGhostMode } from "@/utils/adapters";

export interface UseFiferDataResult {
  data: BoxProps["data"];
  isLoading: boolean;
  error: Error | null;
  isDemoMode: boolean;
}

function buildDemoResult(moduleId: string, boxId: string): UseFiferDataResult {
  const raw = resolveMockData(moduleId, boxId);
  const v = validateFiferBoxData(moduleId, raw);
  if (!v.ok) {
    return {
      data: {},
      isLoading: false,
      error: v.error,
      isDemoMode: true,
    };
  }
  return {
    data: v.data,
    isLoading: false,
    error: resolveSimulatedIntegrationError(boxId),
    isDemoMode: true,
  };
}

/** Demo: Google Shopping sin API Key → Discovery (véase `_xray_INTEGRATIONS.md`). */
function resolveSimulatedIntegrationError(boxId: string): Error | null {
  if (boxId === "content-google-shopping") {
    return GOOGLE_ADS_MOCK_INTEGRATION_ERROR;
  }
  return null;
}

function resolveMockData(moduleId: string, boxId: string): BoxProps["data"] {
  const byBox: Record<string, BoxProps["data"]> = {
    "fifer-finance-snapshot": MOCK_FINANCE_SNAPSHOT_DATA,
    "fifer-content-pipeline": MOCK_CONTENT_PIPELINE_DATA,
    "fifer-ingestor-feed": MOCK_AFFILIATE_FEED_DATA,
    "finance-cashflow-chart": MOCK_FINANCE_DASHBOARD_DATA,
    "finance-transactions-grid": MOCK_FINANCE_SNAPSHOT_DATA,
    "content-ingestion-form": MOCK_CONTENT_PIPELINE_DATA,
    "content-google-shopping": MOCK_CONTENT_PIPELINE_DATA,
    "asset-gallery": MOCK_CONTENT_PRODUCTS_DATA,
  };
  if (byBox[boxId]) return byBox[boxId];

  const mod = moduleId.toLowerCase();
  if (mod === "finance") return MOCK_FINANCE_DASHBOARD_DATA;
  if (mod === "content") return MOCK_CONTENT_PIPELINE_DATA;
  if (mod === "affiliates") return MOCK_AFFILIATE_FEED_DATA;
  return MOCK_FINANCE_SNAPSHOT_DATA;
}

function initialState(moduleId: string, boxId: string): UseFiferDataResult {
  const demo = useLayoutStore.getState().isDemoMode;
  if (demo) return buildDemoResult(moduleId, boxId);
  return { data: {}, isLoading: true, error: null, isDemoMode: false };
}

/**
 * Bridge de hidratación:
 * - **Demo (`isDemoMode`):** semillas Chicureo / ABKupfer desde `@/mocks`.
 * - **Real:** `fetch` al API master vía `fetchRealBoxDataForBridge` → `isLoading` / `error` / `data`.
 */
export function useFiferData(moduleId: string, boxId: string): UseFiferDataResult {
  const isDemoMode = useLayoutStore((s) => s.isDemoMode);
  const [state, setState] = useState<UseFiferDataResult>(() => initialState(moduleId, boxId));

  useEffect(() => {
    if (isDemoMode) {
      setState(buildDemoResult(moduleId, boxId));
      return;
    }

    let cancelled = false;
    setState({ data: {}, isLoading: true, error: null, isDemoMode: false });

    fetchRealBoxDataForBridge(moduleId, boxId)
      .then((data) => {
        if (cancelled) return;
        const v = validateFiferBoxData(moduleId, data);
        if (!v.ok) {
          setState({ data: {}, isLoading: false, error: v.error, isDemoMode: false });
          return;
        }
        if (boxDataHasAdapterGhostMode(v.data)) {
          setState({
            data: v.data,
            isLoading: false,
            error: new FiferDataValidationError(FIFER_DATA_CORRUPTION_MESSAGE),
            isDemoMode: false,
          });
          return;
        }
        setState({ data: v.data, isLoading: false, error: null, isDemoMode: false });
      })
      .catch((e) => {
        if (!cancelled) {
          setState({
            data: {},
            isLoading: false,
            error: e instanceof Error ? e : new Error(String(e)),
            isDemoMode: false,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isDemoMode, moduleId, boxId]);

  return state;
}

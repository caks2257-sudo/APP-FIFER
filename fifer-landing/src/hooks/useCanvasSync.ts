"use client";

/**
 * Canvas ↔ Supabase: sesión anon + token de usuario; rutas API validan en servidor. No usar service role aquí.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { createFiferBrowserClient } from "@/lib/supabase";
import { useOfflineStore } from "@/store/useOfflineStore";

export type CanvasVaultSyncStatus = "idle" | "pulling" | "syncing" | "saved" | "error" | "offline";

type UseCanvasSyncParams<TNode, TConn> = {
  canvasKey: string;
  nodes: TNode[];
  connections: TConn[];
  /** ISO del último estado aplicado desde el vault (persistido en cliente). */
  vaultSyncedAt: string | null;
  onVaultSyncedAtChange: (iso: string | null) => void;
  /** Reemplaza lienzo local cuando el servidor trae un `updated_at` más reciente. */
  onApplyRemoteCanvas: (payload: { nodes: TNode[]; connections: TConn[]; updatedAt: string }) => void;
  enabled?: boolean;
  debounceMs?: number;
};

async function bearerHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const sb = createFiferBrowserClient();
  if (sb) {
    const { data } = await sb.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function parseServerTime(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

/**
 * Sincroniza `{ nodes, connections }` con `fifer_canvas_states` (Supabase vía API Next).
 * Debounce en escritura; GET inicial si la sesión es válida.
 */
export function useCanvasSync<TNode, TConn>({
  canvasKey,
  nodes,
  connections,
  vaultSyncedAt,
  onVaultSyncedAtChange,
  onApplyRemoteCanvas,
  enabled = true,
  debounceMs = 900,
}: UseCanvasSyncParams<TNode, TConn>): {
  status: CanvasVaultSyncStatus;
  lastError: string | null;
} {
  const [status, setStatus] = useState<CanvasVaultSyncStatus>("idle");
  const [lastError, setLastError] = useState<string | null>(null);

  const nodesRef = useRef(nodes);
  const connectionsRef = useRef(connections);
  const vaultSyncedAtRef = useRef(vaultSyncedAt);
  const skipPullRef = useRef(false);
  const savedResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  useEffect(() => {
    connectionsRef.current = connections;
  }, [connections]);
  useEffect(() => {
    vaultSyncedAtRef.current = vaultSyncedAt;
  }, [vaultSyncedAt]);

  const onApplyRemoteCanvasRef = useRef(onApplyRemoteCanvas);
  const onVaultSyncedAtChangeRef = useRef(onVaultSyncedAtChange);
  useEffect(() => {
    onApplyRemoteCanvasRef.current = onApplyRemoteCanvas;
  }, [onApplyRemoteCanvas]);
  useEffect(() => {
    onVaultSyncedAtChangeRef.current = onVaultSyncedAtChange;
  }, [onVaultSyncedAtChange]);

  const pullOnce = useCallback(async () => {
    const sb = createFiferBrowserClient();
    if (!sb) {
      setStatus("offline");
      setLastError("Supabase no configurado en el cliente");
      return;
    }
    const { data: sess } = await sb.auth.getSession();
    if (!sess.session?.access_token) {
      setStatus("offline");
      setLastError("Sin sesión — modo local");
      return;
    }

    setStatus("pulling");
    setLastError(null);
    try {
      const url = `/api/v1/canvas/state?canvas_key=${encodeURIComponent(canvasKey)}`;
      const res = await fetch(url, { headers: await bearerHeaders(), cache: "no-store" });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { nodes?: TNode[]; connections?: TConn[]; updated_at?: string | null };
        error?: string;
      };

      if (!res.ok || !json.success || !json.data) {
        if (res.status === 401) {
          setStatus("offline");
          setLastError(json.error || "Sesión inválida");
          return;
        }
        throw new Error(json.error || `HTTP ${res.status}`);
      }

      const serverAt = parseServerTime(json.data.updated_at);
      const localAt = parseServerTime(vaultSyncedAtRef.current);

      const serverNodes = Array.isArray(json.data.nodes) ? json.data.nodes : [];
      const serverConns = Array.isArray(json.data.connections) ? json.data.connections : [];

      if (serverAt > localAt && (serverNodes.length > 0 || serverConns.length > 0)) {
        const iso = json.data.updated_at || new Date(serverAt).toISOString();
        onApplyRemoteCanvasRef.current({
          nodes: serverNodes,
          connections: serverConns,
          updatedAt: iso,
        });
        onVaultSyncedAtChangeRef.current(iso);
      } else if (json.data.updated_at) {
        onVaultSyncedAtChangeRef.current(json.data.updated_at);
      }

      setStatus("idle");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error de red";
      setLastError(msg);
      setStatus("error");
      useOfflineStore.getState().enqueue({
        kind: "VAULT_CANVAS_PULL",
        label: `Vault lienzo: ${msg}`,
        payload: { canvasKey },
      });
    }
  }, [canvasKey]);

  useEffect(() => {
    if (!enabled || skipPullRef.current) return;
    skipPullRef.current = true;
    void pullOnce();
  }, [enabled, pullOnce]);

  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);

    pushTimerRef.current = setTimeout(() => {
      void (async () => {
        const sb = createFiferBrowserClient();
        if (!sb) {
          setStatus("offline");
          return;
        }
        const { data: sess } = await sb.auth.getSession();
        if (!sess.session?.access_token) {
          setStatus("offline");
          return;
        }

        setStatus("syncing");
        setLastError(null);
        try {
          const res = await fetch("/api/v1/canvas/state", {
            method: "POST",
            headers: await bearerHeaders(),
            body: JSON.stringify({
              canvas_key: canvasKey,
              nodes: nodesRef.current,
              connections: connectionsRef.current,
            }),
          });
          const json = (await res.json()) as {
            success?: boolean;
            data?: { updated_at?: string };
            error?: string;
          };

          if (!res.ok || !json.success) {
            if (res.status === 401) {
              setStatus("offline");
              setLastError(json.error || "Sesión inválida");
              return;
            }
            throw new Error(json.error || `HTTP ${res.status}`);
          }

          const iso = json.data?.updated_at ?? new Date().toISOString();
          onVaultSyncedAtChangeRef.current(iso);
          setStatus("saved");
          if (savedResetRef.current) clearTimeout(savedResetRef.current);
          savedResetRef.current = setTimeout(() => setStatus("idle"), 1600);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Error de red";
          setLastError(msg);
          setStatus("error");
          useOfflineStore.getState().enqueue({
            kind: "VAULT_CANVAS_PUSH",
            label: `Vault lienzo (guardar): ${msg}`,
            payload: { canvasKey },
          });
        }
      })();
    }, debounceMs);

    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [enabled, debounceMs, canvasKey, nodes, connections]);

  useEffect(() => {
    return () => {
      if (savedResetRef.current) clearTimeout(savedResetRef.current);
    };
  }, []);

  return { status, lastError };
}

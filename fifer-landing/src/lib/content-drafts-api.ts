import { createFiferBrowserClient } from "@/lib/supabase";

import {
  appendLocalContentDraft,
  buildContentDraftPayload,
} from "../../../src/engines/utils/artifact-generator";

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

export type PushContentDraftInput = {
  nodeId: string;
  engineId: string;
  data: unknown;
  /** Metadatos adicionales (p. ej. tipo de nodo). */
  metadata?: Record<string, unknown>;
};

/**
 * POST `/api/v1/content/drafts` con sesión Supabase.
 * Si falla red o vault, encola borrador local (`appendLocalContentDraft`).
 */
export async function pushContentToDrafts(input: PushContentDraftInput): Promise<boolean> {
  const built = buildContentDraftPayload(input.data);
  if (!built) return false;

  const metadata: Record<string, unknown> = {
    ...input.metadata,
    sourceNodeId: input.nodeId,
    engineId: input.engineId,
  };

  try {
    const res = await fetch("/api/v1/content/drafts", {
      method: "POST",
      headers: await bearerHeaders(),
      body: JSON.stringify({
        node_id: input.nodeId,
        engine_id: input.engineId,
        body: built.body,
        excerpt: built.excerpt,
        metadata,
      }),
    });
    const json = (await res.json()) as { success?: boolean; error?: string };
    if (res.ok && json.success) {
      return true;
    }
  } catch {
    // cae a local
  }

  return appendLocalContentDraft({
    nodeId: input.nodeId,
    engineId: input.engineId,
    excerpt: built.excerpt,
    body: built.body,
    metadata,
  });
}

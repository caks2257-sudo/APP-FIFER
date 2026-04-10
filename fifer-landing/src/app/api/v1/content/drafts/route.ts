import { NextResponse } from "next/server";

import { getSupabaseUserFromBearer } from "@/lib/supabase-auth-server";
import { createFiferServiceSupabase } from "@/lib/supabase-server";

export const runtime = "nodejs";

type DraftBody = {
  node_id?: string;
  engine_id?: string;
  body?: string;
  excerpt?: string;
  metadata?: Record<string, unknown>;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(request: Request) {
  const auth = await getSupabaseUserFromBearer(request);
  if (!auth.ok) {
    return jsonError("Unauthorized", 401);
  }

  let body: DraftBody;
  try {
    body = (await request.json()) as DraftBody;
  } catch {
    return jsonError("JSON inválido", 400);
  }

  const nodeId = String(body.node_id || "").trim();
  const engineId = String(body.engine_id || "").trim();
  const text = typeof body.body === "string" ? body.body : "";
  const excerpt =
    typeof body.excerpt === "string" && body.excerpt.trim()
      ? body.excerpt.trim().slice(0, 500)
      : text.slice(0, 240);
  const metadata =
    body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? body.metadata
      : {};

  if (!nodeId || !engineId || !text.trim()) {
    return jsonError("node_id, engine_id y body son obligatorios", 400);
  }

  const sb = createFiferServiceSupabase();
  if (!sb) {
    return jsonError("Vault (Supabase service role) no configurado", 503);
  }

  const { data, error } = await sb
    .from("fifer_content_drafts")
    .insert({
      user_id: auth.userId,
      node_id: nodeId,
      engine_id: engineId,
      excerpt,
      body: text.slice(0, 50000),
      metadata,
    })
    .select("id, created_at")
    .single();

  if (error) {
    return jsonError(error.message || "Error guardando borrador", 500);
  }

  return NextResponse.json({
    success: true,
    data: { id: data?.id, created_at: data?.created_at },
  });
}

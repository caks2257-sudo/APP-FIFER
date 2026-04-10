import { NextResponse } from "next/server";

import { getSupabaseUserFromBearer } from "@/lib/supabase-auth-server";
import { createFiferServiceSupabase } from "@/lib/supabase-server";

export const runtime = "nodejs";

type CanvasBody = {
  canvas_key?: string;
  nodes?: unknown;
  connections?: unknown;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function GET(request: Request) {
  const auth = await getSupabaseUserFromBearer(request);
  if (!auth.ok) {
    return jsonError("Unauthorized", auth.reason === "missing_token" ? 401 : 401);
  }

  const url = new URL(request.url);
  const canvasKey = (url.searchParams.get("canvas_key") || "default").slice(0, 120);

  const sb = createFiferServiceSupabase();
  if (!sb) {
    return jsonError("Vault (Supabase service role) no configurado", 503);
  }

  const { data, error } = await sb
    .from("fifer_canvas_states")
    .select("nodes, connections, updated_at")
    .eq("user_id", auth.userId)
    .eq("canvas_key", canvasKey)
    .maybeSingle();

  if (error) {
    return jsonError(error.message || "Error leyendo el vault", 500);
  }

  return NextResponse.json({
    success: true,
    data: {
      nodes: Array.isArray(data?.nodes) ? data.nodes : [],
      connections: Array.isArray(data?.connections) ? data.connections : [],
      updated_at: data?.updated_at ?? null,
    },
  });
}

export async function POST(request: Request) {
  const auth = await getSupabaseUserFromBearer(request);
  if (!auth.ok) {
    return jsonError("Unauthorized", 401);
  }

  let body: CanvasBody;
  try {
    body = (await request.json()) as CanvasBody;
  } catch {
    return jsonError("JSON inválido", 400);
  }

  const canvasKey = String(body.canvas_key || "default").slice(0, 120);
  const nodes = body.nodes;
  const connections = body.connections;

  if (!Array.isArray(nodes) || !Array.isArray(connections)) {
    return jsonError("nodes y connections deben ser arreglos", 400);
  }

  const sb = createFiferServiceSupabase();
  if (!sb) {
    return jsonError("Vault (Supabase service role) no configurado", 503);
  }

  const updatedAt = new Date().toISOString();
  const { error } = await sb.from("fifer_canvas_states").upsert(
    {
      user_id: auth.userId,
      canvas_key: canvasKey,
      nodes,
      connections,
      updated_at: updatedAt,
    },
    { onConflict: "user_id,canvas_key" }
  );

  if (error) {
    return jsonError(error.message || "Error guardando en el vault", 500);
  }

  return NextResponse.json({
    success: true,
    data: { updated_at: updatedAt },
  });
}

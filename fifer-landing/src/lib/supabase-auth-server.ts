import { createClient } from "@supabase/supabase-js";

export type SupabaseAuthResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "missing_token" | "invalid_session" | "supabase_env" };

/**
 * Valida `Authorization: Bearer <access_token>` contra Supabase (anon key).
 * Usar en rutas API antes de tocar tablas con service role filtradas por `user_id`.
 */
export async function getSupabaseUserFromBearer(request: Request): Promise<SupabaseAuthResult> {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return { ok: false, reason: "missing_token" };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !anon) return { ok: false, reason: "supabase_env" };

  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.id) return { ok: false, reason: "invalid_session" };
  return { ok: true, userId: data.user.id };
}

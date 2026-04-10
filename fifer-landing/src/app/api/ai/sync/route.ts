import { NextResponse } from "next/server";
import { runAiMetaSync } from "@/lib/ai/sync-worker";

/**
 * POST — ejecuta Meta-Sync (OpenRouter + OpenAI list). Auth: `Authorization: Bearer <FIFER_AI_SYNC_SECRET>`
 * o cuerpo `{ "secret": "<mismo>" }` usando `FIFER_AI_SYNC_SECRET` | `FIFER_CRON_SECRET` | `FIFER_ADMIN_SECRET`.
 */
export async function POST(req: Request) {
  const token =
    process.env.FIFER_AI_SYNC_SECRET ||
    process.env.FIFER_CRON_SECRET ||
    process.env.FIFER_ADMIN_SECRET;

  if (token) {
    const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    let bodySecret: string | undefined;
    if (!bearer) {
      try {
        const j = (await req.json()) as { secret?: string };
        bodySecret = j?.secret;
      } catch {
        /* sin cuerpo */
      }
    }
    if (bearer !== token && bodySecret !== token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  const result = await runAiMetaSync();
  return NextResponse.json(result);
}

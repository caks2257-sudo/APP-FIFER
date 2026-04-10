import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Simula confirmación de servidor para mutaciones optimistas (solo desarrollo).
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "disabled" }, { status: 403 });
  }
  try {
    await req.json().catch(() => ({}));
  } catch {
    /* ignore */
  }
  await new Promise((r) => setTimeout(r, 120));
  return NextResponse.json({ ok: true });
}

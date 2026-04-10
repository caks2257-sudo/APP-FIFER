import { NextResponse } from "next/server";

/**
 * Establece cookie HttpOnly `fifer_admin=1` si el cuerpo coincide con `FIFER_ADMIN_SECRET`.
 */
export async function POST(req: Request) {
  const secret = process.env.FIFER_ADMIN_SECRET;
  if (!secret || !secret.trim()) {
    return NextResponse.json({ error: "FIFER_ADMIN_SECRET no configurado" }, { status: 503 });
  }

  let body: { secret?: string } = {};
  try {
    body = (await req.json()) as { secret?: string };
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (body.secret !== secret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("fifer_admin", "1", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
  });
  return res;
}

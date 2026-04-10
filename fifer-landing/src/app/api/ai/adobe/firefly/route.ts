import { NextResponse } from "next/server";
import { providerById } from "@/config/ai-toolkit";
import { resolveAdobeFireflyToken } from "@/lib/ai-toolkit-readiness";

export const runtime = "nodejs";

/**
 * POST — Adobe Firefly Services (relleno generativo / edición).
 * Requiere token IMS (`FIFER_ADOBE_ACCESS_TOKEN`) y headers según producto Adobe.
 * Hasta completar OAuth: devuelve contrato esperado.
 */
export async function POST(req: Request) {
  const token = resolveAdobeFireflyToken();
  const meta = providerById("adobe_firefly");
  if (!token) {
    return NextResponse.json(
      {
        error: "Adobe Firefly no configurado",
        hint:
          "Completa OAuth IMS de Adobe y guarda FIFER_ADOBE_ACCESS_TOKEN (opcionalmente FIFER_ADOBE_CLIENT_ID / SECRET para refresh).",
        envKeys: meta?.envKeys,
        fiferRoute: meta?.fiferRoute,
        upstreamBaseUrl: meta?.upstreamBaseUrl,
      },
      { status: 503 }
    );
  }

  try {
    await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  return NextResponse.json(
    {
      ok: false,
      message:
        "Token presente: implementa la ruta Firefly concreta (generative fill, expand, etc.) contra firefly-api.adobe.io según tu contrato.",
      notes: meta?.notes,
    },
    { status: 501 }
  );
}

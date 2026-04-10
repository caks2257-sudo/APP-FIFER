import { NextResponse } from "next/server";

import { recordDnaInteraction } from "@fifer-user/dna-distiller";

export const runtime = "nodejs";

/**
 * POST — registra una interacción de ADN y, cada 20, ejecuta el Conserje sobre `_xray_USER_DNA.md`.
 * Solo desarrollo (escritura en disco del monorepo).
 */
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { ok: false, error: "dna-janitor deshabilitado en producción." },
      { status: 403 }
    );
  }

  try {
    const result = recordDnaInteraction();
    return NextResponse.json({
      ok: true,
      interactionCount: result.interactionCount,
      janitorTriggered: result.janitorTriggered,
      janitor: result.janitor
        ? {
            changed: result.janitor.changed,
            message: result.janitor.message,
            path: result.janitor.path,
            momentumCompressed: result.janitor.momentumCompressed,
            interactionLogCompressed: result.janitor.interactionLogCompressed,
          }
        : undefined,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

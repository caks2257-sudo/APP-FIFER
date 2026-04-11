import { NextResponse } from "next/server";
import "@/engines/ai-fallback-cascade";
import type {
  CommsProvider,
  CommsSubEngine,
} from "@/engines/ai-fallback-cascade/sub-engines/comms";
import { EngineRegistry } from "@/registry/engine-registry";
import type { CoreProfile } from "@/types/user-dna";

type TestCommsBody = {
  botId?: unknown;
  botNombre?: unknown;
  provider?: unknown;
  core?: unknown;
};

function isCoreProfile(v: unknown): v is CoreProfile {
  if (!v || typeof v !== "object") return false;
  const c = v as Record<string, unknown>;
  if (typeof c.nombres !== "string" || typeof c.apellidoPaterno !== "string") {
    return false;
  }
  if (c.tier !== undefined && c.tier !== "free" && c.tier !== "pro") {
    return false;
  }
  return true;
}

function isCommsProvider(v: unknown): v is CommsProvider {
  return v === "whatsapp" || v === "email";
}

function resolveAdminTo(provider: CommsProvider): string | null {
  if (provider === "email") {
    return process.env.FIFER_ADMIN_EMAIL?.trim() || null;
  }
  return (
    process.env.FIFER_ADMIN_WHATSAPP_E164?.trim() ||
    process.env.FIFER_ADMIN_WHATSAPP?.trim() ||
    null
  );
}

export async function POST(req: Request) {
  try {
    let body: TestCommsBody;
    try {
      body = (await req.json()) as TestCommsBody;
    } catch {
      return NextResponse.json(
        {
          ok: false,
          code: "COMMS_BAD_REQUEST",
          reason: "Cuerpo JSON inválido",
        },
        { status: 400 }
      );
    }

    const { botId, botNombre, provider: providerRaw, core } = body;
    const provider: CommsProvider = isCommsProvider(providerRaw)
      ? providerRaw
      : "email";

    if (typeof botId !== "string" || !botId.trim()) {
      return NextResponse.json(
        { ok: false, code: "COMMS_BAD_REQUEST", reason: "botId requerido" },
        { status: 400 }
      );
    }
    if (!isCoreProfile(core)) {
      return NextResponse.json(
        {
          ok: false,
          code: "COMMS_BAD_REQUEST",
          reason: "core (CoreProfile) requerido con nombres y apellidoPaterno",
        },
        { status: 400 }
      );
    }

    let adminTo = resolveAdminTo(provider);
    if (!adminTo && core.tier === "pro") {
      return NextResponse.json(
        {
          ok: false,
          code: "COMMS_ADMIN_DEST_MISSING",
          reason:
            provider === "email"
              ? "Configure FIFER_ADMIN_EMAIL para el destino de prueba (tier pro)."
              : "Configure FIFER_ADMIN_WHATSAPP_E164 (o FIFER_ADMIN_WHATSAPP) para WhatsApp (tier pro).",
        },
        { status: 422 }
      );
    }
    if (!adminTo) {
      adminTo =
        provider === "email"
          ? "mock-admin@fifer.local"
          : "+00000000000";
    }

    const label =
      typeof botNombre === "string" && botNombre.trim()
        ? botNombre.trim()
        : botId.trim();
    const msg = [
      `[FIFER Mis Bots] Notificación de prueba (🔔).`,
      `Bot: ${label} (${botId.trim()}).`,
      `Operador: ${core.nombres} ${core.apellidoPaterno}.`,
      `Tier: ${core.tier ?? "free"}.`,
      `Canal solicitado: ${provider}.`,
    ].join("\n");

    const comms = EngineRegistry.use<CommsSubEngine>("ai-fallback:comms");
    const result = await comms.send(adminTo, msg, provider, core);

    if (!result.ok) {
      return NextResponse.json(
        { ...result, botId: botId.trim(), provider },
        { status: 422 }
      );
    }

    return NextResponse.json({
      ok: true,
      botId: botId.trim(),
      provider,
      channel: result.channel,
      detail: result.detail ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error interno del servidor";
    return NextResponse.json(
      { ok: false, code: "COMMS_SERVER", reason: message },
      { status: 500 }
    );
  }
}

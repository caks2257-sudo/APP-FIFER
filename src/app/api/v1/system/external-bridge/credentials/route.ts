import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import '@/engines/external-bridge-engine';
import {
  BRIDGE_ENV_BINDINGS,
  describeDiscoveredKey,
  type BridgeIntegrationId,
} from '@fifer/external-bridge-engine';
import {
  encryptSecret,
  isBridgeMasterKeyConfigured,
} from '@/lib/bridge-credential-crypto';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase-ssr/server';

export const dynamic = 'force-dynamic';

const bridgeBody = z.object({
  integrationId: z.enum(['payments', 'billing', 'banking']),
  secret: z.string().min(8).max(4096),
});

const envKeyBody = z.object({
  envKey: z
    .string()
    .regex(/^[A-Za-z_][A-Za-z0-9_]*$/)
    .max(256),
  secret: z.string().min(8).max(4096),
});

function envKeyForIntegration(id: BridgeIntegrationId): string | undefined {
  return BRIDGE_ENV_BINDINGS.find((b) => b.integrationId === id)?.envKey;
}

function isAllowedCredentialEnvKey(envKey: string): boolean {
  if (BRIDGE_ENV_BINDINGS.some((b) => b.envKey === envKey)) return true;
  return describeDiscoveredKey(envKey) != null;
}

/**
 * POST: guarda credencial cifrada (admin). No escribe `.env` directamente (Constitución §0.3).
 * Rotación vía HTTP solo con `NODE_ENV=development`; producción: env del despliegue.
 * Cuerpo: `{ integrationId, secret }` (Bridge) o `{ envKey, secret }` (descubrimiento unificado).
 */
export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: authUser.email },
  });
  if (!dbUser || dbUser.role?.toLowerCase() !== 'admin') {
    return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
  }

  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      {
        error:
          'Rotación de credenciales vía API solo en desarrollo (NODE_ENV=development). En producción use variables de entorno del despliegue (Ley de soberanía de conexiones).',
      },
      { status: 403 },
    );
  }

  if (!isBridgeMasterKeyConfigured()) {
    return NextResponse.json(
      {
        error:
          'FIFER_BRIDGE_MASTER_KEY no configurada (64 hex). Defínala en el entorno del servidor para cifrado.',
      },
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const asEnv = envKeyBody.safeParse(json);
  let envKey: string | undefined;
  if (asEnv.success) {
    if (!isAllowedCredentialEnvKey(asEnv.data.envKey)) {
      return NextResponse.json(
        { error: 'envKey no reconocido para el Bridge' },
        { status: 400 },
      );
    }
    envKey = asEnv.data.envKey;
    const enc = encryptSecret(asEnv.data.secret);
    if (!enc) {
      return NextResponse.json({ error: 'Cifrado no disponible' }, { status: 503 });
    }
    await prisma.externalBridgeCredential.upsert({
      where: { envKey },
      create: {
        envKey,
        ciphertextB64: enc.ciphertextB64,
        ivB64: enc.ivB64,
        authTagB64: enc.authTagB64,
        updatedBy: dbUser.email,
      },
      update: {
        ciphertextB64: enc.ciphertextB64,
        ivB64: enc.ivB64,
        authTagB64: enc.authTagB64,
        updatedBy: dbUser.email,
      },
    });
    return NextResponse.json({ ok: true, envKey }, { status: 200 });
  }

  const asBridge = bridgeBody.safeParse(json);
  if (!asBridge.success) {
    return NextResponse.json(
      {
        error: 'Payload inválido',
        details: asBridge.error.flatten(),
      },
      { status: 400 },
    );
  }

  envKey = envKeyForIntegration(asBridge.data.integrationId);
  if (!envKey) {
    return NextResponse.json({ error: 'Integración desconocida' }, { status: 400 });
  }

  const enc = encryptSecret(asBridge.data.secret);
  if (!enc) {
    return NextResponse.json({ error: 'Cifrado no disponible' }, { status: 503 });
  }

  await prisma.externalBridgeCredential.upsert({
    where: { envKey },
    create: {
      envKey,
      ciphertextB64: enc.ciphertextB64,
      ivB64: enc.ivB64,
      authTagB64: enc.authTagB64,
      updatedBy: dbUser.email,
    },
    update: {
      ciphertextB64: enc.ciphertextB64,
      ivB64: enc.ivB64,
      authTagB64: enc.authTagB64,
      updatedBy: dbUser.email,
    },
  });

  return NextResponse.json({ ok: true, envKey }, { status: 200 });
}

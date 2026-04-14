import { NextRequest, NextResponse } from 'next/server';

import '@/engines/external-bridge-engine';
import {
  PrismaAuthLegacyEmailConflictError,
  syncThenFindUser,
} from '@/lib/prisma-auth-sync';
import { createServerSupabaseClient } from '@/lib/supabase-ssr/server';

export const dynamic = 'force-dynamic';

/**
 * La persistencia cifrada en base de datos fue sustituida por Google Secret Manager
 * (JSON) y variables locales. Este endpoint solo documenta el flujo para admins.
 */
export async function POST(_request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email || !authUser.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  let dbUser;
  try {
    dbUser = await syncThenFindUser(authUser);
  } catch (error) {
    if (error instanceof PrismaAuthLegacyEmailConflictError) {
      return NextResponse.json(
        { error: 'Identidad desalineada con Supabase Auth.' },
        { status: 409 },
      );
    }
    throw error;
  }

  if (!dbUser || dbUser.role?.toLowerCase() !== 'admin') {
    return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
  }

  return NextResponse.json(
    {
      error:
        'Las credenciales del Bridge ya no se guardan en base de datos. Defina un secreto JSON en Google Cloud Secret Manager o use variables en el entorno / `.env.local` (ver `loadDecryptedVault`).',
      secretManager: {
        projectEnv: ['FIFER_GCP_PROJECT', 'GOOGLE_CLOUD_PROJECT', 'GCP_PROJECT'],
        secretIdEnv: ['FIFER_BRIDGE_VAULT_SECRET_ID', 'FIFER_AI_VAULT_SECRET_ID'],
        defaultSecretId: 'fifer-external-bridge-vault',
        payloadShape: { FLOW_API_KEY: 'string', OPENAI_API_KEY: 'string' },
      },
    },
    { status: 501 },
  );
}

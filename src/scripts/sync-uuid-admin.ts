/**
 * Alinea el `User.id` de Prisma con el UUID de Supabase Auth (PK).
 * Borra el registro actual del email indicado y lo recrea con el ID fijo en una transacción
 * (cascada según schema: bots, contratos, documentos, etc.).
 *
 * Uso: npm run fifer:sync-uuid
 */
import 'dotenv/config';

import { prisma } from '@/lib/prisma';

const EMAIL = 'caks2257@gmail.com';
const SUPABASE_USER_ID = '371b166d-d4e9-4660-8bc0-949c3fe660cf';
const DEFAULT_NAME = 'Cristobal Kupfer';
const ROLE = 'admin';
const TIER = 'pro';

async function main(): Promise<void> {
  const existingByEmail = await prisma.user.findUnique({ where: { email: EMAIL } });
  const existingByUuid = await prisma.user.findUnique({ where: { id: SUPABASE_USER_ID } });

  if (existingByUuid && existingByUuid.email !== EMAIL) {
    throw new Error(
      `[fifer:sync-uuid] El id ${SUPABASE_USER_ID} ya está asignado a otro email (${existingByUuid.email}). Abortado.`,
    );
  }

  if (existingByEmail?.id === SUPABASE_USER_ID) {
    const updated = await prisma.user.update({
      where: { id: SUPABASE_USER_ID },
      data: { name: existingByEmail.name || DEFAULT_NAME, role: ROLE, tier: TIER },
    });
    console.log('[fifer:sync-uuid] El usuario ya tenía el UUID de Supabase; se reforzaron rol/tier/nombre.');
    console.log(JSON.stringify(updated, null, 2));
    return;
  }

  const nameToUse = existingByEmail?.name?.trim() || DEFAULT_NAME;

  await prisma.$transaction(async (tx) => {
    if (existingByEmail) {
      await tx.user.delete({ where: { id: existingByEmail.id } });
    }
    await tx.user.create({
      data: {
        id: SUPABASE_USER_ID,
        email: EMAIL,
        name: nameToUse,
        role: ROLE,
        tier: TIER,
      },
    });
  });

  const created = await prisma.user.findUniqueOrThrow({ where: { email: EMAIL } });
  console.log('[fifer:sync-uuid] Usuario recreado con UUID de Supabase (transacción completada).');
  console.log(JSON.stringify(created, null, 2));
}

main()
  .catch((err: unknown) => {
    console.error('[fifer:sync-uuid] Error:', err);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });

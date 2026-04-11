/**
 * Emergencia: sincroniza el usuario de Supabase en Prisma y lo eleva a admin + tier pro.
 * Uso: npm run fifer:admin-setup
 *
 * Opcional: `FIFER_ADMIN_SUPABASE_USER_ID=<uuid>` — al crear un usuario nuevo, fuerza el `id`
 * al UUID de Supabase Auth (si no se define, Prisma usa `cuid()`).
 */
import 'dotenv/config';

import { prisma } from '@/lib/prisma';

const EMAIL = 'caks2257@gmail.com';
const NAME = 'Cristobal Kupfer';
const ROLE = 'admin';
const TIER = 'pro';

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

async function main(): Promise<void> {
  const envId = process.env.FIFER_ADMIN_SUPABASE_USER_ID?.trim();
  const explicitId = envId && isUuid(envId) ? envId : undefined;

  const existing = await prisma.user.findUnique({ where: { email: EMAIL } });

  if (!existing) {
    const created = await prisma.user.create({
      data: {
        ...(explicitId ? { id: explicitId } : {}),
        email: EMAIL,
        name: NAME,
        role: ROLE,
        tier: TIER,
      },
    });
    console.log('[fifer:admin-setup] Usuario creado.');
    console.log(JSON.stringify(created, null, 2));
    return;
  }

  const updated = await prisma.user.update({
    where: { id: existing.id },
    data: {
      name: NAME,
      role: ROLE,
      tier: TIER,
    },
  });
  console.log('[fifer:admin-setup] Usuario actualizado (ya existía).');
  console.log(JSON.stringify(updated, null, 2));
}

main()
  .catch((err: unknown) => {
    console.error('[fifer:admin-setup] Error:', err);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });

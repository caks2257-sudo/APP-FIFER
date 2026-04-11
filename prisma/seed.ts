import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Mismo email que en Supabase Auth para que el login te reconozca. */
const DEFAULT_FOUNDER_EMAIL = 'tu-email-de-supabase@ejemplo.com';

const SEED_BOT_IDS = {
  consultorNormativo: 'seed_bot_consultor_normativo_oguc',
  analistaInversiones: 'seed_bot_analista_inversiones',
} as const;

async function main() {
  const raw = process.env.SEED_FOUNDER_EMAIL?.trim();
  const email = raw && raw.length > 0 ? raw : DEFAULT_FOUNDER_EMAIL;

  if (!raw || raw.length === 0) {
    console.warn(
      '[prisma/seed] SEED_FOUNDER_EMAIL no está definido en .env; usando el placeholder del prompt. ' +
        'Añade SEED_FOUNDER_EMAIL con tu email real de Supabase y vuelve a ejecutar el seed.',
    );
  }

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: 'Cristobal Kupfer',
      role: 'admin',
      tier: 'pro',
    },
    update: {
      name: 'Cristobal Kupfer',
      role: 'admin',
      tier: 'pro',
    },
  });

  await prisma.bot.upsert({
    where: { id: SEED_BOT_IDS.consultorNormativo },
    create: {
      id: SEED_BOT_IDS.consultorNormativo,
      name: 'Consultor Normativo OGUC',
      status: 'active',
      modelId: 'gpt-4o',
      ownerId: user.id,
    },
    update: {
      name: 'Consultor Normativo OGUC',
      status: 'active',
      modelId: 'gpt-4o',
      ownerId: user.id,
    },
  });

  await prisma.bot.upsert({
    where: { id: SEED_BOT_IDS.analistaInversiones },
    create: {
      id: SEED_BOT_IDS.analistaInversiones,
      name: 'Analista de Inversiones',
      status: 'active',
      modelId: 'gpt-4o',
      ownerId: user.id,
    },
    update: {
      name: 'Analista de Inversiones',
      status: 'active',
      modelId: 'gpt-4o',
      ownerId: user.id,
    },
  });

  console.log('[prisma/seed] OK — User:', user.email, 'bots vinculados a', user.id);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

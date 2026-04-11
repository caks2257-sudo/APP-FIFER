/**
 * Carga .env y ejecuta el seed (DATABASE_URL = pooler, DIRECT_URL = conexión directa; estándar Prisma + Supabase).
 */
import { config } from 'dotenv';
import { execSync } from 'node:child_process';

config();
execSync('npx prisma db seed', { stdio: 'inherit', env: process.env });

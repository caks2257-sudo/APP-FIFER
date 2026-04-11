import { NextResponse } from 'next/server';
import type { BotDataPayload } from '@/types/schemas';

/**
 * Stub Mis Bots — payload acorde a `BotDataSchema` (mock hasta orquestación real).
 */
export async function GET() {
  const body: BotDataPayload = {
    schemaVersion: '1.0-misbots',
    bots: [
      {
        id: 'bot-ventas-01',
        nombre: 'Asistente Comercial Chicureo',
        estado: 'activo',
        modeloAsignado: 'gpt-4o',
        costoPromedioUF: 2.45,
      },
      {
        id: 'bot-soporte-02',
        nombre: 'Soporte L1 — Inbox',
        estado: 'pausado',
        modeloAsignado: 'gemini-flash',
        costoPromedioUF: 0.32,
      },
      {
        id: 'bot-finops-03',
        nombre: 'FinOps — Resúmenes UF',
        estado: 'activo',
        modeloAsignado: 'gpt-4o-mini',
        costoPromedioUF: 0.78,
      },
    ],
  };

  return NextResponse.json(body, { status: 200 });
}

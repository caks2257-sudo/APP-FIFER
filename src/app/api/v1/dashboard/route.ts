import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase-ssr/server';
import type { RawDashboardPayload } from '@/utils/adapters/dashboardAdapter';
import { STRESS_CONTRATOS_API_SABOTAGE } from '@/utils/fifer-box-data-bridge';

export const dynamic = 'force-dynamic';

const XRAY_SOURCES = ['FIFER_CORE/xray_engines/xray_admitad.js', 'FIFER_CORE/xray_engines/xray_products.js'] as const;

async function buildDashboardPayload(): Promise<RawDashboardPayload> {
  return {
    isRefining: true,
    widgets: [
      {
        id: 'flujo-caja-finanzas',
        boxId: 'finance-cashflow-chart',
        colSpan: 12,
        biome: 'finance',
        data: {
          title: 'Flujo de Caja Operativo',
          subtitle: 'Proyeccion semanal',
          series: [
            { label: 'Lun', value: 28 },
            { label: 'Mar', value: 35 },
            { label: 'Mie', value: 31 },
            { label: 'Jue', value: 44 },
            { label: 'Vie', value: 39 },
            { label: 'Sab', value: 47 },
          ],
        },
        config: {
          source: XRAY_SOURCES[1],
        },
      },
      {
        id: 'ingesta-contenido',
        boxId: 'content-ingestion-form',
        colSpan: 4,
        biome: 'content',
        data: {
          title: 'Ingesta Documental OGUC/LGUC',
          description: 'Canal de entrada para normativa y expedientes',
          sourceLabel: 'Documento fuente',
          placeholder: 'ORD_245_DOM_SANTIAGO.pdf',
        },
        config: {
          source: XRAY_SOURCES[0],
        },
      },
      {
        id: 'contratos-finance-slot',
        boxId: 'fifer-contratos-main',
        colSpan: 12,
        biome: 'finance',
        data: STRESS_CONTRATOS_API_SABOTAGE
          ? {
              contratos: [
                {
                  id: 'stress-qa',
                  localNombre: '',
                  arrendatario: 'Stress QA',
                  montoUF: 0,
                  vencimiento: '2026-01-01',
                  estado: 'Vigente',
                },
              ],
            }
          : { contratos: [] },
        config: {
          source: 'fifer-contratos-main',
          title: 'Control de Contratos — Chicureo',
        },
      },
    ],
  };
}

export async function GET() {
  try {
    const payload = await buildDashboardPayload();

    const supabase = createServerSupabaseClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    let dashboardLayout: unknown = null;
    if (authUser?.email) {
      const rows = await prisma.$queryRaw<Array<{ dashboardLayout: unknown | null }>>`
        SELECT "dashboardLayout" FROM "User" WHERE "email" = ${authUser.email} LIMIT 1
      `;
      dashboardLayout = rows[0]?.dashboardLayout ?? null;
    }

    return NextResponse.json({ ...payload, dashboardLayout }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Dashboard orchestration failed',
        error: error instanceof Error ? error.message : 'Unknown dashboard error',
      },
      { status: 500 },
    );
  }
}

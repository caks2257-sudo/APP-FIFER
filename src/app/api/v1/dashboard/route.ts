import { NextResponse } from 'next/server';
import type { RawDashboardPayload } from '@/utils/adapters/dashboardAdapter';
import { fetchAffiliateData } from '../../../../../FIFER_CORE/xray_engines/xray_admitad.js';

const XRAY_SOURCES = ['FIFER_CORE/xray_engines/xray_admitad.js', 'FIFER_CORE/xray_engines/xray_products.js'] as const;

async function getAffiliateSummaryFromEngine() {
  if (typeof fetchAffiliateData !== 'function') {
    throw new Error('xray_admitad no exporta fetchAffiliateData');
  }

  const result = await fetchAffiliateData();
  if (!result?.summary) {
    throw new Error('xray_admitad devolvio payload invalido (summary ausente)');
  }

  return result.summary as {
    title: string;
    value: string;
    caption: string;
  };
}

async function buildDashboardPayload(): Promise<RawDashboardPayload> {
  const affiliateSummary = await getAffiliateSummaryFromEngine();
  return {
    isRefining: true,
    widgets: [
      {
        id: 'resumen-afiliados',
        boxId: 'affiliate-hero-summary',
        colSpan: 4,
        biome: 'affiliates',
        data: affiliateSummary,
        config: {
          source: XRAY_SOURCES[0],
        },
      },
      {
        id: 'flujo-caja-finanzas',
        boxId: 'finance-cashflow-chart',
        colSpan: 8,
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
    ],
  };
}

export async function GET() {
  try {
    const payload = await buildDashboardPayload();
    return NextResponse.json(payload, { status: 200 });
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

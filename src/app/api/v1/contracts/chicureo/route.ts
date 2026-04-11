import { NextRequest, NextResponse } from 'next/server';

/**
 * BDUI: contratos Chicureo (ADN `ContratosDataSchema`). `?fail=1` → 500.
 */
export async function GET(request: NextRequest) {
  const fail = request.nextUrl.searchParams.get('fail');
  if (fail === '1') {
    return NextResponse.json({ message: 'Simulated contracts API failure' }, { status: 500 });
  }

  return NextResponse.json(
    {
      schemaVersion: '1.0',
      zona: 'Chicureo',
      contratos: [
        {
          id: 'CTR-CH-001',
          localNombre: 'Bodega industrial — Chicureo Manzana 4',
          arrendatario: 'Inmobiliaria Norte SpA',
          montoUF: 185,
          vencimiento: '2027-03-15',
          estado: 'Vigente',
        },
        {
          id: 'CTR-CH-002',
          localNombre: 'Oficina corporativa — Av. Chicureo Norte',
          arrendatario: 'Consultores DOM Ltda.',
          montoUF: 92.5,
          vencimiento: '2026-11-30',
          estado: 'Por Vencer',
        },
      ],
    },
    { status: 200 },
  );
}

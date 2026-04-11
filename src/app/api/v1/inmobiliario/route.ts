import { NextResponse } from 'next/server';

/**
 * Mock tipado vía bridge + Zod (`InmobiliarioDataSchema`) hasta conectar backend real.
 */
export async function GET() {
  const body = {
    schemaVersion: '1.0-inmobiliario',
    propiedades: [
      {
        id: 'proj-chic-001',
        nombreProyecto: 'Reserva Chicureo II',
        unidadesDisponibles: 14,
        estado: 'Disponible' as const,
      },
      {
        id: 'proj-chic-002',
        nombreProyecto: 'Torre Horizonte',
        unidadesDisponibles: 3,
        estado: 'En construcción' as const,
      },
    ],
  };
  return NextResponse.json(body, { status: 200 });
}

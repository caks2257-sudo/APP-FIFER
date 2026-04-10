import { NextResponse } from 'next/server';
import { FinanceEngine, Transaction } from '@fifer/finance-engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const engine = new FinanceEngine({ currentUFValue: 38500 });

    const mockTransactions: Transaction[] = [
      {
        id: 't1',
        amount: 50,
        currency: 'UF',
        type: 'INCOME',
        date: new Date(),
        category: 'Regularización Chicureo',
      },
      {
        id: 't2',
        amount: 300000,
        currency: 'CLP',
        type: 'EXPENSE',
        date: new Date(),
        category: 'Trámites Municipales',
      },
      {
        id: 't3',
        amount: 15,
        currency: 'UF',
        type: 'INCOME',
        date: new Date(),
        category: 'Asesoría Arquitectura',
      },
    ];

    const summary = engine.calculateCashflow(mockTransactions);

    const fiferBoxPayload = {
      boxId: 'fifer-finance-snapshot',
      meta: {
        timestamp: new Date().toISOString(),
        ghostMode: false,
      },
      data: {
        kpis: [
          { label: 'Ingresos (CLP)', value: summary.totalIncomeCLP },
          { label: 'Egresos (CLP)', value: summary.totalExpenseCLP },
          { label: 'Flujo Neto (CLP)', value: summary.netCashflowCLP },
          { label: 'ROI', value: `${summary.roiPercentage ?? 0}%` },
        ],
      },
    };

    return NextResponse.json(fiferBoxPayload);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: 'Error procesando motor financiero',
        details: message,
        meta: { ghostMode: true },
      },
      { status: 500 }
    );
  }
}

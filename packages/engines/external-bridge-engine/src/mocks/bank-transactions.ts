/**
 * Movimientos simulados Fintoc — ids estables para pruebas de deduplicación.
 */
export function mockBankTransactions(): Array<{
  externalId: string;
  postedAt: Date;
  amountClp: number;
  type: 'INGRESO' | 'EGRESO';
  concept: string;
}> {
  return [
    {
      externalId: 'fintoc_mock_tx_001',
      postedAt: new Date('2026-04-10T12:00:00.000Z'),
      amountClp: 45_000,
      type: 'INGRESO',
      concept: 'Transferencia recibida (simulación)',
    },
    {
      externalId: 'fintoc_mock_tx_002',
      postedAt: new Date('2026-04-09T15:30:00.000Z'),
      amountClp: 12_000,
      type: 'EGRESO',
      concept: 'Compra con débito (simulación)',
    },
    {
      externalId: 'fintoc_mock_tx_003',
      postedAt: new Date('2026-04-08T09:15:00.000Z'),
      amountClp: 8_500,
      type: 'EGRESO',
      concept: 'Pago proveedor (simulación)',
    },
  ];
}

export type FinanceTransaction = {
  id: string;
  date: string;
  amount: number;
  status: "paid" | "pending" | "failed";
  description: string;
};

/** Mock JIT Hydration: simula 1s de latencia de red. */
export async function getTransactions(): Promise<FinanceTransaction[]> {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return [
    {
      id: "txn-001",
      date: "2026-04-01T09:12:00.000Z",
      amount: 1299.99,
      status: "paid",
      description: "Cobro afiliado - Piso SPC Roble Premium",
    },
    {
      id: "txn-002",
      date: "2026-04-02T15:46:00.000Z",
      amount: 845.5,
      status: "pending",
      description: "Orden en conciliación - Revestimiento WPC Nogal",
    },
    {
      id: "txn-003",
      date: "2026-04-03T11:07:00.000Z",
      amount: 420,
      status: "paid",
      description: "Comisión marketplace - Piso Vinílico Click",
    },
    {
      id: "txn-004",
      date: "2026-04-04T18:22:00.000Z",
      amount: 230.75,
      status: "failed",
      description: "Pago rechazado - Revestimiento Exterior Deck",
    },
    {
      id: "txn-005",
      date: "2026-04-05T08:30:00.000Z",
      amount: 1675.2,
      status: "paid",
      description: "Venta consolidada - Piso Laminado AC4",
    },
  ];
}
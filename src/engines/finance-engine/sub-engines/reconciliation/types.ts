export type ReconciliationNewMovement = {
  externalId: string;
  postedAt: string;
  amountClp: number;
  type: 'INGRESO' | 'EGRESO';
  concept: string;
};

export type BankReconciliationPreviewResult = {
  bridgeMode: 'MOCK' | 'PROD';
  pendingCount: number;
  newMovements: ReconciliationNewMovement[];
};

export type BankReconciliationApplyResult = {
  bridgeMode: 'MOCK' | 'PROD';
  savedCount: number;
  savedIds: string[];
  balance: string;
  currency: string;
};

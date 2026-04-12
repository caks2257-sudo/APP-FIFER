/**
 * Respuesta simulada DTE (SII / integrador tipo OpenFactura).
 */
export type MockDteEmitResult = {
  folio: number;
  url_pdf: string;
  token_sii: string;
  documentType: '33';
  provider: 'openfactura-mock';
};

export function mockEmitDte(params: {
  transactionId: string;
  publicOrigin: string;
}): MockDteEmitResult {
  const folio = 1_000_000 + (Math.abs(hashString(params.transactionId)) % 99_999);
  const token = `sii_mock_${params.transactionId.slice(0, 12)}_${Date.now().toString(36)}`;
  const url = `${params.publicOrigin.replace(/\/$/, '')}/api/v1/finanzas/billing/mock-pdf?tx=${encodeURIComponent(params.transactionId)}`;

  return {
    folio,
    url_pdf: url,
    token_sii: token,
    documentType: '33',
    provider: 'openfactura-mock',
  };
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

/**
 * Formato de montos para la app Finanzas (CLP vía Intl; UF como número + sufijo).
 */
export function formatMoneyAmount(amountStr: string, currency: string): string {
  const n = Number(amountStr);
  if (!Number.isFinite(n)) return amountStr;
  if (currency === 'UF') {
    return `${n.toLocaleString('es-CL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })} UF`;
  }
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n);
}

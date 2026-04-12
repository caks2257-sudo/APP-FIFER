/**
 * Formato de montos para la app Finanzas (Intl según locale activo; UF como número + sufijo).
 */
export function formatMoneyAmount(
  amountStr: string,
  currency: string,
  intlLocale = 'es-CL',
): string {
  const n = Number(amountStr);
  if (!Number.isFinite(n)) return amountStr;
  if (currency === 'UF') {
    return `${n.toLocaleString(intlLocale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })} UF`;
  }
  const code = currency === 'USD' ? 'USD' : 'CLP';
  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency: code,
    maximumFractionDigits: code === 'CLP' ? 0 : 2,
  }).format(n);
}

/**
 * Validación RUT chileno (cuerpo numérico + dígito verificador).
 */

export function normalizeRutBodyDv(input: string): { body: string; dv: string } | null {
  const raw = input.replace(/\./g, '').replace(/\s/g, '').toUpperCase();
  if (raw.length < 2) return null;
  const last = raw.slice(-1);
  const bodyPart = raw.slice(0, -1).replace(/-/g, '');
  if (!/^\d{7,8}$/.test(bodyPart)) return null;
  if (!/^[\dK]$/.test(last)) return null;
  return { body: bodyPart, dv: last };
}

export function isValidRutChile(input: string): boolean {
  const parsed = normalizeRutBodyDv(input);
  if (!parsed) return false;
  const { body, dv } = parsed;
  let sum = 0;
  let multi = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]!, 10) * multi;
    multi = multi === 7 ? 2 : multi + 1;
  }
  const remainder = 11 - (sum % 11);
  const expected =
    remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);
  return dv === expected;
}

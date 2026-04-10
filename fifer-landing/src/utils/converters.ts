/**
 * Fifer Unit Master — conversiones inmobiliarias / ABKupfer y formato chileno (CLP · UF).
 * Valor UF: `financeMockData.ufValueClpPerDay` (mock del día).
 */
import { contentMockData } from "@/mocks/content-data";
import { financeMockData } from "@/mocks/finance-data";

/** Tipo de producto ABKupfer para m²/caja (estándares de empaque). */
export type AbkupferProductType = "ROBLE" | "PINO" | "DEFAULT";

/**
 * Superficie útil por caja según línea (referencia comercial ABKupfer).
 * Roble ingeniería: cajas más densas; Pino / cladding: ligeramente mayor por tablón.
 */
export const ABKUPFER_M2_PER_BOX: Record<AbkupferProductType, number> = {
  ROBLE: 2.1,
  PINO: 2.35,
  DEFAULT: 2.2,
};

/** @deprecated Usar `getUfDailyRateClp()` — alias del mock actual. */
export const MOCK_UF_VALUE_CLP = financeMockData.ufValueClpPerDay;

/** Valor UF del día en CLP (1 UF). */
export function getUfDailyRateClp(): number {
  return financeMockData.ufValueClpPerDay;
}

/**
 * UF → pesos chilenos (CLP enteros), usando el valor del día del mock de finanzas.
 */
export function convertUFtoCLP(amountUf: number): number {
  if (!Number.isFinite(amountUf)) return NaN;
  return Math.round(amountUf * getUfDailyRateClp());
}

/** CLP → UF (decimal), mismo tipo de cambio del mock. */
export function clpToUf(clp: number, ufClpRate: number = getUfDailyRateClp()): number {
  if (!Number.isFinite(clp) || !Number.isFinite(ufClpRate) || ufClpRate === 0) return NaN;
  return clp / ufClpRate;
}

/** Alias histórico — delega en `convertUFtoCLP` cuando `ufClpRate` es el del mock. */
export function ufToClp(uf: number, ufClpRate: number = getUfDailyRateClp()): number {
  if (!Number.isFinite(uf) || !Number.isFinite(ufClpRate)) return NaN;
  return Math.round(uf * ufClpRate);
}

export function normalizeAbkupferProductType(input: string): AbkupferProductType {
  const t = input.trim().toLowerCase();
  if (t.includes("roble")) return "ROBLE";
  if (t.includes("pino")) return "PINO";
  return "DEFAULT";
}

export function getM2PerBoxForProductType(productType: string): number {
  const key = normalizeAbkupferProductType(productType);
  return ABKUPFER_M2_PER_BOX[key];
}

/**
 * m² → cajas (techo) según estándar ABKupfer por producto (Roble, Pino, …).
 */
export function convertM2toBoxes(
  m2: number,
  productType: string
): {
  boxes: number;
  coveredM2: number;
  remainderM2: number;
  m2PerBox: number;
  productKey: AbkupferProductType;
} {
  const productKey = normalizeAbkupferProductType(productType);
  const m2PerBox = ABKUPFER_M2_PER_BOX[productKey];
  const r = m2ToAbkupferBoxes(m2, m2PerBox);
  return { ...r, m2PerBox, productKey };
}

/** Superficie típica por caja (piso madera) — valor por defecto Unit Master. */
export const ABKUPFER_DEFAULT_M2_PER_BOX = ABKUPFER_M2_PER_BOX.DEFAULT;

const INCH_MM = 25.4;

/**
 * m² → cajas a pedir (techo): embalaje por superficie fija por caja.
 */
export function m2ToAbkupferBoxes(
  m2: number,
  m2PerBox: number = ABKUPFER_DEFAULT_M2_PER_BOX
): { boxes: number; coveredM2: number; remainderM2: number } {
  if (!Number.isFinite(m2) || m2 < 0 || !Number.isFinite(m2PerBox) || m2PerBox <= 0) {
    return { boxes: 0, coveredM2: 0, remainderM2: 0 };
  }
  const boxes = Math.ceil(m2 / m2PerBox);
  const coveredM2 = boxes * m2PerBox;
  const remainderM2 = Number((coveredM2 - m2).toFixed(4));
  return { boxes, coveredM2, remainderM2 };
}

/** Pulgadas → milímetros (arquitectura US → métrico). */
export function inchesToMm(inches: number): number {
  if (!Number.isFinite(inches)) return NaN;
  return Number((inches * INCH_MM).toFixed(3));
}

/** Milímetros → pulgadas. */
export function mmToInches(mm: number): number {
  if (!Number.isFinite(mm)) return NaN;
  return Number((mm / INCH_MM).toFixed(4));
}

/**
 * Parseo chileno: `12,5` · `1.234,56` · `1.234` (miles) · `12.5` (decimal).
 */
export function parseChileanNumber(input: string): number | null {
  const t = input.trim().replace(/\s/g, "");
  if (!t) return null;
  if (t.includes(",")) {
    const n = parseFloat(t.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  const lastDot = t.lastIndexOf(".");
  if (lastDot === -1) {
    const n = parseFloat(t);
    return Number.isFinite(n) ? n : null;
  }
  const decPart = t.slice(lastDot + 1);
  if (decPart.length <= 2) {
    const n = parseFloat(t);
    return Number.isFinite(n) ? n : null;
  }
  const n = parseFloat(t.replace(/\./g, ""));
  return Number.isFinite(n) ? n : null;
}

export type ChileanCurrencyKind = "CLP" | "UF";

/**
 * Formato moneda Chile: miles con punto, decimales con coma (`es-CL`).
 * - CLP: símbolo $ y sin decimales.
 * - UF: número con decimales + sufijo ` UF` (sin $).
 */
export function formatChileanCurrency(
  amount: number,
  type: ChileanCurrencyKind,
  ufFractionDigits = 2
): string {
  if (!Number.isFinite(amount)) return "—";
  if (type === "CLP") {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(Math.round(amount));
  }
  const s = new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: ufFractionDigits,
    maximumFractionDigits: ufFractionDigits,
  }).format(amount);
  return `${s} UF`;
}

/** Formato moneda CLP (delega en `formatChileanCurrency`). */
export function formatClp(amount: number): string {
  return formatChileanCurrency(amount, "CLP");
}

/** Valor UF formateado (delega en `formatChileanCurrency`). */
export function formatUf(amount: number, fractionDigits = 2): string {
  if (!Number.isFinite(amount)) return "—";
  return formatChileanCurrency(amount, "UF", fractionDigits);
}

/** Número genérico es-CL (m², mm, etc.). */
export function formatNumberEsCl(value: number, fractionDigits = 0): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Cabecera con valor UF del día en CLP. */
export function formatUfDayReference(ufClpRate: number = getUfDailyRateClp()): string {
  return `Valor referencial: 1 UF = ${formatChileanCurrency(ufClpRate, "CLP")}`;
}

/**
 * Salida del comando `/uf` (Global Commander): cartera mock + conversión CLP + opcional `/uf <cantidad>`.
 */
export function buildUfCommandOutput(args: string[]): string {
  const lines: string[] = [];
  lines.push(formatUfDayReference());
  lines.push("");
  const s = financeMockData.summary;
  lines.push("Cartera Chicureo (mock):");
  lines.push(
    `• UF totales: ${formatChileanCurrency(s.totalUF, "UF")} → ${formatChileanCurrency(convertUFtoCLP(s.totalUF), "CLP")}`
  );
  lines.push(
    `• UF pendientes: ${formatChileanCurrency(s.pendingUF, "UF")} → ${formatChileanCurrency(convertUFtoCLP(s.pendingUF), "CLP")}`
  );
  lines.push(`• Proyectos activos: ${s.activeProjects}`);

  const firstArg = args[0];
  if (firstArg) {
    const n = parseChileanNumber(firstArg);
    if (n !== null && n > 0) {
      lines.push("");
      lines.push(
        `Conversión rápida: ${formatChileanCurrency(n, "UF")} ≈ ${formatChileanCurrency(convertUFtoCLP(n), "CLP")}`
      );
    }
  }

  const inchMm = inchesToMm(1);
  const roble = convertM2toBoxes(10, "Roble");
  const pino = convertM2toBoxes(10, "Pino");
  lines.push("");
  lines.push(
    `Referencia técnica: 1" = ${formatNumberEsCl(inchMm, 2)} mm · 10 m² Roble ≈ ${roble.boxes} caja(s) (${formatNumberEsCl(roble.m2PerBox, 2)} m²/caja) · 10 m² Pino ≈ ${pino.boxes} caja(s) (${formatNumberEsCl(pino.m2PerBox, 2)} m²/caja).`
  );

  return lines.join("\n");
}

/** Extrae m² de cadenas tipo `140 m2` o `0 m2`. */
export function parseSquareMetersFromLabel(label: string): number | null {
  const m = label.match(/([\d][\d.,]*)\s*m2/i);
  if (!m) return null;
  return parseChileanNumber(m[1]!);
}

/** Salida enriquecida para `/stock` — inventario + cajas estimadas ABKupfer por línea (Roble / Pino). */
export function buildStockCommandOutput(): string {
  const lines: string[] = [`Marca: ${contentMockData.brand}`, ""];
  for (const row of contentMockData.inventory) {
    const m2 = parseSquareMetersFromLabel(row.stock);
    const pack =
      m2 !== null && m2 > 0 ? convertM2toBoxes(m2, row.name) : null;
    const boxLine =
      pack && pack.boxes > 0
        ? ` → ≈ ${pack.boxes} caja(s) · ${pack.productKey} (${formatNumberEsCl(pack.m2PerBox, 2)} m²/caja)`
        : "";
    const alert = row.trend === "Crítica" ? " ⚠ Stock crítico" : "";
    lines.push(`• ${row.name} — ${row.stock} @ ${row.price} (${row.trend})${boxLine}${alert}`);
  }
  return lines.join("\n");
}

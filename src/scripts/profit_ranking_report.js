#!/usr/bin/env node
/**
 * Profitability Ranking Engine (v3.6)
 *
 * - Lee logs/mass_extraction_report.json
 * - Normaliza precio a USD (Currency Oracle)
 * - Calcula ROI por venta con split 75/25 (usuario/plataforma)
 * - Imprime Top 10 global
 * - Exporta logs/profit_ranking.json
 */
const fs = require("fs");
const path = require("path");
const { convertToUSD } = require("../services/currency_service.js");

const REPO_ROOT = path.join(__dirname, "..", "..");
const INPUT_PATH = path.join(REPO_ROOT, "logs", "mass_extraction_report.json");
const OUTPUT_PATH = path.join(REPO_ROOT, "logs", "profit_ranking.json");

const USER_SHARE = 0.75;
const PLATFORM_SHARE = 0.25;

function parseCommissionPercent(value) {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const normalized = raw.replace(/,/g, ".").replace(/[^\d.\-]/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function extractRows(report) {
  const platforms = Array.isArray(report?.platforms) ? report.platforms : [];
  const out = [];
  for (const platformEntry of platforms) {
    const platform = String(platformEntry?.platform || "unknown");
    const rows = Array.isArray(platformEntry?.rows) ? platformEntry.rows : [];
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      if (row.item_ref == null) continue;
      const data = row.data && typeof row.data === "object" ? row.data : null;
      if (!data) continue;
      out.push({
        platform,
        item_ref: String(row.item_ref || ""),
        status: String(row.status || ""),
        data,
      });
    }
  }
  return out;
}

function pickProductName(row) {
  const d = row.data || {};
  return String(d.name || d.external_id || row.item_ref || "Producto");
}

async function buildRankingEntries(rows) {
  const entries = [];
  for (const row of rows) {
    const d = row.data || {};
    const currency = String(d.currency || "USD").toUpperCase();
    const price = safeNumber(d.price);
    const directUsd = safeNumber(d.price_usd);
    let priceUsd = directUsd;
    let currencySource = directUsd != null ? "adapter" : "oracle";

    if (priceUsd == null && price != null) {
      const converted = await convertToUSD(price, currency);
      priceUsd = safeNumber(converted.amount_usd);
      currencySource = converted.source || "oracle";
    }

    const commissionPct = parseCommissionPercent(d.commission_rate);
    if (priceUsd == null || commissionPct == null || commissionPct <= 0) {
      continue;
    }

    const grossCommissionUsd = Number((priceUsd * (commissionPct / 100)).toFixed(6));
    const userGainUsd = Number((grossCommissionUsd * USER_SHARE).toFixed(6));
    const fiferGainUsd = Number((grossCommissionUsd * PLATFORM_SHARE).toFixed(6));

    entries.push({
      platform: row.platform,
      product: pickProductName(row),
      external_id: String(d.external_id || row.item_ref || ""),
      price_usd: Number(priceUsd.toFixed(6)),
      commission_pct: commissionPct,
      gross_commission_usd: grossCommissionUsd,
      user_gain_usd: userGainUsd,
      fifer_gain_usd: fiferGainUsd,
      split: { user: USER_SHARE, fifer: PLATFORM_SHARE },
      currency_source: currencySource,
    });
  }
  return entries;
}

function printTop10Table(top10) {
  const table = top10.map((r) => ({
    Plataforma: r.platform,
    Producto: r.product.length > 40 ? `${r.product.slice(0, 37)}...` : r.product,
    "Precio USD": r.price_usd.toFixed(2),
    "Comisión %": r.commission_pct.toFixed(2),
    "Tu Ganancia USD": r.user_gain_usd.toFixed(4),
  }));
  console.table(table);
}

async function main() {
  if (!fs.existsSync(INPUT_PATH)) {
    throw new Error(`No existe el archivo de entrada: ${INPUT_PATH}`);
  }

  const report = JSON.parse(fs.readFileSync(INPUT_PATH, "utf8"));
  const rows = extractRows(report);
  const ranking = await buildRankingEntries(rows);
  ranking.sort((a, b) => b.user_gain_usd - a.user_gain_usd);
  const top10 = ranking.slice(0, 10);

  console.log("\n=== Profitability Ranking Engine — Top 10 Global ===\n");
  printTop10Table(top10);

  const payload = {
    generated_at: new Date().toISOString(),
    input_file: INPUT_PATH,
    totals: {
      input_rows: rows.length,
      ranked_rows: ranking.length,
      top_rows: top10.length,
    },
    assumptions: {
      split_user: USER_SHARE,
      split_fifer: PLATFORM_SHARE,
      metric: "user_gain_usd_per_sale",
    },
    top10,
    ranking,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2), "utf8");
  console.log(`\nReporte exportado en: ${OUTPUT_PATH}\n`);
}

main().catch((err) => {
  console.error("\nError en profit_ranking_report:", err?.message || err);
  process.exit(1);
});


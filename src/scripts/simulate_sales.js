#!/usr/bin/env node
/**
 * Sales Simulator — ventas ficticias para campañas publicadas (Financial Bunker).
 * Lógica compartida: `src/services/sales_simulation_core.js`
 *
 * Uso (raíz del monorepo):
 *   node src/scripts/simulate_sales.js
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const {
  simulateOnePublishedSale,
  getServiceSupabase,
} = require(path.join(__dirname, "../services/sales_simulation_core.js"));

async function run() {
  if (!getServiceSupabase()) {
    console.error("❌ SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorios.");
    process.exit(1);
  }

  const result = await simulateOnePublishedSale({ demoAuto: false });

  if (result.skipped && result.reason === "no_published_campaigns") {
    console.log("ℹ️ No hay campañas con status 'published'. Publica un borrador primero.");
    process.exit(0);
  }

  if (result.skipped && result.reason === "zero_commission") {
    console.log("ℹ️ Comisión bruta 0; abortando.");
    process.exit(0);
  }

  if (!result.ok) {
    console.error("❌", result.error || result.reason || "simulate_failed");
    process.exit(1);
  }

  console.log("✅ Venta simulada registrada");
  console.log(`   draft_id:     ${result.draft_id}`);
  console.log(`   user_id:      ${result.user_id}`);
  console.log(`   usuario 75%:  ${result.user_share} USD (wallet → ${Number(result.new_balance).toFixed(6)})`);
  console.log(`   plataforma:   ${result.platform_share} USD`);
}

run().catch((e) => {
  console.error("❌", e?.message || e);
  process.exit(1);
});

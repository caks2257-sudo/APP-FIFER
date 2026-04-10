/**
 * Live Demo Engine — ventas simuladas en segundo plano (solo DEMO_MODE=true).
 * Intervalo base: DEMO_SALES_INTERVAL (minutos) ± 30% jitter por ciclo.
 */
const path = require("path");
const { simulateOnePublishedSale } = require(path.join(__dirname, "../services/sales_simulation_core.js"));

let _timeoutId = null;
let _started = false;

function parseIntervalMinutes() {
  const raw = Number(process.env.DEMO_SALES_INTERVAL);
  if (Number.isFinite(raw) && raw > 0) return raw;
  return 5;
}

/** Próximo delay en ms con jitter ±30% respecto al intervalo base en minutos. */
function nextDelayMs() {
  const baseMs = parseIntervalMinutes() * 60 * 1000;
  const jitterFactor = 0.7 + Math.random() * 0.6;
  return Math.max(30_000, Math.round(baseMs * jitterFactor));
}

function scheduleNextTick() {
  if (!_started) return;
  const delay = nextDelayMs();
  _timeoutId = setTimeout(runCycle, delay);
  if (typeof _timeoutId.unref === "function") {
    _timeoutId.unref();
  }
}

async function runCycle() {
  if (!_started) return;
  try {
    const result = await simulateOnePublishedSale({ demoAuto: true });
    if (result.ok && result.draft_id) {
      console.log(`💰 [DEMO MODE] Venta automática generada para Draft: ${result.draft_id}`);
    } else if (result.skipped && result.reason === "no_published_campaigns") {
      console.log("ℹ️  [DEMO MODE] Sin campañas published; reintentando en el próximo ciclo.");
    } else if (!result.ok && result.error) {
      console.warn("⚠️  [DEMO MODE] simulate sale:", result.reason || result.error);
    }
  } catch (err) {
    console.warn("⚠️  [DEMO MODE] background_sales_worker:", err?.message || String(err));
  } finally {
    scheduleNextTick();
  }
}

/**
 * Arranca el worker recursivo (setTimeout + jitter). Idempotente.
 */
function startBackgroundSalesWorker() {
  if (_started) return;
  if (String(process.env.DEMO_MODE || "").trim() !== "true") {
    return;
  }

  _started = true;
  console.log(
    `🚀 [DEMO MODE] Live Demo Engine activo — ventas cada ~${parseIntervalMinutes()} min (±30% jitter).`
  );
  scheduleNextTick();
}

function stopBackgroundSalesWorker() {
  _started = false;
  if (_timeoutId) {
    clearTimeout(_timeoutId);
    _timeoutId = null;
  }
}

module.exports = {
  startBackgroundSalesWorker,
  stopBackgroundSalesWorker,
  nextDelayMs,
};

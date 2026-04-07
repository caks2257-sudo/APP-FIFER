/**
 * Self-Healing Boot Sequence (v2.6): env + vascular health_xray antes de tráfico.
 * CLI: `node src/system/boot_sequence.js` → exit 0|1
 */
const fs = require("fs");
const http = require("http");
const path = require("path");
const serviceNodes = require("../config/service_nodes.json");
const { runHealthXray, truthy } = require("./health_xray.js");

const REPO_ROOT = path.join(__dirname, "..", "..");
const ENV_PATH = path.join(REPO_ROOT, ".env");
const ENV_EXAMPLE_PATH = path.join(REPO_ROOT, ".env.example");
let _ghostServer = null;

/**
 * Si falta `.env`, intenta copiar desde `.env.example`.
 * @returns {{ created: boolean, error?: string }}
 */
function ensureEnvFile() {
  if (fs.existsSync(ENV_PATH)) {
    return { created: false };
  }
  if (!fs.existsSync(ENV_EXAMPLE_PATH)) {
    console.error(
      "❌ CRITICAL_BOOT_ERROR — Falta `.env` en la raíz del repo y no existe `.env.example` para generarlo."
    );
    console.error("   → Crea manualmente `.env` o añade `.env.example` con las claves mínimas.");
    return { created: false, error: "no_env_no_example" };
  }
  try {
    fs.copyFileSync(ENV_EXAMPLE_PATH, ENV_PATH);
    console.log("✅ Creado `.env` desde `.env.example`. Edita los valores antes de producción.");
    return { created: true };
  } catch (err) {
    console.error("❌ CRITICAL_BOOT_ERROR — No se pudo crear `.env`:", err.message || String(err));
    return { created: false, error: "copy_failed" };
  }
}

function loadRootEnv() {
  require("dotenv").config({ path: ENV_PATH });
}

function isGhostModeEnv() {
  return String(process.env.NODE_ENV || "").trim().toLowerCase() === "development";
}

function startGhostModeEmulator() {
  if (!isGhostModeEnv()) return;

  // Force AliExpress adapter mock path in development.
  process.env.FIFER_GHOST_MODE = "true";
  process.env.ALIEXPRESS_FORCE_MOCK = "true";

  if (_ghostServer) return;
  try {
    _ghostServer = http.createServer((req, res) => {
      const url = String(req.url || "");
      if (url.startsWith("/healthz")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, mode: "ghost" }));
        return;
      }
      if (url.startsWith("/mock/aliexpress")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            mode: "ghost",
            provider: "aliexpress",
            commission_rate: "10%",
          })
        );
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, mode: "ghost", note: "external APIs simulated" }));
    });
    _ghostServer.listen(3000, "127.0.0.1", () => {
      console.log("👻 MODO FANTASMA ACTIVO: Simulando APIs externas");
    });
    _ghostServer.on("error", (err) => {
      if (err && err.code === "EADDRINUSE") {
        console.warn("👻 Ghost emulator: puerto 3000 ya en uso; se reutiliza servidor existente.");
        return;
      }
      console.warn("👻 Ghost emulator error:", err?.message || String(err));
    });
  } catch (err) {
    console.warn("👻 Ghost emulator no pudo iniciar:", err?.message || String(err));
  }
}

/**
 * Paso A — variables críticas (ajustado si FEATURE_DRY_RUN).
 * @returns {{ ok: boolean, missing: string[], warnings: string[] }}
 */
function verifyEnvIntegrity() {
  const missing = [];
  const warnings = [];
  const dryRun = process.env.FEATURE_DRY_RUN === "true";

  const supabaseUrl = String(process.env.SUPABASE_URL || "").trim();
  if (!supabaseUrl) missing.push("SUPABASE_URL");

  const hasServiceRole = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const hasAnon = String(process.env.SUPABASE_ANON_KEY || "").trim();
  if (!hasServiceRole && !hasAnon) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY|SUPABASE_ANON_KEY");
  }

  const internalKey = String(process.env.FIFER_INTERNAL_KEY || "").trim();
  if (!internalKey && !dryRun) {
    missing.push("FIFER_INTERNAL_KEY");
  }

  const webhook = String(process.env.MAKE_WEBHOOK_URL || "").trim();
  if (!webhook && !dryRun) {
    missing.push("MAKE_WEBHOOK_URL");
  }
  if (!webhook && dryRun) {
    warnings.push("MAKE_WEBHOOK_URL ausente (aceptable en dry run; publicación/Make desactivada)");
  }

  return { ok: missing.length === 0, missing, warnings };
}

/** @param {object} report - output of runHealthXray */
function evaluateVascularCritical(report) {
  const critical = [];
  const checks = report?.checks || {};

  if (checks.job_store && !checks.job_store.ok) {
    critical.push("job_store");
  }

  const nodes = serviceNodes?.nodes || {};
  for (const [key, node] of Object.entries(nodes)) {
    const res = checks[key];
    if (!res) continue;
    const featureOn = node.enabled_env && truthy(process.env[node.enabled_env]);
    if (!featureOn) continue;
    if (res.ok || res.status === "skipped_feature_off") continue;
    critical.push(key);
  }

  return { critical };
}

/**
 * @param {{ context?: string, healthXrayOpts?: object, skipEnvFile?: boolean }} [options]
 */
async function runBootSequence(options = {}) {
  const context = options.context || "fifer";

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║  FIFER — Self-Healing Boot Sequence                      ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  if (!options.skipEnvFile) {
    const ensured = ensureEnvFile();
    if (ensured.error === "no_env_no_example") {
      return { ok: false, phase: "env_file", missing: [".env"] };
    }
    loadRootEnv();
    if (ensured.created) {
      loadRootEnv();
    }
  }

  startGhostModeEmulator();

  console.log("📋 Paso A — Integridad de variables de entorno…");
  const env = verifyEnvIntegrity();
  if (env.warnings.length) {
    env.warnings.forEach((w) => console.warn(`⚠️  ${w}`));
  }
  if (!env.ok) {
    console.error(
      "❌ CRITICAL_BOOT_ERROR — ENV_INTEGRITY",
      JSON.stringify({ missing: env.missing, context })
    );
    console.error("   → Define las claves faltantes en `.env` (raíz del repo).");
    return { ok: false, phase: "env", missing: env.missing };
  }
  console.log("✅ Paso A OK — variables críticas presentes.\n");

  console.log(
    "🔐 v2.9 Vault — POST /api/v1/master/orchestrate requiere JWT Supabase (Command Center). POST /automated-play sigue con X-FIFER-INTERNAL-KEY (ISC / bots).\n"
  );

  if (process.env.FEATURE_DRY_RUN === "true") {
    console.log("⚠️ MODO SIMULACRO ACTIVO - NO SE CONSUMIRÁN CRÉDITOS\n");
  }

  console.log("🔎 Paso B — Health X-Ray (nodos vasculares + job_store)…");
  const report = await runHealthXray(options.healthXrayOpts || {});
  const { critical } = evaluateVascularCritical(report);
  const dryRunFallback = process.env.FEATURE_DRY_RUN === "true";
  const degradedAllowed = process.env.SAFE_BOOT_DEGRADED === "true";

  if (critical.length > 0 && !dryRunFallback) {
    if (degradedAllowed) {
      console.warn(
        "⚠️  MODO DEGRADADO — Nodos vasculares en fallo pero SAFE_BOOT_DEGRADED=true; se continúa.",
        critical
      );
      console.log(
        `✅ Boot completado en modo degradado (overall: ${report.overall}).\n`
      );
      return { ok: true, report, critical, degradedBoot: true };
    }
    console.error(
      "❌ CRITICAL_BOOT_ERROR — VASCULAR",
      JSON.stringify({
        nodes: critical,
        overall: report.overall,
        context,
      })
    );
    console.error(
      "   → Activa nodos, desactiva flags FEATURE_* innecesarios, usa FEATURE_DRY_RUN=true o SAFE_BOOT_DEGRADED=true (solo si asumes el riesgo)."
    );
    return { ok: false, phase: "vascular", report, critical };
  }

  if (critical.length > 0 && dryRunFallback) {
    console.warn(
      "⚠️  Nodos vasculares con fallo; se tolera por FEATURE_DRY_RUN (mocks).",
      critical
    );
  }

  console.log(
    `✅ Paso B OK — overall: ${report.overall}${report.degraded ? " (degradado por latencia)" : ""}\n`
  );

  console.log("🔗 Paso C — Final Bridge (FEATURE_AUTO_PROCESS → Master API)…");
  try {
    const bridgePath = path.join(__dirname, "../modules/affiliates/bridge_hook.js");
    const { probeMasterBridgeReadiness } = require(bridgePath);
    const fb = await probeMasterBridgeReadiness();
    if (fb.skipped) {
      console.log(`↷ ${fb.detail || "Sin comprobación de bridge."}\n`);
    } else if (!fb.ok) {
      console.warn(
        `⚠️ Final Bridge: ${fb.detail || "Master no alcanzable"} — el sync AliExpress seguirá; revisa MASTER_API_BASE_URL y el system-api.\n`
      );
    } else {
      console.log(`✅ ${fb.detail || "Final Bridge listo."}\n`);
    }
  } catch (err) {
    console.warn(
      "⚠️ Final Bridge: no se pudo ejecutar probe (no bloquea el boot):",
      err?.message || String(err),
      "\n"
    );
  }

  console.log("✅ 🎉 Safe Boot completado correctamente.\n");

  if (options.startJanitor === true) {
    try {
      const { startJanitor } = require("./cron_janitor.js");
      startJanitor();
    } catch (err) {
      console.warn(
        "⚠️ Cron Janitor no pudo iniciarse (no bloquea boot):",
        err?.message || String(err)
      );
    }
  }

  if (options.startInventoryGuardian === true || options.startJanitor === true) {
    try {
      const { startInventoryGuardian } = require("./inventory_guardian.js");
      startInventoryGuardian();
    } catch (err) {
      console.warn(
        "⚠️ Inventory Guardian no pudo iniciarse (no bloquea boot):",
        err?.message || String(err)
      );
    }
  }

  return { ok: true, report };
}

/** Alias explícito para integraciones (`boot_sequence.run()`). */
const run = runBootSequence;

if (require.main === module) {
  loadRootEnv();
  const pre = ensureEnvFile();
  if (pre.error === "no_env_no_example") {
    process.exit(1);
  }
  if (pre.created) {
    loadRootEnv();
  }
  runBootSequence({ context: "cli" })
    .then((r) => {
      process.exit(r.ok ? 0 : 1);
    })
    .catch((err) => {
      console.error("❌ CRITICAL_BOOT_ERROR — UNHANDLED", err?.message || String(err));
      process.exit(1);
    });
}

module.exports = {
  run,
  runBootSequence,
  verifyEnvIntegrity,
  evaluateVascularCritical,
  ensureEnvFile,
  loadRootEnv,
};

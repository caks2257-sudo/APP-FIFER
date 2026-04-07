/**
 * Punto de entrada raíz: carga entorno, asegura `.env`, ejecuta Self-Healing Boot.
 * Uso: `node src/server.js` (validación) o encadenado en `npm run dev:safe`.
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const {
  run,
  ensureEnvFile,
  loadRootEnv,
} = require("./system/boot_sequence.js");

(async () => {
  console.log("🚀 FIFER — src/server.js (pre-flight)\n");

  const ensured = ensureEnvFile();
  if (ensured.error === "no_env_no_example") {
    process.exit(1);
  }
  loadRootEnv();
  if (ensured.created) {
    loadRootEnv();
  }

  const boot = await run({ context: "src/server.js", skipEnvFile: true });

  if (!boot.ok) {
    console.error("❌ Boot fallido — no se continúa con el arranque de servicios.");
    process.exit(1);
  }
  if (boot.degradedBoot) {
    console.warn(
      "⚠️ Boot en modo degradado (nodos vasculares); revisa conectividad antes de producción."
    );
  }

  console.log(
    "✅ Pre-flight OK. Siguiente: `npm run dev:safe` (raíz) o `npm run dev:all` en fifer-landing/temp-frontend.\n"
  );
  process.exit(0);
})().catch((err) => {
  console.error("❌ CRITICAL_BOOT_ERROR", err?.message || String(err));
  process.exit(1);
});

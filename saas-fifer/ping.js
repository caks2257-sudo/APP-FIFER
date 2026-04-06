const config = require('./config');

console.log("========================================");
console.log("🚀 FIFER CONFIGURATION PING TEST");
console.log("========================================");

// Verifica la conexión con el .env a través del config
console.log("📦 DATABASE (Supabase):", config.db.supabase.url ? "✅ Configurado" : "❌ Falta URL");
console.log("🧠 AI (Gemini):", config.ai.gemini ? "✅ Listo para pensar" : "❌ Falta Key");

// Verifica un par de afiliados para estar seguros
console.log("🤝 CLICKBANK:", config.affiliates.clickbank.dev ? "✅ Vinculado" : "⚠️ Pendiente");
console.log("🤝 SHAREASALE:", config.affiliates.shareasale.id ? "✅ Vinculado" : "⚠️ Pendiente");

console.log("========================================");
console.log("Si ves los '✅', significa que tu arquitectura centralizada");
console.log("está leyendo correctamente el archivo .env de la raíz.");
console.log("========================================");
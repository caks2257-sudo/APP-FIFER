const { preguntarAFifer } = require('../services/aiService');
const supabase = require('../services/dbService');

async function iniciarPrueba() {
    console.log("🤖 FIFER está pensando en un producto para tu nicho...");
    
    const miPrompt = "Sugiere un nombre creativo y una descripción corta para un nuevo software SaaS que ayude a administrar ligas de fútbol usando IA. Formato: Nombre - Descripción";
    
    const respuestaIA = await preguntarAFifer(miPrompt);
    
    if (respuestaIA) {
        console.log("\n✨ Propuesta de la IA:");
        console.log(respuestaIA);
        console.log("\n✅ Conexión con Gemini: OK");
    }

    // Prueba rápida de Supabase
    const { data, error } = await supabase.from('_test_fifer').select('*').limit(1);
    // (No importa si falla porque la tabla no existe, lo que importa es que el cliente se inicie)
    console.log("📦 Conexión con Supabase: Iniciada");
}

iniciarPrueba();
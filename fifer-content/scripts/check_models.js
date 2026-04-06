const path = require('path');
const dotenv = require('dotenv');

// Carga el .env
const envPath = path.join(__dirname, '..', '..', '.env');
dotenv.config({ path: envPath });

const key = process.env.GOOGLE_AI_KEY;

if (!key) {
    console.error("❌ No se encontró GOOGLE_AI_KEY en el .env");
    process.exit(1);
}

async function escanearModelos() {
    console.log("🔍 Escaneando catálogo de Google AI Studio con tu Master Key...");
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    
    try {
        const respuesta = await fetch(url);
        const data = await respuesta.json();
        
        if (data.error) {
            console.error("❌ Error de API de Google:", data.error.message);
            return;
        }
        
        console.log("\n✅ MODELOS DISPONIBLES (Que soportan generación de texto):");
        console.log("---------------------------------------------------------");
        
        const generativos = data.models.filter(m => 
            m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")
        );
        
        generativos.forEach(m => {
            console.log(`👉 ${m.name.replace('models/', '')}`);
        });
        
        console.log("---------------------------------------------------------");
        console.log("💡 El nombre exacto que debes usar en main_generator.js es uno de los de arriba.");
        
    } catch (e) {
        console.error("❌ Error de conexión:", e.message);
    }
}

escanearModelos();
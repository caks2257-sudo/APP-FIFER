const dotenv = require('dotenv');
const path = require('path');

// Cargar el .env
dotenv.config();

async function scanModels() {
    const apiKey = process.env.GOOGLE_AI_KEY;
    if (!apiKey) {
        console.error("❌ No hay API KEY en el .env");
        return;
    }

    console.log("🔍 Escaneando modelos disponibles para tu cuenta...");
    
    // Probamos con la ruta estable v1
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("❌ Error de la API:", data.error.message);
            return;
        }

        console.log("\n✅ MODELOS ENCONTRADOS:");
        data.models.forEach(m => {
            console.log(`- ${m.name.replace('models/', '')} (${m.displayName})`);
        });
        
        console.log("\n💡 Copia el nombre exacto de la lista de arriba (ej: gemini-1.5-flash) y úsalo en tu script.");

    } catch (err) {
        console.error("❌ Error en la conexión:", err.message);
    }
}

scanModels();
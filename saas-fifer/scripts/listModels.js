const { GoogleGenerativeAI } = require("@google/generative-ai");
const config = require('../config');

async function verModelos() {
    try {
        const genAI = new GoogleGenerativeAI(config.ai.gemini);
        // Intentamos listar los modelos disponibles
        console.log("🔍 Consultando modelos disponibles en tu cuenta...");
        
        // Nota: En algunas versiones del SDK esto puede variar, 
        // pero intentaremos la llamada directa a la API si es necesario.
        console.log("Prueba cambiando el nombre del modelo en aiService.js por uno de estos si el test falla:");
        console.log("- gemini-1.5-flash-latest");
        console.log("- gemini-2.0-flash (Probable en 2026)");
        console.log("- gemini-pro");
        
    } catch (e) {
        console.error("Error:", e.message);
    }
}
verModelos();
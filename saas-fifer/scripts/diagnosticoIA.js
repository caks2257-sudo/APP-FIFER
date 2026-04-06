const config = require('../config');

async function listarModelos() {
    console.log("🔍 Consultando modelos disponibles para tu API Key...");
    
    // Probamos con la versión v1beta y v1 por si acaso
    const urls = [
        `https://generativelanguage.googleapis.com/v1beta/models?key=${config.ai.gemini}`,
        `https://generativelanguage.googleapis.com/v1/models?key=${config.ai.gemini}`
    ];

    for (const url of urls) {
        try {
            console.log(`\n📡 Probando endpoint: ${url.split('?')[0]}`);
            const response = await fetch(url);
            const data = await response.json();

            if (data.models) {
                console.log("✅ MODELOS ENCONTRADOS:");
                data.models.forEach(m => {
                    const name = m.name.replace('models/', '');
                    if (m.supportedGenerationMethods.includes('generateContent')) {
                        console.log(`   - ${name} (LISTO PARA USAR)`);
                    }
                });
                return; // Si encontramos modelos, terminamos
            } else if (data.error) {
                console.log(`❌ Error de Google: ${data.error.message}`);
            }
        } catch (error) {
            console.error("❌ Error de red:", error.message);
        }
    }
}

listarModelos();
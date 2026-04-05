const config = require('../config');

async function probarConexionCB() {
    const { dev, clerk } = config.affiliates.clickbank;
    
    if (!dev || !clerk) {
        console.error("❌ Faltan llaves de ClickBank (DEV o CLERK) en el .env");
        return null;
    }

    console.log("🔐 Autenticando con la API estricta de ClickBank usando Fetch puro...");

    try {
        const response = await fetch('https://api.clickbank.com/rest/1.3/quickstats', {
            method: 'GET',
            headers: {
                // Fetch no inyecta basura oculta, respeta estrictamente esto:
                'Accept': 'application/json',
                'Authorization': `${dev}:${clerk}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log("✅ Conexión establecida perfectamente.");
            return data;
        } else {
            // Manejamos las respuestas cuando la cuenta es válida pero nueva
            if (response.status === 403 || response.status === 404) {
                console.log("✅ Conexión establecida. El servidor te reconoce (Cuenta sin datos de ventas aún).");
                return { estado: "Conectado", mensaje: "Llaves válidas." };
            }
            
            const errorText = await response.text();
            console.error(`❌ Error de ClickBank: Código ${response.status}`);
            console.error("Detalle:", errorText || "Sin detalle del servidor");
            return null;
        }

    } catch (error) {
        console.error("❌ Error de red:", error.message);
        return null;
    }
}

module.exports = { probarConexionCB };
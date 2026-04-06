const { obtenerComerciantes } = require('../services/shareasaleService');

async function probarConexion() {
    console.log("📡 Golpeando la puerta del servidor de ShareASale...");
    const data = await obtenerComerciantes();
    
    if (data) {
        console.log("✅ ¡Respuesta recibida!");
        // Mostramos solo un pedacito para no inundar tu terminal
        console.log("📊 Muestra de datos:", JSON.stringify(data).substring(0, 500) + "...\n");
    } else {
        console.log("\n⚠️ Hubo un problema. Si tus llaves están correctas, es posible que tu cuenta siga en estado de 'Revisión'.");
    }
}

probarConexion();
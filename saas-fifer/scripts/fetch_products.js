require('dotenv').config({ override: true });
const axios = require('axios');

// Fase 1: Conseguir la llave temporal
async function obtenerToken() {
    const cid = process.env.ADMITAD_CLIENT_ID ? process.env.ADMITAD_CLIENT_ID.trim() : "";
    const secret = process.env.ADMITAD_CLIENT_SECRET ? process.env.ADMITAD_CLIENT_SECRET.trim() : "";

    const auth = Buffer.from(`${cid}:${secret}`).toString('base64');
    const payload = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: cid,
        // 🛠️ ARREGLO: Permiso ampliado para acceder a las campañas (advcampaigns)
        scope: 'advcampaigns public_data' 
    }).toString();

    try {
        const response = await axios.post('https://api.admitad.com/token/', payload, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        return response.data.access_token;
    } catch (error) {
        console.error("❌ Fallo crítico al obtener el Token.");
        throw error;
    }
}

// Fase 2: Extraer la información
async function extraerCatalogo() {
    console.log("🚀 Iniciando Secuencia de Extracción FIFER...");
    
    try {
        const token = await obtenerToken();
        console.log(`🔑 Token asegurado. Conectando con la bodega de Admitad...\n`);

        // Llamamos al endpoint de "Campañas Publicitarias" (Marcas)
        // limit=5 trae solo los 5 primeros resultados para no saturar la terminal
        const response = await axios.get('https://api.admitad.com/advcampaigns/?limit=5&language=es', {
            headers: {
                'Authorization': `Bearer ${token}` // Así se usa la llave para entrar
            }
        });

        const campañas = response.data.results;

        console.log("📦 --- DATOS EXTRAÍDOS --- 📦");
        campañas.forEach((campaña, index) => {
            console.log(`\n${index + 1}. Marca: ${campaña.name}`);
            console.log(`   Categoría: ${campaña.categories[0]?.name || 'Variada'}`);
            console.log(`   Sitio Web: ${campaña.site_url}`);
            console.log(`   Estado: ${campaña.connection_status}`);
        });
        console.log("\n✅ Extracción completada con éxito.");

    } catch (error) {
        console.error("❌ Error durante la extracción:");
        console.error(error.response ? error.response.data : error.message);
    }
}

// Encender la máquina
extraerCatalogo();
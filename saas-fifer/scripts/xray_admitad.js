require('dotenv').config({ override: true });
const axios = require('axios');

async function obtenerToken() {
    const cid = process.env.ADMITAD_CLIENT_ID ? process.env.ADMITAD_CLIENT_ID.trim() : "";
    const secret = process.env.ADMITAD_CLIENT_SECRET ? process.env.ADMITAD_CLIENT_SECRET.trim() : "";

    const auth = Buffer.from(`${cid}:${secret}`).toString('base64');
    const payload = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: cid,
        // Añadimos el scope 'coupons' y 'websites' para ver si podemos raspar más data
        scope: 'advcampaigns public_data coupons websites' 
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
        console.error("❌ Fallo al obtener el Token.");
        return null;
    }
}

async function rayosXAdmitad() {
    console.log("🔍 Iniciando Escaneo de Rayos X en la API de Admitad...\n");
    const token = await obtenerToken();
    
    if (!token) return;

    try {
        // Pedimos solo 1 resultado, pero queremos TODOS sus detalles
        const response = await axios.get('https://api.admitad.com/advcampaigns/?limit=1&language=es', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const dataCruda = response.data.results[0];

        console.log("==========================================");
        console.log("💀 RADIOGRAFÍA COMPLETA DEL OBJETO ADMITAD");
        console.log("==========================================\n");
        
        // Esto imprimirá el objeto completo con toda su estructura anidada
        console.log(JSON.stringify(dataCruda, null, 2));
        
        console.log("\n==========================================");
        console.log(`📊 Total de variables disponibles: ${Object.keys(dataCruda).length}`);

    } catch (error) {
        console.error("❌ Error en el escaneo:");
        console.error(error.response ? error.response.data : error.message);
    }
}

rayosXAdmitad();
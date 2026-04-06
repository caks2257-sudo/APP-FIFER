require('dotenv').config({ override: true });
const axios = require('axios');

async function obtenerToken() {
    const cid = process.env.ADMITAD_CLIENT_ID.trim();
    const secret = process.env.ADMITAD_CLIENT_SECRET.trim();
    const auth = Buffer.from(`${cid}:${secret}`).toString('base64');
    
    const payload = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: cid,
        // Agregamos el scope para productos
        scope: 'advcampaigns public_data' 
    }).toString();

    try {
        const response = await axios.post('https://api.admitad.com/token/', payload, {
            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        return response.data.access_token;
    } catch (error) {
        console.error("❌ Fallo crítico al obtener el Token.");
        return null;
    }
}

async function xrayProductos() {
    console.log("🔍 Iniciando Rayos X en el Catálogo de PRODUCTOS de Admitad...\n");
    const token = await obtenerToken();
    if (!token) return;

    try {
        // Buscamos 1 solo producto del catálogo global de Admitad
        const response = await axios.get('https://api.admitad.com/products/?limit=1', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.data.results && response.data.results.length > 0) {
            const dataCruda = response.data.results[0];
            console.log("==========================================");
            console.log("💀 RADIOGRAFÍA DE UN PRODUCTO INDIVIDUAL");
            console.log("==========================================\n");
            console.log(JSON.stringify(dataCruda, null, 2));
            console.log("\n==========================================");
            console.log(`📊 Total de variables disponibles: ${Object.keys(dataCruda).length}`);
        } else {
            console.log("⚠️ Admitad respondió correctamente, pero el catálogo parece estar vacío o requiere estar unido a una campaña primero.");
            console.log(response.data);
        }

    } catch (error) {
        console.error("❌ Error en el escaneo de productos:");
        console.error(error.response ? error.response.data : error.message);
    }
}

xrayProductos();
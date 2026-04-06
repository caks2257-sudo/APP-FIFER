const axios = require('axios');
const fs = require('fs');

// 🔴 LLAVES INYECTADAS DIRECTAMENTE (BYPASS)
const MI_CLIENT_ID = "ohxce373AvTCJQLJU2HWW8mSPSXUul"; 
const MI_CLIENT_SECRET = "mdQEUNl9SNrJAl0oJwMiSGS4CN3EMw";

async function run() {
    console.log("🚀 Iniciando Extracción de Categorías con llaves directas...");
    
    try {
        // Encriptación base64 nativa de Node.js
        const auth = Buffer.from(`${MI_CLIENT_ID}:${MI_CLIENT_SECRET}`).toString('base64');
        
        // Formato estricto para Admitad
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', MI_CLIENT_ID); 
        params.append('scope', 'public_data advcampaigns');

        console.log("🔑 Solicitando Token...");

        const tokenRes = await axios.post('https://api.admitad.com/token/', params, {
            headers: { 
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        const token = tokenRes.data.access_token;
        console.log("✅ Token obtenido. Descargando mapa...");

        const res = await axios.get('https://api.admitad.com/categories/?limit=500&language=es', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const categorias = res.data.results.map(c => ({
            id: c.id,
            name: c.name,
            parent_id: c.parent ? c.parent.id : null
        }));

        if (!fs.existsSync('./data')) fs.mkdirSync('./data');
        fs.writeFileSync('./data/mapa_categories.json', JSON.stringify(categorias, null, 2));

        console.log("\n🎊 ¡LOGRADO! 🎊");
        console.table(categorias.slice(0, 10));

    } catch (e) {
        console.error("❌ Fallo crítico:");
        console.error(e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
    }
}

run();
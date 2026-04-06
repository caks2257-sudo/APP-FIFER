require('dotenv').config({ override: true });
const axios = require('axios');
const fs = require('fs');

async function obtenerToken() {
    // ⚠️ REEMPLAZA ESTO DIRECTAMENTE CON TUS LLAVES (SIN USAR process.env)
    const cid = "AQUÍ_PEGA_TU_CLIENT_ID"; 
    const secret = "AQUÍ_PEGA_TU_CLIENT_SECRET";
    
    console.log(`🔑 Usando ID: ${cid.substring(0, 5)}...`);
    
    const auth = Buffer.from(`${cid}:${secret}`).toString('base64');
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('scope', 'public_data advcampaigns');

    const response = await axios.post('https://api.admitad.com/token/', params, {
        headers: { 
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });
    return response.data.access_token;
}

async function descargarMapa() {
    console.log("🗺️  Conectando a Admitad para bajar el mapa de categorías...");
    try {
        const token = await obtenerToken();
        
        // Traemos las primeras 500 categorías (suele haber unas 200-300)
        const res = await axios.get('https://api.admitad.com/categories/?limit=500&language=es', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const categorias = res.data.results.map(c => ({
            id: c.id,
            name: c.name,
            parent_id: c.parent ? c.parent.id : null
        }));

        // Crear carpeta data si no existe (como un buen arquitecto, preparamos el sitio)
        if (!fs.existsSync('./data')) fs.mkdirSync('./data');
        
        fs.writeFileSync('./data/mapa_categories.json', JSON.stringify(categorias, null, 2));
        
        console.log("\n✅ MAPA DESCARGADO CON ÉXITO");
        console.table(categorias.slice(0, 15)); // Muestra las primeras 15 para confirmar
        console.log(`\n💾 Total: ${categorias.length} categorías guardadas en /data/mapa_categories.json`);

    } catch (e) {
        console.error("❌ Error en la descarga:", e.response ? e.response.data : e.message);
    }
}

descargarMapa();
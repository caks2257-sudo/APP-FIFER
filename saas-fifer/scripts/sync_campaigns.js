require('dotenv').config({ override: true });
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 🎯 Tu lista de búsqueda específica
const MIS_MARCAS = ["AliExpress", "Alibaba", "Govee", "Geekbuying", "Gshopper", "Cotosen", "Harfington", "Noracora", "Stylewe", "Wayrates", "Часы Молния"];

async function obtenerToken() {
    const auth = Buffer.from(`${process.env.ADMITAD_CLIENT_ID.trim()}:${process.env.ADMITAD_CLIENT_SECRET.trim()}`).toString('base64');
    const response = await axios.post('https://api.admitad.com/token/', 'grant_type=client_credentials&scope=advcampaigns public_data', {
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data.access_token;
}

async function forzarSincronizacion() {
    console.log("🎯 Buscando tus marcas específicas en Admitad...");
    const token = await obtenerToken();

    for (const marca of MIS_MARCAS) {
        try {
            const res = await axios.get(`https://api.admitad.com/advcampaigns/?name=${encodeURIComponent(marca)}&language=es`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.data.results.length > 0) {
                const camp = res.data.results[0];
                const datos = {
                    network: 'Admitad',
                    campaign_id: camp.id,
                    name: camp.name,
                    status: camp.status,
                    site_url: camp.site_url,
                    image_url: camp.image,
                    commission_size: camp.actions?.[0]?.payment_size || 'Consultar'
                };

                const { error } = await supabase.from('campaigns').upsert(datos, { onConflict: 'campaign_id' });
                if (!error) console.log(`✅ ¡Encontrada y Guardada!: ${camp.name} (ID: ${camp.id})`);
            } else {
                console.log(`⚠️ No se encontró "${marca}" en tus campañas activas.`);
            }
        } catch (e) { console.error(`❌ Error con ${marca}`); }
    }
    console.log("\n🏁 Proceso terminado. Ahora las marcas principales están en Supabase.");
}

forzarSincronizacion();
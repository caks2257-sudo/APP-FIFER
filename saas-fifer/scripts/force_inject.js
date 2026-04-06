require('dotenv').config({ override: true });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const CAMPAÑAS_FALTANTES = [
    { name: 'AliExpress', id: 10, feed_id: 14107 }, // ID 10 es el estándar de AliExpress
    { name: 'Alibaba', id: 21444, feed_id: 17675 },
    { name: 'Govee', id: 25066, feed_id: 25757 },
    { name: 'Cotosen', id: 24921, feed_id: 24921 },
    { name: 'Geekbuying', id: 14271, feed_id: 15502 }
];

async function inyectar() {
    console.log("💉 Inyectando campañas faltantes en la base de datos...");

    for (const c of CAMPAÑAS_FALTANTES) {
        const { error } = await supabase.from('campaigns').upsert({
            network: 'Admitad',
            campaign_id: c.id, // ID interno de Admitad
            name: c.name,
            status: 'active'
        }, { onConflict: 'campaign_id' });

        if (error) console.error(`❌ Error con ${c.name}:`, error.message);
        else console.log(`✅ ${c.name} ahora es reconocida por la bodega.`);
    }
    console.log("\n🏁 ¡Listo! Ahora vuelve a ejecutar mass_sync.js");
}

inyectar();
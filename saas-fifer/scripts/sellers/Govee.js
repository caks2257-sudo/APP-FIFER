// scripts/sellers/aliexpress.js
const axios = require('axios');
const csv = require('csv-parser');

async function sync(supabase, config, helpers) {
    const { url, name, limit } = config;
    const { obtenerCategoriaRaiz } = helpers;

    console.log(`🚢 [${name}] Iniciando extracción...`);

    let guardados = 0;
    let batch = [];
    let haTerminado = false;

    // Buscamos la campaña en Supabase
    let { data: campaign } = await supabase.from('campaigns').select('id').ilike('name', `%${name}%`).maybeSingle();
    if (!campaign) throw new Error(`Campaña ${name} no encontrada.`);

    const response = await axios({ method: 'get', url, responseType: 'stream' });

    return new Promise((resolve, reject) => {
        const stream = response.data.pipe(csv({ separator: ';' }));

        stream.on('data', async (row) => {
            if (guardados >= limit || haTerminado) return;

            // Lógica específica para AliExpress (Fallback de descripción)
            const desc = row.description || row.title || row.name || 'Sin descripción';
            const catId = row.categoryId || row.category_id;
            const mainCat = obtenerCategoriaRaiz(catId) || 'General';

            batch.push({
                campaign_id: campaign.id,
                product_id: row.id || row.productId,
                name: row.name || row.title,
                description: desc,
                price: parseFloat(row.price) || 0,
                image_url: row.picture || row.image,
                product_url: row.url,
                affiliate_url: row.url,
                category: mainCat
            });

            if (batch.length >= 50) {
                stream.pause();
                const toInsert = [...batch];
                batch = [];
                const { error } = await supabase.from('products').upsert(toInsert, { onConflict: 'product_id' });
                if (!error) guardados += toInsert.length;
                
                if (guardados >= limit) {
                    haTerminado = true;
                    response.data.destroy();
                    resolve(guardados);
                }
                stream.resume();
            }
        });

        stream.on('end', async () => {
            if (!haTerminado) {
                if (batch.length > 0) await supabase.from('products').upsert(batch, { onConflict: 'product_id' });
                resolve(guardados + batch.length);
            }
        });

        stream.on('error', (err) => reject(err));
    });
}

module.exports = { sync };
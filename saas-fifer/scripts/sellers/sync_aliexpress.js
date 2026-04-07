const axios = require('axios');
const csv = require('csv-parser');
const path = require('path');
const { maybeSyncTagsAfterAliexpressBatch } = require('../adapters/tagCenterAliexpressAdapter');
const { triggerMasterAfterProductUpsert } = require(path.join(
    __dirname,
    '..',
    '..',
    '..',
    'src',
    'modules',
    'affiliates',
    'bridge_hook'
));

function scheduleAutoProcessAfterUpsert(toInsert) {
    if (process.env.FEATURE_AUTO_PROCESS !== 'true') return;
    setImmediate(() => {
        triggerMasterAfterProductUpsert(toInsert, { source: 'aliexpress' })
            .then((r) => {
                if (!r.ok && !r.skipped) {
                    console.warn('[BRIDGE_HOOK] Master processing no OK (sync continúa):', r.error || r.body || r);
                }
            })
            .catch((e) => console.error('[BRIDGE_HOOK]', e.message || e));
    });
}

// 🔐 Configuración Privada del Seller
const CONFIG = {
    name: 'AliExpress',
    url: 'https://export.admitad.com/en/webmaster/websites/2929847/products/export_adv_products/?template=78215&user=cristobal_kupfer1d485&code=jkr8eosa60&feed_id=15830',
    separator: ';' 
};

async function sync(supabase, options, helpers) {
    const { limit } = options;
    const { obtenerCategoriaRaiz } = helpers;

    console.log(`🚢 [${CONFIG.name}] Gatillado. Extrayendo desde Template 78215...`);

    let guardados = 0;
    let batch = [];
    let haTerminado = false;

    // Obtener Campaña
    let { data: campaign } = await supabase.from('campaigns').select('id').ilike('name', `%${CONFIG.name}%`).maybeSingle();
    if (!campaign) throw new Error(`Campaña ${CONFIG.name} no existe.`);

    const response = await axios({ method: 'get', url: CONFIG.url, responseType: 'stream' });

    return new Promise((resolve, reject) => {
        const stream = response.data.pipe(csv({ separator: CONFIG.separator }));

        stream.on('data', async (row) => {
            if (guardados >= limit || haTerminado) return;

            // --- TRANSFORMACIÓN DE DATOS (ESPECÍFICA PARA TU CSV DETECTADO) ---
            
            // 1. Manejo de Categoría: 
            // Tu CSV trae 'category' como texto (ej: "Deportes > Fútbol").
            // Intentamos buscar por ID primero, si no, limpiamos el texto.
            const catId = row.categoryId || row.category_id;
            let finalCategory = obtenerCategoriaRaiz(catId);

            if (!finalCategory && row.category) {
                // Si no hay ID, limpiamos el texto: "Ropa > Camisetas" -> "Ropa"
                finalCategory = row.category.split('>')[0].split('/')[0].trim();
            }

            // 2. Manejo de Identificador
            const productId = row.id || row.productId || Date.now().toString();

            // 3. Manejo de Nombre y Descripción
            // En AliExpress, el 'name' es el título largo. Lo usamos para ambos campos.
            const rawTitle = row.name || row.title || 'Producto AliExpress';

            batch.push({
                campaign_id: campaign.id,
                product_id: productId,
                name: rawTitle,
                description: rawTitle, // Usamos el título largo como descripción para alimentar a la IA
                price: parseFloat(row.price) || 0,
                image_url: row.picture || row.image,
                product_url: row.url,
                affiliate_url: row.url,
                category: finalCategory || 'General'
            });

            if (batch.length >= 50) {
                stream.pause();
                const toInsert = [...batch];
                batch = [];
                const { error } = await supabase.from('products').upsert(toInsert, { onConflict: 'product_id' });
                if (!error) {
                    guardados += toInsert.length;
                    try {
                        await maybeSyncTagsAfterAliexpressBatch(supabase, toInsert);
                    } catch (e) {
                        console.error(`[TAG_CENTER] batch sidecar: ${e.message || e}`);
                    }
                    scheduleAutoProcessAfterUpsert(toInsert);
                }

                process.stdout.write(`📦 [${CONFIG.name}] ${guardados}/${limit} items... \r`);

                if (guardados >= limit) {
                    haTerminado = true;
                    response.data.destroy();
                    console.log(`\n✅ [${CONFIG.name}] Cuota completada.`);
                    resolve(guardados);
                }
                stream.resume();
            }
        });

        stream.on('end', async () => {
            if (haTerminado) return;
            if (batch.length > 0) {
                const toInsert = [...batch];
                batch = [];
                const { error } = await supabase.from('products').upsert(toInsert, { onConflict: 'product_id' });
                if (!error) {
                    guardados += toInsert.length;
                    try {
                        await maybeSyncTagsAfterAliexpressBatch(supabase, toInsert);
                    } catch (e) {
                        console.error(`[TAG_CENTER] batch sidecar: ${e.message || e}`);
                    }
                    scheduleAutoProcessAfterUpsert(toInsert);
                }
            }
            resolve(guardados);
        });
        stream.on('error', (err) => reject(err));
    });
}

module.exports = { sync };
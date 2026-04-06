require('dotenv').config({ override: true });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Importamos solo al especialista de AliExpress
const aliexpress = require('./sellers/sync_aliexpress');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Cargar helpers mínimos para la prueba
const diccionarioCategorias = JSON.parse(fs.readFileSync('./data/mapa_categories.json', 'utf-8'));
const helpers = {
    obtenerCategoriaRaiz: (idStr) => {
        let id = parseInt(idStr);
        if (!id || !diccionarioCategorias[id]) return null;
        let actual = diccionarioCategorias[id];
        while (actual.parent_id && diccionarioCategorias[actual.parent_id]) {
            actual = diccionarioCategorias[actual.parent_id];
        }
        return actual.name;
    }
};

async function test() {
    console.log("🔍 MODO TEST: Sincronizando solo AliExpress...");
    console.log("-------------------------------------------");

    try {
        // Ejecutamos con un límite bajo (ej. 100) para una prueba rápida
        const total = await aliexpress.sync(supabase, { limit: 100 }, helpers);
        
        console.log("\n-------------------------------------------");
        console.log(`✅ TEST FINALIZADO: Se inyectaron ${total} productos.`);
        console.log("Revisa tu tabla 'products' en Supabase para ver los resultados.");
    } catch (error) {
        console.error("\n❌ EL TEST FALLÓ:", error.message);
    }
}

test();
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
const supabase = require('../../shared/supabase');

// Carga blindada del .env desde la raíz de fifer-ingestor
const envPath = path.join(__dirname, '..', '..', '.env');
dotenv.config({ path: envPath });

// Importamos los especialistas
const aliexpress = require('./sellers/sync_aliexpress');
// const govee = require('./sellers/sync_govee');

function assertEnvReady() {
    // Validamos que haya al menos una configuración de API disponible.
    const admitadVars = ['ADMITAD_FEED_URL', 'ADMITAD_API_KEY', 'ADMITAD_CLIENT_ID', 'ADMITAD_CLIENT_SECRET'];
    const aliExpressVars = ['ALIEXPRESS_FEED_URL', 'ALIEXPRESS_APP_KEY', 'ALIEXPRESS_APP_SECRET'];

    const admitadFound = admitadVars.filter((k) => Boolean(process.env[k]));
    const aliExpressFound = aliExpressVars.filter((k) => Boolean(process.env[k]));

    if (admitadFound.length === 0 && aliExpressFound.length === 0) {
        console.error('❌ ERROR: No se detectaron variables de API para Admitad/AliExpress.');
        console.error(`Define al menos una de: ${[...admitadVars, ...aliExpressVars].join(', ')}`);
        process.exit(1);
    }

    console.log('✅ Entorno validado correctamente.');
    if (admitadFound.length > 0) console.log(`- Admitad vars detectadas: ${admitadFound.join(', ')}`);
    if (aliExpressFound.length > 0) console.log(`- AliExpress vars detectadas: ${aliExpressFound.join(', ')}`);
}

assertEnvReady();

// --- HELPERS COMPARTIDOS ---
let diccionarioCategorias = {};
try {
    const categoriasPath = path.join(__dirname, '..', '..', 'data', 'mapa_categories.json');
    const raw = fs.readFileSync(categoriasPath, 'utf-8');
    diccionarioCategorias = JSON.parse(raw);
} catch (err) {
    console.warn('⚠️ No se pudo cargar data/mapa_categories.json desde la raíz del proyecto:', err.message);
    diccionarioCategorias = {};
}
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

async function main() {
    console.log("🚀 GATILLANDO SINCRONIZACIÓN MASIVA (ETL)");
    console.log("------------------------------------------");

    try {
        // Ejecución secuencial para no saturar la CPU
        await aliexpress.sync(supabase, { limit: 1000 }, helpers);
        // await govee.sync(supabase, { limit: 1000 }, helpers);

        console.log("\n✨ BODEGA FIFER ACTUALIZADA COMPLETAMENTE.");
    } catch (error) {
        console.error("\n❌ Error en el gatillador:", error.message);
    }
}

main();
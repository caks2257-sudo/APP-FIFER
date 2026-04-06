const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkBuckets() {
    console.log("🔍 Conectando a:", process.env.SUPABASE_URL);
    
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
        console.error("❌ Error de conexión:", error.message);
        return;
    }

    console.log("📦 Buckets que tu API 've' actualmente:");
    if (data && data.length > 0) {
        data.forEach(b => {
            console.log(`- Nombre: "${b.name}" | Público: ${b.public}`);
        });
    } else {
        console.log("⚠️ ¡No hay ningún bucket en este proyecto! Está totalmente vacío.");
    }
}

checkBuckets();
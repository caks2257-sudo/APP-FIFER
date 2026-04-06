require('dotenv').config({ override: true });

console.log("🔍 --- REVISIÓN DE CREDENCIALES ---");
const cid = process.env.ADMITAD_CLIENT_ID;
const secret = process.env.ADMITAD_CLIENT_SECRET;

if (!cid) {
    console.error("❌ ADMITAD_CLIENT_ID no encontrado.");
} else {
    console.log(`✅ ID encontrado: ${cid.substring(0, 5)}...`);
}

if (!secret) {
    console.error("❌ ADMITAD_CLIENT_SECRET no encontrado.");
} else {
    console.log(`✅ Secret encontrado: ${secret.substring(0, 5)}...`);
}

console.log("----------------------------------");
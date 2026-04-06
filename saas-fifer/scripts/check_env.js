require('dotenv').config();

console.log("--- CHEQUEO DE CABLES ---");
console.log("¿Existe CLIENT_ID?:", process.env.ADMITAD_CLIENT_ID ? "SÍ ✅" : "NO ❌");
console.log("¿Existe CLIENT_SECRET?:", process.env.ADMITAD_CLIENT_SECRET ? "SÍ ✅" : "NO ❌");
console.log("Valor de CLIENT_ID (primeros 3 caracteres):", process.env.ADMITAD_CLIENT_ID?.substring(0, 3));
console.log("--------------------------");
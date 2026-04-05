const { probarConexionCB } = require('../services/clickbankService');

async function iniciarTest() {
    console.log("📡 Conectando con los servidores de ClickBank...");
    const data = await probarConexionCB();
    
    if (data) {
        console.log("\n📊 Resultado de la conexión:");
        console.log(data);
    } else {
        console.log("\n⚠️ Revisa que tus llaves CLICKBANK_DEV_KEY y CLICKBANK_CLERK_KEY estén pegadas en el .env");
    }
}

iniciarTest();
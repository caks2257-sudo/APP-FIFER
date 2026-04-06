require('dotenv').config({ override: true }); 
const axios = require('axios');

async function test() {
    const cid = process.env.ADMITAD_CLIENT_ID ? process.env.ADMITAD_CLIENT_ID.trim() : "";
    const secret = process.env.ADMITAD_CLIENT_SECRET ? process.env.ADMITAD_CLIENT_SECRET.trim() : "";

    console.log("🚀 Iniciando motor de autenticación...");

    if (!cid || !secret) {
        console.error("❌ ERROR: Faltan llaves en el .env.");
        return;
    }

    try {
        const auth = Buffer.from(`${cid}:${secret}`).toString('base64');
        
        // EL ARREGLO: Forzamos el envío del client_id en el cuerpo de la petición
        const payload = new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: cid, // <--- Admitad no podrá ignorar esto
            scope: 'public_data'
        }).toString();

        const response = await axios.post('https://api.admitad.com/token/', 
            payload, 
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        
        console.log("✅ ¡CONEXIÓN EXITOSA CON ADMITAD!");
        console.log("🔑 Token generado:", response.data.access_token.substring(0, 15) + "...");
    } catch (e) {
        console.error("❌ Admitad rechazó la conexión:");
        console.error(e.response ? e.response.data : e.message);
    }
}

test();
const crypto = require('crypto');
const axios = require('axios');
const config = require('../config');

// El endpoint oficial de ShareASale
const SHAREASALE_API_URL = 'https://api.shareasale.com/w.cfm';

async function obtenerComerciantes() {
    const { id, token, secret } = config.affiliates.shareasale;
    
    if (!id || !token || !secret || id === "ESPERANDO_APROBACION") {
        console.error("❌ Faltan credenciales válidas de ShareASale en el .env");
        return null;
    }

    const action = 'merchantSearch'; // Acción para ver qué marcas existen
    const date = new Date().toUTCString();
    
    // 🔐 El "candado" criptográfico que exige ShareASale
    const sigString = `${token}:${date}:${action}:${secret}`;
    const hash = crypto.createHash('sha256').update(sigString).digest('hex');

    try {
        const response = await axios.get(SHAREASALE_API_URL, {
            headers: {
                'x-ShareASale-Date': date,
                'x-ShareASale-Authentication': hash
            },
            params: {
                affiliateId: id,
                token: token,
                version: '2.1',
                action: action,
                format: 'json'
            }
        });
        return response.data;
    } catch (error) {
        console.error("❌ Error de ShareASale:", error.response?.data || error.message);
        return null;
    }
}

module.exports = { obtenerComerciantes };
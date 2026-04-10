const path = require('path');
const axios = require('axios');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), override: false });

function getAdmitadCredentials() {
    const clientId = process.env.ADMITAD_CLIENT_ID ? process.env.ADMITAD_CLIENT_ID.trim() : "";
    const clientSecret = process.env.ADMITAD_CLIENT_SECRET ? process.env.ADMITAD_CLIENT_SECRET.trim() : "";

    if (!clientId) {
        throw new Error("API Key de Admitad no encontrada: falta ADMITAD_CLIENT_ID");
    }
    if (!clientSecret) {
        throw new Error("API Secret de Admitad no encontrada: falta ADMITAD_CLIENT_SECRET");
    }

    return { clientId, clientSecret };
}

async function obtenerToken() {
    const { clientId, clientSecret } = getAdmitadCredentials();

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const payload = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        scope: 'advcampaigns public_data coupons websites' 
    }).toString();

    try {
        const response = await axios.post('https://api.admitad.com/token/', payload, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        return response.data.access_token;
    } catch (error) {
        const status = error.response ? error.response.status : 'unknown';
        const reason = error.response?.data ? JSON.stringify(error.response.data) : error.message;
        throw new Error(`Fallo al obtener token de Admitad (${status}): ${reason}`);
    }
}

function toAffiliateSummary(campaign) {
    const campaignName = campaign?.name || campaign?.name_short || "Campaña Admitad";
    const actions = Array.isArray(campaign?.actions) ? campaign.actions.length : 0;
    const rating = typeof campaign?.rating === 'number' ? campaign.rating.toFixed(1) : null;
    const holdDays = campaign?.hold_time ?? campaign?.hold_time_avg ?? 'N/D';

    return {
        title: 'Comisiones del Mes',
        value: `${actions} acciones`,
        caption: `${campaignName} | rating ${rating ?? 'N/D'} | hold ${holdDays} dias`,
    };
}

async function fetchAffiliateData() {
    const token = await obtenerToken();

    try {
        const response = await axios.get('https://api.admitad.com/advcampaigns/?limit=1&language=es', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const dataCruda = response?.data?.results?.[0];
        if (!dataCruda) {
            throw new Error('Admitad no devolvio campañas en results[0]');
        }

        return {
            raw: dataCruda,
            summary: toAffiliateSummary(dataCruda),
        };

    } catch (error) {
        const status = error.response ? error.response.status : 'unknown';
        const reason = error.response?.data ? JSON.stringify(error.response.data) : error.message;
        throw new Error(`Error en motor xray_admitad (${status}): ${reason}`);
    }
}

async function runCli() {
    console.log("🔍 Iniciando Escaneo de Rayos X en la API de Admitad...\n");
    const result = await fetchAffiliateData();
    console.log("==========================================");
    console.log("💀 RADIOGRAFÍA COMPLETA DEL OBJETO ADMITAD");
    console.log("==========================================\n");
    console.log(JSON.stringify(result.raw, null, 2));
    console.log("\n==========================================");
    console.log(`📊 Total de variables disponibles: ${Object.keys(result.raw).length}`);
}

module.exports = {
    fetchAffiliateData,
};

if (require.main === module) {
    runCli().catch((error) => {
        console.error("❌ Error en CLI xray_admitad:");
        console.error(error.message);
        process.exitCode = 1;
    });
}
/**
 * Central feature switches (env). Default off for zero regression until rollout.
 */
const FLAGS = {
    TAG_CENTER: 'FEATURE_TAG_CENTER',
    SCORING_ENGINE: 'FEATURE_SCORING_ENGINE',
    CREDIT_SIMULATOR: 'FEATURE_CREDIT_SIMULATOR',
    APP_MARKETING: 'FEATURE_APP_MARKETING',
    SYSTEM_MONITOR: 'FEATURE_SYSTEM_MONITOR',
    /** After successful `public.products` upsert, trigger Master automated play (bridge). */
    INGEST_MASTER_BRIDGE: 'FEATURE_INGEST_MASTER_BRIDGE',
    /** AliExpress sync: auto-trigger Master processing after upsert (`bridge_hook`). */
    AUTO_PROCESS: 'FEATURE_AUTO_PROCESS',
    SHOPIFY_CONNECTOR: 'FEATURE_SHOPIFY_CONNECTOR',
    MERCADOLIBRE_CONNECTOR: 'FEATURE_MERCADOLIBRE_CONNECTOR',
    WOOCOMMERCE_CONNECTOR: 'FEATURE_WOOCOMMERCE_CONNECTOR',
};

function truthy(v) {
    if (v == null) return false;
    const s = String(v).trim().toLowerCase();
    return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

function isEnabled(flagKey) {
    const envName = FLAGS[flagKey];
    if (!envName) return false;
    return truthy(process.env[envName]);
}

module.exports = { FLAGS, isEnabled, truthy };

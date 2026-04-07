const path = require('path');

/**
 * Lazy load of existing saas-fifer config (no edits to config module).
 */
function loadAffiliateConfig() {
    const cfgPath = path.join(__dirname, '..', '..', '..', 'config');
    return require(cfgPath);
}

/**
 * Read-only map of configured affiliate networks for App Marketing orchestration.
 * @returns {Record<string, boolean>}
 */
function getAffiliateAvailability() {
    const config = loadAffiliateConfig();
    const a = config.affiliates || {};
    return {
        amazon: Boolean(a.amazon?.tag && a.amazon?.key),
        impact: Boolean(a.impact?.sid && a.impact?.token),
        clickbank: Boolean(a.clickbank?.dev),
        shareasale: Boolean(a.shareasale?.id && a.shareasale?.token),
        partnerstack: Boolean(a.partnerstack?.pk && a.partnerstack?.sk),
        appsumo: Boolean(a.appsumo?.id && a.appsumo?.key),
    };
}

/**
 * Placeholder for Make.com / webhook fan-out (implement when FEATURE_APP_MARKETING is on).
 * @param {{ event: string, payload: object }} _evt
 */
async function dispatchMarketingHook(_evt) {
    return { ok: false, reason: 'not_implemented' };
}

module.exports = { getAffiliateAvailability, dispatchMarketingHook, loadAffiliateConfig };

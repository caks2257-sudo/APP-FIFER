const { isEnabled } = require('../featureFlags');
const bridge = require('./affiliateBridge');
const { loadPlayTemplate } = require('./playLoader');

/**
 * App Marketing entrypoint; keeps coupling to App Afiliados via config bridge only.
 */
async function planCampaignDraft(spec) {
    if (!isEnabled('APP_MARKETING')) {
        const err = new Error('APP_MARKETING disabled (set FEATURE_APP_MARKETING=true)');
        err.code = 'FEATURE_DISABLED';
        throw err;
    }
    if (!spec || typeof spec !== 'object') {
        const err = new Error('invalid_spec');
        err.code = 'VALIDATION';
        throw err;
    }
    const networks = bridge.getAffiliateAvailability();
    const play = spec.play_template_id ? loadPlayTemplate(spec.play_template_id) : null;
    return {
        specId: spec.id || null,
        affiliateNetworks: networks,
        play: play || null,
        notes: play
            ? 'Play template loaded; merge with TAG-CENTER rank + credit estimate before dispatch.'
            : 'Wire creatives + TAG-CENTER tags before dispatch.',
    };
}

module.exports = { planCampaignDraft, loadPlayTemplate, ...bridge };

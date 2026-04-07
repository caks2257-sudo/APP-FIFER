/**
 * FIFER platform kit: TAG-CENTER, scoring, credits, App Marketing (feature-flagged).
 */
module.exports = {
    featureFlags: require('./featureFlags'),
    tagCenter: require('./tag-center/tagRepository'),
    scoring: require('./scoring/scoringEngine'),
    credits: require('./credits/creditSimulator'),
    appMarketing: require('./app-marketing'),
};

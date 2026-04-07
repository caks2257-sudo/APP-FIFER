const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, 'plays', 'templates');

/**
 * Load a campaign play template JSON by file stem (e.g. sales_explosive_v1).
 * @param {string} playTemplateId
 * @returns {object|null}
 */
function loadPlayTemplate(playTemplateId) {
    const safe = String(playTemplateId).replace(/[^a-zA-Z0-9._-]/g, '');
    if (!safe) return null;
    const file = path.join(TEMPLATES_DIR, `${safe}.play.json`);
    if (!fs.existsSync(file)) return null;
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
}

module.exports = { loadPlayTemplate, TEMPLATES_DIR };

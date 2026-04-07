const { isEnabled } = require('../featureFlags');

const SCHEMA = 'fifer_platform';
const TABLE = 'tags';

/**
 * @typedef {object} TagRow
 * @property {string} id
 * @property {string} name
 * @property {string} type
 * @property {string} description
 * @property {object[]} metrics
 * @property {object[]} virtues
 * @property {object[]} limitations
 * @property {string} cost_unit
 * @property {number} cost_value
 * @property {string|null} provider_id
 * @property {number} version
 * @property {string} created_by
 * @property {string} created_at
 * @property {object[]} history
 */

function assertFlag() {
    if (!isEnabled('TAG_CENTER')) {
        const err = new Error('TAG_CENTER disabled (set FEATURE_TAG_CENTER=true)');
        err.code = 'FEATURE_DISABLED';
        throw err;
    }
}

function clientTable(supabase) {
    return supabase.schema(SCHEMA).from(TABLE);
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {Omit<TagRow, 'id'|'created_at'|'history'|'version'> & { version?: number }} row
 * @param {{ byUserId: string }} ctx
 */
async function insertTag(supabase, row, ctx) {
    assertFlag();
    const historyEntry = {
        at: new Date().toISOString(),
        by: ctx.byUserId,
        action: 'create',
        snapshot: { ...row, version: row.version ?? 1 },
    };
    const payload = {
        ...row,
        version: row.version ?? 1,
        created_by: ctx.byUserId,
        history: [historyEntry],
    };
    const { data, error } = await clientTable(supabase).insert(payload).select().single();
    if (error) throw error;
    return data;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} id
 * @param {Partial<TagRow>} patch
 * @param {{ byUserId: string }} ctx
 */
async function updateTag(supabase, id, patch, ctx) {
    assertFlag();
    const { data: cur, error: e0 } = await clientTable(supabase).select('*').eq('id', id).single();
    if (e0) throw e0;
    const nextVersion = (cur.version || 1) + 1;
    const historyEntry = {
        at: new Date().toISOString(),
        by: ctx.byUserId,
        action: 'update',
        patch,
        version: nextVersion,
    };
    const nextHistory = [...(cur.history || []), historyEntry];
    const { data, error } = await clientTable(supabase)
        .update({
            ...patch,
            version: nextVersion,
            history: nextHistory,
        })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ type?: string, name?: string }} [filter]
 */
async function listTags(supabase, filter = {}) {
    assertFlag();
    let q = clientTable(supabase).select('*').order('created_at', { ascending: false });
    if (filter.type) q = q.eq('type', filter.type);
    if (filter.name) q = q.eq('name', filter.name);
    const { data, error } = await q;
    if (error) throw error;
    return data;
}

module.exports = { insertTag, updateTag, listTags, SCHEMA, TABLE };

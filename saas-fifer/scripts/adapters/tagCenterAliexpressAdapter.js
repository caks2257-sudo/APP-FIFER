const { isEnabled } = require('../../modules/fifer-platform/featureFlags');
const { insertTag, updateTag, SCHEMA, TABLE } = require('../../modules/fifer-platform/tag-center/tagRepository');

const TAG_TYPE = 'ingest_aliexpress_product';

let warnedMissingActor = false;

function isUuid(s) {
    return typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function tagNameForProduct(productId) {
    return `ae:${String(productId)}`;
}

function productRowToTagPayload(row) {
    const desc = String(row.description || row.name || '').slice(0, 2000);
    return {
        name: tagNameForProduct(row.product_id),
        type: TAG_TYPE,
        description: desc,
        metrics: [
            { k: 'product_id', v: String(row.product_id) },
            { k: 'campaign_id', v: row.campaign_id },
            { k: 'category', v: String(row.category || '') },
            { k: 'price', v: row.price },
        ],
        virtues: [],
        limitations: [],
        cost_unit: 'credit',
        cost_value: 0,
        provider_id: null,
        extra: {
            source: 'aliexpress_admitad_feed',
            public_product_ref: {
                product_id: String(row.product_id),
                campaign_id: row.campaign_id,
            },
        },
    };
}

/**
 * After a successful `products` upsert, mirror rows into `fifer_platform.tags`.
 * No-op unless FEATURE_TAG_CENTER is truthy. Never throws to callers.
 *
 * Env: TAG_CENTER_INGEST_ACTOR_ID = UUID for `created_by` / history audit (service role bypasses RLS).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object[]} productRows — same objects passed to `products` upsert (no ai_metadata required)
 */
async function maybeSyncTagsAfterAliexpressBatch(supabase, productRows) {
    if (!isEnabled('TAG_CENTER')) return;

    const actor = process.env.TAG_CENTER_INGEST_ACTOR_ID;
    if (!actor || !isUuid(actor)) {
        if (!warnedMissingActor) {
            warnedMissingActor = true;
            console.warn(
                '[TAG_CENTER] FEATURE_TAG_CENTER is on but TAG_CENTER_INGEST_ACTOR_ID is missing or invalid; skipping tag writes.'
            );
        }
        return;
    }

    const ctx = { byUserId: actor };

    for (const row of productRows) {
        try {
            const payload = productRowToTagPayload(row);
            const { data: existing, error: qErr } = await supabase
                .schema(SCHEMA)
                .from(TABLE)
                .select('id')
                .eq('name', payload.name)
                .eq('type', payload.type)
                .maybeSingle();
            if (qErr) throw qErr;

            if (existing?.id) {
                await updateTag(
                    supabase,
                    existing.id,
                    {
                        description: payload.description,
                        metrics: payload.metrics,
                        virtues: payload.virtues,
                        limitations: payload.limitations,
                        cost_unit: payload.cost_unit,
                        cost_value: payload.cost_value,
                        extra: payload.extra,
                    },
                    ctx
                );
            } else {
                await insertTag(supabase, payload, ctx);
            }
        } catch (e) {
            console.error(`[TAG_CENTER] tag sync failed for product_id=${row?.product_id}:`, e.message || e);
        }
    }
}

module.exports = { maybeSyncTagsAfterAliexpressBatch, TAG_TYPE, tagNameForProduct };

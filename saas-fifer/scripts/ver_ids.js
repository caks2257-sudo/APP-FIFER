require('dotenv').config({ override: true });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function verIds() {
    let { data, error } = await supabase.from('campaigns').select('name, campaign_id');
    if (error) console.error(error);
    else console.table(data);
}
verIds();
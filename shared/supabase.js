require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  const missing = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseKey) {
    missing.push('SUPABASE_SERVICE_ROLE_KEY | SUPABASE_KEY | SUPABASE_ANON_KEY');
  }
  throw new Error(`Missing Supabase env vars: ${missing.join(', ')}`);
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;

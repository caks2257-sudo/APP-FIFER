const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

// Inicializamos el cliente de Supabase usando nuestro búnker centralizado
const supabase = createClient(
    config.db.supabase.url, 
    config.db.supabase.service // Usamos service key para tener permisos totales en el backend
);

module.exports = supabase;
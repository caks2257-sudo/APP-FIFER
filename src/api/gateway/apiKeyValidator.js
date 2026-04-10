const { createClient } = require("@supabase/supabase-js");

let _supabase = null;

/**
 * Cliente Supabase con service_role (lazy) para saltar RLS y leer api_keys / escribir api_logs.
 * Evita fallar al cargar el módulo si .env aún no está aplicado; falla en la primera petición si falta config.
 */
function getSupabaseServiceClient() {
  if (_supabase) return _supabase;
  const url = String(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ""
  ).trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) {
    throw new Error(
      "Gateway Supabase: define NEXT_PUBLIC_SUPABASE_URL o SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  _supabase = createClient(url, key);
  return _supabase;
}

/**
 * Middleware de Gateway: Valida la API Key interna de FIFER.
 * @param {string} requiredScope - Scope necesario para la ruta (ej: 'scraping.product').
 * @param {string} requiredPermission - Permiso específico (ej: 'read', 'write').
 */
function requireApiKey(requiredScope, requiredPermission) {
  return async (req, res, next) => {
    const apiKey = req.headers["x-fifer-api-key"];
    const endpoint = req.originalUrl;

    if (!apiKey) {
      await logApiAccess(null, endpoint, 401);
      return res.status(401).json({ error: "Missing x-fifer-api-key header" });
    }

    try {
      const supabase = getSupabaseServiceClient();
      // 1. Buscar la key en Supabase
      const { data: keyData, error } = await supabase
        .from("api_keys")
        .select("*")
        .eq("key", apiKey)
        .single();

      if (error || !keyData) {
        await logApiAccess(null, endpoint, 403);
        return res.status(403).json({ error: "Invalid API Key" });
      }

      // 2. Verificar expiración
      if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
        await logApiAccess(keyData.id, endpoint, 403);
        return res.status(403).json({ error: "API Key expired" });
      }

      // 3. Verificar Scope
      if (keyData.scope !== "*" && keyData.scope !== requiredScope) {
        await logApiAccess(keyData.id, endpoint, 403);
        return res.status(403).json({ error: "Insufficient scope" });
      }

      // 4. Verificar Permisos (JSONB)
      const permissions = keyData.permissions || [];
      if (
        !permissions.includes("*") &&
        !permissions.includes(requiredPermission)
      ) {
        await logApiAccess(keyData.id, endpoint, 403);
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      // 5. Autorizado
      req.fiferAuth = {
        keyId: keyData.id,
        ownerType: keyData.owner_type,
        ownerId: keyData.owner_id,
      };

      await logApiAccess(keyData.id, endpoint, 200);
      next();
    } catch (err) {
      console.error("[API Gateway Error]", err);
      return res.status(500).json({ error: "Internal Gateway Error" });
    }
  };
}

/**
 * Función auxiliar para registrar la trazabilidad en api_logs
 * @param {string|null} keyId
 * @param {string} endpoint
 * @param {number} status
 */
async function logApiAccess(keyId, endpoint, status) {
  try {
    const supabase = getSupabaseServiceClient();
    await supabase.from("api_logs").insert([
      {
        key_id: keyId,
        endpoint: endpoint,
        status: status,
      },
    ]);
  } catch (logError) {
    console.error("[API Gateway Log Error]", logError);
    // No bloqueamos la ejecución si falla el log
  }
}

module.exports = {
  requireApiKey,
};

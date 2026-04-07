/**
 * Security Fortress — Supabase Auth (v2.9)
 * Extrae `Authorization: Bearer <jwt>` y valida con `supabase.auth.getUser(token)`.
 * Cliente solo con SUPABASE_URL + SUPABASE_ANON_KEY (no usar service role para validar JWT de usuario).
 *
 * Errores 401/503 vía `response_builder.errorResponse`.
 *
 * `requireAuth` / `requireSupabaseJwt`: inyectan `req.user` y `req.supabaseUser` (misma referencia).
 * Rutas internas (bots): `internal_auth` + X-FIFER-INTERNAL-KEY — sin este middleware.
 */
const { createClient } = require("@supabase/supabase-js");
const { errorResponse } = require("../../utils/response_builder.js");

function extractBearer(req) {
  if (!req?.headers?.authorization) return "";
  const auth = String(req.headers.authorization);
  if (!auth.startsWith("Bearer ")) return "";
  return auth.slice(7).trim();
}

let _supabaseForAuth = null;

function getSupabaseAuthClient() {
  if (_supabaseForAuth) return _supabaseForAuth;
  const url = String(process.env.SUPABASE_URL || "").trim();
  const key = String(process.env.SUPABASE_ANON_KEY || "").trim();
  if (!url || !key) {
    return null;
  }
  _supabaseForAuth = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _supabaseForAuth;
}

/**
 * @param {string} jwt
 */
async function getUserFromJwt(jwt) {
  const supabase = getSupabaseAuthClient();
  if (!supabase) {
    return { user: null, error: new Error("SUPABASE_URL / SUPABASE_ANON_KEY not configured") };
  }
  const { data, error } = await supabase.auth.getUser(jwt);
  if (error) return { user: null, error };
  return { user: data?.user || null, error: null };
}

function attachGatewayUser(req, user) {
  req.user = user;
  req.supabaseUser = user;
}

/**
 * JWT opcional; no devuelve 401.
 */
function optionalSupabaseJwt(req, res, next) {
  const token = extractBearer(req);
  if (!token) {
    req.user = null;
    req.supabaseUser = null;
    return next();
  }
  getUserFromJwt(token)
    .then(({ user, error }) => {
      if (user) attachGatewayUser(req, user);
      else {
        req.user = null;
        req.supabaseUser = null;
      }
      req.supabaseAuthError = error || null;
      next();
    })
    .catch((err) => {
      req.user = null;
      req.supabaseUser = null;
      req.supabaseAuthError = err;
      next();
    });
}

/**
 * Gateway obligatorio: sesión Supabase válida (email/password u otros proveedores).
 */
function requireAuth(req, res, next) {
  const token = extractBearer(req);
  if (!token) {
    return res.status(401).json(
      errorResponse("Missing or invalid Authorization header (Bearer token required)", {
        node: "auth_supabase",
        code: "missing_bearer",
      })
    );
  }
  const supabase = getSupabaseAuthClient();
  if (!supabase) {
    return res.status(503).json(
      errorResponse("Auth service not configured (SUPABASE_URL + SUPABASE_ANON_KEY)", {
        node: "auth_supabase",
        code: "auth_misconfigured",
      })
    );
  }
  getUserFromJwt(token)
    .then(({ user, error }) => {
      if (error || !user) {
        return res.status(401).json(
          errorResponse(error?.message || "Invalid or expired token", {
            node: "auth_supabase",
            code: "invalid_token",
          })
        );
      }
      attachGatewayUser(req, user);
      next();
    })
    .catch((err) =>
      res.status(401).json(
        errorResponse(err.message || String(err), {
          node: "auth_supabase",
          code: "auth_error",
        })
      )
    );
}

/** @deprecated usar `requireAuth` */
const requireSupabaseJwt = requireAuth;

module.exports = {
  extractBearer,
  getUserFromJwt,
  optionalSupabaseJwt,
  requireAuth,
  requireSupabaseJwt,
  getSupabaseAuthClient,
};

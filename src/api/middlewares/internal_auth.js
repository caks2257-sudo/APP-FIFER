const { errorResponse } = require("../../utils/response_builder");

function extractKey(req) {
  if (!req || !req.headers) return "";
  return String(req.headers["x-fifer-internal-key"] || "").trim();
}

function internalAuth(req, res, next) {
  const expected = String(process.env.FIFER_INTERNAL_KEY || "").trim();
  if (!expected) {
    return res.status(503).json(
      errorResponse("FIFER_INTERNAL_KEY is not configured", {
        node: "master_orchestrator",
      })
    );
  }

  const provided = extractKey(req);
  if (provided && provided === expected) return next();

  return res.status(401).json(
    errorResponse("Unauthorized internal request", {
      node: "master_orchestrator",
    })
  );
}

module.exports = {
  internalAuth,
  extractKey,
};

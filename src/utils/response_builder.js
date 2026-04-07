function buildMetadata(metadata = {}) {
  return {
    cost_est: Number.isFinite(Number(metadata.cost_est)) ? Number(metadata.cost_est) : 0,
    node: metadata.node || "unknown",
    latency_ms: Number.isFinite(Number(metadata.latency_ms)) ? Number(metadata.latency_ms) : 0,
    retries: Number.isFinite(Number(metadata.retries)) ? Number(metadata.retries) : 0,
    timestamp: metadata.timestamp || new Date().toISOString(),
    ...metadata,
  };
}

function successResponse(data = {}, metadata = {}) {
  return {
    success: true,
    data,
    metadata: buildMetadata(metadata),
    error: null,
  };
}

function errorResponse(error, metadata = {}, data = null) {
  const message =
    typeof error === "string"
      ? error
      : error?.message || "Unhandled internal service error";

  return {
    success: false,
    data,
    metadata: buildMetadata(metadata),
    error: message,
  };
}

module.exports = {
  successResponse,
  errorResponse,
  buildMetadata,
};

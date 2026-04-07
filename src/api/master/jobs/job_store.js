/**
 * In-memory job registry for async pipeline execution (Nervous System).
 * Replace with Redis/DB in production for multi-instance deployments.
 */
const { randomUUID } = require("crypto");
const { successResponse, errorResponse } = require("../../../utils/response_builder.js");

/** @type {Map<string, object>} */
const jobs = new Map();

/**
 * @param {{ kind: string, payload?: object, id?: string }} input
 */
function createJob(input) {
  const id = input.id && String(input.id).trim() ? String(input.id).trim() : randomUUID();
  if (jobs.has(id)) {
    throw new Error(`job_id_collision:${id}`);
  }
  const job = {
    id,
    kind: input.kind || "pipeline",
    status: "processing",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    payload: input.payload || null,
    result: null,
    error: null,
  };
  jobs.set(id, job);
  return job;
}

function updateJob(id, patch) {
  const j = jobs.get(id);
  if (!j) return null;
  Object.assign(j, patch, { updated_at: new Date().toISOString() });
  return j;
}

function getJob(id) {
  return jobs.get(id) || null;
}

function getPendingCount() {
  let n = 0;
  for (const j of jobs.values()) {
    if (j.status === "processing") n += 1;
  }
  return n;
}

function getStats() {
  return {
    total: jobs.size,
    pending: getPendingCount(),
  };
}

/**
 * Standard contract envelope for thin-client polling.
 */
function getJobEnvelope(jobId) {
  const j = getJob(jobId);
  if (!j) {
    return errorResponse("JOB_NOT_FOUND", { node: "job_store", cost_est: 0, latency_ms: 0 }, null);
  }
  return successResponse(
    {
      job_id: j.id,
      status: j.status,
      kind: j.kind,
      created_at: j.created_at,
      updated_at: j.updated_at,
      result: j.result,
      error_detail: j.error,
      publish_status: j.publish_status,
      publish_error: j.publish_error,
    },
    { node: "job_store", cost_est: 0, latency_ms: 0 }
  );
}

module.exports = {
  createJob,
  updateJob,
  getJob,
  getPendingCount,
  getStats,
  getJobEnvelope,
};

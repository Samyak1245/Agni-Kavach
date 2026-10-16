const INCIDENT_STATUSES = [
  "new_signal",
  "under_verification",
  "elevated_concern",
  "high_priority_review",
  "human_verified_fire",
  "likely_false_alarm",
  "closed",
  // Statuses retained by the existing frontend for older scenarios/actions.
  "unverified",
  "under_review",
  "elevated",
  "high_priority",
  "ranger_dispatched",
  "contained",
];

const INCIDENT_PRIORITIES = ["Routine", "Guarded", "Elevated", "Urgent"];
const INCIDENT_ZONES = [
  "core",
  "buffer",
  "fringe",
  "outside",
  "uncertain_edge",
  "industrial_exclusion",
];
const QUEUE_VALUES = ["all", "active", "cleared"];
const INCIDENT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;

function result(value, errors = []) {
  return { isValid: errors.length === 0, value: errors.length ? null : value, errors };
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function optionalText(value, field, errors, maxLength = 2000, fallback = "") {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string") {
    errors.push(`${field} must be a string.`);
    return fallback;
  }
  const clean = value.trim();
  if (clean.length > maxLength) errors.push(`${field} must not exceed ${maxLength} characters.`);
  return clean;
}

function actorFromBody(body, errors) {
  const raw = body.actor ?? body.reviewerName;
  const actor = optionalText(raw, "actor", errors, 120, "operator");
  return actor || "operator";
}

function positiveInt(raw, field, errors, fallback, max) {
  if (raw === undefined || raw === null || raw === "") return fallback;
  const text = String(raw).trim();
  if (!/^\d+$/.test(text)) {
    errors.push(`${field} must be a positive integer.`);
    return fallback;
  }
  const n = Number(text);
  if (!Number.isSafeInteger(n) || n < 1 || n > max) {
    errors.push(`${field} must be between 1 and ${max}.`);
    return fallback;
  }
  return n;
}

export function validateIncidentId(raw) {
  const errors = [];
  if (typeof raw !== "string") return result(null, ["incidentId is required and must be a string."]);
  const incidentId = raw.trim();
  if (!INCIDENT_ID_PATTERN.test(incidentId)) {
    errors.push("Invalid incidentId. Use letters, numbers, hyphens, or underscores (up to 120 characters).");
  }
  return result(incidentId, errors);
}

export function validateIncidentListQuery(query = {}) {
  const errors = [];
  if (!isObject(query)) return result(null, ["Query parameters must be an object."]);
  const value = {};

  for (const [field, allowed] of [
    ["status", INCIDENT_STATUSES],
    ["priority", INCIDENT_PRIORITIES],
    ["zone", INCIDENT_ZONES],
  ]) {
    if (query[field] === undefined || query[field] === "") continue;
    if (typeof query[field] !== "string") {
      errors.push(`${field} must be a single string value.`);
      continue;
    }
    const cleaned = query[field].trim();
    if (cleaned === "all") value[field] = "all";
    else if (!allowed.includes(cleaned)) errors.push(`Invalid ${field}. Allowed values: ${[...allowed].join(", ")}.`);
    else value[field] = cleaned;
  }

  if (query.queue !== undefined && query.queue !== "") {
    const queue = typeof query.queue === "string" ? query.queue.trim() : "";
    if (!QUEUE_VALUES.includes(queue)) errors.push("queue must be one of: all, active, cleared.");
    else value.queue = queue;
  }

  value.page = positiveInt(query.page, "page", errors, 1, 1000000);
  value.limit = positiveInt(query.limit, "limit", errors, 50, 200);
  return result(value, errors);
}

export function validateIncidentStatusUpdate(body = {}) {
  const errors = [];
  if (!isObject(body)) return result(null, ["Request body must be a JSON object."]);
  const status = typeof body.status === "string" ? body.status.trim() : "";
  if (!status) errors.push("status is required.");
  else if (!INCIDENT_STATUSES.includes(status)) errors.push(`Invalid status. Allowed values: ${INCIDENT_STATUSES.join(", ")}.`);
  const note = optionalText(body.note, "note", errors, 2000, "");
  const actor = actorFromBody(body, errors);
  return result({ status, note, actor }, errors);
}

export function validateIncidentPriorityUpdate(body = {}) {
  const errors = [];
  if (!isObject(body)) return result(null, ["Request body must be a JSON object."]);
  const priority = typeof body.priority === "string" ? body.priority.trim() : "";
  if (!priority) errors.push("priority is required.");
  else if (!INCIDENT_PRIORITIES.includes(priority)) errors.push(`Invalid priority. Allowed values: ${INCIDENT_PRIORITIES.join(", ")}.`);
  const note = optionalText(body.note, "note", errors, 2000, "");
  const actor = actorFromBody(body, errors);
  return result({ priority, note, actor }, errors);
}

export function validateRangerNotesUpdate(body = {}) {
  const errors = [];
  if (!isObject(body)) return result(null, ["Request body must be a JSON object."]);
  const rawNotes = body.notes ?? body.rangerNotes;
  if (typeof rawNotes !== "string") errors.push("notes is required and must be a string.");
  const notes = optionalText(rawNotes, "notes", errors, 10000, "");
  const actor = actorFromBody(body, errors);
  return result({ notes, actor }, errors);
}

export function validateClearIncident(body = {}) {
  const errors = [];
  if (!isObject(body)) return result(null, ["Request body must be a JSON object."]);
  const note = optionalText(body.note, "note", errors, 2000, "Incident marked as cleared by operator.");
  const actor = actorFromBody(body, errors);
  return result({ actor, note: note || "Incident marked as cleared by operator." }, errors);
}

export function validateReopenIncident(body = {}) {
  const errors = [];
  if (!isObject(body)) return result(null, ["Request body must be a JSON object."]);
  const note = optionalText(body.note, "note", errors, 2000, "Incident reopened for monitoring.");
  const actor = actorFromBody(body, errors);
  return result({ actor, note: note || "Incident reopened for monitoring." }, errors);
}

export function validationErrorPayload(validation, message = "Request validation failed.") {
  return { success: false, message, errors: Array.isArray(validation?.errors) ? validation.errors : ["Invalid request."] };
}

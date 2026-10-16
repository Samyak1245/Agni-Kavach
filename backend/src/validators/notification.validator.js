const NOTIFICATION_METHODS = ["email", "sms", "webhook"];
const NOTIFICATION_STATUSES = ["drafted", "queued", "submitted", "sent", "delivered", "failed", "acknowledged"];
const INCIDENT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;
const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/;

function result(value, errors = []) {
  return { isValid: errors.length === 0, value: errors.length ? null : value, errors };
}
function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function text(value, field, errors, { required = false, maxLength = 2000, fallback = "" } = {}) {
  if (value === undefined || value === null) {
    if (required) errors.push(`${field} is required.`);
    return fallback;
  }
  if (typeof value !== "string") {
    errors.push(`${field} must be a string.`);
    return fallback;
  }
  const cleaned = value.trim();
  if (required && !cleaned) errors.push(`${field} is required.`);
  if (cleaned.length > maxLength) errors.push(`${field} must not exceed ${maxLength} characters.`);
  return cleaned;
}
function isValidEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function validPhone(value) { return /^\+[1-9]\d{7,14}$/.test(value); }
function validHttpUrl(value) {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
  } catch { return false; }
}

export function validateNotificationIncidentId(raw) {
  const errors = [];
  if (typeof raw !== "string") return result(null, ["incidentId is required and must be a string."]);
  const incidentId = raw.trim();
  if (!INCIDENT_ID_PATTERN.test(incidentId)) errors.push("Invalid incidentId format.");
  return result(incidentId, errors);
}

export function validateNotificationId(raw) {
  const errors = [];
  if (typeof raw !== "string") return result(null, ["notificationId must be a string."]);
  const notificationId = raw.trim();
  // The application uses public TATR-DISP-* IDs, not Mongo's _id, in this route.
  if (!/^TATR-DISP-[A-Z0-9-]{5,100}$/.test(notificationId) && !OBJECT_ID_PATTERN.test(notificationId)) {
    errors.push("Invalid notificationId format.");
  }
  return result(notificationId, errors);
}

/** Payload sent by the existing OfficialAlertModal.tsx. */
export function validateOfficialAlertPayload(body = {}) {
  const errors = [];
  if (!isObject(body)) return result(null, ["Request body must be a JSON object."]);

  const incidentId = text(body.incidentId, "incidentId", errors, { required: true, maxLength: 120 });
  if (incidentId && !INCIDENT_ID_PATTERN.test(incidentId)) errors.push("Invalid incidentId format.");

  const recipientEmail = text(body.recipientEmail, "recipientEmail", errors, { required: true, maxLength: 320 });
  if (recipientEmail && !isValidEmail(recipientEmail)) errors.push("recipientEmail must be a valid email address.");
  const officialName = text(body.officialName, "officialName", errors, { maxLength: 200, fallback: "Forest Official" }) || "Forest Official";
  const officialRole = text(body.officialRole, "officialRole", errors, { maxLength: 200, fallback: "" });
  const locationContext = text(body.locationContext, "locationContext", errors, { maxLength: 500, fallback: "" });
  const message = text(body.message, "message", errors, { required: true, maxLength: 10000 });
  if (message && message.length < 10) errors.push("message must contain at least 10 characters.");

  let coordinates = null;
  if (body.coordinates !== undefined && body.coordinates !== null) {
    if (!isObject(body.coordinates)) {
      errors.push("coordinates must be an object with lat and lng values.");
    } else {
      const { lat, lng } = body.coordinates;
      if (typeof lat !== "number" || !Number.isFinite(lat) || lat < -90 || lat > 90) {
        errors.push("coordinates.lat must be a number between -90 and 90.");
      }
      if (typeof lng !== "number" || !Number.isFinite(lng) || lng < -180 || lng > 180) {
        errors.push("coordinates.lng must be a number between -180 and 180.");
      }
      if (errors.length === 0 || (typeof lat === "number" && typeof lng === "number")) {
        coordinates = { lat, lng };
      }
    }
  }

  const confidence = body.confidence === undefined ? null : body.confidence;
  if (confidence !== null && !["string", "number"].includes(typeof confidence)) {
    errors.push("confidence must be a string or number when provided.");
  }

  return result({ incidentId, recipientEmail, officialName, officialRole, coordinates, locationContext, confidence, message }, errors);
}

/** Optional generic notification creation validator for service/API extensions. */
export function validateNotificationCreate(body = {}) {
  const errors = [];
  if (!isObject(body)) return result(null, ["Request body must be a JSON object."]);
  const recipient = text(body.recipient, "recipient", errors, { required: true, maxLength: 500 });
  const method = text(body.method, "method", errors, { required: true, maxLength: 20 }).toLowerCase();
  const subject = text(body.subject, "subject", errors, { maxLength: 200, fallback: "" });
  const message = text(body.message, "message", errors, { required: true, maxLength: 10000 });
  if (!NOTIFICATION_METHODS.includes(method)) errors.push(`method must be one of: ${NOTIFICATION_METHODS.join(", ")}.`);
  else if (method === "email" && !isValidEmail(recipient)) errors.push("recipient must be a valid email address.");
  else if (method === "sms" && !validPhone(recipient)) errors.push("recipient must be in E.164 format, e.g. +919876543210.");
  else if (method === "webhook" && !validHttpUrl(recipient)) errors.push("recipient must be a valid HTTP or HTTPS URL.");
  return result({ recipient, method, subject, message }, errors);
}

export function validateNotificationAcknowledgement(body = {}) {
  const errors = [];
  if (!isObject(body)) return result(null, ["Request body must be a JSON object."]);
  const acknowledgedBy = text(body.acknowledgedBy ?? body.actor, "acknowledgedBy", errors, { required: true, maxLength: 200 });
  const acknowledgmentChannel = text(body.acknowledgmentChannel ?? body.channel, "acknowledgmentChannel", errors, { maxLength: 100, fallback: "" });
  const acknowledgmentNotes = text(body.acknowledgmentNotes ?? body.notes, "acknowledgmentNotes", errors, { maxLength: 2000, fallback: "" });
  return result({ acknowledgedBy, acknowledgmentChannel, acknowledgmentNotes }, errors);
}

export function validateNotificationListQuery(query = {}) {
  const errors = [];
  if (!isObject(query)) return result(null, ["Query parameters must be an object."]);
  const value = {};
  if (query.status !== undefined && query.status !== "") {
    if (typeof query.status !== "string" || !NOTIFICATION_STATUSES.includes(query.status.trim())) errors.push(`Invalid status. Allowed values: ${NOTIFICATION_STATUSES.join(", ")}.`);
    else value.status = query.status.trim();
  }
  if (query.method !== undefined && query.method !== "") {
    if (typeof query.method !== "string" || !NOTIFICATION_METHODS.includes(query.method.trim().toLowerCase())) errors.push(`Invalid method. Allowed values: ${NOTIFICATION_METHODS.join(", ")}.`);
    else value.method = query.method.trim().toLowerCase();
  }
  const intField = (raw, field, fallback, max) => {
    if (raw === undefined || raw === "" || raw === null) return fallback;
    const rawText = String(raw).trim();
    if (!/^\d+$/.test(rawText)) { errors.push(`${field} must be a positive integer.`); return fallback; }
    const n = Number(rawText);
    if (!Number.isSafeInteger(n) || n < 1 || n > max) { errors.push(`${field} must be between 1 and ${max}.`); return fallback; }
    return n;
  };
  value.page = intField(query.page, "page", 1, 1000000);
  value.limit = intField(query.limit, "limit", 50, 200);
  return result(value, errors);
}

export function notificationValidationError(validation) {
  return { success: false, message: "Notification validation failed.", errors: validation?.errors || ["Invalid request."] };
}

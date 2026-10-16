import { incidentStatusValues } from "../models/Incident.js";

// Match the frontend's types/index.ts.
export const INCIDENT_PRIORITIES = [
    "Routine",
    "Guarded",
    "Elevated",
    "Urgent",
];

export const INCIDENT_ZONES = [
    "core",
    "buffer",
    "fringe",
    "outside",
    "uncertain_edge",
    "industrial_exclusion",
];

const STATUS_SET = new Set(incidentStatusValues);
const PRIORITY_SET = new Set(INCIDENT_PRIORITIES);
const ZONE_SET = new Set(INCIDENT_ZONES);

const QUEUE_VALUES = new Set([
    "all",
    "active",
    "cleared",
]);

const INCIDENT_ID_PATTERN =
    /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;


// Standard response returned by every validator.
function result(value, errors = []) {
    return {
        isValid: errors.length === 0,
        value: errors.length === 0 ? value : null,
        errors,
    };
}


function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}


// Validate text fields and restrict their lengths.
function optionalText(
    input,
    fieldName,
    errors,
    maxLength = 2000
) {
    if (input === undefined || input === null) {
        return "";
    }

    if (typeof input !== "string") {
        errors.push(`${fieldName} must be a string.`);
        return "";
    }

    const value = input.trim();

    if (value.length > maxLength) {
        errors.push(
            `${fieldName} must not exceed ${maxLength} characters.`
        );
    }

    return value;
}


// Without authentication, this is only an audit label,
// not proof of the operator's identity.
function optionalActor(body, errors) {
    const rawActor = body.actor ?? body.reviewerName;

    if (
        rawActor === undefined ||
        rawActor === null ||
        rawActor === ""
    ) {
        return "operator";
    }

    if (typeof rawActor !== "string") {
        errors.push("actor must be a string.");
        return "operator";
    }

    const actor = rawActor.trim();

    if (actor.length > 120) {
        errors.push("actor must not exceed 120 characters.");
    }

    return actor || "operator";
}


// Validate page and limit query parameters.
function parsePositiveInteger(
    rawValue,
    fieldName,
    errors,
    defaultValue,
    max
) {
    if (
        rawValue === undefined ||
        rawValue === null ||
        rawValue === ""
    ) {
        return defaultValue;
    }

    if (
        typeof rawValue !== "string" &&
        typeof rawValue !== "number"
    ) {
        errors.push(`${fieldName} must be a positive integer.`);
        return defaultValue;
    }

    const text = String(rawValue).trim();

    if (!/^\d+$/.test(text)) {
        errors.push(`${fieldName} must be a positive integer.`);
        return defaultValue;
    }

    const number = Number(text);

    if (
        !Number.isSafeInteger(number) ||
        number < 1 ||
        number > max
    ) {
        errors.push(
            `${fieldName} must be between 1 and ${max}.`
        );
        return defaultValue;
    }

    return number;
}


// Validate :incidentId route parameters.
export function validateIncidentId(rawIncidentId) {
    const errors = [];

    if (typeof rawIncidentId !== "string") {
        return result(null, [
            "incidentId is required and must be a string.",
        ]);
    }

    const incidentId = rawIncidentId.trim();

    if (!incidentId) {
        errors.push("incidentId is required.");
    } else if (!INCIDENT_ID_PATTERN.test(incidentId)) {
        errors.push(
            "incidentId may contain only letters, numbers, underscores, and hyphens, up to 120 characters."
        );
    }

    return result(incidentId, errors);
}


// Validate GET /api/incidents query parameters.
export function validateIncidentListQuery(query = {}) {
    const errors = [];

    if (!isPlainObject(query)) {
        return result(null, [
            "Query parameters must be an object.",
        ]);
    }

    const value = {};

    const filters = [
        ["status", STATUS_SET],
        ["priority", PRIORITY_SET],
        ["zone", ZONE_SET],
    ];

    for (const [field, allowedValues] of filters) {
        const raw = query[field];

        if (raw === undefined || raw === "") {
            continue;
        }

        if (typeof raw !== "string") {
            errors.push(
                `${field} must be a single string value.`
            );
            continue;
        }

        const cleaned = raw.trim();

        if (cleaned === "all") {
            value[field] = "all";
        } else if (!allowedValues.has(cleaned)) {
            errors.push(
                `Invalid ${field}. Allowed values: ${[
                    ...allowedValues,
                ].join(", ")}.`
            );
        } else {
            value[field] = cleaned;
        }
    }

    if (query.queue !== undefined && query.queue !== "") {
        if (
            typeof query.queue !== "string" ||
            !QUEUE_VALUES.has(query.queue.trim())
        ) {
            errors.push(
                "queue must be one of: all, active, cleared."
            );
        } else {
            value.queue = query.queue.trim();
        }
    }

    value.page = parsePositiveInteger(
        query.page,
        "page",
        errors,
        1,
        1000000
    );

    value.limit = parsePositiveInteger(
        query.limit,
        "limit",
        errors,
        50,
        200
    );

    return result(value, errors);
}


// Validate PATCH /api/incidents/:incidentId/status.
export function validateIncidentStatusUpdate(body = {}) {
    const errors = [];

    if (!isPlainObject(body)) {
        return result(null, [
            "Request body must be a JSON object.",
        ]);
    }

    const status =
        typeof body.status === "string"
            ? body.status.trim()
            : "";

    if (!status) {
        errors.push("status is required.");
    } else if (!STATUS_SET.has(status)) {
        errors.push(
            `Invalid status. Allowed values: ${[
                ...STATUS_SET,
            ].join(", ")}.`
        );
    }

    const note = optionalText(
        body.note,
        "note",
        errors,
        2000
    );

    const actor = optionalActor(body, errors);

    return result({ status, note, actor }, errors);
}


// Validate PATCH /api/incidents/:incidentId/priority.
export function validateIncidentPriorityUpdate(body = {}) {
    const errors = [];

    if (!isPlainObject(body)) {
        return result(null, [
            "Request body must be a JSON object.",
        ]);
    }

    const priority =
        typeof body.priority === "string"
            ? body.priority.trim()
            : "";

    if (!priority) {
        errors.push("priority is required.");
    } else if (!PRIORITY_SET.has(priority)) {
        errors.push(
            `Invalid priority. Allowed values: ${INCIDENT_PRIORITIES.join(", ")}.`
        );
    }

    const note = optionalText(
        body.note,
        "note",
        errors,
        2000
    );

    const actor = optionalActor(body, errors);

    return result({ priority, note, actor }, errors);
}


// Validate PATCH /api/incidents/:incidentId/notes.
export function validateRangerNotesUpdate(body = {}) {
    const errors = [];

    if (!isPlainObject(body)) {
        return result(null, [
            "Request body must be a JSON object.",
        ]);
    }

    // Accept either the service's "notes" field or
    // the frontend-style "rangerNotes" field.
    const rawNotes = body.notes ?? body.rangerNotes;

    if (typeof rawNotes !== "string") {
        errors.push(
            "notes is required and must be a string."
        );
    }

    const notes = optionalText(
        rawNotes,
        "notes",
        errors,
        10000
    );

    const actor = optionalActor(body, errors);

    return result({ notes, actor }, errors);
}


// Validate an incident-clear action.
export function validateClearIncident(body = {}) {
    const errors = [];

    if (!isPlainObject(body)) {
        return result(null, [
            "Request body must be a JSON object.",
        ]);
    }

    const note =
        body.note === undefined ||
            body.note === null ||
            body.note === ""
            ? "Incident marked as cleared by operator."
            : optionalText(body.note, "note", errors, 2000);

    const actor = optionalActor(body, errors);

    return result({ actor, note }, errors);
}


// Validate an incident-reopen action.
export function validateReopenIncident(body = {}) {
    const errors = [];

    if (!isPlainObject(body)) {
        return result(null, [
            "Request body must be a JSON object.",
        ]);
    }

    const note =
        body.note === undefined ||
            body.note === null ||
            body.note === ""
            ? "Incident reopened for monitoring."
            : optionalText(body.note, "note", errors, 2000);

    const actor = optionalActor(body, errors);

    return result({ actor, note }, errors);
}


// A consistent error response for controllers.
export function validationErrorPayload(validation) {
    return {
        success: false,
        message: "Request validation failed.",
        errors: Array.isArray(validation?.errors)
            ? validation.errors
            : ["Invalid request."],
    };
}
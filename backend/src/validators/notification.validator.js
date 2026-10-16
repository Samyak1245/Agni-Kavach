// backend/src/validators/notification.validator.js

const NOTIFICATION_METHODS = [
    "email",
    "sms",
    "webhook",
];

const NOTIFICATION_STATUSES = [
    "drafted",
    "queued",
    "submitted",
    "sent",
    "delivered",
    "failed",
    "acknowledged",
];

const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/;

const INCIDENT_ID_PATTERN =
    /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;


// Consistent result format for every validator.
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


// Safely validate text values.
function readText(
    value,
    field,
    errors,
    {
        required = false,
        maxLength = 2000,
    } = {}
) {
    if (value === undefined || value === null) {
        if (required) {
            errors.push(`${field} is required.`);
        }

        return "";
    }

    if (typeof value !== "string") {
        errors.push(`${field} must be a string.`);
        return "";
    }

    const cleaned = value.trim();

    if (required && cleaned.length === 0) {
        errors.push(`${field} is required.`);
    }

    if (cleaned.length > maxLength) {
        errors.push(
            `${field} must not exceed ${maxLength} characters.`
        );
    }

    return cleaned;
}


// Validate public incident IDs such as TATR-INC-1001.
export function validateNotificationIncidentId(
    rawIncidentId
) {
    const errors = [];

    if (typeof rawIncidentId !== "string") {
        return result(null, [
            "Incident ID must be a string.",
        ]);
    }

    const incidentId = rawIncidentId.trim();

    if (!INCIDENT_ID_PATTERN.test(incidentId)) {
        errors.push("Invalid incident ID format.");
    }

    return result(incidentId, errors);
}


// Validate MongoDB notification IDs.
export function validateNotificationId(
    rawNotificationId
) {
    const errors = [];

    if (typeof rawNotificationId !== "string") {
        return result(null, [
            "Notification ID must be a string.",
        ]);
    }

    const notificationId = rawNotificationId.trim();

    if (!OBJECT_ID_PATTERN.test(notificationId)) {
        errors.push(
            "Notification ID must be a valid MongoDB ObjectId."
        );
    }

    return result(notificationId, errors);
}


// Validate email addresses.
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


// Validate an international phone number in E.164 format.
function isValidPhoneNumber(phone) {
    return /^\+[1-9]\d{7,14}$/.test(phone);
}


// Validate an absolute HTTP or HTTPS URL.
function isValidWebhookUrl(value) {
    try {
        const url = new URL(value);

        return (
            (url.protocol === "http:" ||
                url.protocol === "https:") &&
            Boolean(url.hostname)
        );
    } catch {
        return false;
    }
}


// Validate POST /api/incidents/:incidentId/notifications
//
// Expected body:
// {
//   "recipient": "ranger@example.com",
//   "method": "email",
//   "subject": "Potential wildfire hotspot",
//   "message": "Please investigate the reported hotspot."
// }
export function validateNotificationCreate(body = {}) {
    const errors = [];

    if (!isPlainObject(body)) {
        return result(null, [
            "Request body must be a JSON object.",
        ]);
    }

    const recipient = readText(
        body.recipient,
        "recipient",
        errors,
        {
            required: true,
            maxLength: 500,
        }
    );

    const method = readText(
        body.method,
        "method",
        errors,
        {
            required: true,
            maxLength: 20,
        }
    ).toLowerCase();

    const subject = readText(
        body.subject,
        "subject",
        errors,
        {
            maxLength: 200,
        }
    );

    const message = readText(
        body.message,
        "message",
        errors,
        {
            required: true,
            maxLength: 10000,
        }
    );

    if (!NOTIFICATION_METHODS.includes(method)) {
        errors.push(
            `Invalid method. Allowed methods: ${NOTIFICATION_METHODS.join(", ")}.`
        );
    } else {
        if (
            method === "email" &&
            !isValidEmail(recipient)
        ) {
            errors.push(
                "recipient must be a valid email address for email notifications."
            );
        }

        if (
            method === "sms" &&
            !isValidPhoneNumber(recipient)
        ) {
            errors.push(
                "recipient must be an international phone number in E.164 format, such as +919876543210."
            );
        }

        if (
            method === "webhook" &&
            !isValidWebhookUrl(recipient)
        ) {
            errors.push(
                "recipient must be a valid HTTP or HTTPS URL for webhook notifications."
            );
        }
    }

    return result(
        {
            recipient,
            method,
            subject,
            message,
        },
        errors
    );
}


// Validate notification acknowledgment.
//
// Expected body:
// {
//   "acknowledgedBy": "Ranger"
// }
export function validateNotificationAcknowledgement(
    body = {}
) {
    const errors = [];

    if (!isPlainObject(body)) {
        return result(null, [
            "Request body must be a JSON object.",
        ]);
    }

    const acknowledgedBy = readText(
        body.acknowledgedBy ?? body.actor,
        "acknowledgedBy",
        errors,
        {
            required: true,
            maxLength: 120,
        }
    );

    return result(
        {
            acknowledgedBy,
        },
        errors
    );
}


// Validate GET /api/notifications query parameters.
export function validateNotificationListQuery(
    query = {}
) {
    const errors = [];

    if (!isPlainObject(query)) {
        return result(null, [
            "Query parameters must be an object.",
        ]);
    }

    const value = {};

    if (
        query.status !== undefined &&
        query.status !== ""
    ) {
        if (
            typeof query.status !== "string" ||
            !NOTIFICATION_STATUSES.includes(
                query.status.trim()
            )
        ) {
            errors.push(
                `Invalid status. Allowed statuses: ${NOTIFICATION_STATUSES.join(", ")}.`
            );
        } else {
            value.status = query.status.trim();
        }
    }

    if (
        query.method !== undefined &&
        query.method !== ""
    ) {
        if (
            typeof query.method !== "string" ||
            !NOTIFICATION_METHODS.includes(
                query.method.trim().toLowerCase()
            )
        ) {
            errors.push(
                `Invalid method. Allowed methods: ${NOTIFICATION_METHODS.join(", ")}.`
            );
        } else {
            value.method = query.method.trim().toLowerCase();
        }
    }

    value.page = readPositiveInteger(
        query.page,
        "page",
        errors,
        1,
        1000000
    );

    value.limit = readPositiveInteger(
        query.limit,
        "limit",
        errors,
        50,
        200
    );

    return result(value, errors);
}


// Validate page and limit values.
function readPositiveInteger(
    rawValue,
    field,
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

    const text = String(rawValue).trim();

    if (!/^\d+$/.test(text)) {
        errors.push(
            `${field} must be a positive integer.`
        );

        return defaultValue;
    }

    const number = Number(text);

    if (
        !Number.isSafeInteger(number) ||
        number < 1 ||
        number > max
    ) {
        errors.push(
            `${field} must be between 1 and ${max}.`
        );

        return defaultValue;
    }

    return number;
}


// Reuse this in notification controllers.
export function notificationValidationError(
    validation
) {
    return {
        success: false,
        message: "Notification validation failed.",
        errors: validation.errors,
    };
}
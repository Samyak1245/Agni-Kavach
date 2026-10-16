import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  validateNotificationIncidentId,
  validateNotificationId,
  validateOfficialAlertPayload,
  validateNotificationAcknowledgement,
  validateNotificationListQuery,
} from "../validators/notification.validator.js";
import {
  sendOfficialAlert,
  acknowledgeNotification as acknowledgeNotificationService,
  getNotificationsForIncident,
} from "../services/notification.service.js";

function validated(validation, message = "Notification request validation failed.") {
  if (!validation.isValid) throw new ApiError(400, message, validation.errors);
  return validation.value;
}

/**
 * POST /api/alerts/notify
 * Keeps the exact top-level response fields consumed by the existing
 * OfficialAlertModal.tsx. A failed/missing webhook is a non-2xx response.
 */
export const notifyOfficial = asyncHandler(async (req, res) => {
  const payload = validated(validateOfficialAlertPayload(req.body));
  const outcome = await sendOfficialAlert(payload);
  const statusCode = outcome.success ? 200 : 502;
  return res.status(statusCode).json(outcome);
});

/** GET /api/alerts/incidents/:incidentId/notifications */
export const listIncidentNotifications = asyncHandler(async (req, res) => {
  const incidentId = validated(validateNotificationIncidentId(req.params.incidentId));
  const notifications = await getNotificationsForIncident(incidentId);
  if (notifications === null) throw new ApiError(404, `Incident ${incidentId} was not found.`);

  // The current service returns Mongoose documents as lean objects. Do not
  // expose internal fields as a substitute for authentication; this endpoint
  // is intended for the local prototype and should be access-controlled later.
  const query = validated(validateNotificationListQuery(req.query));
  let filtered = notifications;
  if (query.status) filtered = filtered.filter((item) => item.status === query.status);
  if (query.method) filtered = filtered.filter((item) => item.method === query.method);
  const total = filtered.length;
  const start = (query.page - 1) * query.limit;
  const pageItems = filtered.slice(start, start + query.limit);

  return res.status(200).json(new ApiResponse(
    200,
    pageItems,
    "Incident notifications retrieved successfully.",
    { total, page: query.page, limit: query.limit, pages: Math.ceil(total / query.limit) }
  ));
});

/** PATCH /api/alerts/notifications/:notificationId/acknowledgement */
export const acknowledgeNotification = asyncHandler(async (req, res) => {
  const notificationId = validated(validateNotificationId(req.params.notificationId));
  const input = validated(validateNotificationAcknowledgement(req.body));
  const result = await acknowledgeNotificationService(notificationId, input);
  if (!result) throw new ApiError(404, `Notification ${notificationId} was not found.`);
  return res.status(200).json(new ApiResponse(200, result.notification, "Notification acknowledged successfully."));
});

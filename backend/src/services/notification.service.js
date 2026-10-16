import { randomUUID } from "node:crypto";
import Incident from "../models/Incident.js";
import Notification from "../models/Notification.js";

function serviceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function makeNotificationId() {
  return `TATR-DISP-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

function notificationForFrontend(document) {
  return {
    status: document.status === "acknowledged" ? "acknowledged" : document.status === "failed" ? "failed" : document.status === "sent" || document.status === "delivered" ? "sent" : "pending",
    notificationId: document.notificationId,
    recipientEmail: document.recipient,
    officialName: document.officialName,
    officialRole: document.officialRole,
    channel: document.channel || "email",
    sentAt: document.sentAt ? new Date(document.sentAt).toISOString() : undefined,
    errorMessage: document.errorMessage || undefined,
    deliveryMethod: document.deliveryMethod || undefined,
    details: document.details || undefined,
    acknowledgedAt: document.acknowledgedAt ? new Date(document.acknowledgedAt).toISOString() : undefined,
    acknowledgedBy: document.acknowledgedBy || undefined,
    acknowledgmentNotes: document.acknowledgmentNotes || undefined,
  };
}

async function saveNotificationToIncident(incident, notification) {
  const snapshot = incident.analysisSnapshot || {};
  snapshot.notification = notificationForFrontend(notification);
  snapshot.lastUpdatedAt = new Date().toISOString();
  snapshot.auditTrail = [
    ...(snapshot.auditTrail || []),
    {
      timestamp: new Date().toISOString(),
      actor: notification.acknowledgedBy || "AgniKavach Notification Service",
      action: notification.status === "acknowledged" ? "notification_acknowledged" : "notification_attempted",
      notes: notification.details || notification.errorMessage || "Notification state updated.",
    },
  ];
  incident.analysisSnapshot = snapshot;
  incident.markModified("analysisSnapshot");
  await incident.save();
}

/**
 * Sends the frontend's existing OfficialAlertModal payload to a configured
 * dispatch webhook and persists both success and failure attempts.
 * A 2xx response means the relay accepted the request; it is not proof that
 * the recipient's inbox received the email.
 */
export async function sendOfficialAlert(payload = {}) {
  const {
    incidentId,
    recipientEmail,
    officialName = "Forest Official",
    officialRole = "",
    coordinates = null,
    locationContext = "",
    confidence = null,
    message = "",
  } = payload;

  if (!incidentId || typeof incidentId !== "string") throw serviceError("Incident ID is required.");
  if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(recipientEmail).trim())) {
    throw serviceError("A valid recipient email address is required.");
  }
  if (!message || typeof message !== "string" || message.trim().length < 10) {
    throw serviceError("The alert message is missing or too short.");
  }

  const incident = await Incident.findOne({ incidentId });
  if (!incident) throw serviceError(`Incident ${incidentId} was not found. Persist the incident before sending an alert.`, 404);

  const notificationId = makeNotificationId();
  const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL?.trim();
  const notification = await Notification.create({
    incidentId: incident._id,
    publicIncidentId: incident.incidentId,
    notificationId,
    recipient: String(recipientEmail).trim(),
    officialName: String(officialName || "Forest Official").trim().slice(0, 200),
    officialRole: String(officialRole || "").trim().slice(0, 200),
    method: "webhook",
    channel: "email",
    subject: `AgniKavach Alert: ${incident.incidentId}`,
    message: message.trim(),
    coordinates,
    locationContext: String(locationContext || "").slice(0, 500),
    confidence,
    status: webhookUrl ? "queued" : "failed",
    deliveryMethod: webhookUrl ? "Forest Operations Dispatch Relay" : "Not configured",
    details: webhookUrl ? "Alert queued for dispatch relay." : "No notification relay is configured. No alert was sent.",
    errorMessage: webhookUrl ? null : "NOTIFICATION_WEBHOOK_URL is not configured.",
  });

  if (!webhookUrl) {
    await saveNotificationToIncident(incident, notification);
    return {
      success: false,
      status: "failed",
      notificationId,
      recipient: notification.recipient,
      officialName: notification.officialName,
      officialRole: notification.officialRole,
      channel: "email",
      timestamp: new Date().toISOString(),
      deliveryMethod: "Not configured",
      details: "Notification failed because NOTIFICATION_WEBHOOK_URL is not configured. No alert was sent.",
      error: "NOTIFICATION_WEBHOOK_URL is not configured.",
    };
  }

  try {
    const relayResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        notificationId,
        incidentId: incident.incidentId,
        recipientEmail: notification.recipient,
        officialName: notification.officialName,
        officialRole: notification.officialRole,
        coordinates,
        locationContext,
        confidence,
        message: notification.message,
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(15000),
    });

    const relayText = await relayResponse.text().catch(() => "");
    if (!relayResponse.ok) {
      notification.status = "failed";
      notification.errorMessage = `Dispatch relay returned HTTP ${relayResponse.status}.`;
      notification.details = `Dispatch relay rejected the alert (HTTP ${relayResponse.status}). ${relayText.slice(0, 160)}`.trim();
      notification.deliveryMethod = `Webhook Relay (${relayResponse.status})`;
    } else {
      notification.status = "sent";
      notification.sentAt = new Date();
      notification.errorMessage = null;
      notification.deliveryMethod = `Webhook Relay (${relayResponse.status})`;
      notification.details = "The dispatch relay accepted the request. Final recipient delivery has not been independently confirmed.";
    }
  } catch (error) {
    notification.status = "failed";
    notification.errorMessage = error?.name === "TimeoutError"
      ? "Dispatch relay timed out."
      : String(error?.message || "Unable to reach dispatch relay.").slice(0, 300);
    notification.details = `Notification transmission failed: ${notification.errorMessage}`;
    notification.deliveryMethod = "Webhook Failed";
  }

  await notification.save();
  await saveNotificationToIncident(incident, notification);

  const succeeded = notification.status === "sent";
  return {
    success: succeeded,
    status: succeeded ? "sent" : "failed",
    notificationId,
    recipient: notification.recipient,
    officialName: notification.officialName,
    officialRole: notification.officialRole,
    channel: "email",
    timestamp: (notification.sentAt || notification.updatedAt || new Date()).toISOString(),
    deliveryMethod: notification.deliveryMethod,
    details: notification.details,
    ...(succeeded ? {} : { error: notification.errorMessage || "Notification transmission failed." }),
  };
}

export async function acknowledgeNotification(notificationId, {
  acknowledgedBy,
  acknowledgmentChannel = "",
  acknowledgmentNotes = "",
} = {}) {
  if (!notificationId || typeof notificationId !== "string") throw serviceError("Notification ID is required.");
  if (!acknowledgedBy || !String(acknowledgedBy).trim()) throw serviceError("Acknowledging officer name is required.");

  const notification = await Notification.findOne({ notificationId });
  if (!notification) return null;

  const now = new Date();
  notification.status = "acknowledged";
  notification.acknowledgedAt = now;
  notification.acknowledgedBy = String(acknowledgedBy).trim().slice(0, 200);
  notification.acknowledgmentChannel = String(acknowledgmentChannel || "").trim().slice(0, 100);
  notification.acknowledgmentNotes = String(acknowledgmentNotes || "").trim().slice(0, 2000);
  notification.details = `Acknowledged by ${notification.acknowledgedBy}${notification.acknowledgmentChannel ? ` via ${notification.acknowledgmentChannel}` : ""}.`;
  await notification.save();

  const incident = await Incident.findById(notification.incidentId);
  if (incident) await saveNotificationToIncident(incident, notification);

  return {
    success: true,
    notification: notificationForFrontend(notification),
  };
}

export async function getNotificationsForIncident(incidentId) {
  const incident = await Incident.findOne({ incidentId }).select("_id").lean();
  if (!incident) return null;
  return Notification.find({ incidentId: incident._id }).sort({ createdAt: -1 }).lean();
}

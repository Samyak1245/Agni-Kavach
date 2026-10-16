import Incident, { incidentStatusValues } from "../models/Incident.js";

const VALID_STATUSES = new Set(incidentStatusValues);
const VALID_PRIORITIES = new Set(["Routine", "Guarded", "Elevated", "Urgent"]);

function makeServiceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function toClientAudit(entry) {
  return {
    timestamp: entry.timestamp ? new Date(entry.timestamp).toISOString() : new Date().toISOString(),
    actor: entry.actor || "operator",
    action: entry.action || "updated",
    notes: entry.note || entry.notes || "",
    ...(entry.previousStatus ? { previousStatus: entry.previousStatus } : {}),
    ...(entry.newStatus ? { newStatus: entry.newStatus } : {}),
  };
}

export function toClientIncident(document) {
  const incident = typeof document?.toObject === "function" ? document.toObject() : document;
  const snapshot = incident.analysisSnapshot || {};
  const center = incident.center || {};
  const storedAudit = Array.isArray(snapshot.auditTrail) && snapshot.auditTrail.length
    ? snapshot.auditTrail
    : incident.auditTrail || [];

  return {
    ...snapshot,
    id: incident.incidentId,
    clusterId: incident.clusterId || snapshot.clusterId || `CLUST-${incident.incidentId}`,
    center: {
      lat: center.latitude ?? snapshot.center?.lat ?? 0,
      lng: center.longitude ?? snapshot.center?.lng ?? 0,
    },
    zone: incident.zone || snapshot.zone || "uncertain_edge",
    status: incident.status || snapshot.status || "new_signal",
    priority: incident.priority || snapshot.priority || "Routine",
    isCleared: Boolean(incident.isCleared),
    clearedAt: incident.clearedAt ? new Date(incident.clearedAt).toISOString() : snapshot.clearedAt,
    clearedBy: incident.clearedBy || snapshot.clearedBy,
    clearedAction: incident.clearedAction || snapshot.clearedAction,
    rangerNotes: incident.rangerNotes || "",
    firstDetectedAt: incident.firstDetectedAt
      ? new Date(incident.firstDetectedAt).toISOString()
      : snapshot.firstDetectedAt,
    lastUpdatedAt: incident.updatedAt
      ? new Date(incident.updatedAt).toISOString()
      : snapshot.lastUpdatedAt,
    auditTrail: storedAudit.map(toClientAudit),
    fireActivityAssessment: incident.fireActivityAssessment || snapshot.fireActivityAssessment,
  };
}

export async function getAllIncidents(filters = {}) {
  const query = {};
  if (filters.status && filters.status !== "all") query.status = filters.status;
  if (filters.priority && filters.priority !== "all") query.priority = filters.priority;
  if (filters.zone && filters.zone !== "all") query.zone = filters.zone;
  if (filters.queue === "cleared") query.isCleared = true;
  if (filters.queue === "active") query.isCleared = false;

  const limit = Math.min(200, Math.max(1, Number.parseInt(filters.limit, 10) || 50));
  const page = Math.max(1, Number.parseInt(filters.page, 10) || 1);
  const [documents, total] = await Promise.all([
    Incident.find(query).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Incident.countDocuments(query),
  ]);

  return {
    data: documents.map(toClientIncident),
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
}

export async function getIncidentById(incidentId) {
  if (!incidentId || typeof incidentId !== "string") throw makeServiceError("A valid incident ID is required.");
  const incident = await Incident.findOne({ incidentId }).lean();
  return incident ? toClientIncident(incident) : null;
}

export async function updateIncidentStatus(incidentId, { status, note = "", actor = "operator" } = {}) {
  if (!VALID_STATUSES.has(status)) throw makeServiceError(`Unsupported incident status: ${status}`);
  const incident = await Incident.findOne({ incidentId });
  if (!incident) return null;

  const previousStatus = incident.status;
  incident.status = status;
  incident.operatorModified = true;
  incident.auditTrail.push({
    action: "status_changed",
    previousStatus,
    newStatus: status,
    note: String(note).slice(0, 2000),
    actor: String(actor || "operator").slice(0, 120),
    timestamp: new Date(),
  });

  const snapshot = incident.analysisSnapshot || {};
  snapshot.status = status;
  snapshot.auditTrail = [
    ...(snapshot.auditTrail || []),
    { timestamp: new Date().toISOString(), actor: String(actor || "operator"), action: "status_changed", notes: String(note).slice(0, 2000), previousStatus, newStatus: status },
  ];
  snapshot.lastUpdatedAt = new Date().toISOString();
  incident.analysisSnapshot = snapshot;
  await incident.save();
  return toClientIncident(incident);
}

export async function updateIncidentPriority(incidentId, { priority, note = "", actor = "operator" } = {}) {
  if (!VALID_PRIORITIES.has(priority)) throw makeServiceError(`Unsupported incident priority: ${priority}`);
  const incident = await Incident.findOne({ incidentId });
  if (!incident) return null;
  const previousPriority = incident.priority;
  incident.priority = priority;
  incident.operatorModified = true;
  incident.auditTrail.push({
    action: "priority_changed",
    note: `${previousPriority} → ${priority}. ${String(note).slice(0, 1800)}`.trim(),
    actor: String(actor || "operator").slice(0, 120),
    timestamp: new Date(),
  });
  const snapshot = incident.analysisSnapshot || {};
  snapshot.priority = priority;
  snapshot.auditTrail = [
    ...(snapshot.auditTrail || []),
    { timestamp: new Date().toISOString(), actor: String(actor || "operator"), action: "priority_changed", notes: String(note).slice(0, 2000) },
  ];
  snapshot.lastUpdatedAt = new Date().toISOString();
  incident.analysisSnapshot = snapshot;
  await incident.save();
  return toClientIncident(incident);
}

export async function updateRangerNotes(incidentId, { notes, actor = "operator" } = {}) {
  if (typeof notes !== "string") throw makeServiceError("Ranger notes must be text.");
  const incident = await Incident.findOne({ incidentId });
  if (!incident) return null;
  const cleanNotes = notes.trim().slice(0, 10000);
  incident.rangerNotes = cleanNotes;
  incident.operatorModified = true;
  incident.auditTrail.push({ action: "ranger_notes_updated", note: cleanNotes, actor: String(actor || "operator").slice(0, 120) });
  const snapshot = incident.analysisSnapshot || {};
  snapshot.rangerNotes = cleanNotes;
  snapshot.auditTrail = [
    ...(snapshot.auditTrail || []),
    { timestamp: new Date().toISOString(), actor: String(actor || "operator"), action: "ranger_notes_updated", notes: cleanNotes },
  ];
  snapshot.lastUpdatedAt = new Date().toISOString();
  incident.analysisSnapshot = snapshot;
  await incident.save();
  return toClientIncident(incident);
}

export async function clearIncident(incidentId, { actor = "operator", note = "Incident marked as cleared by operator." } = {}) {
  const incident = await Incident.findOne({ incidentId });
  if (!incident) return null;
  const now = new Date();
  incident.isCleared = true;
  incident.clearedAt = now;
  incident.clearedBy = String(actor || "operator").slice(0, 120);
  incident.clearedAction = String(note).slice(0, 2000);
  incident.operatorModified = true;
  incident.auditTrail.push({ action: "incident_cleared", note: incident.clearedAction, actor: incident.clearedBy, timestamp: now });
  const snapshot = incident.analysisSnapshot || {};
  snapshot.isCleared = true;
  snapshot.clearedAt = now.toISOString();
  snapshot.clearedBy = incident.clearedBy;
  snapshot.clearedAction = incident.clearedAction;
  snapshot.auditTrail = [
    ...(snapshot.auditTrail || []),
    { timestamp: now.toISOString(), actor: incident.clearedBy, action: "incident_cleared", notes: incident.clearedAction },
  ];
  snapshot.lastUpdatedAt = now.toISOString();
  incident.analysisSnapshot = snapshot;
  await incident.save();
  return toClientIncident(incident);
}

export async function reopenIncident(incidentId, { actor = "operator", note = "Incident reopened for monitoring." } = {}) {
  const incident = await Incident.findOne({ incidentId });
  if (!incident) return null;
  const now = new Date();
  incident.isCleared = false;
  incident.clearedAt = null;
  incident.clearedBy = null;
  incident.clearedAction = null;
  incident.operatorModified = true;
  incident.auditTrail.push({ action: "incident_reopened", note: String(note).slice(0, 2000), actor: String(actor || "operator").slice(0, 120), timestamp: now });
  const snapshot = incident.analysisSnapshot || {};
  snapshot.isCleared = false;
  delete snapshot.clearedAt;
  delete snapshot.clearedBy;
  delete snapshot.clearedAction;
  snapshot.auditTrail = [
    ...(snapshot.auditTrail || []),
    { timestamp: now.toISOString(), actor: String(actor || "operator"), action: "incident_reopened", notes: String(note).slice(0, 2000) },
  ];
  snapshot.lastUpdatedAt = now.toISOString();
  incident.analysisSnapshot = snapshot;
  await incident.save();
  return toClientIncident(incident);
}

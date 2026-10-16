import { createHash } from "node:crypto";
import SatelliteObservation from "../models/SatelliteObservation.js";
import Incident from "../models/Incident.js";
import { toFrontendObservation } from "./firms.service.js";
// Reuse AgniKavach's existing explainable verification engine and its TATR GIS data.
// The backend must be launched through `tsx` so this TypeScript module can be loaded.
import { clusterObservations } from "../../../src/utils/verificationEngine.ts";

function observationTimestamp(observation) {
  const date = String(observation.acqDate || "");
  const time = String(observation.acqTime || "0000").padStart(4, "0");
  const parsed = new Date(`${date}T${time.slice(0, 2)}:${time.slice(2, 4)}:00Z`);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function makeStableIncidentId(observations) {
  // Anchor the identity to the earliest observation in the cluster, not the
  // cluster's array index (which can change after each satellite refresh).
  const anchor = [...observations].sort((a, b) => {
    const timeDifference = observationTimestamp(a) - observationTimestamp(b);
    return timeDifference || String(a.id).localeCompare(String(b.id));
  })[0];
  const digest = createHash("sha256").update(String(anchor?.id || "empty-cluster")).digest("hex");
  return `TATR-INC-${digest.slice(0, 10).toUpperCase()}`;
}

function auditEntriesForModel(entries = []) {
  return entries.map((entry) => ({
    action: entry.action || "verification_update",
    previousStatus: entry.previousStatus || null,
    newStatus: entry.newStatus || null,
    note: entry.notes || entry.note || "",
    actor: entry.actor || "AgniKavach Verification Engine",
    timestamp: entry.timestamp ? new Date(entry.timestamp) : new Date(),
  }));
}

/**
 * Re-runs the repository's cluster + explainable verification engine against
 * recent, persisted FIRMS observations. This does not clear or delete old incidents.
 */
export async function rebuildIncidentsFromObservations({ days = 3, customBoundaryCoords } = {}) {
  const safeDays = Math.min(10, Math.max(1, Number.parseInt(days, 10) || 3));
  const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);
  const documents = await SatelliteObservation.find({ acquiredAt: { $gte: since } })
    .sort({ acquiredAt: 1 })
    .lean();

  if (documents.length === 0) {
    return { success: true, observationsConsidered: 0, incidentsProcessed: 0, incidents: [] };
  }

  const frontendObservations = documents.map(toFrontendObservation);
  const documentByExternalId = new Map(documents.map((document) => [String(document.externalId), document]));
  const generated = clusterObservations(frontendObservations, customBoundaryCoords);
  const persistedIncidents = [];

  for (const evaluated of generated) {
    const incidentId = makeStableIncidentId(evaluated.allObservations || [evaluated.primaryObservation]);
    const linkedObservationIds = (evaluated.allObservations || [])
      .map((observation) => documentByExternalId.get(String(observation.id))?._id)
      .filter(Boolean);

    const existing = await Incident.findOne({ incidentId });
    const preserveOperatorDecision = Boolean(existing?.operatorModified);
    const now = new Date();
    const snapshot = {
      ...evaluated,
      id: incidentId,
      clusterId: `CLUST-${incidentId}`,
      status: preserveOperatorDecision ? existing.status : evaluated.status,
      priority: preserveOperatorDecision ? existing.priority : evaluated.priority,
      isCleared: existing?.isCleared || false,
      rangerNotes: existing?.rangerNotes || "",
      auditTrail: existing?.analysisSnapshot?.auditTrail || evaluated.auditTrail || [],
      notification: existing?.analysisSnapshot?.notification || evaluated.notification,
      lastUpdatedAt: now.toISOString(),
    };

    // The assessment is refreshed every time. Operator-set status/priority and
    // notes survive refreshes so an automatic run cannot overwrite a human decision.
    let incident = existing || new Incident({ incidentId });
    incident.clusterId = snapshot.clusterId;
    incident.title = evaluated.fireActivityAssessment?.inferredFireActivity?.label || "Potential wildfire hotspot";
    incident.center = {
      latitude: evaluated.center.lat,
      longitude: evaluated.center.lng,
    };
    incident.zone = evaluated.zone;
    if (!preserveOperatorDecision) {
      incident.status = evaluated.status;
      incident.priority = evaluated.priority;
    }
    incident.observationIds = linkedObservationIds;
    incident.fireActivityAssessment = evaluated.fireActivityAssessment;
    incident.analysisSnapshot = snapshot;
    incident.firstDetectedAt = evaluated.firstDetectedAt ? new Date(evaluated.firstDetectedAt) : now;
    if (!existing) {
      incident.isCleared = false;
      incident.rangerNotes = "";
      incident.auditTrail = auditEntriesForModel(evaluated.auditTrail);
    }

    await incident.save();
    persistedIncidents.push(incident);
  }

  return {
    success: true,
    observationsConsidered: documents.length,
    incidentsProcessed: persistedIncidents.length,
    incidents: persistedIncidents,
  };
}

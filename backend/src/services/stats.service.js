import Incident from "../models/Incident.js";
import SatelliteObservation from "../models/SatelliteObservation.js";
import Notification from "../models/Notification.js";

export async function getDashboardSummary() {
  const [
    totalIncidents,
    activeIncidents,
    clearedIncidents,
    urgentIncidents,
    totalObservations,
    totalNotifications,
    latestObservation,
    statusGroups,
    priorityGroups,
    zoneGroups,
    notificationGroups,
  ] = await Promise.all([
    Incident.countDocuments({}),
    Incident.countDocuments({ isCleared: false }),
    Incident.countDocuments({ isCleared: true }),
    Incident.countDocuments({ isCleared: false, priority: "Urgent" }),
    SatelliteObservation.countDocuments({}),
    Notification.countDocuments({}),
    SatelliteObservation.findOne({}).sort({ acquiredAt: -1 }).select("acquiredAt").lean(),
    Incident.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Incident.aggregate([{ $group: { _id: "$priority", count: { $sum: 1 } } }]),
    Incident.aggregate([{ $group: { _id: "$zone", count: { $sum: 1 } } }]),
    Notification.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);

  const toCountMap = (groups) => Object.fromEntries(groups.map((group) => [group._id || "unknown", group.count]));

  return {
    generatedAt: new Date().toISOString(),
    incidents: {
      total: totalIncidents,
      active: activeIncidents,
      cleared: clearedIncidents,
      urgentActive: urgentIncidents,
      byStatus: toCountMap(statusGroups),
      byPriority: toCountMap(priorityGroups),
      byZone: toCountMap(zoneGroups),
    },
    observations: {
      total: totalObservations,
      latestAcquiredAt: latestObservation?.acquiredAt
        ? new Date(latestObservation.acquiredAt).toISOString()
        : null,
    },
    notifications: {
      total: totalNotifications,
      byStatus: toCountMap(notificationGroups),
    },
  };
}

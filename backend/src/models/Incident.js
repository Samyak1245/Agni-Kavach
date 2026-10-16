import mongoose from "mongoose";

const incidentStatusValues = [
  "new_signal",
  "under_verification",
  "elevated_concern",
  "high_priority_review",
  "human_verified_fire",
  "likely_false_alarm",
  "closed",
  "unverified",
  "under_review",
  "elevated",
  "high_priority",
  "ranger_dispatched",
  "contained",
];

const auditEntrySchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    previousStatus: { type: String, default: null },
    newStatus: { type: String, default: null },
    note: { type: String, default: "" },
    actor: { type: String, default: "operator" },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const incidentSchema = new mongoose.Schema(
  {
    incidentId: { type: String, required: true, unique: true, index: true },
    clusterId: { type: String, default: null },
    title: { type: String, default: "Potential wildfire hotspot" },
    center: {
      latitude: { type: Number, required: true, min: -90, max: 90 },
      longitude: { type: Number, required: true, min: -180, max: 180 },
    },
    zone: {
      type: String,
      enum: ["core", "buffer", "fringe", "outside", "uncertain_edge", "industrial_exclusion"],
      default: "uncertain_edge",
    },
    status: { type: String, enum: incidentStatusValues, default: "new_signal" },
    priority: {
      type: String,
      enum: ["Routine", "Guarded", "Elevated", "Urgent"],
      default: "Routine",
    },
    observationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "SatelliteObservation" }],
    isCleared: { type: Boolean, default: false },
    clearedAt: { type: Date, default: null },
    clearedBy: { type: String, default: null },
    clearedAction: { type: String, default: null },
    rangerNotes: { type: String, default: "" },
    operatorModified: { type: Boolean, default: false },
    fireActivityAssessment: { type: mongoose.Schema.Types.Mixed, default: null },
    // Preserve the complete VerifiedIncident shape that the React UI already expects.
    analysisSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    auditTrail: { type: [auditEntrySchema], default: [] },
    firstDetectedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

incidentSchema.index({ status: 1, priority: 1, updatedAt: -1 });
incidentSchema.index({ isCleared: 1, updatedAt: -1 });

const Incident = mongoose.model("Incident", incidentSchema);
export { incidentStatusValues };
export default Incident;

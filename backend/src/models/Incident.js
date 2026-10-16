import mongoose from "mongoose";

const auditEntrySchema = new mongoose.Schema(
    {
        action: {
            type: String,
            required: true,
        },

        previousStatus: {
            type: String,
            default: null,
        },

        newStatus: {
            type: String,
            default: null,
        },

        note: {
            type: String,
            default: "",
        },

        actor: {
            type: String,
            default: "system",
        },

        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false }
);

const incidentSchema = new mongoose.Schema(
    {
        incidentId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        title: {
            type: String,
            default: "Potential wildfire hotspot",
        },

        center: {
            latitude: {
                type: Number,
                required: true,
                min: -90,
                max: 90,
            },

            longitude: {
                type: Number,
                required: true,
                min: -180,
                max: 180,
            },
        },

        zone: {
            type: String,
            enum: [
                "core",
                "buffer",
                "fringe",
                "outside",
                "uncertain_edge",
                "industrial_exclusion",
            ],
            default: "uncertain_edge",
        },

        status: {
            type: String,
            enum: [
                "new_signal",
                "under_verification",
                "elevated_concern",
                "high_priority_review",
                "human_verified_fire",
                "likely_false_alarm",
                "closed",
                "contained",
            ],
            default: "new_signal",
        },

        priority: {
            type: String,
            enum: ["Routine", "Guarded", "Elevated", "Urgent"],
            default: "Routine",
        },

        observationIds: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "SatelliteObservation",
            },
        ],

        isCleared: {
            type: Boolean,
            default: false,
        },

        rangerNotes: {
            type: String,
            default: "",
        },

        fireActivityAssessment: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },

        auditTrail: {
            type: [auditEntrySchema],
            default: [],
        },
    },
    { timestamps: true }
);

incidentSchema.index({ status: 1, priority: 1, updatedAt: -1 });

const Incident = mongoose.model("Incident", incidentSchema);

export default Incident;
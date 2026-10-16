import mongoose from "mongoose";

const satelliteObservationSchema = new mongoose.Schema(
    {
        source: {
            type: String,
            default: "NASA_FIRMS",
            required: true,
        },

        externalId: {
            type: String,
            required: true,
        },

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

        acquiredAt: {
            type: Date,
            required: true,
        },

        satellite: {
            type: String,
            default: "Unknown",
        },

        instrument: {
            type: String,
            default: "Unknown",
        },

        confidence: {
            type: String,
            default: "unknown",
        },

        brightness: {
            type: Number,
            default: null,
        },

        frp: {
            type: Number,
            default: null,
            min: 0,
        },

        daynight: {
            type: String,
            enum: ["D", "N", "U"],
            default: "U",
        },

        rawData: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
    },
    { timestamps: true }
);

// The same source observation should not be stored twice.
satelliteObservationSchema.index(
    { source: 1, externalId: 1 },
    { unique: true }
);

satelliteObservationSchema.index({
    latitude: 1,
    longitude: 1,
    acquiredAt: -1,
});

const SatelliteObservation = mongoose.model(
    "SatelliteObservation",
    satelliteObservationSchema
);

export default SatelliteObservation;
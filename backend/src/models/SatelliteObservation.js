import mongoose from "mongoose";

const satelliteObservationSchema = new mongoose.Schema(
  {
    // Store the FIRMS product/source, e.g. VIIRS_SNPP_NRT, so the same
    // coordinate/time from different satellite products remains distinguishable.
    source: { type: String, required: true, default: "VIIRS_SNPP_NRT" },
    externalId: { type: String, required: true },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    acquiredAt: { type: Date, required: true, index: true },
    satellite: { type: String, required: true },
    instrument: { type: String, required: true },
    confidence: { type: mongoose.Schema.Types.Mixed, default: "unavailable" },
    brightness: { type: Number, default: null },
    brightT31: { type: Number, default: null },
    scan: { type: Number, default: null },
    track: { type: Number, default: null },
    frp: { type: Number, default: null, min: 0 },
    daynight: { type: String, enum: ["D", "N", "U"], default: "U" },
    version: { type: String, default: "" },
    ingestedAt: { type: Date, default: Date.now },
    provenance: {
      type: String,
      enum: ["nasa_firms_live", "nasa_firms_cache", "benchmark_scenario", "user_csv"],
      default: "nasa_firms_live",
    },
    rawData: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

satelliteObservationSchema.index({ source: 1, externalId: 1 }, { unique: true });
satelliteObservationSchema.index({ acquiredAt: -1 });
satelliteObservationSchema.index({ latitude: 1, longitude: 1, acquiredAt: -1 });

const SatelliteObservation = mongoose.model(
  "SatelliteObservation",
  satelliteObservationSchema
);

export default SatelliteObservation;

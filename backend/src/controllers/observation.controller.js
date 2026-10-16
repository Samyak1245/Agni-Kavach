import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import SatelliteObservation from "../models/SatelliteObservation.js";
import { fetchNasaFirmsHotspots, toFrontendObservation } from "../services/firms.service.js";
import { rebuildIncidentsFromObservations } from "../services/verification.service.js";
import {
  validateObservationListQuery,
  validateObservationRefreshBody,
} from "../validators/observation.validator.js";

function validated(validation, message = "Observation request validation failed.") {
  if (!validation.isValid) throw new ApiError(400, message, validation.errors);
  return validation.value;
}

/** GET /api/observations?days=3&source=VIIRS_SNPP_NRT&page=1&limit=100 */
export const listObservations = asyncHandler(async (req, res) => {
  const queryInput = validated(validateObservationListQuery(req.query));
  const query = {
    acquiredAt: { $gte: new Date(Date.now() - queryInput.days * 24 * 60 * 60 * 1000) },
  };
  if (queryInput.source) query.source = queryInput.source;

  const skip = (queryInput.page - 1) * queryInput.limit;
  const [documents, total, latest] = await Promise.all([
    SatelliteObservation.find(query)
      .sort({ acquiredAt: -1 })
      .skip(skip)
      .limit(queryInput.limit)
      .lean(),
    SatelliteObservation.countDocuments(query),
    SatelliteObservation.findOne(query).sort({ acquiredAt: -1 }).select("acquiredAt").lean(),
  ]);

  const latestAt = latest?.acquiredAt ? new Date(latest.acquiredAt) : null;
  const freshnessHours = latestAt
    ? Math.max(0, Math.round(((Date.now() - latestAt.getTime()) / 3600000) * 10) / 10)
    : null;

  return res.status(200).json(new ApiResponse(
    200,
    documents.map(toFrontendObservation),
    "Satellite observations retrieved successfully.",
    {
      total,
      page: queryInput.page,
      limit: queryInput.limit,
      pages: Math.ceil(total / queryInput.limit),
      days: queryInput.days,
      source: queryInput.source || "all",
      latestAcquiredAt: latestAt ? latestAt.toISOString() : null,
      dataFreshnessHours: freshnessHours,
    }
  ));
});

/**
 * POST /api/observations/refresh
 * The FIRMS key stays server-side. After a successful fetch, rebuild the
 * incidents from recent persisted observations using the repo's verification
 * engine. A service-level missing-key result is returned as 503.
 */
export const refreshObservations = asyncHandler(async (req, res) => {
  const input = validated(validateObservationRefreshBody(req.body ?? {}));
  let firmsResult;

  try {
    firmsResult = await fetchNasaFirmsHotspots(input);
  } catch (error) {
    throw new ApiError(502, error?.message || "NASA FIRMS request failed.");
  }

  if (!firmsResult.success) {
    return res.status(503).json(new ApiResponse(
      503,
      firmsResult,
      firmsResult.error || "Satellite data source is not available."
    ));
  }

  let verificationResult;
  try {
    verificationResult = await rebuildIncidentsFromObservations({ days: input.days });
  } catch (error) {
    // Hotspots have already been saved at this point. State this clearly so a
    // caller doesn't assume the ingestion was rolled back.
    throw new ApiError(500, `Satellite observations were saved, but incident verification failed: ${error?.message || "unknown verification error"}`);
  }

  return res.status(200).json(new ApiResponse(200, {
    ingestion: firmsResult,
    verification: {
      success: verificationResult.success,
      observationsConsidered: verificationResult.observationsConsidered,
      incidentsProcessed: verificationResult.incidentsProcessed,
      incidents: verificationResult.incidents,
    },
  }, "Satellite data refresh completed."));
});

/** POST /api/observations/verify - re-run clustering on already-saved data. */
export const verifyStoredObservations = asyncHandler(async (req, res) => {
  const input = validated(validateObservationRefreshBody(req.body ?? {}));
  const result = await rebuildIncidentsFromObservations({ days: input.days });
  return res.status(200).json(new ApiResponse(200, result, "Stored observations re-verified successfully."));
});

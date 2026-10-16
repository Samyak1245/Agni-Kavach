import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { getDashboardSummary } from "../services/stats.service.js";

/** GET /api/stats/summary */
export const getStatsSummary = asyncHandler(async (_req, res) => {
  const summary = await getDashboardSummary();
  return res.status(200).json(new ApiResponse(200, summary, "Dashboard statistics retrieved successfully."));
});

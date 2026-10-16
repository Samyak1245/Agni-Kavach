import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  validateIncidentId,
  validateIncidentListQuery,
  validateIncidentStatusUpdate,
  validateIncidentPriorityUpdate,
  validateRangerNotesUpdate,
  validateClearIncident,
  validateReopenIncident,
} from "../validators/incident.validator.js";
import {
  getAllIncidents,
  getIncidentById,
  updateIncidentStatus as updateStatusService,
  updateIncidentPriority as updatePriorityService,
  updateRangerNotes as updateNotesService,
  clearIncident as clearIncidentService,
  reopenIncident as reopenIncidentService,
} from "../services/incident.service.js";

function validated(validation, message = "Request validation failed.") {
  if (!validation.isValid) throw new ApiError(400, message, validation.errors);
  return validation.value;
}

export const listIncidents = asyncHandler(async (req, res) => {
  const filters = validated(validateIncidentListQuery(req.query), "Invalid incident filters.");
  const result = await getAllIncidents(filters);

  return res.status(200).json(new ApiResponse(
    200,
    result.data,
    "Incidents retrieved successfully.",
    { total: result.total, page: result.page, limit: result.limit, pages: result.pages }
  ));
});

export const getIncident = asyncHandler(async (req, res) => {
  const incidentId = validated(validateIncidentId(req.params.incidentId));
  const incident = await getIncidentById(incidentId);
  if (!incident) throw new ApiError(404, `Incident ${incidentId} was not found.`);
  return res.status(200).json(new ApiResponse(200, incident, "Incident retrieved successfully."));
});

export const updateIncidentStatus = asyncHandler(async (req, res) => {
  const incidentId = validated(validateIncidentId(req.params.incidentId));
  const input = validated(validateIncidentStatusUpdate(req.body));
  const incident = await updateStatusService(incidentId, input);
  if (!incident) throw new ApiError(404, `Incident ${incidentId} was not found.`);
  return res.status(200).json(new ApiResponse(200, incident, "Incident status updated successfully."));
});

export const updateIncidentPriority = asyncHandler(async (req, res) => {
  const incidentId = validated(validateIncidentId(req.params.incidentId));
  const input = validated(validateIncidentPriorityUpdate(req.body));
  const incident = await updatePriorityService(incidentId, input);
  if (!incident) throw new ApiError(404, `Incident ${incidentId} was not found.`);
  return res.status(200).json(new ApiResponse(200, incident, "Incident priority updated successfully."));
});

export const updateIncidentNotes = asyncHandler(async (req, res) => {
  const incidentId = validated(validateIncidentId(req.params.incidentId));
  const input = validated(validateRangerNotesUpdate(req.body));
  const incident = await updateNotesService(incidentId, input);
  if (!incident) throw new ApiError(404, `Incident ${incidentId} was not found.`);
  return res.status(200).json(new ApiResponse(200, incident, "Ranger notes saved successfully."));
});

export const clearIncident = asyncHandler(async (req, res) => {
  const incidentId = validated(validateIncidentId(req.params.incidentId));
  const input = validated(validateClearIncident(req.body ?? {}));
  const incident = await clearIncidentService(incidentId, input);
  if (!incident) throw new ApiError(404, `Incident ${incidentId} was not found.`);
  return res.status(200).json(new ApiResponse(200, incident, "Incident marked as cleared."));
});

export const reopenIncident = asyncHandler(async (req, res) => {
  const incidentId = validated(validateIncidentId(req.params.incidentId));
  const input = validated(validateReopenIncident(req.body ?? {}));
  const incident = await reopenIncidentService(incidentId, input);
  if (!incident) throw new ApiError(404, `Incident ${incidentId} was not found.`);
  return res.status(200).json(new ApiResponse(200, incident, "Incident reopened for monitoring."));
});

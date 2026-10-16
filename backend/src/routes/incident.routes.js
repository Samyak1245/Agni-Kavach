import { Router } from "express";
import {
  listIncidents,
  getIncident,
  updateIncidentStatus,
  updateIncidentPriority,
  updateIncidentNotes,
  clearIncident,
  reopenIncident,
} from "../controllers/incident.controller.js";

const router = Router();
router.get("/", listIncidents);
router.get("/:incidentId", getIncident);
router.patch("/:incidentId/status", updateIncidentStatus);
router.patch("/:incidentId/priority", updateIncidentPriority);
router.patch("/:incidentId/notes", updateIncidentNotes);
router.patch("/:incidentId/clear", clearIncident);
router.patch("/:incidentId/reopen", reopenIncident);

export default router;

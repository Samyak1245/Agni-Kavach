import { Router } from "express";
import {
  notifyOfficial,
  listIncidentNotifications,
  acknowledgeNotification,
} from "../controllers/alert.controller.js";

const router = Router();
router.post("/notify", notifyOfficial);
router.get("/incidents/:incidentId/notifications", listIncidentNotifications);
router.patch("/notifications/:notificationId/acknowledgement", acknowledgeNotification);

export default router;

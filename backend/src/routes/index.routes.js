import { Router } from "express";
import incidentRoutes from "./incident.routes.js";
import alertRoutes from "./alert.routes.js";
import observationRoutes from "./observation.routes.js";
import statsRoutes from "./stats.routes.js";

const router = Router();
router.use("/incidents", incidentRoutes);
router.use("/alerts", alertRoutes);
router.use("/observations", observationRoutes);
router.use("/stats", statsRoutes);

export default router;

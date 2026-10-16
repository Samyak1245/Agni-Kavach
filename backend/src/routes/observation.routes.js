import { Router } from "express";
import {
  listObservations,
  refreshObservations,
  verifyStoredObservations,
} from "../controllers/observation.controller.js";

const router = Router();
router.get("/", listObservations);
router.post("/refresh", refreshObservations);
router.post("/verify", verifyStoredObservations);

export default router;

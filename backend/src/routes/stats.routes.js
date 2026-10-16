import { Router } from "express";
import { getStatsSummary } from "../controllers/stats.controller.js";

const router = Router();
router.get("/summary", getStatsSummary);

export default router;

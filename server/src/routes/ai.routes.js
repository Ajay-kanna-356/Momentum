import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  handleGenerateWeeklyReview,
  handleGetLatestWeeklyReview,
} from "../controllers/ai.controller.js";

const router = Router();

// Protect all AI endpoints
router.use(authenticate);

// POST /api/ai/weekly-review - Generate weekly review
router.post("/weekly-review", handleGenerateWeeklyReview);

// GET /api/ai/weekly-review/latest - Fetch latest review
router.get("/weekly-review/latest", handleGetLatestWeeklyReview);

export default router;

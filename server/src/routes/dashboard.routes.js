import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { handleGetDashboard } from "../controllers/dashboard.controller.js";

const router = Router();

router.use(authenticate);

// GET /dashboard/today?date=YYYY-MM-DD
router.get("/today", handleGetDashboard);

export default router;

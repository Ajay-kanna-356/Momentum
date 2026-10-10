import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
    handleListLogsForUser,
    handleDeleteHabitLog,
} from "../controllers/habitLog.controller.js";

const router = Router();

router.use(authenticate);

// List all habit logs for the user (optionally filtered by day / date range)
router.get("/", handleListLogsForUser);

// Delete a specific habit log by its id
router.delete("/:logId", handleDeleteHabitLog);

export default router;

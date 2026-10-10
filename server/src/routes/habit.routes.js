import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
    handleCreateHabit,
    handleListHabits,
    handleGetHabit,
    handleUpdateHabit,
    handleDeleteHabit,
} from "../controllers/habit.controller.js";
import {
    handleGetSchedule,
    handleReplaceSchedule,
    handleClearSchedule,
} from "../controllers/habitSchedule.controller.js";
import {
    handleUpsertHabitLog,
    handleListLogsForHabit,
} from "../controllers/habitLog.controller.js";

const router = Router();

router.use(authenticate);

// Habit CRUD
router.post("/", handleCreateHabit);
router.get("/", handleListHabits);
router.get("/:id", handleGetHabit);
router.patch("/:id", handleUpdateHabit);
router.delete("/:id", handleDeleteHabit);

// Habit Schedule (nested under /habits/:habitId/schedule)
router.get("/:habitId/schedule", handleGetSchedule);
router.put("/:habitId/schedule", handleReplaceSchedule);
router.delete("/:habitId/schedule", handleClearSchedule);

// Habit Logs (nested under /habits/:habitId/logs)
router.put("/:habitId/logs", handleUpsertHabitLog);
router.get("/:habitId/logs", handleListLogsForHabit);

export default router;

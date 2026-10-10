import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
    handleCreateGoal,
    handleListGoals,
    handleGetGoal,
    handleUpdateGoal,
    handleDeleteGoal,
} from "../controllers/goal.controller.js";

const router = Router();

router.use(authenticate);

router.post("/", handleCreateGoal);
router.get("/", handleListGoals);
router.get("/:id", handleGetGoal);
router.patch("/:id", handleUpdateGoal);
router.delete("/:id", handleDeleteGoal);

export default router;

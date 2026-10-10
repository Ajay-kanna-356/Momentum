import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
    handleCreateActivity,
    handleListActivities,
    handleGetActivity,
    handleUpdateActivity,
    handleDeleteActivity,
} from "../controllers/activity.controller.js";

const router = Router();

router.use(authenticate);

router.post("/", handleCreateActivity);
router.get("/", handleListActivities);
router.get("/:id", handleGetActivity);
router.patch("/:id", handleUpdateActivity);
router.delete("/:id", handleDeleteActivity);

export default router;

import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
    getMe,
    googleCallback,
    handleGoogleCallback,
    logout,
    startGoogleAuth,
} from "../controllers/auth.controller.js";

const router = Router();

router.get("/google", startGoogleAuth);
router.get("/google/callback", googleCallback, handleGoogleCallback);
router.get("/me", authenticate, getMe);
router.post("/logout", authenticate, logout);

export default router;

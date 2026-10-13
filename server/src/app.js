import express from "express";
import cors from "cors";
import passport from "passport";
import { initializePassport } from "./config/passport.js";
import authRoutes from "./routes/auth.routes.js";
import goalRoutes from "./routes/goal.routes.js";
import habitRoutes from "./routes/habit.routes.js";
import habitLogRoutes from "./routes/habitLog.routes.js";
import activityRoutes from "./routes/activity.routes.js";
import journalRoutes from "./routes/journal.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";

initializePassport();

const app = express();

app.use(
    cors({
        origin: process.env.CLIENT_URL,
    })
);
app.use(express.json());
app.use(passport.initialize());

app.get("/", (req, res) => {
    res.json({ message: "Momentum API is running 🚀" });
});

app.use("/auth", authRoutes);
app.use("/goals", goalRoutes);
app.use("/habits", habitRoutes);
app.use("/habit-logs", habitLogRoutes);
app.use("/activities", activityRoutes);
app.use("/journal", journalRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/api/ai", aiRoutes);
app.use("/ai", aiRoutes);

// Central error handler (must be last)
app.use(errorHandler);

export default app;

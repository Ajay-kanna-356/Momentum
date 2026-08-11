import express from "express";
import cors from "cors";
import passport from "passport";
import { initializePassport } from "./config/passport.js";
import authRoutes from "./routes/auth.routes.js";

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

export default app;

import passport from "passport";
import { signToken } from "../utils/jwt.js";
import { getCurrentUser } from "../services/auth.service.js";

export function startGoogleAuth(req, res, next) {
    passport.authenticate("google", {
        session: false,
        scope: ["profile", "email"],
    })(req, res, next);
}

export function googleCallback(req, res, next) {
    passport.authenticate("google", {
        session: false,
        failureRedirect: `${process.env.CLIENT_URL}/auth/error`,
    })(req, res, next);
}

export async function handleGoogleCallback(req, res) {
    try {
        const token = signToken(req.user.id);
        const redirectUrl = new URL("/auth/callback", process.env.CLIENT_URL);
        redirectUrl.searchParams.set("token", token);

        res.redirect(redirectUrl.toString());
    } catch {
        res.status(500).json({ error: "Failed to complete Google authentication" });
    }
}

export async function getMe(req, res) {
    try {
        const user = await getCurrentUser(req.user.id);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            profile_picture: user.profilePicture,
            created_at: user.createdAt,
            updated_at: user.updatedAt,
        });
    } catch {
        res.status(500).json({ error: "Failed to fetch current user" });
    }
}

export function logout(_req, res) {
    res.json({ message: "Logged out successfully" });
}

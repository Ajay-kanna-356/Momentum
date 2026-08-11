import { verifyToken } from "../utils/jwt.js";

export function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Authentication required" });
    }

    const token = authHeader.slice("Bearer ".length);

    try {
        const payload = verifyToken(token);
        const userId = Number(payload.sub);

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(401).json({ error: "Invalid token" });
        }

        req.user = { id: userId };
        next();
    } catch {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}

import { AppError } from "../utils/errors.js";
import { Prisma } from "@prisma/client";

/**
 * Central Express error-handling middleware.
 * Must be registered with app.use() AFTER all routes.
 */
export function errorHandler(err, _req, res, _next) {
    // Known application errors
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({ error: err.message });
    }

    // Prisma unique-constraint violations → 409
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
            return res.status(409).json({ error: "A record with those values already exists." });
        }
        if (err.code === "P2025") {
            return res.status(404).json({ error: "Record not found." });
        }
    }

    // Unhandled / unexpected errors → 500 (never expose internals)
    console.error("Unhandled error:", err);
    return res.status(500).json({ error: "An unexpected error occurred." });
}

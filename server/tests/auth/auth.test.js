import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../src/app.js";
import { createTestUser, cleanupTestUsers, disconnectPrisma } from "../helpers.js";

afterAll(async () => {
    await cleanupTestUsers();
    await disconnectPrisma();
});

describe("Authentication Middleware", () => {
    it("returns 401 when no Authorization header is provided", async () => {
        const res = await request(app).get("/goals");
        expect(res.status).toBe(401);
        expect(res.body.error).toBeTruthy();
    });

    it("returns 401 for a malformed token", async () => {
        const res = await request(app)
            .get("/goals")
            .set("Authorization", "Bearer not-a-real-token");
        expect(res.status).toBe(401);
    });

    it("returns 401 for a token signed with wrong secret", async () => {
        const badToken = jwt.sign({ sub: "1" }, "wrong-secret", { expiresIn: "1h" });
        const res = await request(app)
            .get("/goals")
            .set("Authorization", `Bearer ${badToken}`);
        expect(res.status).toBe(401);
    });

    it("returns 401 for a token with non-integer subject", async () => {
        const badToken = jwt.sign({ sub: "not-an-id" }, process.env.JWT_SECRET, {
            expiresIn: "1h",
        });
        const res = await request(app)
            .get("/goals")
            .set("Authorization", `Bearer ${badToken}`);
        expect(res.status).toBe(401);
    });

    it("identifies the correct user from a valid token - authenticated request succeeds", async () => {
        await createTestUser(); // just needs to exist
        const { authHeader } = await createTestUser();
        const res = await request(app).get("/goals").set("Authorization", authHeader);
        expect(res.status).toBe(200);
    });
});

describe("GET /auth/me", () => {
    it("returns user profile for authenticated user", async () => {
        const { user, authHeader } = await createTestUser();
        const res = await request(app).get("/auth/me").set("Authorization", authHeader);
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(user.id);
        expect(res.body.email).toBe(user.email);
    });

    it("returns 401 when unauthenticated", async () => {
        const res = await request(app).get("/auth/me");
        expect(res.status).toBe(401);
    });
});

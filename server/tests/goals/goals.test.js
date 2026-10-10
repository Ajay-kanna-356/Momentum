import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { createTestUser, cleanupTestUsers, disconnectPrisma } from "../helpers.js";

let user1, user2, authHeader1, authHeader2;

beforeAll(async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    user1 = u1.user;
    authHeader1 = u1.authHeader;
    user2 = u2.user;
    authHeader2 = u2.authHeader;
});

afterAll(async () => {
    await cleanupTestUsers();
    await disconnectPrisma();
});

describe("Goals API", () => {
    let goalId;

    describe("POST /goals", () => {
        it("creates a goal successfully", async () => {
            const res = await request(app)
                .post("/goals")
                .set("Authorization", authHeader1)
                .send({ title: "Crack SDE Interviews", description: "Land a job at top tech", status: "active" });
            expect(res.status).toBe(201);
            expect(res.body.id).toBeDefined();
            expect(res.body.title).toBe("Crack SDE Interviews");
            expect(res.body.userId).toBe(user1.id);
            goalId = res.body.id;
        });

        it("rejects creation with missing title", async () => {
            const res = await request(app)
                .post("/goals")
                .set("Authorization", authHeader1)
                .send({ description: "No title" });
            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/title/i);
        });

        it("rejects creation with invalid status", async () => {
            const res = await request(app)
                .post("/goals")
                .set("Authorization", authHeader1)
                .send({ title: "Test", status: "invalid_status" });
            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/status/i);
        });

        it("rejects creation with invalid targetDate", async () => {
            const res = await request(app)
                .post("/goals")
                .set("Authorization", authHeader1)
                .send({ title: "Test", targetDate: "not-a-date" });
            expect(res.status).toBe(400);
        });

        it("creates a goal with targetDate", async () => {
            const res = await request(app)
                .post("/goals")
                .set("Authorization", authHeader1)
                .send({ title: "Fitness Goal", targetDate: "2026-12-31" });
            expect(res.status).toBe(201);
            expect(res.body.targetDate).toBeTruthy();
        });

        it("returns 401 when unauthenticated", async () => {
            const res = await request(app).post("/goals").send({ title: "Test" });
            expect(res.status).toBe(401);
        });
    });

    describe("GET /goals", () => {
        it("lists goals for the authenticated user", async () => {
            const res = await request(app)
                .get("/goals")
                .set("Authorization", authHeader1);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.every((g) => g.userId === user1.id)).toBe(true);
        });

        it("does not return another user's goals", async () => {
            // Create a goal for user2
            await request(app)
                .post("/goals")
                .set("Authorization", authHeader2)
                .send({ title: "User2 Goal" });

            const res = await request(app)
                .get("/goals")
                .set("Authorization", authHeader1);
            expect(res.body.every((g) => g.userId === user1.id)).toBe(true);
        });
    });

    describe("GET /goals/:id", () => {
        it("retrieves a specific goal", async () => {
            const res = await request(app)
                .get(`/goals/${goalId}`)
                .set("Authorization", authHeader1);
            expect(res.status).toBe(200);
            expect(res.body.id).toBe(goalId);
        });

        it("returns 404 for a non-existent goal", async () => {
            const res = await request(app)
                .get("/goals/999999")
                .set("Authorization", authHeader1);
            expect(res.status).toBe(404);
        });

        it("returns 403 when accessing another user's goal", async () => {
            const res = await request(app)
                .get(`/goals/${goalId}`)
                .set("Authorization", authHeader2);
            expect(res.status).toBe(403);
        });
    });

    describe("PATCH /goals/:id", () => {
        it("updates a goal's title and status", async () => {
            const res = await request(app)
                .patch(`/goals/${goalId}`)
                .set("Authorization", authHeader1)
                .send({ title: "Updated Goal", status: "completed" });
            expect(res.status).toBe(200);
            expect(res.body.title).toBe("Updated Goal");
            expect(res.body.status).toBe("completed");
        });

        it("rejects update with invalid status", async () => {
            const res = await request(app)
                .patch(`/goals/${goalId}`)
                .set("Authorization", authHeader1)
                .send({ status: "invalid" });
            expect(res.status).toBe(400);
        });

        it("returns 403 when updating another user's goal", async () => {
            const res = await request(app)
                .patch(`/goals/${goalId}`)
                .set("Authorization", authHeader2)
                .send({ title: "Hijacked" });
            expect(res.status).toBe(403);
        });
    });

    describe("DELETE /goals/:id", () => {
        it("deletes a goal and returns 204", async () => {
            const create = await request(app)
                .post("/goals")
                .set("Authorization", authHeader1)
                .send({ title: "To Delete" });
            const id = create.body.id;

            const del = await request(app)
                .delete(`/goals/${id}`)
                .set("Authorization", authHeader1);
            expect(del.status).toBe(204);

            const get = await request(app)
                .get(`/goals/${id}`)
                .set("Authorization", authHeader1);
            expect(get.status).toBe(404);
        });

        it("returns 403 when deleting another user's goal", async () => {
            const res = await request(app)
                .delete(`/goals/${goalId}`)
                .set("Authorization", authHeader2);
            expect(res.status).toBe(403);
        });
    });
});

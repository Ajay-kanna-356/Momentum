import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { createTestUser, cleanupTestUsers, disconnectPrisma } from "../helpers.js";

let user1, user2, authHeader1, authHeader2, habitId, user2HabitId;

beforeAll(async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    user1 = u1.user;
    authHeader1 = u1.authHeader;
    user2 = u2.user;
    authHeader2 = u2.authHeader;

    const h1 = await request(app)
        .post("/habits")
        .set("Authorization", authHeader1)
        .send({ title: "Running" });
    habitId = h1.body.id;

    const h2 = await request(app)
        .post("/habits")
        .set("Authorization", authHeader2)
        .send({ title: "User2 Running" });
    user2HabitId = h2.body.id;
});

afterAll(async () => {
    await cleanupTestUsers();
    await disconnectPrisma();
});

describe("Habit Log API", () => {
    describe("PUT /habits/:habitId/logs", () => {
        it("marks a habit as completed for a day", async () => {
            const res = await request(app)
                .put(`/habits/${habitId}/logs`)
                .set("Authorization", authHeader1)
                .send({ day: "2026-10-10", completed: true });
            expect(res.status).toBe(200);
            expect(res.body.completed).toBe(true);
            expect(res.body.habitId).toBe(habitId);
        });

        it("changes completed from true to false (update, no duplicate)", async () => {
            const res = await request(app)
                .put(`/habits/${habitId}/logs`)
                .set("Authorization", authHeader1)
                .send({ day: "2026-10-10", completed: false });
            expect(res.status).toBe(200);
            expect(res.body.completed).toBe(false);
        });

        it("repeated requests for same day do not create duplicates", async () => {
            await request(app)
                .put(`/habits/${habitId}/logs`)
                .set("Authorization", authHeader1)
                .send({ day: "2026-10-11", completed: true });

            await request(app)
                .put(`/habits/${habitId}/logs`)
                .set("Authorization", authHeader1)
                .send({ day: "2026-10-11", completed: true });

            const logs = await request(app)
                .get(`/habits/${habitId}/logs`)
                .set("Authorization", authHeader1);

            const logsForDay = logs.body.filter((l) => {
                const d = new Date(l.day).toISOString().slice(0, 10);
                return d === "2026-10-11";
            });
            expect(logsForDay.length).toBe(1);
        });

        it("rejects invalid date format", async () => {
            const res = await request(app)
                .put(`/habits/${habitId}/logs`)
                .set("Authorization", authHeader1)
                .send({ day: "10-10-2026", completed: true });
            expect(res.status).toBe(400);
        });

        it("rejects non-boolean completed field", async () => {
            const res = await request(app)
                .put(`/habits/${habitId}/logs`)
                .set("Authorization", authHeader1)
                .send({ day: "2026-10-12", completed: "yes" });
            expect(res.status).toBe(400);
        });

        it("returns 403 when accessing another user's habit", async () => {
            const res = await request(app)
                .put(`/habits/${user2HabitId}/logs`)
                .set("Authorization", authHeader1)
                .send({ day: "2026-10-10", completed: true });
            expect(res.status).toBe(403);
        });
    });

    describe("GET /habits/:habitId/logs", () => {
        it("lists logs for a habit", async () => {
            const res = await request(app)
                .get(`/habits/${habitId}/logs`)
                .set("Authorization", authHeader1);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it("filters logs by date range", async () => {
            const res = await request(app)
                .get(`/habits/${habitId}/logs?from=2026-10-10&to=2026-10-11`)
                .set("Authorization", authHeader1);
            expect(res.status).toBe(200);
        });

        it("returns 403 for another user's habit", async () => {
            const res = await request(app)
                .get(`/habits/${user2HabitId}/logs`)
                .set("Authorization", authHeader1);
            expect(res.status).toBe(403);
        });
    });

    describe("GET /habit-logs", () => {
        it("lists all logs for the user", async () => {
            const res = await request(app)
                .get("/habit-logs")
                .set("Authorization", authHeader1);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it("filters by specific day", async () => {
            const res = await request(app)
                .get("/habit-logs?day=2026-10-10")
                .set("Authorization", authHeader1);
            expect(res.status).toBe(200);
        });
    });

    describe("DELETE /habit-logs/:logId", () => {
        it("deletes a habit log", async () => {
            const log = await request(app)
                .put(`/habits/${habitId}/logs`)
                .set("Authorization", authHeader1)
                .send({ day: "2026-09-05", completed: true });
            const logId = log.body.id;

            const del = await request(app)
                .delete(`/habit-logs/${logId}`)
                .set("Authorization", authHeader1);
            expect(del.status).toBe(204);
        });

        it("returns 403 when deleting another user's log", async () => {
            const log = await request(app)
                .put(`/habits/${user2HabitId}/logs`)
                .set("Authorization", authHeader2)
                .send({ day: "2026-09-06", completed: true });
            const logId = log.body.id;

            const del = await request(app)
                .delete(`/habit-logs/${logId}`)
                .set("Authorization", authHeader1);
            expect(del.status).toBe(403);
        });
    });
});

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { createTestUser, cleanupTestUsers, disconnectPrisma } from "../helpers.js";

let user1, authHeader1, goalId, habitId;

beforeAll(async () => {
    const u1 = await createTestUser();
    user1 = u1.user;
    authHeader1 = u1.authHeader;

    // Create goal
    const g = await request(app)
        .post("/goals")
        .set("Authorization", authHeader1)
        .send({ title: "Dashboard Goal" });
    goalId = g.body.id;

    // Create habit linked to goal, scheduled for Saturday (2026-10-10 is a Saturday)
    const h = await request(app)
        .post("/habits")
        .set("Authorization", authHeader1)
        .send({ title: "Dashboard Habit", goalId });
    habitId = h.body.id;

    await request(app)
        .put(`/habits/${habitId}/schedule`)
        .set("Authorization", authHeader1)
        .send({ daysOfWeek: ["SATURDAY"] });

    // Create a habit log and activity for that day
    await request(app)
        .put(`/habits/${habitId}/logs`)
        .set("Authorization", authHeader1)
        .send({ day: "2026-10-10", completed: true });

    await request(app)
        .post("/activities")
        .set("Authorization", authHeader1)
        .send({ title: "Dashboard Activity", day: "2026-10-10", habitId });

    // Create journal entry
    await request(app)
        .post("/journal")
        .set("Authorization", authHeader1)
        .send({ day: "2026-10-10", content: "Dashboard test day" });
});

afterAll(async () => {
    await cleanupTestUsers();
    await disconnectPrisma();
});

describe("Dashboard API", () => {
    describe("GET /dashboard/today", () => {
        it("returns 401 when unauthenticated", async () => {
            const res = await request(app).get("/dashboard/today?date=2026-10-10");
            expect(res.status).toBe(401);
        });

        it("returns dashboard data for a specific date", async () => {
            const res = await request(app)
                .get("/dashboard/today?date=2026-10-10")
                .set("Authorization", authHeader1);
            expect(res.status).toBe(200);
            expect(res.body.date).toBe("2026-10-10");
            expect(res.body.dayOfWeek).toBe("SATURDAY");
            expect(res.body.scheduledHabits).toBeDefined();
            expect(res.body.habitLogs).toBeDefined();
            expect(res.body.activities).toBeDefined();
            expect(res.body.journalEntry).toBeDefined();
        });

        it("includes the scheduled habit in the response", async () => {
            const res = await request(app)
                .get("/dashboard/today?date=2026-10-10")
                .set("Authorization", authHeader1);
            const habit = res.body.scheduledHabits.find((h) => h.id === habitId);
            expect(habit).toBeDefined();
            expect(habit.goal).toBeDefined();
        });

        it("includes the habit log for that day", async () => {
            const res = await request(app)
                .get("/dashboard/today?date=2026-10-10")
                .set("Authorization", authHeader1);
            const log = res.body.habitLogs.find((l) => l.habitId === habitId);
            expect(log).toBeDefined();
            expect(log.completed).toBe(true);
        });

        it("includes activities for that day", async () => {
            const res = await request(app)
                .get("/dashboard/today?date=2026-10-10")
                .set("Authorization", authHeader1);
            expect(res.body.activities.length).toBeGreaterThan(0);
        });

        it("includes the journal entry for that day", async () => {
            const res = await request(app)
                .get("/dashboard/today?date=2026-10-10")
                .set("Authorization", authHeader1);
            expect(res.body.journalEntry).toBeTruthy();
            expect(res.body.journalEntry.content).toBe("Dashboard test day");
        });

        it("returns null journalEntry when no entry exists", async () => {
            const res = await request(app)
                .get("/dashboard/today?date=2026-01-01")
                .set("Authorization", authHeader1);
            expect(res.status).toBe(200);
            expect(res.body.journalEntry).toBeNull();
        });

        it("rejects invalid date format", async () => {
            const res = await request(app)
                .get("/dashboard/today?date=not-a-date")
                .set("Authorization", authHeader1);
            expect(res.status).toBe(400);
        });

        it("falls back to current UTC date when no date param is given", async () => {
            const res = await request(app)
                .get("/dashboard/today")
                .set("Authorization", authHeader1);
            expect(res.status).toBe(200);
            expect(res.body.date).toBeDefined();
        });
    });
});

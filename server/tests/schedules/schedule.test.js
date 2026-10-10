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
        .send({ title: "Gym" });
    habitId = h1.body.id;

    const h2 = await request(app)
        .post("/habits")
        .set("Authorization", authHeader2)
        .send({ title: "User2 Gym" });
    user2HabitId = h2.body.id;
});

afterAll(async () => {
    await cleanupTestUsers();
    await disconnectPrisma();
});

describe("Habit Schedule API", () => {
    describe("GET /habits/:habitId/schedule", () => {
        it("returns empty schedule for a new habit", async () => {
            const res = await request(app)
                .get(`/habits/${habitId}/schedule`)
                .set("Authorization", authHeader1);
            expect(res.status).toBe(200);
            expect(res.body.schedule).toEqual([]);
        });

        it("returns 403 for another user's habit", async () => {
            const res = await request(app)
                .get(`/habits/${user2HabitId}/schedule`)
                .set("Authorization", authHeader1);
            expect(res.status).toBe(403);
        });
    });

    describe("PUT /habits/:habitId/schedule", () => {
        it("saves Monday, Friday, Saturday", async () => {
            const res = await request(app)
                .put(`/habits/${habitId}/schedule`)
                .set("Authorization", authHeader1)
                .send({ daysOfWeek: ["MONDAY", "FRIDAY", "SATURDAY"] });
            expect(res.status).toBe(200);
            const days = res.body.schedule.map((s) => s.dayOfWeek);
            expect(days).toContain("MONDAY");
            expect(days).toContain("FRIDAY");
            expect(days).toContain("SATURDAY");
            expect(days.length).toBe(3);
        });

        it("rejects invalid day values", async () => {
            const res = await request(app)
                .put(`/habits/${habitId}/schedule`)
                .set("Authorization", authHeader1)
                .send({ daysOfWeek: ["MONDAY", "FUNDAY"] });
            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/FUNDAY/i);
        });

        it("deduplicates repeated days", async () => {
            const res = await request(app)
                .put(`/habits/${habitId}/schedule`)
                .set("Authorization", authHeader1)
                .send({ daysOfWeek: ["MONDAY", "MONDAY", "FRIDAY"] });
            expect(res.status).toBe(200);
            expect(res.body.schedule.length).toBe(2);
        });

        it("replaces the entire schedule", async () => {
            // Set to Mon, Fri, Sat
            await request(app)
                .put(`/habits/${habitId}/schedule`)
                .set("Authorization", authHeader1)
                .send({ daysOfWeek: ["MONDAY", "FRIDAY", "SATURDAY"] });

            // Replace with just Wed
            const res = await request(app)
                .put(`/habits/${habitId}/schedule`)
                .set("Authorization", authHeader1)
                .send({ daysOfWeek: ["WEDNESDAY"] });
            expect(res.status).toBe(200);
            expect(res.body.schedule.length).toBe(1);
            expect(res.body.schedule[0].dayOfWeek).toBe("WEDNESDAY");
        });

        it("does not modify HabitLogs when schedule is replaced", async () => {
            // First, create a HabitLog
            const logRes = await request(app)
                .put(`/habits/${habitId}/logs`)
                .set("Authorization", authHeader1)
                .send({ day: "2026-09-01", completed: true });
            expect(logRes.status).toBe(200);

            // Replace schedule
            await request(app)
                .put(`/habits/${habitId}/schedule`)
                .set("Authorization", authHeader1)
                .send({ daysOfWeek: ["TUESDAY", "THURSDAY"] });

            // Log should still exist
            const logsRes = await request(app)
                .get(`/habits/${habitId}/logs`)
                .set("Authorization", authHeader1);
            expect(logsRes.status).toBe(200);
            expect(logsRes.body.some((l) => l.completed === true)).toBe(true);
        });

        it("accepts empty array to clear all days", async () => {
            const res = await request(app)
                .put(`/habits/${habitId}/schedule`)
                .set("Authorization", authHeader1)
                .send({ daysOfWeek: [] });
            expect(res.status).toBe(200);
            expect(res.body.schedule).toEqual([]);
        });

        it("returns 403 for another user's habit", async () => {
            const res = await request(app)
                .put(`/habits/${user2HabitId}/schedule`)
                .set("Authorization", authHeader1)
                .send({ daysOfWeek: ["MONDAY"] });
            expect(res.status).toBe(403);
        });

        it("returns 400 when daysOfWeek is not an array", async () => {
            const res = await request(app)
                .put(`/habits/${habitId}/schedule`)
                .set("Authorization", authHeader1)
                .send({ daysOfWeek: "MONDAY" });
            expect(res.status).toBe(400);
        });
    });

    describe("DELETE /habits/:habitId/schedule", () => {
        it("clears all scheduled days", async () => {
            // First set some days
            await request(app)
                .put(`/habits/${habitId}/schedule`)
                .set("Authorization", authHeader1)
                .send({ daysOfWeek: ["MONDAY", "FRIDAY"] });

            const res = await request(app)
                .delete(`/habits/${habitId}/schedule`)
                .set("Authorization", authHeader1);
            expect(res.status).toBe(204);

            const getRes = await request(app)
                .get(`/habits/${habitId}/schedule`)
                .set("Authorization", authHeader1);
            expect(getRes.body.schedule).toEqual([]);
        });

        it("returns 403 for another user's habit", async () => {
            const res = await request(app)
                .delete(`/habits/${user2HabitId}/schedule`)
                .set("Authorization", authHeader1);
            expect(res.status).toBe(403);
        });
    });
});

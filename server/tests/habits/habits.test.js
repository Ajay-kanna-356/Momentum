import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { createTestUser, cleanupTestUsers, disconnectPrisma } from "../helpers.js";

let user1, user2, authHeader1, authHeader2, goalId;

beforeAll(async () => {
    const u1 = await createTestUser();
    const u2 = await createTestUser();
    user1 = u1.user;
    authHeader1 = u1.authHeader;
    user2 = u2.user;
    authHeader2 = u2.authHeader;

    // Create a goal for user1 to use in habit tests
    const goalRes = await request(app)
        .post("/goals")
        .set("Authorization", authHeader1)
        .send({ title: "SDE Prep" });
    goalId = goalRes.body.id;
});

afterAll(async () => {
    await cleanupTestUsers();
    await disconnectPrisma();
});

describe("Habits API", () => {
    let habitId;
    let independentHabitId;

    describe("POST /habits", () => {
        it("creates an independent habit (no goalId)", async () => {
            const res = await request(app)
                .post("/habits")
                .set("Authorization", authHeader1)
                .send({ title: "Drink Water", description: "3L daily" });
            expect(res.status).toBe(201);
            expect(res.body.id).toBeDefined();
            expect(res.body.goalId).toBeNull();
            expect(res.body.userId).toBe(user1.id);
            independentHabitId = res.body.id;
        });

        it("creates a habit linked to a goal", async () => {
            const res = await request(app)
                .post("/habits")
                .set("Authorization", authHeader1)
                .send({ title: "Solve DSA", goalId });
            expect(res.status).toBe(201);
            expect(res.body.goalId).toBe(goalId);
            expect(res.body.goal).toBeDefined();
            expect(res.body.goal.id).toBe(goalId);
            habitId = res.body.id;
        });

        it("rejects habit linked to another user's goal", async () => {
            const user2GoalRes = await request(app)
                .post("/goals")
                .set("Authorization", authHeader2)
                .send({ title: "User2 Goal" });
            const user2GoalId = user2GoalRes.body.id;

            const res = await request(app)
                .post("/habits")
                .set("Authorization", authHeader1)
                .send({ title: "Bad Habit", goalId: user2GoalId });
            expect(res.status).toBe(403);
        });

        it("rejects creation with missing title", async () => {
            const res = await request(app)
                .post("/habits")
                .set("Authorization", authHeader1)
                .send({ description: "No title" });
            expect(res.status).toBe(400);
        });

        it("rejects creation with invalid status", async () => {
            const res = await request(app)
                .post("/habits")
                .set("Authorization", authHeader1)
                .send({ title: "Test", status: "deleted" });
            expect(res.status).toBe(400);
        });

        it("returns 401 when unauthenticated", async () => {
            const res = await request(app).post("/habits").send({ title: "Test" });
            expect(res.status).toBe(401);
        });
    });

    describe("GET /habits", () => {
        it("lists habits for the authenticated user", async () => {
            const res = await request(app)
                .get("/habits")
                .set("Authorization", authHeader1);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.every((h) => h.userId === user1.id)).toBe(true);
        });

        it("does not return another user's habits", async () => {
            await request(app)
                .post("/habits")
                .set("Authorization", authHeader2)
                .send({ title: "User2 Habit" });

            const res = await request(app)
                .get("/habits")
                .set("Authorization", authHeader1);
            expect(res.body.every((h) => h.userId === user1.id)).toBe(true);
        });

        it("filters habits by status", async () => {
            const res = await request(app)
                .get("/habits?status=active")
                .set("Authorization", authHeader1);
            expect(res.status).toBe(200);
            expect(res.body.every((h) => h.status === "active")).toBe(true);
        });
    });

    describe("GET /habits/:id", () => {
        it("retrieves a specific habit with schedule and goal info", async () => {
            const res = await request(app)
                .get(`/habits/${habitId}`)
                .set("Authorization", authHeader1);
            expect(res.status).toBe(200);
            expect(res.body.id).toBe(habitId);
            expect(res.body.schedules).toBeDefined();
            expect(res.body.goal).toBeDefined();
        });

        it("returns 404 for non-existent habit", async () => {
            const res = await request(app)
                .get("/habits/999999")
                .set("Authorization", authHeader1);
            expect(res.status).toBe(404);
        });

        it("returns 403 when accessing another user's habit", async () => {
            const res = await request(app)
                .get(`/habits/${habitId}`)
                .set("Authorization", authHeader2);
            expect(res.status).toBe(403);
        });
    });

    describe("PATCH /habits/:id", () => {
        it("updates habit title and description", async () => {
            const res = await request(app)
                .patch(`/habits/${habitId}`)
                .set("Authorization", authHeader1)
                .send({ title: "Updated DSA", description: "Updated description" });
            expect(res.status).toBe(200);
            expect(res.body.title).toBe("Updated DSA");
        });

        it("archives a habit (status update)", async () => {
            const res = await request(app)
                .patch(`/habits/${habitId}`)
                .set("Authorization", authHeader1)
                .send({ status: "archived" });
            expect(res.status).toBe(200);
            expect(res.body.status).toBe("archived");
        });

        it("unlinks a habit from its goal", async () => {
            const res = await request(app)
                .patch(`/habits/${habitId}`)
                .set("Authorization", authHeader1)
                .send({ goalId: null });
            expect(res.status).toBe(200);
            expect(res.body.goalId).toBeNull();
        });

        it("returns 403 when updating another user's habit", async () => {
            const res = await request(app)
                .patch(`/habits/${habitId}`)
                .set("Authorization", authHeader2)
                .send({ title: "Hijacked" });
            expect(res.status).toBe(403);
        });
    });

    describe("DELETE /habits/:id", () => {
        it("deletes a habit (activities should be preserved with null habitId)", async () => {
            // Create a temporary habit
            const createHabit = await request(app)
                .post("/habits")
                .set("Authorization", authHeader1)
                .send({ title: "Temp Habit for deletion test" });
            const tempHabitId = createHabit.body.id;

            // Create an activity linked to it
            const createActivity = await request(app)
                .post("/activities")
                .set("Authorization", authHeader1)
                .send({ title: "Temp activity", day: "2026-10-01", habitId: tempHabitId });
            const activityId = createActivity.body.id;

            // Delete the habit
            const del = await request(app)
                .delete(`/habits/${tempHabitId}`)
                .set("Authorization", authHeader1);
            expect(del.status).toBe(204);

            // Activity should still exist but with habitId: null
            const getActivity = await request(app)
                .get(`/activities/${activityId}`)
                .set("Authorization", authHeader1);
            expect(getActivity.status).toBe(200);
            expect(getActivity.body.habitId).toBeNull();
        });

        it("returns 403 when deleting another user's habit", async () => {
            const res = await request(app)
                .delete(`/habits/${independentHabitId}`)
                .set("Authorization", authHeader2);
            expect(res.status).toBe(403);
        });
    });
});

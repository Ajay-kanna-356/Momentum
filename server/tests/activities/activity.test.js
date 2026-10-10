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
        .send({ title: "User2 Yoga" });
    user2HabitId = h2.body.id;

    // Set a schedule for the gym habit (Mon, Fri, Sat)
    await request(app)
        .put(`/habits/${habitId}/schedule`)
        .set("Authorization", authHeader1)
        .send({ daysOfWeek: ["MONDAY", "FRIDAY", "SATURDAY"] });
});

afterAll(async () => {
    await cleanupTestUsers();
    await disconnectPrisma();
});

describe("Activities API", () => {
    let activityId;
    let linkedActivityId;

    describe("POST /activities", () => {
        it("creates an activity without a habit (standalone)", async () => {
            const res = await request(app)
                .post("/activities")
                .set("Authorization", authHeader1)
                .send({ title: "Played Chess", day: "2026-10-10", duration: 120 });
            expect(res.status).toBe(201);
            expect(res.body.id).toBeDefined();
            expect(res.body.habitId).toBeNull();
            expect(res.body.userId).toBe(user1.id);
            activityId = res.body.id;
        });

        it("creates an activity linked to a habit", async () => {
            const res = await request(app)
                .post("/activities")
                .set("Authorization", authHeader1)
                .send({
                    title: "Gym Session",
                    day: "2026-10-10",
                    duration: 60,
                    habitId,
                });
            expect(res.status).toBe(201);
            expect(res.body.habitId).toBe(habitId);
            expect(res.body.habit.id).toBe(habitId);
            linkedActivityId = res.body.id;
        });

        it("creates multiple activities for the same habit on the same day", async () => {
            // First activity already created above (linkedActivityId)
            const res = await request(app)
                .post("/activities")
                .set("Authorization", authHeader1)
                .send({
                    title: "Evening Gym",
                    day: "2026-10-10",
                    duration: 45,
                    habitId,
                });
            expect(res.status).toBe(201);
            // Should be a different record
            expect(res.body.id).not.toBe(linkedActivityId);
        });

        it("creates an activity on an unscheduled day (Tuesday, Gym scheduled Mon/Fri/Sat)", async () => {
            // Tuesday 2026-10-13 is not a scheduled day for Gym
            const res = await request(app)
                .post("/activities")
                .set("Authorization", authHeader1)
                .send({
                    title: "Gym",
                    day: "2026-10-13",
                    duration: 45,
                    habitId,
                });
            expect(res.status).toBe(201);
            expect(res.body.habitId).toBe(habitId);
        });

        it("rejects activity linked to another user's habit", async () => {
            const res = await request(app)
                .post("/activities")
                .set("Authorization", authHeader1)
                .send({
                    title: "Cross-user",
                    day: "2026-10-10",
                    habitId: user2HabitId,
                });
            expect(res.status).toBe(403);
        });

        it("rejects activity with missing title", async () => {
            const res = await request(app)
                .post("/activities")
                .set("Authorization", authHeader1)
                .send({ day: "2026-10-10" });
            expect(res.status).toBe(400);
        });

        it("rejects activity with missing day", async () => {
            const res = await request(app)
                .post("/activities")
                .set("Authorization", authHeader1)
                .send({ title: "No Day" });
            expect(res.status).toBe(400);
        });

        it("rejects invalid date format", async () => {
            const res = await request(app)
                .post("/activities")
                .set("Authorization", authHeader1)
                .send({ title: "Test", day: "10/10/2026" });
            expect(res.status).toBe(400);
        });

        it("creates an activity with startTime and endTime", async () => {
            const res = await request(app)
                .post("/activities")
                .set("Authorization", authHeader1)
                .send({
                    title: "Morning Run",
                    day: "2026-10-10",
                    startTime: "07:00",
                    endTime: "07:45",
                    duration: 45,
                });
            expect(res.status).toBe(201);
            expect(res.body.startTime).toBeDefined();
        });

        it("returns 401 when unauthenticated", async () => {
            const res = await request(app)
                .post("/activities")
                .send({ title: "Test", day: "2026-10-10" });
            expect(res.status).toBe(401);
        });
    });

    describe("GET /activities", () => {
        it("lists activities for the authenticated user", async () => {
            const res = await request(app)
                .get("/activities")
                .set("Authorization", authHeader1);
            expect(res.status).toBe(200);
            expect(res.body.items).toBeDefined();
            expect(res.body.total).toBeDefined();
            expect(res.body.items.every((a) => a.userId === user1.id)).toBe(true);
        });

        it("does not return another user's activities", async () => {
            await request(app)
                .post("/activities")
                .set("Authorization", authHeader2)
                .send({ title: "User2 Activity", day: "2026-10-10" });

            const res = await request(app)
                .get("/activities")
                .set("Authorization", authHeader1);
            expect(res.body.items.every((a) => a.userId === user1.id)).toBe(true);
        });

        it("filters by day", async () => {
            const res = await request(app)
                .get("/activities?day=2026-10-10")
                .set("Authorization", authHeader1);
            expect(res.status).toBe(200);
        });

        it("filters by habitId", async () => {
            const res = await request(app)
                .get(`/activities?habitId=${habitId}`)
                .set("Authorization", authHeader1);
            expect(res.status).toBe(200);
            expect(res.body.items.every((a) => a.habitId === habitId)).toBe(true);
        });

        it("supports date range filtering", async () => {
            const res = await request(app)
                .get("/activities?from=2026-10-01&to=2026-10-31")
                .set("Authorization", authHeader1);
            expect(res.status).toBe(200);
        });
    });

    describe("GET /activities/:id", () => {
        it("retrieves a specific activity", async () => {
            const res = await request(app)
                .get(`/activities/${activityId}`)
                .set("Authorization", authHeader1);
            expect(res.status).toBe(200);
            expect(res.body.id).toBe(activityId);
        });

        it("returns 404 for non-existent activity", async () => {
            const res = await request(app)
                .get("/activities/999999")
                .set("Authorization", authHeader1);
            expect(res.status).toBe(404);
        });

        it("returns 403 for another user's activity", async () => {
            const user2ActivityRes = await request(app)
                .post("/activities")
                .set("Authorization", authHeader2)
                .send({ title: "U2 Activity", day: "2026-10-10" });
            const user2ActivityId = user2ActivityRes.body.id;

            const res = await request(app)
                .get(`/activities/${user2ActivityId}`)
                .set("Authorization", authHeader1);
            expect(res.status).toBe(403);
        });
    });

    describe("PATCH /activities/:id", () => {
        it("updates an activity's title and duration", async () => {
            const res = await request(app)
                .patch(`/activities/${activityId}`)
                .set("Authorization", authHeader1)
                .send({ title: "Updated Chess", duration: 90 });
            expect(res.status).toBe(200);
            expect(res.body.title).toBe("Updated Chess");
            expect(res.body.duration).toBe(90);
        });

        it("links an existing activity to a habit", async () => {
            const res = await request(app)
                .patch(`/activities/${activityId}`)
                .set("Authorization", authHeader1)
                .send({ habitId });
            expect(res.status).toBe(200);
            expect(res.body.habitId).toBe(habitId);
        });

        it("unlinks an activity from a habit", async () => {
            const res = await request(app)
                .patch(`/activities/${activityId}`)
                .set("Authorization", authHeader1)
                .send({ habitId: null });
            expect(res.status).toBe(200);
            expect(res.body.habitId).toBeNull();
        });

        it("returns 403 when linking to another user's habit", async () => {
            const res = await request(app)
                .patch(`/activities/${activityId}`)
                .set("Authorization", authHeader1)
                .send({ habitId: user2HabitId });
            expect(res.status).toBe(403);
        });

        it("returns 403 when updating another user's activity", async () => {
            const u2res = await request(app)
                .post("/activities")
                .set("Authorization", authHeader2)
                .send({ title: "U2 act", day: "2026-10-10" });
            const res = await request(app)
                .patch(`/activities/${u2res.body.id}`)
                .set("Authorization", authHeader1)
                .send({ title: "Hijacked" });
            expect(res.status).toBe(403);
        });
    });

    describe("DELETE /activities/:id", () => {
        it("deletes an activity and returns 204", async () => {
            const create = await request(app)
                .post("/activities")
                .set("Authorization", authHeader1)
                .send({ title: "To Delete", day: "2026-10-01" });
            const id = create.body.id;

            const del = await request(app)
                .delete(`/activities/${id}`)
                .set("Authorization", authHeader1);
            expect(del.status).toBe(204);

            const get = await request(app)
                .get(`/activities/${id}`)
                .set("Authorization", authHeader1);
            expect(get.status).toBe(404);
        });

        it("returns 403 when deleting another user's activity", async () => {
            const u2act = await request(app)
                .post("/activities")
                .set("Authorization", authHeader2)
                .send({ title: "U2 act to delete", day: "2026-10-01" });

            const res = await request(app)
                .delete(`/activities/${u2act.body.id}`)
                .set("Authorization", authHeader1);
            expect(res.status).toBe(403);
        });
    });
});

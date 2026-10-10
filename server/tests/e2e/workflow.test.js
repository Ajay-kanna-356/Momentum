/**
 * End-to-End Workflow Test
 *
 * Runs a complete workflow:
 * 1. Authenticate two test users
 * 2. Create a Goal
 * 3. Create a Habit linked to the Goal
 * 4. Create an independent Habit
 * 5. Assign weekly schedule days to both Habits
 * 6. Mark a Habit completed for a particular day
 * 7. Create an Activity linked to a Habit on an unscheduled day
 * 8. Create an independent Activity
 * 9. Create a Journal Entry for that day
 * 10. Retrieve the dashboard data
 * 11. Update and delete records
 * 12. Verify that User 2 cannot access User 1's records
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { createTestUser, cleanupTestUsers, disconnectPrisma } from "../helpers.js";

let userA, authA, userB, authB;
let goalId, habitLinkedId, habitIndependentId;
let logId, linkedActivityId, independentActivityId, journalEntryId;

// Note: 2026-10-10 is a Saturday
const TEST_DATE = "2026-10-10";

beforeAll(async () => {
    const a = await createTestUser();
    const b = await createTestUser();
    userA = a.user;
    authA = a.authHeader;
    userB = b.user;
    authB = b.authHeader;
});

afterAll(async () => {
    await cleanupTestUsers();
    await disconnectPrisma();
});

describe("End-to-End Workflow", () => {
    it("Step 1: User A creates a Goal", async () => {
        const res = await request(app)
            .post("/goals")
            .set("Authorization", authA)
            .send({ title: "E2E Goal: Improve Fitness", status: "active" });
        expect(res.status).toBe(201);
        goalId = res.body.id;
        expect(goalId).toBeDefined();
    });

    it("Step 2: User A creates a Habit linked to the Goal", async () => {
        const res = await request(app)
            .post("/habits")
            .set("Authorization", authA)
            .send({ title: "Gym", goalId });
        expect(res.status).toBe(201);
        habitLinkedId = res.body.id;
        expect(res.body.goalId).toBe(goalId);
    });

    it("Step 3: User A creates an independent Habit", async () => {
        const res = await request(app)
            .post("/habits")
            .set("Authorization", authA)
            .send({ title: "Meditation" });
        expect(res.status).toBe(201);
        habitIndependentId = res.body.id;
        expect(res.body.goalId).toBeNull();
    });

    it("Step 4: Assign schedule to Gym Habit (Mon, Fri, Sat)", async () => {
        const res = await request(app)
            .put(`/habits/${habitLinkedId}/schedule`)
            .set("Authorization", authA)
            .send({ daysOfWeek: ["MONDAY", "FRIDAY", "SATURDAY"] });
        expect(res.status).toBe(200);
        expect(res.body.schedule.length).toBe(3);
    });

    it("Step 5: Assign schedule to Meditation Habit (daily)", async () => {
        const res = await request(app)
            .put(`/habits/${habitIndependentId}/schedule`)
            .set("Authorization", authA)
            .send({
                daysOfWeek: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
            });
        expect(res.status).toBe(200);
        expect(res.body.schedule.length).toBe(7);
    });

    it("Step 6: Mark Gym Habit as completed for 2026-10-10 (Saturday)", async () => {
        const res = await request(app)
            .put(`/habits/${habitLinkedId}/logs`)
            .set("Authorization", authA)
            .send({ day: TEST_DATE, completed: true });
        expect(res.status).toBe(200);
        expect(res.body.completed).toBe(true);
        logId = res.body.id;
    });

    it("Step 7: Create an Activity linked to Gym on an UNSCHEDULED day (Tuesday 2026-10-13)", async () => {
        // Tuesday is not in Mon/Fri/Sat schedule for Gym
        const res = await request(app)
            .post("/activities")
            .set("Authorization", authA)
            .send({
                title: "Gym",
                day: "2026-10-13",
                duration: 45,
                habitId: habitLinkedId,
            });
        expect(res.status).toBe(201);
        linkedActivityId = res.body.id;
        expect(res.body.habitId).toBe(habitLinkedId);
    });

    it("Step 8: Create an independent Activity (Played Chess)", async () => {
        const res = await request(app)
            .post("/activities")
            .set("Authorization", authA)
            .send({ title: "Played Chess", day: TEST_DATE, duration: 120 });
        expect(res.status).toBe(201);
        independentActivityId = res.body.id;
        expect(res.body.habitId).toBeNull();
    });

    it("Step 9: Create a Journal Entry for 2026-10-10", async () => {
        const res = await request(app)
            .post("/journal")
            .set("Authorization", authA)
            .send({ day: TEST_DATE, content: "Great workout day! Also played some chess." });
        expect(res.status).toBe(201);
        journalEntryId = res.body.id;
    });

    it("Step 10: Retrieve dashboard for 2026-10-10 and verify all data", async () => {
        const res = await request(app)
            .get(`/dashboard/today?date=${TEST_DATE}`)
            .set("Authorization", authA);
        expect(res.status).toBe(200);
        expect(res.body.date).toBe(TEST_DATE);

        // Both Gym and Meditation should appear (both scheduled for Saturday)
        const habitsIds = res.body.scheduledHabits.map((h) => h.id);
        expect(habitsIds).toContain(habitLinkedId);
        expect(habitsIds).toContain(habitIndependentId);

        // Habit log should show Gym as completed
        const gymLog = res.body.habitLogs.find((l) => l.habitId === habitLinkedId);
        expect(gymLog).toBeDefined();
        expect(gymLog.completed).toBe(true);

        // Activities (only chess was on this day, gym was on Tuesday)
        const chessActivity = res.body.activities.find((a) => a.title === "Played Chess");
        expect(chessActivity).toBeDefined();

        // Journal entry
        expect(res.body.journalEntry).toBeTruthy();
        expect(res.body.journalEntry.content).toContain("Great workout day");
    });

    it("Step 11a: Update the Goal title and status", async () => {
        const res = await request(app)
            .patch(`/goals/${goalId}`)
            .set("Authorization", authA)
            .send({ title: "Updated Fitness Goal", status: "completed" });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("completed");
    });

    it("Step 11b: Update journal entry content", async () => {
        const res = await request(app)
            .patch(`/journal/${journalEntryId}`)
            .set("Authorization", authA)
            .send({ content: "Updated: Great workout day! Also played chess. Feeling good." });
        expect(res.status).toBe(200);
        expect(res.body.content).toContain("Updated:");
    });

    it("Step 11c: Delete the independent Activity", async () => {
        const res = await request(app)
            .delete(`/activities/${independentActivityId}`)
            .set("Authorization", authA);
        expect(res.status).toBe(204);
    });

    it("Step 12a: User B cannot access User A's Goal", async () => {
        const res = await request(app)
            .get(`/goals/${goalId}`)
            .set("Authorization", authB);
        expect(res.status).toBe(403);
    });

    it("Step 12b: User B cannot access User A's Habit", async () => {
        const res = await request(app)
            .get(`/habits/${habitLinkedId}`)
            .set("Authorization", authB);
        expect(res.status).toBe(403);
    });

    it("Step 12c: User B cannot mark User A's Habit as completed", async () => {
        const res = await request(app)
            .put(`/habits/${habitLinkedId}/logs`)
            .set("Authorization", authB)
            .send({ day: TEST_DATE, completed: true });
        expect(res.status).toBe(403);
    });

    it("Step 12d: User B cannot access User A's Journal Entry", async () => {
        const res = await request(app)
            .get(`/journal/${journalEntryId}`)
            .set("Authorization", authB);
        expect(res.status).toBe(403);
    });

    it("Step 12e: User B cannot access User A's Activity", async () => {
        const res = await request(app)
            .get(`/activities/${linkedActivityId}`)
            .set("Authorization", authB);
        expect(res.status).toBe(403);
    });

    it("Step 12f: User B's goal list does NOT contain User A's goals", async () => {
        const res = await request(app)
            .get("/goals")
            .set("Authorization", authB);
        expect(res.status).toBe(200);
        expect(res.body.find((g) => g.id === goalId)).toBeUndefined();
    });

    it("Data integrity: Deleting Gym Habit preserves linked Activity (sets habitId to null)", async () => {
        // Delete the habit
        const del = await request(app)
            .delete(`/habits/${habitLinkedId}`)
            .set("Authorization", authA);
        expect(del.status).toBe(204);

        // The activity (linkedActivityId) should still exist but habitId = null
        const getAct = await request(app)
            .get(`/activities/${linkedActivityId}`)
            .set("Authorization", authA);
        expect(getAct.status).toBe(200);
        expect(getAct.body.habitId).toBeNull();
    });

    it("Data integrity: Deleting Goal does NOT cascade-delete Habits immediately (SetNull)", async () => {
        // Create a fresh goal + habit pair
        const g = await request(app)
            .post("/goals")
            .set("Authorization", authA)
            .send({ title: "Temp Goal for integrity test" });
        const gId = g.body.id;

        const h = await request(app)
            .post("/habits")
            .set("Authorization", authA)
            .send({ title: "Temp Habit", goalId: gId });
        const hId = h.body.id;

        // Delete the goal
        await request(app).delete(`/goals/${gId}`).set("Authorization", authA);

        // Habit should still exist but with goalId = null (SetNull in schema)
        const getHabit = await request(app)
            .get(`/habits/${hId}`)
            .set("Authorization", authA);
        expect(getHabit.status).toBe(200);
        expect(getHabit.body.goalId).toBeNull();
    });
});

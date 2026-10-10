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

describe("Journal API", () => {
    let entryId;

    describe("POST /journal", () => {
        it("creates a journal entry", async () => {
            const res = await request(app)
                .post("/journal")
                .set("Authorization", authHeader1)
                .send({ day: "2026-10-10", content: "Today was productive!" });
            expect(res.status).toBe(201);
            expect(res.body.id).toBeDefined();
            expect(res.body.userId).toBe(user1.id);
            expect(res.body.content).toBe("Today was productive!");
            entryId = res.body.id;
        });

        it("rejects duplicate entry for the same day (same user)", async () => {
            const res = await request(app)
                .post("/journal")
                .set("Authorization", authHeader1)
                .send({ day: "2026-10-10", content: "Another entry same day" });
            expect(res.status).toBe(409);
        });

        it("allows different users to have entries on the same day", async () => {
            const res = await request(app)
                .post("/journal")
                .set("Authorization", authHeader2)
                .send({ day: "2026-10-10", content: "User2 journal entry" });
            expect(res.status).toBe(201);
        });

        it("rejects empty content", async () => {
            const res = await request(app)
                .post("/journal")
                .set("Authorization", authHeader1)
                .send({ day: "2026-10-11", content: "" });
            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/content/i);
        });

        it("rejects whitespace-only content", async () => {
            const res = await request(app)
                .post("/journal")
                .set("Authorization", authHeader1)
                .send({ day: "2026-10-11", content: "   " });
            expect(res.status).toBe(400);
        });

        it("rejects invalid date format", async () => {
            const res = await request(app)
                .post("/journal")
                .set("Authorization", authHeader1)
                .send({ day: "October 10", content: "Valid content" });
            expect(res.status).toBe(400);
        });

        it("rejects missing day", async () => {
            const res = await request(app)
                .post("/journal")
                .set("Authorization", authHeader1)
                .send({ content: "No day provided" });
            expect(res.status).toBe(400);
        });

        it("returns 401 when unauthenticated", async () => {
            const res = await request(app)
                .post("/journal")
                .send({ day: "2026-10-12", content: "Test" });
            expect(res.status).toBe(401);
        });
    });

    describe("GET /journal", () => {
        it("lists entries for the user in descending order", async () => {
            // Create another entry
            await request(app)
                .post("/journal")
                .set("Authorization", authHeader1)
                .send({ day: "2026-10-08", content: "Earlier entry" });

            const res = await request(app)
                .get("/journal")
                .set("Authorization", authHeader1);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.every((e) => e.userId === user1.id)).toBe(true);

            // Verify descending order
            if (res.body.length >= 2) {
                for (let i = 0; i < res.body.length - 1; i++) {
                    const d1 = new Date(res.body[i].day).getTime();
                    const d2 = new Date(res.body[i + 1].day).getTime();
                    expect(d1).toBeGreaterThanOrEqual(d2);
                }
            }
        });

        it("does not return another user's entries", async () => {
            const res = await request(app)
                .get("/journal")
                .set("Authorization", authHeader1);
            expect(res.body.every((e) => e.userId === user1.id)).toBe(true);
        });

        it("supports date range filtering", async () => {
            const res = await request(app)
                .get("/journal?from=2026-10-08&to=2026-10-10")
                .set("Authorization", authHeader1);
            expect(res.status).toBe(200);
        });
    });

    describe("GET /journal/:id", () => {
        it("retrieves a specific journal entry", async () => {
            const res = await request(app)
                .get(`/journal/${entryId}`)
                .set("Authorization", authHeader1);
            expect(res.status).toBe(200);
            expect(res.body.id).toBe(entryId);
        });

        it("returns 404 for non-existent entry", async () => {
            const res = await request(app)
                .get("/journal/999999")
                .set("Authorization", authHeader1);
            expect(res.status).toBe(404);
        });

        it("returns 403 for another user's entry", async () => {
            const u2entry = await request(app)
                .post("/journal")
                .set("Authorization", authHeader2)
                .send({ day: "2026-10-09", content: "User2 private entry" });

            const res = await request(app)
                .get(`/journal/${u2entry.body.id}`)
                .set("Authorization", authHeader1);
            expect(res.status).toBe(403);
        });
    });

    describe("GET /journal/by-day", () => {
        it("retrieves the entry for a specific day", async () => {
            const res = await request(app)
                .get("/journal/by-day?day=2026-10-10")
                .set("Authorization", authHeader1);
            expect(res.status).toBe(200);
            expect(res.body.id).toBe(entryId);
        });

        it("returns 404 if no entry exists for that day", async () => {
            const res = await request(app)
                .get("/journal/by-day?day=2026-01-01")
                .set("Authorization", authHeader1);
            expect(res.status).toBe(404);
        });
    });

    describe("PATCH /journal/:id", () => {
        it("updates the journal entry content", async () => {
            const res = await request(app)
                .patch(`/journal/${entryId}`)
                .set("Authorization", authHeader1)
                .send({ content: "Updated journal content" });
            expect(res.status).toBe(200);
            expect(res.body.content).toBe("Updated journal content");
        });

        it("rejects empty content on update", async () => {
            const res = await request(app)
                .patch(`/journal/${entryId}`)
                .set("Authorization", authHeader1)
                .send({ content: "  " });
            expect(res.status).toBe(400);
        });

        it("returns 403 when updating another user's entry", async () => {
            const u2entry = await request(app)
                .post("/journal")
                .set("Authorization", authHeader2)
                .send({ day: "2026-10-07", content: "User2 to protect" });

            const res = await request(app)
                .patch(`/journal/${u2entry.body.id}`)
                .set("Authorization", authHeader1)
                .send({ content: "Hijacked" });
            expect(res.status).toBe(403);
        });
    });

    describe("DELETE /journal/:id", () => {
        it("deletes a journal entry", async () => {
            const create = await request(app)
                .post("/journal")
                .set("Authorization", authHeader1)
                .send({ day: "2026-09-01", content: "Entry to delete" });
            const id = create.body.id;

            const del = await request(app)
                .delete(`/journal/${id}`)
                .set("Authorization", authHeader1);
            expect(del.status).toBe(204);

            const get = await request(app)
                .get(`/journal/${id}`)
                .set("Authorization", authHeader1);
            expect(get.status).toBe(404);
        });

        it("returns 403 when deleting another user's entry", async () => {
            const u2entry = await request(app)
                .post("/journal")
                .set("Authorization", authHeader2)
                .send({ day: "2026-08-01", content: "U2 to delete" });

            const res = await request(app)
                .delete(`/journal/${u2entry.body.id}`)
                .set("Authorization", authHeader1);
            expect(res.status).toBe(403);
        });
    });
});

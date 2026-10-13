import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { createTestUser, cleanupTestUsers, disconnectPrisma } from "../helpers.js";
import {
  setCustomGroqCaller,
  resetGroqCaller,
  clearReviewCache,
} from "../../src/services/aiWeeklyReview.service.js";
import { GroqError } from "../../src/services/groq.service.js";

let user1, authHeader1, user2, authHeader2;

const mockReviewResponse = {
  summary: "Great momentum this week with strong habit execution and focused coding sessions.",
  wins: [
    "Completed 5 out of 5 scheduled system design sessions.",
    "Logged over 3 hours of dedicated focus time.",
  ],
  patterns: [
    "Most active focus sessions occurred in the morning hours.",
    "Higher habit consistency on weekdays compared to weekends.",
  ],
  areasForImprovement: [
    "Reading habit had a minor drop on Thursday.",
  ],
  actionableRecommendations: [
    "Block out 30 minutes in the calendar for evening reading.",
    "Maintain the morning workout streak.",
  ],
};

beforeAll(async () => {
  const u1 = await createTestUser();
  user1 = u1.user;
  authHeader1 = u1.authHeader;

  const u2 = await createTestUser();
  user2 = u2.user;
  authHeader2 = u2.authHeader;
});

afterAll(async () => {
  resetGroqCaller();
  await cleanupTestUsers();
  await disconnectPrisma();
});

beforeEach(() => {
  clearReviewCache();
  // Set default mock caller that returns valid structured review
  setCustomGroqCaller(async (aggregatedData) => {
    return { ...mockReviewResponse };
  });
});

describe("AI Weekly Review API", () => {
  describe("Authentication", () => {
    it("returns 401 when calling POST /api/ai/weekly-review unauthenticated", async () => {
      const res = await request(app).post("/api/ai/weekly-review").send({});
      expect(res.status).toBe(401);
    });

    it("returns 401 when calling GET /api/ai/weekly-review/latest unauthenticated", async () => {
      const res = await request(app).get("/api/ai/weekly-review/latest");
      expect(res.status).toBe(401);
    });
  });

  describe("Data Isolation & Aggregation", () => {
    it("aggregates only the authenticated user's records", async () => {
      // User 1 creates a habit and an activity for 2026-10-10
      const habitRes = await request(app)
        .post("/habits")
        .set("Authorization", authHeader1)
        .send({ title: "User1 Running" });
      const habitId = habitRes.body.id;

      await request(app)
        .put(`/habits/${habitId}/schedule`)
        .set("Authorization", authHeader1)
        .send({ daysOfWeek: ["SATURDAY"] });

      await request(app)
        .put(`/habits/${habitId}/logs`)
        .set("Authorization", authHeader1)
        .send({ day: "2026-10-10", completed: true });

      await request(app)
        .post("/activities")
        .set("Authorization", authHeader1)
        .send({ title: "User1 Focus Session", day: "2026-10-10", duration: 90 });

      // User 2 requests review for period ending 2026-10-11 (covers 2026-10-10)
      let capturedUser2Data = null;
      setCustomGroqCaller(async (data) => {
        capturedUser2Data = data;
        return { ...mockReviewResponse };
      });

      const res2 = await request(app)
        .post("/api/ai/weekly-review")
        .set("Authorization", authHeader2)
        .send({ endDate: "2026-10-11" });

      expect(res2.status).toBe(200);
      expect(capturedUser2Data).toBeDefined();
      expect(capturedUser2Data.user.id).toBe(user2.id);
      // User 2 has 0 habits and 0 focus minutes
      expect(capturedUser2Data.metricsSummary.totalCompletedHabitInstances).toBe(0);
      expect(capturedUser2Data.metricsSummary.totalFocusMinutes).toBe(0);
      expect(capturedUser2Data.topActivities.length).toBe(0);

      // Now User 1 requests review for the same period
      let capturedUser1Data = null;
      setCustomGroqCaller(async (data) => {
        capturedUser1Data = data;
        return { ...mockReviewResponse };
      });

      const res1 = await request(app)
        .post("/api/ai/weekly-review")
        .set("Authorization", authHeader1)
        .send({ endDate: "2026-10-11" });

      expect(res1.status).toBe(200);
      expect(capturedUser1Data).toBeDefined();
      expect(capturedUser1Data.user.id).toBe(user1.id);
      expect(capturedUser1Data.metricsSummary.totalCompletedHabitInstances).toBeGreaterThanOrEqual(1);
      expect(capturedUser1Data.metricsSummary.totalFocusMinutes).toBe(90);
    });

    it("safely handles zero denominators and empty user history without errors", async () => {
      let passedData = null;
      setCustomGroqCaller(async (data) => {
        passedData = data;
        return { ...mockReviewResponse };
      });

      const res = await request(app)
        .post("/api/ai/weekly-review")
        .set("Authorization", authHeader2)
        .send({ endDate: "2026-10-11" });

      expect(res.status).toBe(200);
      expect(passedData.metricsSummary.overallHabitCompletionRate).toBe(0);
      expect(passedData.metricsSummary.averageDailyFocusMinutes).toBe(0);
      expect(passedData.metricsSummary.perfectDaysCount).toBe(0);
    });
  });

  describe("Journal Sensitivity & Opt-in", () => {
    it("excludes journal content by default when includeJournal is false or omitted", async () => {
      // User 1 creates a journal entry for 2026-10-10
      await request(app)
        .post("/journal")
        .set("Authorization", authHeader1)
        .send({ day: "2026-10-10", content: "Confidential private thoughts" });

      let receivedData = null;
      setCustomGroqCaller(async (data) => {
        receivedData = data;
        return { ...mockReviewResponse };
      });

      const res = await request(app)
        .post("/api/ai/weekly-review")
        .set("Authorization", authHeader1)
        .send({ endDate: "2026-10-11", includeJournal: false });

      expect(res.status).toBe(200);
      expect(receivedData.metricsSummary.journalIncluded).toBe(false);
      // Snippets should be null
      for (const day of receivedData.dailyBreakdown) {
        expect(day.journalSnippet).toBeNull();
      }
    });

    it("includes journal reflections when includeJournal is explicitly true", async () => {
      let receivedData = null;
      setCustomGroqCaller(async (data) => {
        receivedData = data;
        return { ...mockReviewResponse };
      });

      const res = await request(app)
        .post("/api/ai/weekly-review")
        .set("Authorization", authHeader1)
        .send({ endDate: "2026-10-11", includeJournal: true, forceRegenerate: true });

      expect(res.status).toBe(200);
      expect(receivedData.metricsSummary.journalIncluded).toBe(true);
      expect(receivedData.metricsSummary.journalEntriesCount).toBeGreaterThanOrEqual(1);

      const day10 = receivedData.dailyBreakdown.find((d) => d.date === "2026-10-10");
      expect(day10).toBeDefined();
      expect(day10.journalSnippet).toContain("Confidential private thoughts");
    });
  });

  describe("Error Handling", () => {
    it("returns 503 when Groq API key is missing", async () => {
      setCustomGroqCaller(async () => {
        throw new GroqError("Groq API key is not configured.", 503, "MISSING_API_KEY");
      });

      const res = await request(app)
        .post("/api/ai/weekly-review")
        .set("Authorization", authHeader1)
        .send({ endDate: "2026-10-11", forceRegenerate: true });

      expect(res.status).toBe(503);
      expect(res.body.error).toContain("Groq API key is not configured");
    });

    it("returns 429 when Groq is rate limited", async () => {
      setCustomGroqCaller(async () => {
        throw new GroqError("Groq rate limit exceeded.", 429, "RATE_LIMITED");
      });

      const res = await request(app)
        .post("/api/ai/weekly-review")
        .set("Authorization", authHeader1)
        .send({ endDate: "2026-10-11", forceRegenerate: true });

      expect(res.status).toBe(429);
      expect(res.body.error).toContain("rate limit");
    });

    it("returns 504 on timeout", async () => {
      setCustomGroqCaller(async () => {
        throw new GroqError("Groq request timed out.", 504, "TIMEOUT");
      });

      const res = await request(app)
        .post("/api/ai/weekly-review")
        .set("Authorization", authHeader1)
        .send({ endDate: "2026-10-11", forceRegenerate: true });

      expect(res.status).toBe(504);
      expect(res.body.error).toContain("timed out");
    });
  });

  describe("Response Contract and Caching", () => {
    it("returns the complete validated review payload and caches it", async () => {
      let callCount = 0;
      setCustomGroqCaller(async () => {
        callCount++;
        return { ...mockReviewResponse };
      });

      // First call -> calls caller
      const res1 = await request(app)
        .post("/api/ai/weekly-review")
        .set("Authorization", authHeader1)
        .send({ endDate: "2026-10-11" });

      expect(res1.status).toBe(200);
      expect(callCount).toBe(1);
      expect(res1.body.period).toBeDefined();
      expect(res1.body.period.daysCount).toBe(7);
      expect(res1.body.metrics).toBeDefined();
      expect(res1.body.review.summary).toBe(mockReviewResponse.summary);
      expect(res1.body.review.wins).toHaveLength(2);
      expect(res1.body.review.patterns).toHaveLength(2);
      expect(res1.body.review.areasForImprovement).toHaveLength(1);
      expect(res1.body.review.actionableRecommendations).toHaveLength(2);
      expect(res1.body.meta.cached).toBe(false);

      // Second call with same period -> returns cached without calling Groq again
      const res2 = await request(app)
        .post("/api/ai/weekly-review")
        .set("Authorization", authHeader1)
        .send({ endDate: "2026-10-11" });

      expect(res2.status).toBe(200);
      expect(callCount).toBe(1); // Cached!
      expect(res2.body.meta.cached).toBe(true);

      // Third call with forceRegenerate = true -> calls Groq again
      const res3 = await request(app)
        .post("/api/ai/weekly-review")
        .set("Authorization", authHeader1)
        .send({ endDate: "2026-10-11", forceRegenerate: true });

      expect(res3.status).toBe(200);
      expect(callCount).toBe(2);
      expect(res3.body.meta.cached).toBe(false);

      // Latest review endpoint
      const latestRes = await request(app)
        .get("/api/ai/weekly-review/latest")
        .set("Authorization", authHeader1);

      expect(latestRes.status).toBe(200);
      expect(latestRes.body.review).toBeDefined();
      expect(latestRes.body.review.review.summary).toBe(mockReviewResponse.summary);
    });
  });
});

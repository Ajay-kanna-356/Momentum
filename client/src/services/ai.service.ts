import { API_URL } from "../config/api";
import { getStoredToken } from "./auth.service";

async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
}

export interface ReviewPeriod {
  startDate: string;
  endDate: string;
  timezone: string;
  daysCount: number;
}

export interface ReviewMetrics {
  totalScheduledHabitInstances: number;
  totalCompletedHabitInstances: number;
  overallHabitCompletionRate: number;
  totalFocusMinutes: number;
  averageDailyFocusMinutes: number;
  totalActivities: number;
  activeDaysCount: number;
  perfectDaysCount: number;
  activeGoalsCount: number;
  journalEntriesCount: number;
  journalIncluded: boolean;
}

export interface ReviewContent {
  summary: string;
  wins: string[];
  patterns: string[];
  areasForImprovement: string[];
  actionableRecommendations: string[];
}

export interface HabitSummary {
  id: number;
  title: string;
  goalTitle: string | null;
  scheduledDaysCount: number;
  completedDaysCount: number;
  completionRate: number | null;
}

export interface ActivitySummary {
  title: string;
  durationMinutes: number;
}

export interface WeeklyReviewResponse {
  period: ReviewPeriod;
  metrics: ReviewMetrics;
  habits: HabitSummary[];
  topActivities: ActivitySummary[];
  review: ReviewContent;
  meta: {
    generatedAt: string;
    includeJournal: boolean;
    model: string;
    cached?: boolean;
  };
}

export interface GenerateReviewOptions {
  endDate?: string;
  timezone?: string;
  includeJournal?: boolean;
  forceRegenerate?: boolean;
}

/**
 * Calls POST /api/ai/weekly-review to generate an evidence-based AI review.
 */
export async function generateWeeklyReview(
  options: GenerateReviewOptions = {}
): Promise<WeeklyReviewResponse> {
  const response = await authFetch("/api/ai/weekly-review", {
    method: "POST",
    body: JSON.stringify(options),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to generate AI weekly review");
  }

  return data;
}

/**
 * Calls GET /api/ai/weekly-review/latest to retrieve the latest generated review.
 */
export async function fetchLatestWeeklyReview(): Promise<WeeklyReviewResponse | null> {
  const response = await authFetch("/api/ai/weekly-review/latest");

  if (!response.ok) {
    throw new Error("Failed to fetch latest review");
  }

  const data = await response.json();
  return data.review || null;
}

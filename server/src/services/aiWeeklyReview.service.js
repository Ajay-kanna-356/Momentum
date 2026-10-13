import {
  calculateReviewPeriod,
  aggregateWeeklyUserData,
} from "./aiContextAggregation.service.js";
import {
  callGroqWeeklyReview,
  GroqError,
} from "./groq.service.js";

// In-memory cache for generated reviews to prevent unnecessary regeneration
// Key: `${userId}_${startDateStr}_${endDateStr}_${includeJournal}`
const reviewCache = new Map();
const userLatestReview = new Map();

// Pluggable caller for unit tests / mocking
let activeCaller = callGroqWeeklyReview;

export function setCustomGroqCaller(fn) {
  activeCaller = fn;
}

export function resetGroqCaller() {
  activeCaller = callGroqWeeklyReview;
}


/**
 * Generates an evidence-based AI Weekly Review for an authenticated user.
 */
export async function generateWeeklyReview(userId, options = {}) {
  const {
    endDate,
    timezone = "UTC",
    includeJournal = false,
    forceRegenerate = false,
  } = options;

  // 1. Calculate the 7 completed calendar days review period
  const period = calculateReviewPeriod(endDate, timezone);
  const cacheKey = `${userId}_${period.startDateStr}_${period.endDateStr}_${Boolean(includeJournal)}`;

  // 2. Check cache if regeneration is not forced
  if (!forceRegenerate && reviewCache.has(cacheKey)) {
    const cached = reviewCache.get(cacheKey);
    // If generated less than 12 hours ago, return cached
    const ageMs = Date.now() - new Date(cached.meta.generatedAt).getTime();
    if (ageMs < 12 * 60 * 60 * 1000) {
      return {
        ...cached,
        meta: { ...cached.meta, cached: true },
      };
    }
  }

  // 3. Aggregate user's verified metrics & habits
  const aggregatedData = await aggregateWeeklyUserData(userId, period, {
    includeJournal,
  });

  const selectedModel = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

  // 4. Invoke Groq with structured schema
  const aiResult = await activeCaller(aggregatedData, {
    model: selectedModel,
  });

  // 5. Build full review payload
  const result = {
    period: {
      startDate: period.startDateStr,
      endDate: period.endDateStr,
      timezone: period.timezone,
      daysCount: 7,
    },
    metrics: aggregatedData.metricsSummary,
    habits: aggregatedData.habits,
    topActivities: aggregatedData.topActivities,
    review: {
      summary: aiResult.summary,
      wins: aiResult.wins,
      patterns: aiResult.patterns,
      areasForImprovement: aiResult.areasForImprovement,
      actionableRecommendations: aiResult.actionableRecommendations,
    },
    meta: {
      generatedAt: new Date().toISOString(),
      includeJournal: Boolean(includeJournal),
      model: selectedModel,
      cached: false,
    },
  };

  // 6. Store in cache
  reviewCache.set(cacheKey, result);
  userLatestReview.set(userId, result);

  return result;
}

/**
 * Returns the most recent weekly review for a user, if available.
 */
export async function getLatestWeeklyReview(userId) {
  if (userLatestReview.has(userId)) {
    return userLatestReview.get(userId);
  }
  return null;
}

/**
 * Clears review cache (used in testing).
 */
export function clearReviewCache() {
  reviewCache.clear();
  userLatestReview.clear();
}

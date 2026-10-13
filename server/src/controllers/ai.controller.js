import {
  generateWeeklyReview,
  getLatestWeeklyReview,
} from "../services/aiWeeklyReview.service.js";
import { parseOptionalDate } from "../utils/validation.js";

/**
 * POST /api/ai/weekly-review
 * Protected endpoint generating an AI-powered Weekly Review for the authenticated user.
 */
export async function handleGenerateWeeklyReview(req, res, next) {
  try {
    const userId = req.user.id;
    const { endDate, timezone, includeJournal, forceRegenerate } = req.body || {};

    if (endDate) {
      parseOptionalDate(endDate, "endDate");
    }

    const review = await generateWeeklyReview(userId, {
      endDate,
      timezone,
      includeJournal: Boolean(includeJournal),
      forceRegenerate: Boolean(forceRegenerate),
    });

    res.status(200).json(review);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/ai/weekly-review/latest
 * Protected endpoint fetching the most recently generated review for the authenticated user.
 */
export async function handleGetLatestWeeklyReview(req, res, next) {
  try {
    const userId = req.user.id;
    const review = await getLatestWeeklyReview(userId);
    res.status(200).json({ review });
  } catch (err) {
    next(err);
  }
}

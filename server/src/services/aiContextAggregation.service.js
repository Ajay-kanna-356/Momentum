import prisma from "../config/database.js";
import { ValidationError } from "../utils/errors.js";

const DOW_MAP = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

/**
 * Returns UTC midnight Date from YYYY-MM-DD string or Date object.
 */
export function toUtcMidnight(input) {
  if (typeof input === "string") {
    const trimmed = input.trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      throw new ValidationError("Date must be in YYYY-MM-DD format");
    }
    return new Date(`${trimmed}T00:00:00.000Z`);
  }
  const iso = input.toISOString().slice(0, 10);
  return new Date(`${iso}T00:00:00.000Z`);
}

/**
 * Formats a Date object as YYYY-MM-DD.
 */
export function formatDateStr(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Calculates a 7 completed calendar days review period.
 * If endDateStr is provided, period is [endDateStr - 6 days, endDateStr].
 * If omitted, period is the 7 completed days preceding today (today - 7 days to today - 1 day).
 */
export function calculateReviewPeriod(endDateInput, timezone = "UTC") {
  let endUtc;
  if (endDateInput) {
    endUtc = toUtcMidnight(endDateInput);
  } else {
    // Default to yesterday (most recent completed calendar day)
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    endUtc = toUtcMidnight(yesterday);
  }

  // Calculate start date: 6 days before end date (total 7 calendar days inclusive)
  const startUtc = new Date(endUtc);
  startUtc.setUTCDate(startUtc.getUTCDate() - 6);

  const datesList = [];
  const curr = new Date(startUtc);
  while (curr <= endUtc) {
    datesList.push(formatDateStr(curr));
    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  return {
    startDate: startUtc,
    endDate: endUtc,
    startDateStr: formatDateStr(startUtc),
    endDateStr: formatDateStr(endUtc),
    datesList,
    timezone: timezone || "UTC",
    daysCount: datesList.length,
  };
}

/**
 * Aggregates all relevant user data for the specified 7-day period.
 * Strictly scopes all queries to userId to maintain data isolation.
 */
export async function aggregateWeeklyUserData(userId, period, options = {}) {
  const { startDate, endDate, datesList, startDateStr, endDateStr } = period;
  const includeJournal = Boolean(options.includeJournal);

  // 1. Fetch user data in parallel
  const [user, goals, habits, habitLogs, activities, journalEntries] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true },
      }),
      prisma.goal.findMany({
        where: { userId },
        select: { id: true, title: true, description: true, status: true, targetDate: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.habit.findMany({
        where: { userId, status: "active" },
        include: {
          goal: { select: { id: true, title: true } },
          schedules: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.habitLog.findMany({
        where: {
          habit: { userId },
          day: { gte: startDate, lte: endDate },
        },
        include: {
          habit: { select: { id: true, title: true } },
        },
      }),
      prisma.activity.findMany({
        where: {
          userId,
          day: { gte: startDate, lte: endDate },
        },
        include: {
          habit: { select: { id: true, title: true } },
        },
        orderBy: { day: "asc" },
      }),
      includeJournal
        ? prisma.journalEntry.findMany({
            where: {
              userId,
              day: { gte: startDate, lte: endDate },
            },
            orderBy: { day: "asc" },
          })
        : Promise.resolve([]),
    ]);

  if (!user) {
    throw new ValidationError("User not found");
  }

  // 2. Build Day-by-Day Aggregations
  // Map dateStr -> habitLogs & activities & journal
  const logsByDate = new Map();
  for (const log of habitLogs) {
    const dStr = formatDateStr(log.day);
    if (!logsByDate.has(dStr)) logsByDate.set(dStr, []);
    logsByDate.get(dStr).push(log);
  }

  const activitiesByDate = new Map();
  for (const act of activities) {
    const dStr = formatDateStr(act.day);
    if (!activitiesByDate.has(dStr)) activitiesByDate.set(dStr, []);
    activitiesByDate.get(dStr).push(act);
  }

  const journalsByDate = new Map();
  for (const j of journalEntries) {
    const dStr = formatDateStr(j.day);
    journalsByDate.set(dStr, j);
  }

  // 3. Calculate per-day metrics
  let totalScheduledHabitInstances = 0;
  let totalCompletedHabitInstances = 0;
  let totalFocusMinutes = 0;
  let perfectDaysCount = 0;
  let activeDaysCount = 0;

  const dailyBreakdown = datesList.map((dStr) => {
    const dateObj = toUtcMidnight(dStr);
    const dow = DOW_MAP[dateObj.getUTCDay()];

    // Determine which habits were scheduled for this day of week
    const scheduledHabits = habits.filter((h) => {
      // If habit has schedules, check for matching DOW
      if (h.schedules && h.schedules.length > 0) {
        return h.schedules.some((s) => s.dayOfWeek === dow);
      }
      // If no schedule records exist, habit is active everyday
      return true;
    });

    const dayLogs = logsByDate.get(dStr) || [];
    const completedLogHabitIds = new Set(
      dayLogs.filter((l) => l.completed).map((l) => l.habitId)
    );

    const scheduledCount = scheduledHabits.length;
    const completedCount = scheduledHabits.filter((h) =>
      completedLogHabitIds.has(h.id)
    ).length;

    totalScheduledHabitInstances += scheduledCount;
    totalCompletedHabitInstances += completedCount;

    const dayActivities = activitiesByDate.get(dStr) || [];
    const dayDuration = dayActivities.reduce(
      (sum, a) => sum + (a.duration || 0),
      0
    );
    totalFocusMinutes += dayDuration;

    const dayHasActivity = completedCount > 0 || dayActivities.length > 0;
    if (dayHasActivity) activeDaysCount++;

    const isPerfect =
      scheduledCount > 0 && completedCount >= scheduledCount;
    if (isPerfect) perfectDaysCount++;

    const journal = journalsByDate.get(dStr);

    return {
      date: dStr,
      dayOfWeek: dow,
      scheduledHabitsCount: scheduledCount,
      completedHabitsCount: completedCount,
      completionRate:
        scheduledCount > 0
          ? Math.round((completedCount / scheduledCount) * 100)
          : null,
      activityDurationMinutes: dayDuration,
      activitySessionsCount: dayActivities.length,
      hasJournalEntry: Boolean(journal),
      journalSnippet:
        includeJournal && journal
          ? journal.content.slice(0, 280)
          : null,
    };
  });

  // 4. Calculate per-habit metrics
  const habitPerformance = habits.map((h) => {
    const scheduledDaysInPeriod = datesList.filter((dStr) => {
      const dateObj = toUtcMidnight(dStr);
      const dow = DOW_MAP[dateObj.getUTCDay()];
      if (h.schedules && h.schedules.length > 0) {
        return h.schedules.some((s) => s.dayOfWeek === dow);
      }
      return true;
    }).length;

    const completedInPeriod = habitLogs.filter(
      (l) => l.habitId === h.id && l.completed
    ).length;

    const rate =
      scheduledDaysInPeriod > 0
        ? Math.round((completedInPeriod / scheduledDaysInPeriod) * 100)
        : null;

    return {
      id: h.id,
      title: h.title,
      goalTitle: h.goal?.title || null,
      scheduledDaysCount: scheduledDaysInPeriod,
      completedDaysCount: completedInPeriod,
      completionRate: rate,
    };
  });

  // 5. Activity breakdown by title
  const activitySummaryMap = new Map();
  for (const act of activities) {
    const title = act.title.trim();
    const dur = act.duration || 0;
    activitySummaryMap.set(title, (activitySummaryMap.get(title) || 0) + dur);
  }

  const topActivities = Array.from(activitySummaryMap.entries())
    .map(([title, durationMinutes]) => ({ title, durationMinutes }))
    .sort((a, b) => b.durationMinutes - a.durationMinutes);

  // 6. Overall statistics
  const overallHabitCompletionRate =
    totalScheduledHabitInstances > 0
      ? Math.round(
          (totalCompletedHabitInstances / totalScheduledHabitInstances) * 100
        )
      : 0;

  const averageDailyFocusMinutes = Math.round(totalFocusMinutes / 7);

  return {
    user: {
      id: user.id,
      name: user.name || "Productivity Seeker",
    },
    period: {
      startDate: startDateStr,
      endDate: endDateStr,
      daysCount: 7,
      timezone: period.timezone,
    },
    metricsSummary: {
      totalScheduledHabitInstances,
      totalCompletedHabitInstances,
      overallHabitCompletionRate,
      totalFocusMinutes,
      averageDailyFocusMinutes,
      totalActivities: activities.length,
      activeDaysCount,
      perfectDaysCount,
      activeGoalsCount: goals.filter((g) => g.status === "active").length,
      journalEntriesCount: journalEntries.length,
      journalIncluded: includeJournal,
    },
    habits: habitPerformance,
    topActivities,
    goals: goals.map((g) => ({
      id: g.id,
      title: g.title,
      status: g.status,
      targetDate: g.targetDate ? formatDateStr(g.targetDate) : null,
    })),
    dailyBreakdown,
  };
}

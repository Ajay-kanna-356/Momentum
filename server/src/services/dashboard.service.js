import prisma from "../config/database.js";

/**
 * Get dashboard data for a given day (UTC date string YYYY-MM-DD).
 *
 * Returns:
 *  - habits: active habits scheduled for that day of the week
 *  - habitLogs: logs for the user's habits on that day
 *  - activities: activities recorded on that day
 *  - journalEntry: journal entry for that day (or null)
 *
 * Timezone note: The `day` parameter must be the user's local calendar date
 * in YYYY-MM-DD format, supplied explicitly by the caller. The server does
 * not infer a timezone. The client should derive the local date and pass it
 * as a query parameter (e.g., ?date=2026-10-10).
 */
export async function getDashboardForDay(userId, day) {
    // Map JS day number (0=Sun ... 6=Sat) to DayOfWeek enum
    const DOW_MAP = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const dayOfWeek = DOW_MAP[day.getUTCDay()];

    // Active habits scheduled for this day of the week
    const scheduledHabits = await prisma.habit.findMany({
        where: {
            userId,
            status: "active",
            schedules: { some: { dayOfWeek } },
        },
        include: {
            goal: { select: { id: true, title: true, status: true } },
            schedules: true,
        },
    });

    // Habit logs for those habits on this day
    const habitIds = scheduledHabits.map((h) => h.id);
    const habitLogs = habitIds.length
        ? await prisma.habitLog.findMany({
              where: { habitId: { in: habitIds }, day },
          })
        : [];

    // Activities for this day
    const activities = await prisma.activity.findMany({
        where: { userId, day },
        orderBy: { createdAt: "asc" },
        include: { habit: { select: { id: true, title: true } } },
    });

    // Journal entry for this day
    const journalEntry = await prisma.journalEntry.findUnique({
        where: { userId_day: { userId, day } },
    });

    return {
        date: day.toISOString().slice(0, 10),
        dayOfWeek,
        scheduledHabits,
        habitLogs,
        activities,
        journalEntry: journalEntry ?? null,
    };
}

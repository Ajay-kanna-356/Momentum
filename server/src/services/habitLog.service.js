import prisma from "../config/database.js";
import { NotFoundError, ForbiddenError } from "../utils/errors.js";
import { assertHabitOwnership } from "./habit.service.js";

/**
 * Upsert a HabitLog for (habitId, day).
 * Creates if absent, updates if present.
 * Verifies habit ownership first.
 */
export async function upsertHabitLog(habitId, userId, day, completed) {
    await assertHabitOwnership(habitId, userId);

    return prisma.habitLog.upsert({
        where: { habitId_day: { habitId, day } },
        update: { completed },
        create: { habitId, day, completed },
    });
}

/**
 * List logs for a specific habit (with optional date range).
 */
export async function listLogsForHabit(habitId, userId, filters = {}) {
    await assertHabitOwnership(habitId, userId);

    const where = { habitId };
    if (filters.from || filters.to) {
        where.day = {};
        if (filters.from) where.day.gte = filters.from;
        if (filters.to) where.day.lte = filters.to;
    }

    return prisma.habitLog.findMany({
        where,
        orderBy: { day: "desc" },
    });
}

/**
 * List all habit logs for a user on a specific day or date range.
 * Only returns logs whose habits belong to userId.
 */
export async function listLogsForUser(userId, filters = {}) {
    const where = {
        habit: { userId },
    };
    if (filters.day) {
        where.day = filters.day;
    } else if (filters.from || filters.to) {
        where.day = {};
        if (filters.from) where.day.gte = filters.from;
        if (filters.to) where.day.lte = filters.to;
    }

    return prisma.habitLog.findMany({
        where,
        orderBy: { day: "desc" },
        include: { habit: { select: { id: true, title: true } } },
    });
}

/**
 * Delete a habit log by id, verifying ownership.
 */
export async function deleteHabitLog(logId, userId) {
    const log = await prisma.habitLog.findUnique({
        where: { id: logId },
        include: { habit: { select: { userId: true } } },
    });
    if (!log) throw new NotFoundError("HabitLog");
    if (log.habit.userId !== userId) throw new ForbiddenError("Access denied");

    await prisma.habitLog.delete({ where: { id: logId } });
}

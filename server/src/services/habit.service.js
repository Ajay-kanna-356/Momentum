import prisma from "../config/database.js";
import { NotFoundError, ForbiddenError } from "../utils/errors.js";
import { assertGoalOwnership } from "./goal.service.js";

/**
 * Asserts that a Habit exists and belongs to userId.
 * Returns the Habit if valid.
 */
export async function assertHabitOwnership(habitId, userId) {
    const habit = await prisma.habit.findUnique({ where: { id: habitId } });
    if (!habit) throw new NotFoundError("Habit");
    if (habit.userId !== userId) throw new ForbiddenError("Access denied");
    return habit;
}

export async function createHabit(userId, data) {
    // If goalId is provided, verify ownership
    if (data.goalId) {
        await assertGoalOwnership(data.goalId, userId);
    }

    return prisma.habit.create({
        data: {
            userId,
            goalId: data.goalId ?? null,
            title: data.title,
            description: data.description ?? null,
            status: data.status ?? "active",
        },
        include: {
            goal: { select: { id: true, title: true, status: true } },
            schedules: true,
        },
    });
}

export async function listHabits(userId, filters = {}) {
    const where = { userId };
    if (filters.status) where.status = filters.status;
    if (filters.goalId) where.goalId = filters.goalId;

    return prisma.habit.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
            goal: { select: { id: true, title: true, status: true } },
            schedules: true,
        },
    });
}

export async function getHabit(habitId, userId) {
    const habit = await prisma.habit.findUnique({
        where: { id: habitId },
        include: {
            goal: { select: { id: true, title: true, status: true } },
            schedules: true,
        },
    });
    if (!habit) throw new NotFoundError("Habit");
    if (habit.userId !== userId) throw new ForbiddenError("Access denied");
    return habit;
}

export async function updateHabit(habitId, userId, data) {
    await assertHabitOwnership(habitId, userId);

    // If goalId is being set (not unlinked), verify ownership
    if (data.goalId !== undefined && data.goalId !== null) {
        await assertGoalOwnership(data.goalId, userId);
    }

    return prisma.habit.update({
        where: { id: habitId },
        data: {
            ...(data.title !== undefined && { title: data.title }),
            ...(data.description !== undefined && { description: data.description }),
            ...(data.status !== undefined && { status: data.status }),
            ...(data.goalId !== undefined && { goalId: data.goalId }),
        },
        include: {
            goal: { select: { id: true, title: true, status: true } },
            schedules: true,
        },
    });
}

export async function deleteHabit(habitId, userId) {
    await assertHabitOwnership(habitId, userId);
    // HabitSchedules and HabitLogs cascade-delete
    // Activities referencing this habit will have habitId set to null (SetNull)
    await prisma.habit.delete({ where: { id: habitId } });
}

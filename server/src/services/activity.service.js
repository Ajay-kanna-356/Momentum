import prisma from "../config/database.js";
import { NotFoundError, ForbiddenError } from "../utils/errors.js";
import { assertHabitOwnership } from "./habit.service.js";

/**
 * Verifies an activity exists and belongs to userId.
 */
async function assertActivityOwnership(activityId, userId) {
    const activity = await prisma.activity.findUnique({ where: { id: activityId } });
    if (!activity) throw new NotFoundError("Activity");
    if (activity.userId !== userId) throw new ForbiddenError("Access denied");
    return activity;
}

export async function createActivity(userId, data) {
    // If habitId is provided, verify it belongs to the same user
    if (data.habitId) {
        await assertHabitOwnership(data.habitId, userId);
    }

    return prisma.activity.create({
        data: {
            userId,
            habitId: data.habitId ?? null,
            title: data.title,
            description: data.description ?? null,
            day: data.day,
            startTime: data.startTime ?? null,
            endTime: data.endTime ?? null,
            duration: data.duration ?? null,
        },
        include: {
            habit: { select: { id: true, title: true } },
        },
    });
}

export async function listActivities(userId, filters = {}) {
    const where = { userId };

    if (filters.day) {
        where.day = filters.day;
    } else if (filters.from || filters.to) {
        where.day = {};
        if (filters.from) where.day.gte = filters.from;
        if (filters.to) where.day.lte = filters.to;
    }

    if (filters.habitId) {
        where.habitId = filters.habitId;
    }

    const page = Math.max(1, parseInt(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
        prisma.activity.findMany({
            where,
            orderBy: { day: "desc" },
            skip,
            take: limit,
            include: { habit: { select: { id: true, title: true } } },
        }),
        prisma.activity.count({ where }),
    ]);

    return { items, total, page, limit };
}

export async function getActivity(activityId, userId) {
    const activity = await prisma.activity.findUnique({
        where: { id: activityId },
        include: { habit: { select: { id: true, title: true } } },
    });
    if (!activity) throw new NotFoundError("Activity");
    if (activity.userId !== userId) throw new ForbiddenError("Access denied");
    return activity;
}

export async function updateActivity(activityId, userId, data) {
    await assertActivityOwnership(activityId, userId);

    // If habitId is being changed, verify the new habit belongs to the user
    if (data.habitId !== undefined && data.habitId !== null) {
        await assertHabitOwnership(data.habitId, userId);
    }

    return prisma.activity.update({
        where: { id: activityId },
        data: {
            ...(data.title !== undefined && { title: data.title }),
            ...(data.description !== undefined && { description: data.description }),
            ...(data.day !== undefined && { day: data.day }),
            ...(data.startTime !== undefined && { startTime: data.startTime }),
            ...(data.endTime !== undefined && { endTime: data.endTime }),
            ...(data.duration !== undefined && { duration: data.duration }),
            ...(data.habitId !== undefined && { habitId: data.habitId }),
        },
        include: { habit: { select: { id: true, title: true } } },
    });
}

export async function deleteActivity(activityId, userId) {
    await assertActivityOwnership(activityId, userId);
    await prisma.activity.delete({ where: { id: activityId } });
}

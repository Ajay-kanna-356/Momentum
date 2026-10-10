import prisma from "../config/database.js";
import { NotFoundError, ForbiddenError } from "../utils/errors.js";

/**
 * Asserts that a Goal exists and belongs to userId.
 * Returns the Goal if valid.
 */
export async function assertGoalOwnership(goalId, userId) {
    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) throw new NotFoundError("Goal");
    if (goal.userId !== userId) throw new ForbiddenError("Access denied");
    return goal;
}

export async function createGoal(userId, data) {
    return prisma.goal.create({
        data: {
            userId,
            title: data.title,
            description: data.description ?? null,
            status: data.status ?? "active",
            targetDate: data.targetDate ?? null,
        },
    });
}

export async function listGoals(userId) {
    return prisma.goal.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
    });
}

export async function getGoal(goalId, userId) {
    const goal = await assertGoalOwnership(goalId, userId);
    return goal;
}

export async function updateGoal(goalId, userId, data) {
    await assertGoalOwnership(goalId, userId);
    return prisma.goal.update({
        where: { id: goalId },
        data: {
            ...(data.title !== undefined && { title: data.title }),
            ...(data.description !== undefined && { description: data.description }),
            ...(data.status !== undefined && { status: data.status }),
            ...(data.targetDate !== undefined && { targetDate: data.targetDate }),
        },
    });
}

export async function deleteGoal(goalId, userId) {
    await assertGoalOwnership(goalId, userId);
    // Habits linked to this goal will have goalId set to null (SetNull in schema)
    await prisma.goal.delete({ where: { id: goalId } });
}

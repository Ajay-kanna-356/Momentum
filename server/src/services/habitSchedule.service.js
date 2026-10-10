import prisma from "../config/database.js";
import { assertHabitOwnership } from "./habit.service.js";

/**
 * Get all scheduled days for a habit.
 */
export async function getSchedule(habitId, userId) {
    await assertHabitOwnership(habitId, userId);
    return prisma.habitSchedule.findMany({
        where: { habitId },
        orderBy: { dayOfWeek: "asc" },
    });
}

/**
 * Replace the complete schedule for a habit.
 * Deletes all existing schedule entries then creates the new ones
 * in a single transaction. Does NOT touch HabitLogs or Activities.
 *
 * @param {number} habitId
 * @param {number} userId
 * @param {string[]} daysOfWeek - deduplicated, validated array of DayOfWeek enum values
 */
export async function replaceSchedule(habitId, userId, daysOfWeek) {
    await assertHabitOwnership(habitId, userId);

    return prisma.$transaction(async (tx) => {
        // Remove existing schedule entries
        await tx.habitSchedule.deleteMany({ where: { habitId } });

        if (daysOfWeek.length === 0) {
            return [];
        }

        // Create new schedule entries
        await tx.habitSchedule.createMany({
            data: daysOfWeek.map((dayOfWeek) => ({ habitId, dayOfWeek })),
        });

        return tx.habitSchedule.findMany({
            where: { habitId },
            orderBy: { dayOfWeek: "asc" },
        });
    });
}

/**
 * Clear all scheduled days for a habit.
 */
export async function clearSchedule(habitId, userId) {
    await assertHabitOwnership(habitId, userId);
    await prisma.habitSchedule.deleteMany({ where: { habitId } });
}

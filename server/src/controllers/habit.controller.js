import {
    createHabit,
    listHabits,
    getHabit,
    updateHabit,
    deleteHabit,
} from "../services/habit.service.js";
import { requireString, VALID_HABIT_STATUSES } from "../utils/validation.js";
import { ValidationError } from "../utils/errors.js";

export async function handleCreateHabit(req, res, next) {
    try {
        const userId = req.user.id;
        const title = requireString(req.body.title, "title");
        const { description, goalId, status } = req.body;

        if (status !== undefined && !VALID_HABIT_STATUSES.includes(status)) {
            throw new ValidationError(
                `status must be one of: ${VALID_HABIT_STATUSES.join(", ")}`
            );
        }

        const parsedGoalId =
            goalId !== undefined && goalId !== null ? parseInt(goalId) : null;
        if (parsedGoalId !== null && isNaN(parsedGoalId)) {
            throw new ValidationError("goalId must be a valid integer");
        }

        const habit = await createHabit(userId, {
            title,
            description: description?.trim() ?? null,
            goalId: parsedGoalId,
            status: status ?? "active",
        });

        res.status(201).json(habit);
    } catch (err) {
        next(err);
    }
}

export async function handleListHabits(req, res, next) {
    try {
        const { status, goalId } = req.query;

        if (status !== undefined && !VALID_HABIT_STATUSES.includes(status)) {
            throw new ValidationError(
                `status must be one of: ${VALID_HABIT_STATUSES.join(", ")}`
            );
        }

        const filters = {};
        if (status) filters.status = status;
        if (goalId) {
            const parsed = parseInt(goalId);
            if (isNaN(parsed)) throw new ValidationError("goalId must be a valid integer");
            filters.goalId = parsed;
        }

        const habits = await listHabits(req.user.id, filters);
        res.json(habits);
    } catch (err) {
        next(err);
    }
}

export async function handleGetHabit(req, res, next) {
    try {
        const habitId = parseInt(req.params.id);
        if (isNaN(habitId)) throw new ValidationError("Invalid habit id");
        const habit = await getHabit(habitId, req.user.id);
        res.json(habit);
    } catch (err) {
        next(err);
    }
}

export async function handleUpdateHabit(req, res, next) {
    try {
        const habitId = parseInt(req.params.id);
        if (isNaN(habitId)) throw new ValidationError("Invalid habit id");

        const { title, description, goalId, status } = req.body;
        const updates = {};

        if (title !== undefined) updates.title = requireString(title, "title");
        if (description !== undefined) updates.description = description?.trim() ?? null;
        if (status !== undefined) {
            if (!VALID_HABIT_STATUSES.includes(status)) {
                throw new ValidationError(
                    `status must be one of: ${VALID_HABIT_STATUSES.join(", ")}`
                );
            }
            updates.status = status;
        }
        if (goalId !== undefined) {
            // Allow explicitly setting to null to unlink
            updates.goalId =
                goalId === null ? null : parseInt(goalId);
            if (updates.goalId !== null && isNaN(updates.goalId)) {
                throw new ValidationError("goalId must be a valid integer or null");
            }
        }

        const habit = await updateHabit(habitId, req.user.id, updates);
        res.json(habit);
    } catch (err) {
        next(err);
    }
}

export async function handleDeleteHabit(req, res, next) {
    try {
        const habitId = parseInt(req.params.id);
        if (isNaN(habitId)) throw new ValidationError("Invalid habit id");
        await deleteHabit(habitId, req.user.id);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
}

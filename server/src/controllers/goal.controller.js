import {
    createGoal,
    listGoals,
    getGoal,
    updateGoal,
    deleteGoal,
} from "../services/goal.service.js";
import {
    requireString,
    parseOptionalDate,
    VALID_GOAL_STATUSES,
} from "../utils/validation.js";
import { ValidationError } from "../utils/errors.js";

export async function handleCreateGoal(req, res, next) {
    try {
        const userId = req.user.id;
        const title = requireString(req.body.title, "title");

        const { description, status, targetDate } = req.body;

        if (status !== undefined && !VALID_GOAL_STATUSES.includes(status)) {
            throw new ValidationError(
                `status must be one of: ${VALID_GOAL_STATUSES.join(", ")}`
            );
        }

        const parsedTargetDate = parseOptionalDate(targetDate, "targetDate");

        const goal = await createGoal(userId, {
            title,
            description: description?.trim() ?? null,
            status: status ?? "active",
            targetDate: parsedTargetDate ?? null,
        });

        res.status(201).json(goal);
    } catch (err) {
        next(err);
    }
}

export async function handleListGoals(req, res, next) {
    try {
        const goals = await listGoals(req.user.id);
        res.json(goals);
    } catch (err) {
        next(err);
    }
}

export async function handleGetGoal(req, res, next) {
    try {
        const goalId = parseInt(req.params.id);
        if (isNaN(goalId)) throw new ValidationError("Invalid goal id");
        const goal = await getGoal(goalId, req.user.id);
        res.json(goal);
    } catch (err) {
        next(err);
    }
}

export async function handleUpdateGoal(req, res, next) {
    try {
        const goalId = parseInt(req.params.id);
        if (isNaN(goalId)) throw new ValidationError("Invalid goal id");

        const { title, description, status, targetDate } = req.body;
        const updates = {};

        if (title !== undefined) updates.title = requireString(title, "title");
        if (description !== undefined) updates.description = description?.trim() ?? null;
        if (status !== undefined) {
            if (!VALID_GOAL_STATUSES.includes(status)) {
                throw new ValidationError(
                    `status must be one of: ${VALID_GOAL_STATUSES.join(", ")}`
                );
            }
            updates.status = status;
        }
        if (targetDate !== undefined) {
            updates.targetDate = parseOptionalDate(targetDate, "targetDate") ?? null;
        }

        const goal = await updateGoal(goalId, req.user.id, updates);
        res.json(goal);
    } catch (err) {
        next(err);
    }
}

export async function handleDeleteGoal(req, res, next) {
    try {
        const goalId = parseInt(req.params.id);
        if (isNaN(goalId)) throw new ValidationError("Invalid goal id");
        await deleteGoal(goalId, req.user.id);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
}

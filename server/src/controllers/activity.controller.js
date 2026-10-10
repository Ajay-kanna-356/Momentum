import {
    createActivity,
    listActivities,
    getActivity,
    updateActivity,
    deleteActivity,
} from "../services/activity.service.js";
import {
    requireString,
    parseDate,
    parseOptionalDate,
    parseOptionalTime,
} from "../utils/validation.js";
import { ValidationError } from "../utils/errors.js";

export async function handleCreateActivity(req, res, next) {
    try {
        const userId = req.user.id;
        const title = requireString(req.body.title, "title");
        const day = parseDate(req.body.day, "day");

        const { description, habitId, startTime, endTime, duration } = req.body;

        const parsedHabitId =
            habitId !== undefined && habitId !== null ? parseInt(habitId) : null;
        if (parsedHabitId !== null && isNaN(parsedHabitId)) {
            throw new ValidationError("habitId must be a valid integer");
        }

        const parsedDuration =
            duration !== undefined && duration !== null ? parseInt(duration) : null;
        if (parsedDuration !== null && (isNaN(parsedDuration) || parsedDuration < 0)) {
            throw new ValidationError("duration must be a non-negative integer (minutes)");
        }

        const activity = await createActivity(userId, {
            title,
            description: description?.trim() ?? null,
            day,
            habitId: parsedHabitId,
            startTime: parseOptionalTime(startTime, "startTime"),
            endTime: parseOptionalTime(endTime, "endTime"),
            duration: parsedDuration,
        });

        res.status(201).json(activity);
    } catch (err) {
        next(err);
    }
}

export async function handleListActivities(req, res, next) {
    try {
        const userId = req.user.id;
        const { day, from, to, habitId, page, limit } = req.query;

        const filters = { page, limit };

        if (day) filters.day = parseDate(day, "day");
        else {
            filters.from = parseOptionalDate(from, "from");
            filters.to = parseOptionalDate(to, "to");
        }

        if (habitId) {
            const parsed = parseInt(habitId);
            if (isNaN(parsed)) throw new ValidationError("habitId must be a valid integer");
            filters.habitId = parsed;
        }

        const result = await listActivities(userId, filters);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

export async function handleGetActivity(req, res, next) {
    try {
        const activityId = parseInt(req.params.id);
        if (isNaN(activityId)) throw new ValidationError("Invalid activity id");
        const activity = await getActivity(activityId, req.user.id);
        res.json(activity);
    } catch (err) {
        next(err);
    }
}

export async function handleUpdateActivity(req, res, next) {
    try {
        const activityId = parseInt(req.params.id);
        if (isNaN(activityId)) throw new ValidationError("Invalid activity id");

        const { title, description, day, habitId, startTime, endTime, duration } = req.body;
        const updates = {};

        if (title !== undefined) updates.title = requireString(title, "title");
        if (description !== undefined) updates.description = description?.trim() ?? null;
        if (day !== undefined) updates.day = parseDate(day, "day");
        if (habitId !== undefined) {
            updates.habitId = habitId === null ? null : parseInt(habitId);
            if (updates.habitId !== null && isNaN(updates.habitId)) {
                throw new ValidationError("habitId must be a valid integer or null");
            }
        }
        if (startTime !== undefined) updates.startTime = parseOptionalTime(startTime, "startTime");
        if (endTime !== undefined) updates.endTime = parseOptionalTime(endTime, "endTime");
        if (duration !== undefined) {
            updates.duration = duration === null ? null : parseInt(duration);
            if (updates.duration !== null && (isNaN(updates.duration) || updates.duration < 0)) {
                throw new ValidationError("duration must be a non-negative integer");
            }
        }

        const activity = await updateActivity(activityId, req.user.id, updates);
        res.json(activity);
    } catch (err) {
        next(err);
    }
}

export async function handleDeleteActivity(req, res, next) {
    try {
        const activityId = parseInt(req.params.id);
        if (isNaN(activityId)) throw new ValidationError("Invalid activity id");
        await deleteActivity(activityId, req.user.id);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
}

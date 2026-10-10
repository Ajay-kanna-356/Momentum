import {
    upsertHabitLog,
    listLogsForHabit,
    listLogsForUser,
    deleteHabitLog,
} from "../services/habitLog.service.js";
import { parseDate, parseOptionalDate } from "../utils/validation.js";
import { ValidationError } from "../utils/errors.js";

export async function handleUpsertHabitLog(req, res, next) {
    try {
        const userId = req.user.id;
        const habitId = parseInt(req.params.habitId);
        if (isNaN(habitId)) throw new ValidationError("Invalid habit id");

        const day = parseDate(req.body.day, "day");
        const { completed } = req.body;

        if (completed === undefined || typeof completed !== "boolean") {
            throw new ValidationError("completed must be a boolean");
        }

        const log = await upsertHabitLog(habitId, userId, day, completed);
        res.status(200).json(log);
    } catch (err) {
        next(err);
    }
}

export async function handleListLogsForHabit(req, res, next) {
    try {
        const userId = req.user.id;
        const habitId = parseInt(req.params.habitId);
        if (isNaN(habitId)) throw new ValidationError("Invalid habit id");

        const { from, to } = req.query;
        const filters = {
            from: parseOptionalDate(from, "from"),
            to: parseOptionalDate(to, "to"),
        };

        const logs = await listLogsForHabit(habitId, userId, filters);
        res.json(logs);
    } catch (err) {
        next(err);
    }
}

export async function handleListLogsForUser(req, res, next) {
    try {
        const userId = req.user.id;
        const { day, from, to } = req.query;

        const filters = {};
        if (day) filters.day = parseDate(day, "day");
        else {
            filters.from = parseOptionalDate(from, "from");
            filters.to = parseOptionalDate(to, "to");
        }

        const logs = await listLogsForUser(userId, filters);
        res.json(logs);
    } catch (err) {
        next(err);
    }
}

export async function handleDeleteHabitLog(req, res, next) {
    try {
        const logId = parseInt(req.params.logId);
        if (isNaN(logId)) throw new ValidationError("Invalid log id");
        await deleteHabitLog(logId, req.user.id);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
}

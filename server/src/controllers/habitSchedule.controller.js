import {
    getSchedule,
    replaceSchedule,
    clearSchedule,
} from "../services/habitSchedule.service.js";
import { validateDays } from "../utils/validation.js";
import { ValidationError } from "../utils/errors.js";

function parseHabitId(req) {
    const id = parseInt(req.params.habitId);
    if (isNaN(id)) throw new ValidationError("Invalid habit id");
    return id;
}

export async function handleGetSchedule(req, res, next) {
    try {
        const habitId = parseHabitId(req);
        const schedule = await getSchedule(habitId, req.user.id);
        res.json({ habitId, schedule });
    } catch (err) {
        next(err);
    }
}

export async function handleReplaceSchedule(req, res, next) {
    try {
        const habitId = parseHabitId(req);
        const { daysOfWeek } = req.body;

        if (daysOfWeek === undefined) {
            throw new ValidationError("daysOfWeek is required");
        }

        const days = validateDays(daysOfWeek);
        const schedule = await replaceSchedule(habitId, req.user.id, days);
        res.json({ habitId, schedule });
    } catch (err) {
        next(err);
    }
}

export async function handleClearSchedule(req, res, next) {
    try {
        const habitId = parseHabitId(req);
        await clearSchedule(habitId, req.user.id);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
}

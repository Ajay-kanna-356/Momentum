import { getDashboardForDay } from "../services/dashboard.service.js";
import { parseDate } from "../utils/validation.js";
import { ValidationError } from "../utils/errors.js";

export async function handleGetDashboard(req, res, next) {
    try {
        const userId = req.user.id;

        // The client must supply ?date=YYYY-MM-DD (the user's local calendar date).
        // If omitted, we fall back to today's UTC date as a convenience.
        let day;
        if (req.query.date) {
            day = parseDate(req.query.date, "date");
        } else {
            // Use current UTC date
            const now = new Date();
            const iso = now.toISOString().slice(0, 10);
            day = new Date(`${iso}T00:00:00.000Z`);
        }

        const data = await getDashboardForDay(userId, day);
        res.json(data);
    } catch (err) {
        next(err);
    }
}

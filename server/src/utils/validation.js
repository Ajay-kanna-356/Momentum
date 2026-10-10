import { ValidationError } from "./errors.js";

/** Valid DayOfWeek enum values matching Prisma schema */
export const VALID_DAYS = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
];

/** Valid GoalStatus enum values matching Prisma schema */
export const VALID_GOAL_STATUSES = ["active", "completed", "archived"];

/** Valid HabitStatus enum values matching Prisma schema */
export const VALID_HABIT_STATUSES = ["active", "archived"];

/**
 * Parses and validates a date string (YYYY-MM-DD).
 * Returns a Date object set to midnight UTC.
 * Throws ValidationError if the string is missing or malformed.
 */
export function parseDate(value, fieldName = "day") {
    if (!value || typeof value !== "string") {
        throw new ValidationError(`${fieldName} is required`);
    }
    // Accept only YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
        throw new ValidationError(
            `${fieldName} must be a valid date in YYYY-MM-DD format`
        );
    }
    const d = new Date(`${value.trim()}T00:00:00.000Z`);
    if (isNaN(d.getTime())) {
        throw new ValidationError(
            `${fieldName} must be a valid calendar date`
        );
    }
    return d;
}

/**
 * Parses an optional date string. Returns undefined if value is absent.
 */
export function parseOptionalDate(value, fieldName = "date") {
    if (value === undefined || value === null || value === "") return undefined;
    return parseDate(value, fieldName);
}

/**
 * Validates and returns a non-empty trimmed string.
 * Throws ValidationError if absent or blank.
 */
export function requireString(value, fieldName) {
    if (value === undefined || value === null) {
        throw new ValidationError(`${fieldName} is required`);
    }
    const trimmed = String(value).trim();
    if (trimmed.length === 0) {
        throw new ValidationError(`${fieldName} must not be empty`);
    }
    return trimmed;
}

/**
 * Validates and deduplicates an array of DayOfWeek values.
 * Returns a deduplicated array of valid day strings.
 */
export function validateDays(days) {
    if (!Array.isArray(days)) {
        throw new ValidationError("daysOfWeek must be an array");
    }
    const invalid = days.filter((d) => !VALID_DAYS.includes(d));
    if (invalid.length > 0) {
        throw new ValidationError(
            `Invalid day(s): ${invalid.join(", ")}. Valid values: ${VALID_DAYS.join(", ")}`
        );
    }
    // Deduplicate
    return [...new Set(days)];
}

/**
 * Parses a time string (HH:MM or HH:MM:SS) into a Date object (date portion is 1970-01-01).
 * Returns undefined if value is absent.
 */
export function parseOptionalTime(value, fieldName) {
    if (value === undefined || value === null || value === "") return undefined;
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
        throw new ValidationError(
            `${fieldName} must be a valid time in HH:MM or HH:MM:SS format`
        );
    }
    const d = new Date(`1970-01-01T${value.length === 5 ? value + ":00" : value}.000Z`);
    if (isNaN(d.getTime())) {
        throw new ValidationError(`${fieldName} must be a valid time`);
    }
    return d;
}

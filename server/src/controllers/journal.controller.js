import {
    createJournalEntry,
    listJournalEntries,
    getJournalEntry,
    getJournalEntryByDay,
    updateJournalEntry,
    deleteJournalEntry,
} from "../services/journal.service.js";
import { requireString, parseDate, parseOptionalDate } from "../utils/validation.js";
import { ValidationError } from "../utils/errors.js";

export async function handleCreateJournalEntry(req, res, next) {
    try {
        const userId = req.user.id;
        const day = parseDate(req.body.day, "day");
        const content = requireString(req.body.content, "content");

        const entry = await createJournalEntry(userId, day, content);
        res.status(201).json(entry);
    } catch (err) {
        next(err);
    }
}

export async function handleListJournalEntries(req, res, next) {
    try {
        const { from, to } = req.query;
        const filters = {
            from: parseOptionalDate(from, "from"),
            to: parseOptionalDate(to, "to"),
        };
        const entries = await listJournalEntries(req.user.id, filters);
        res.json(entries);
    } catch (err) {
        next(err);
    }
}

export async function handleGetJournalEntry(req, res, next) {
    try {
        const entryId = parseInt(req.params.id);
        if (isNaN(entryId)) throw new ValidationError("Invalid journal entry id");
        const entry = await getJournalEntry(entryId, req.user.id);
        res.json(entry);
    } catch (err) {
        next(err);
    }
}

export async function handleGetJournalEntryByDay(req, res, next) {
    try {
        const day = parseDate(req.query.day, "day");
        const entry = await getJournalEntryByDay(req.user.id, day);
        res.json(entry);
    } catch (err) {
        next(err);
    }
}

export async function handleUpdateJournalEntry(req, res, next) {
    try {
        const entryId = parseInt(req.params.id);
        if (isNaN(entryId)) throw new ValidationError("Invalid journal entry id");
        const content = requireString(req.body.content, "content");
        const entry = await updateJournalEntry(entryId, req.user.id, content);
        res.json(entry);
    } catch (err) {
        next(err);
    }
}

export async function handleDeleteJournalEntry(req, res, next) {
    try {
        const entryId = parseInt(req.params.id);
        if (isNaN(entryId)) throw new ValidationError("Invalid journal entry id");
        await deleteJournalEntry(entryId, req.user.id);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
}

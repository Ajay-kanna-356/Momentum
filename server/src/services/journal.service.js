import prisma from "../config/database.js";
import { NotFoundError, ForbiddenError, ConflictError } from "../utils/errors.js";

/**
 * Asserts that a JournalEntry exists and belongs to userId.
 */
async function assertJournalOwnership(entryId, userId) {
    const entry = await prisma.journalEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw new NotFoundError("JournalEntry");
    if (entry.userId !== userId) throw new ForbiddenError("Access denied");
    return entry;
}

export async function createJournalEntry(userId, day, content) {
    // Enforce one-entry-per-day for this user
    const existing = await prisma.journalEntry.findUnique({
        where: { userId_day: { userId, day } },
    });
    if (existing) {
        throw new ConflictError(
            "A journal entry already exists for this day. Edit the existing entry instead."
        );
    }

    return prisma.journalEntry.create({
        data: { userId, day, content },
    });
}

export async function listJournalEntries(userId, filters = {}) {
    const where = { userId };
    if (filters.from || filters.to) {
        where.day = {};
        if (filters.from) where.day.gte = filters.from;
        if (filters.to) where.day.lte = filters.to;
    }

    return prisma.journalEntry.findMany({
        where,
        orderBy: { day: "desc" },
    });
}

export async function getJournalEntry(entryId, userId) {
    return assertJournalOwnership(entryId, userId);
}

export async function getJournalEntryByDay(userId, day) {
    const entry = await prisma.journalEntry.findUnique({
        where: { userId_day: { userId, day } },
    });
    if (!entry) throw new NotFoundError("JournalEntry");
    return entry;
}

export async function updateJournalEntry(entryId, userId, content) {
    await assertJournalOwnership(entryId, userId);
    return prisma.journalEntry.update({
        where: { id: entryId },
        data: { content },
    });
}

export async function deleteJournalEntry(entryId, userId) {
    await assertJournalOwnership(entryId, userId);
    await prisma.journalEntry.delete({ where: { id: entryId } });
}

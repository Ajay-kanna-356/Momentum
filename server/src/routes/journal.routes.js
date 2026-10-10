import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
    handleCreateJournalEntry,
    handleListJournalEntries,
    handleGetJournalEntry,
    handleGetJournalEntryByDay,
    handleUpdateJournalEntry,
    handleDeleteJournalEntry,
} from "../controllers/journal.controller.js";

const router = Router();

router.use(authenticate);

router.post("/", handleCreateJournalEntry);
router.get("/", handleListJournalEntries);
router.get("/by-day", handleGetJournalEntryByDay); // GET /journal/by-day?day=YYYY-MM-DD
router.get("/:id", handleGetJournalEntry);
router.patch("/:id", handleUpdateJournalEntry);
router.delete("/:id", handleDeleteJournalEntry);

export default router;

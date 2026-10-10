/**
 * Global test setup.
 *
 * Loads environment variables before any tests run.
 * Uses TEST_DATABASE_URL if available, otherwise DATABASE_URL.
 */
import dotenv from "dotenv";
dotenv.config();

// If TEST_DATABASE_URL is set, override DATABASE_URL for test isolation
if (process.env.TEST_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

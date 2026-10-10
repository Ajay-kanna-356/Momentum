/**
 * Test helpers for Momentum API tests.
 *
 * Uses TEST_DATABASE_URL if set; falls back to DATABASE_URL.
 * Mocks Google OAuth - tests authenticate via JWT directly.
 */

import { signToken } from "../src/utils/jwt.js";
import prisma from "../src/config/database.js";

/**
 * Create a test user directly in the database (bypasses Google OAuth).
 * Returns the created user and a valid Bearer token.
 */
export async function createTestUser(overrides = {}) {
    const suffix = Math.random().toString(36).slice(2, 9);
    const user = await prisma.user.create({
        data: {
            name: overrides.name ?? `Test User ${suffix}`,
            email: overrides.email ?? `test_${suffix}@momentum.test`,
            profilePicture: null,
        },
    });
    const token = signToken(user.id);
    return { user, token, authHeader: `Bearer ${token}` };
}

/**
 * Remove all test data by deleting every user whose email ends with @momentum.test.
 * Cascade deletes take care of related records.
 */
export async function cleanupTestUsers() {
    await prisma.user.deleteMany({
        where: { email: { endsWith: "@momentum.test" } },
    });
}

/**
 * Disconnect Prisma after all tests.
 */
export async function disconnectPrisma() {
    await prisma.$disconnect();
}

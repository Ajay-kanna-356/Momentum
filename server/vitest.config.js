import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        globals: true,
        pool: "forks",
        singleFork: true,
        // Run test FILES sequentially to avoid DB conflicts between files
        fileParallelism: false,
        // Increase timeout for DB operations
        testTimeout: 30000,
        hookTimeout: 30000,
        // Setup file
        setupFiles: ["./tests/setup.js"],
    },
});

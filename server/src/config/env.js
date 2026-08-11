const requiredEnvVars = [
    "DATABASE_URL",
    "JWT_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_CALLBACK_URL",
    "CLIENT_URL",
];

export function validateEnv() {
    const missing = requiredEnvVars.filter((key) => !process.env[key]);

    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missing.join(", ")}`
        );
    }
}

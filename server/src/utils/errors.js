// Custom error classes for consistent API error handling

export class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.name = "AppError";
    }
}

export class NotFoundError extends AppError {
    constructor(resource = "Resource") {
        super(`${resource} not found`, 404);
        this.name = "NotFoundError";
    }
}

export class ForbiddenError extends AppError {
    constructor(message = "Access denied") {
        super(message, 403);
        this.name = "ForbiddenError";
    }
}

export class ValidationError extends AppError {
    constructor(message) {
        super(message, 400);
        this.name = "ValidationError";
    }
}

export class ConflictError extends AppError {
    constructor(message) {
        super(message, 409);
        this.name = "ConflictError";
    }
}

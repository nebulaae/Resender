/**
 * Typed application errors. Throw these from services; the central error
 * middleware maps them to the right HTTP status and response envelope.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly expose: boolean;
  public readonly errors?: unknown;

  constructor(message: string, statusCode = 500, options?: { expose?: boolean; errors?: unknown }) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    // expose = safe to show the message to the client (default true for 4xx)
    this.expose = options?.expose ?? statusCode < 500;
    this.errors = options?.errors;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request.', errors?: unknown) {
    super(message, 400, { errors });
  }
}
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized.') {
    super(message, 401);
  }
}
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden.') {
    super(message, 403);
  }
}
export class NotFoundError extends AppError {
  constructor(message = 'Not found.') {
    super(message, 404);
  }
}
export class ConflictError extends AppError {
  constructor(message = 'Conflict.') {
    super(message, 409);
  }
}
export class ValidationError extends AppError {
  constructor(message = 'Validation failed.', errors?: unknown) {
    super(message, 422, { errors });
  }
}
export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests.') {
    super(message, 429);
  }
}

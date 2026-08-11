/**
 * The catalog of error codes the API can return. Each maps to a single HTTP
 * status so routes never hand-roll status codes (requirement 6.1).
 */
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "SESSION_ACTIVE"
  | "NO_ACTIVE_SESSION"
  | "INTERNAL_ERROR";

const statusByCode: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  SESSION_ACTIVE: 409,
  NO_ACTIVE_SESSION: 409,
  INTERNAL_ERROR: 500,
};

/**
 * A tagged application error. Domain and route code throw these; a single
 * Fastify error handler turns them into the standard error envelope so the
 * shape stays consistent everywhere (requirement 6.1).
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = statusByCode[code];
    this.details = details;
  }
}

export const notFound = (message = "Resource not found"): AppError =>
  new AppError("NOT_FOUND", message);

export const validationError = (message: string, details?: unknown): AppError =>
  new AppError("VALIDATION_ERROR", message, details);

export const sessionActive = (
  message = "A focus session is already active",
): AppError => new AppError("SESSION_ACTIVE", message);

export const noActiveSession = (
  message = "No focus session is active",
): AppError => new AppError("NO_ACTIVE_SESSION", message);

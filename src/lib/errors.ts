/**
 * Custom Error Classes
 * Application-specific errors with consistent structure
 */

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Authentication & Authorization Errors
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details?: unknown) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details?: unknown) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

export class InvalidTokenError extends AppError {
  constructor(message = 'Invalid token', details?: unknown) {
    super(message, 401, 'INVALID_TOKEN', details);
  }
}

// Validation Errors
export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

// Resource Errors
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} with id '${id}' not found`
      : `${resource} not found`;
    super(message, 404, 'NOT_FOUND', { resource, id });
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 409, 'CONFLICT', details);
  }
}

// Business Logic Errors
export class InsufficientBalanceError extends AppError {
  constructor(required: number, available: number) {
    super(
      `Insufficient balance. Required: ${required}, Available: ${available}`,
      400,
      'INSUFFICIENT_BALANCE',
      { required, available }
    );
  }
}

export class SubscriptionExpiredError extends AppError {
  constructor(subscriptionId: string) {
    super(
      'Subscription has expired',
      400,
      'SUBSCRIPTION_EXPIRED',
      { subscriptionId }
    );
  }
}

export class ServerOverloadedError extends AppError {
  constructor(serverId: string) {
    super(
      'Server is overloaded',
      503,
      'SERVER_OVERLOADED',
      { serverId }
    );
  }
}

export class IpPoolExhaustedError extends AppError {
  constructor(serverId: string) {
    super(
      'No available IP addresses in pool',
      503,
      'IP_POOL_EXHAUSTED',
      { serverId }
    );
  }
}

// Payment Errors
export class PaymentFailedError extends AppError {
  constructor(reason: string, details?: unknown) {
    super(`Payment failed: ${reason}`, 400, 'PAYMENT_FAILED', details);
  }
}

export class InvalidPromoCodeError extends AppError {
  constructor(code: string) {
    super(
      `Invalid or expired promo code: ${code}`,
      400,
      'INVALID_PROMO_CODE',
      { code }
    );
  }
}

// Rate Limiting
export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super(
      'Too many requests',
      429,
      'RATE_LIMIT_EXCEEDED',
      { retryAfter }
    );
  }
}

// External Service Errors
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(
      `External service error (${service}): ${message}`,
      503,
      'EXTERNAL_SERVICE_ERROR',
      { service }
    );
  }
}

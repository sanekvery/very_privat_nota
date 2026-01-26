/**
 * API Response Helpers
 * Standardized response creators for Next.js API routes
 */

import { NextResponse } from 'next/server';
import type { ApiResponse, ApiError } from '@/types';
import { AppError } from './errors';
import { logger } from './logger';

/**
 * Create a successful API response
 */
export function createSuccessResponse<T>(
  data: T,
  status = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

/**
 * Create an error API response
 */
export function createErrorResponse(
  error: unknown,
  defaultMessage = 'Internal server error'
): NextResponse<ApiResponse<never>> {
  let apiError: ApiError;

  if (error instanceof AppError) {
    apiError = {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
    };
  } else if (error instanceof Error) {
    logger.error('Unexpected error:', error);
    apiError = {
      message:
        process.env.NODE_ENV === 'development'
          ? error.message
          : defaultMessage,
      statusCode: 500,
    };
  } else {
    logger.error('Unknown error:', error);
    apiError = {
      message: defaultMessage,
      statusCode: 500,
    };
  }

  return NextResponse.json(
    {
      success: false,
      error: {
        message: apiError.message,
        code: apiError.code,
        details: apiError.details,
      },
    },
    { status: apiError.statusCode }
  );
}

/**
 * Async handler wrapper for API routes
 * Catches errors and returns standardized error responses
 */
export function apiHandler<T>(
  handler: (request: any) => Promise<NextResponse<ApiResponse<T>>>
) {
  return async (request: any): Promise<NextResponse<ApiResponse<T | never>>> => {
    try {
      return await handler(request);
    } catch (error) {
      return createErrorResponse(error) as NextResponse<ApiResponse<never>>;
    }
  };
}

/**
 * Validate request method
 */
export function validateMethod(
  request: any,
  allowedMethods: string[]
): void {
  if (!allowedMethods.includes(request.method)) {
    throw new AppError(
      `Method ${request.method} not allowed`,
      405,
      'METHOD_NOT_ALLOWED'
    );
  }
}

/**
 * Parse request JSON body with error handling
 */
export async function parseRequestBody<T>(request: any): Promise<T> {
  try {
    return await request.json();
  } catch (error) {
    throw new AppError(
      'Invalid JSON in request body',
      400,
      'INVALID_JSON'
    );
  }
}

/**
 * Get query params from URL
 */
export function getQueryParams(request: any): URLSearchParams {
  const { searchParams } = new URL(request.url);
  return searchParams;
}

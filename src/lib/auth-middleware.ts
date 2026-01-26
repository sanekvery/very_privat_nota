/**
 * Authentication Middleware
 * Validates session tokens and protects routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { UnauthorizedError, ForbiddenError } from './errors';
import { createErrorResponse } from './api-response';
import { authService } from '@/modules/auth/auth.service';
import type { AuthUser } from '@/modules/auth/auth.types';

// Extended request with auth context
export interface AuthenticatedRequest extends NextRequest {
  user?: AuthUser;
}

/**
 * Extract bearer token from request
 */
function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return null;
  }

  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * Require authentication middleware
 * Validates session token and adds user to request
 */
export async function requireAuth(
  request: NextRequest
): Promise<AuthUser> {
  const token = extractToken(request);

  if (!token) {
    throw new UnauthorizedError('Authentication required');
  }

  try {
    const user = await authService.validateSession(token);
    return user;
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired session');
  }
}

/**
 * Require admin middleware
 * Validates session and checks for admin role
 */
export async function requireAdmin(
  request: NextRequest
): Promise<AuthUser> {
  const user = await requireAuth(request);

  if (!user.isAdmin) {
    throw new ForbiddenError('Admin access required');
  }

  return user;
}

/**
 * Optional auth middleware
 * Adds user to request if authenticated, but doesn't require it
 */
export async function optionalAuth(
  request: NextRequest
): Promise<AuthUser | null> {
  const token = extractToken(request);

  if (!token) {
    return null;
  }

  try {
    return await authService.validateSession(token);
  } catch {
    return null;
  }
}

/**
 * Wrapper for authenticated route handlers
 */
export function withAuth<T>(
  handler: (request: NextRequest, user: AuthUser) => Promise<NextResponse<T>>
) {
  return async (request: NextRequest): Promise<NextResponse<T>> => {
    try {
      const user = await requireAuth(request);
      return await handler(request, user);
    } catch (error) {
      return createErrorResponse(error) as NextResponse<T>;
    }
  };
}

/**
 * Wrapper for admin-only route handlers
 */
export function withAdmin<T>(
  handler: (request: NextRequest, user: AuthUser) => Promise<NextResponse<T>>
) {
  return async (request: NextRequest): Promise<NextResponse<T>> => {
    try {
      const user = await requireAdmin(request);
      return await handler(request, user);
    } catch (error) {
      return createErrorResponse(error) as NextResponse<T>;
    }
  };
}

/**
 * Wrapper for optional auth route handlers
 */
export function withOptionalAuth<T>(
  handler: (request: NextRequest, user: AuthUser | null) => Promise<NextResponse<T>>
) {
  return async (request: NextRequest): Promise<NextResponse<T>> => {
    try {
      const user = await optionalAuth(request);
      return await handler(request, user);
    } catch (error) {
      return createErrorResponse(error) as NextResponse<T>;
    }
  };
}

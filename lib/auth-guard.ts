import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { extractBearerToken, verifyAdminBearerToken } from '@/lib/jwt';
import { NextResponse } from 'next/server';

export interface AdminAuthContext {
  authenticated: boolean;
  authorized: boolean;
  user?: {
    username: string;
    role: 'admin';
    displayName?: string;
  };
  authMethod?: 'bearer' | 'session';
  error?: string;
}

/**
 * Checks authentication & role authorization for both Bearer tokens and NextAuth sessions.
 * Can be called in Route Handlers, Server Actions, or Server Components.
 */
export async function getAdminAuth(req?: Request): Promise<AdminAuthContext> {
  // 1. Check for Authorization: Bearer <token>
  let authHeader: string | null = null;
  if (req) {
    authHeader = req.headers.get('authorization');
  } else {
    try {
      const h = await headers();
      authHeader = h.get('authorization');
    } catch {
      // headers() may fail if called outside of request context
    }
  }

  const bearerToken = extractBearerToken(authHeader);
  if (bearerToken) {
    const result = await verifyAdminBearerToken(bearerToken);
    if (result.valid && result.payload) {
      return {
        authenticated: true,
        authorized: true,
        user: {
          username: result.payload.username,
          role: 'admin',
          displayName: result.payload.displayName,
        },
        authMethod: 'bearer',
      };
    }
    return {
      authenticated: false,
      authorized: false,
      error: result.error || 'Invalid or expired Bearer token',
    };
  }

  // 2. Check for NextAuth cookie-based session
  try {
    const session = await auth();
    if (session?.user && session.user.role === 'admin') {
      const username = session.user.username || session.user.name || 'admin';
      return {
        authenticated: true,
        authorized: true,
        user: {
          username,
          role: 'admin',
          displayName: session.user.name || username,
        },
        authMethod: 'session',
      };
    }
  } catch (err) {
    console.error('Session retrieval error in getAdminAuth:', err);
  }

  return {
    authenticated: false,
    authorized: false,
    error: 'Authentication required. Provide a valid NextAuth session or Bearer token.',
  };
}

/**
 * Enforces admin authentication in API Route Handlers.
 * Returns null if authorized, or a pre-configured 401/403 NextResponse if unauthorized.
 */
export async function enforceAdminApiAuth(req: Request): Promise<NextResponse | null> {
  const authContext = await getAdminAuth(req);

  if (!authContext.authenticated) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: authContext.error || 'Authentication required',
      },
      {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Bearer realm="SpecPulse Admin API", charset="UTF-8"',
        },
      }
    );
  }

  if (!authContext.authorized) {
    return NextResponse.json(
      {
        error: 'Forbidden',
        message: 'Insufficient permissions. Admin authorization required.',
      },
      { status: 403 }
    );
  }

  return null;
}


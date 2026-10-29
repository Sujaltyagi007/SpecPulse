import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { extractBearerToken, verifyAdminBearerToken } from '@/lib/jwt';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Clone headers to forward request info down the line
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  // Security headers applied to all admin responses
  const applySecurityHeaders = (response: NextResponse) => {
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    return response;
  };

  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || process.env.ADMIN_PASSWORD;

  // 1. Check Bearer Token
  let isAuthenticated = false;
  let userRole: string | null = null;
  let username: string | null = null;

  const authHeader = request.headers.get('authorization');
  const bearerToken = extractBearerToken(authHeader);

  if (bearerToken) {
    const bearerResult = await verifyAdminBearerToken(bearerToken);
    if (bearerResult.valid && bearerResult.payload) {
      isAuthenticated = true;
      userRole = bearerResult.payload.role;
      username = bearerResult.payload.username;
    }
  }

  // 2. Check NextAuth Session Token if not authenticated via Bearer
  if (!isAuthenticated) {
    try {
      const token = await getToken({
        req: request,
        secret,
      });

      if (token) {
        isAuthenticated = true;
        userRole = (token.role as string) || 'admin';
        username = (token.username as string) || (token.name as string) || 'admin';
      }
    } catch (err) {
      console.error('Proxy session token verification failed:', err);
    }
  }

  const isLoginPage = pathname === '/admin/login';
  const isApiAdmin = pathname.startsWith('/api/admin');
  const isProtectedAdminPage = pathname.startsWith('/admin') && !isLoginPage;

  // Forward verified user identity in request headers if authenticated
  if (isAuthenticated && username) {
    requestHeaders.set('x-admin-user', username);
    if (userRole) requestHeaders.set('x-admin-role', userRole);
  }

  // Case A: Unauthenticated user accessing protected Admin API route
  if (isApiAdmin && !isAuthenticated) {
    return applySecurityHeaders(
      NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Valid Bearer token or session required for admin access',
        },
        {
          status: 401,
          headers: {
            'WWW-Authenticate': 'Bearer realm="SpecPulse Admin API", charset="UTF-8"',
          },
        }
      )
    );
  }

  // Case B: Authenticated but not admin accessing Admin API
  if (isApiAdmin && userRole !== 'admin') {
    return applySecurityHeaders(
      NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Admin authorization required',
        },
        { status: 403 }
      )
    );
  }

  // Case C: Authenticated user visiting /admin/login -> redirect to /admin
  if (isLoginPage && isAuthenticated && userRole === 'admin') {
    const callbackUrl = request.nextUrl.searchParams.get('callbackUrl');
    const redirectUrl = callbackUrl && callbackUrl.startsWith('/admin') ? callbackUrl : '/admin';
    return applySecurityHeaders(NextResponse.redirect(new URL(redirectUrl, request.url)));
  }

  // Case D: Unauthenticated user accessing protected Admin HTML page -> redirect to /admin/login
  if (isProtectedAdminPage && (!isAuthenticated || userRole !== 'admin')) {
    const loginUrl = new URL('/admin/login', request.url);
    const destination = pathname + request.nextUrl.search;
    loginUrl.searchParams.set('callbackUrl', destination);
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  // Case E: Authorized or public route -> proceed with security headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  return applySecurityHeaders(response);
}

// Support both proxy export and middleware export
export { proxy as middleware };

export const config = {
  matcher: ['/admin', '/admin/:path*', '/api/admin/:path*'],
};

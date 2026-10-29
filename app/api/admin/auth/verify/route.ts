import { NextResponse, type NextRequest } from 'next/server';
import { getAdminAuth } from '@/lib/auth-guard';

export async function GET(request: NextRequest) {
  const authContext = await getAdminAuth(request);

  if (!authContext.authenticated) {
    return NextResponse.json(
      {
        authenticated: false,
        authorized: false,
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
        authenticated: true,
        authorized: false,
        error: 'Forbidden',
        message: 'Admin authorization required',
      },
      { status: 403 }
    );
  }

  return NextResponse.json({
    authenticated: true,
    authorized: true,
    authMethod: authContext.authMethod,
    user: authContext.user,
    message: 'Admin access verified successfully',
    timestamp: new Date().toISOString(),
  });
}


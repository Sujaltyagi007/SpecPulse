import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyAdminCredentials } from '@/lib/auth';
import { signAdminBearerToken } from '@/lib/jwt';
import { auth } from '@/lib/auth';

const tokenRequestSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  expiresIn: z.string().optional().default('8h'),
});

export async function POST(request: NextRequest) {
  // Option 1: Existing session exchange (admin already logged in in browser requests a Bearer token)
  try {
    const session = await auth();
    if (session?.user && session.user.role === 'admin') {
      const username = session.user.username || session.user.name || 'SuperAdmin';
      const token = await signAdminBearerToken({ username }, '8h');
      return NextResponse.json({
        success: true,
        token,
        tokenType: 'Bearer',
        expiresIn: '8h',
        user: {
          username,
          role: 'admin',
        },
      });
    }
  } catch {
    // If no session, proceed to credentials validation
  }

  // Option 2: Credentials payload (JSON)
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON request body' },
      { status: 400 }
    );
  }

  const parseResult = tokenRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { username, password, expiresIn } = parseResult.data;
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';

  const verification = await verifyAdminCredentials(username, password, clientIp);
  if (!verification.success || !verification.user) {
    return NextResponse.json(
      { error: 'Authentication failed', message: verification.error || 'Invalid credentials' },
      { status: 401 }
    );
  }

  const token = await signAdminBearerToken(
    {
      username: verification.user.username,
    },
    expiresIn
  );

  return NextResponse.json({
    success: true,
    token,
    tokenType: 'Bearer',
    expiresIn,
    user: {
      username: verification.user.username,
      role: verification.user.role,
    },
  });
}


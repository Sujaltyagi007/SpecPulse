import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from '@/lib/rate-limit';

const credentialsSchema = z.object({
  username: z.string().min(1, 'Username is required').max(100),
  password: z.string().min(1, 'Password is required').max(200),
});

/**
 * Constant-time string equality check to protect against timing attacks.
 */
function secureCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    // Run dummy comparison to spend uniform execution time
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Validates admin credentials against environment configuration.
 * Protected with rate limiting and constant-time comparisons.
 */
export async function verifyAdminCredentials(
  inputUsername: string,
  inputPassword: string,
  clientIp: string = 'unknown'
): Promise<{ success: boolean; user?: { id: string; username: string; role: 'admin' }; error?: string }> {
  const rateLimitKey = `login:${clientIp}:${inputUsername.toLowerCase()}`;
  const rateCheck = checkRateLimit(rateLimitKey);

  if (!rateCheck.allowed) {
    return {
      success: false,
      error: rateCheck.error || 'Too many failed login attempts. Account temporarily locked.',
    };
  }

  const expectedUser = process.env.ADMIN_USER ?? 'SuperAdmin';
  const expectedPassword = process.env.ADMIN_PASSWORD;
  const expectedPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  // Constant-time check for username
  const userMatches = secureCompare(inputUsername.trim(), expectedUser);

  let passwordMatches = false;
  if (expectedPasswordHash) {
    // If a bcrypt hash is configured, use it
    passwordMatches = bcrypt.compareSync(inputPassword, expectedPasswordHash);
  } else if (expectedPassword) {
    // Constant-time comparison for plaintext password from env
    passwordMatches = secureCompare(inputPassword, expectedPassword);
  } else {
    // No password configured on the server
    return { success: false, error: 'Server authentication is not configured.' };
  }

  if (!userMatches || !passwordMatches) {
    const record = recordFailedAttempt(rateLimitKey);
    const remainingMsg =
      record.remainingAttempts > 0
        ? ` (${record.remainingAttempts} attempt${record.remainingAttempts === 1 ? '' : 's'} remaining)`
        : ' (Account locked for 15 minutes)';
    return {
      success: false,
      error: `Invalid username or password${remainingMsg}`,
    };
  }

  // Credentials are valid; reset rate limiting for this key
  resetRateLimit(rateLimitKey);

  return {
    success: true,
    user: {
      id: inputUsername.trim(),
      username: inputUsername.trim(),
      role: 'admin',
    },
  };
}

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      id: 'credentials',
      name: 'Admin Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          throw new Error('Invalid input format');
        }

        const { username, password } = parsed.data;
        // In authorize callback, verify credentials
        const result = await verifyAdminCredentials(username, password);

        if (!result.success || !result.user) {
          throw new Error(result.error || 'Authentication failed');
        }

        return {
          id: result.user.id,
          name: result.user.username,
          username: result.user.username,
          role: result.user.role,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
    updateAge: 60 * 60, // refresh session every 1 hour if active
  },
  pages: {
    signIn: '/admin/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username ?? user.name ?? 'admin';
        token.role = 'admin';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || (token.sub as string);
        session.user.username = (token.username as string) || (session.user.name as string);
        session.user.role = 'admin';
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);


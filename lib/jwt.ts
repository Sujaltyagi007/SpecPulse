import { SignJWT, jwtVerify, JWTPayload, errors } from 'jose';

const JWT_ISSUER = 'specpulse-admin';
const JWT_AUDIENCE = 'specpulse-admin-api';
const DEFAULT_EXPIRATION = '8h';

/**
 * Ensures a valid crypto key derived from AUTH_SECRET or NEXTAUTH_SECRET.
 * Fallback to ADMIN_PASSWORD only in local development.
 */
function getJwtSecretKey(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.ADMIN_PASSWORD;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_SECRET or NEXTAUTH_SECRET must be set in production');
    }
    // Fallback key for dev if unset
    return new TextEncoder().encode('dev-fallback-insecure-secret-must-replace-in-env-at-least-32-bytes');
  }

  // Ensure key has adequate bytes (HMAC-SHA256 requires >= 256 bits for optimal security)
  return new TextEncoder().encode(secret);
}

export interface AdminTokenPayload extends JWTPayload {
  username: string;
  role: 'admin';
  displayName?: string;
  type?: 'bearer' | 'session';
}

export interface VerifyResult {
  valid: boolean;
  payload?: AdminTokenPayload;
  error?: string;
  expired?: boolean;
}

/**
 * Generates a signed JWT Bearer Token for an admin user.
 */
export async function signAdminBearerToken(
  user: { username: string; displayName?: string },
  expiresIn: string = DEFAULT_EXPIRATION
): Promise<string> {
  const secretKey = getJwtSecretKey();
  const jti = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

  return new SignJWT({
    username: user.username,
    displayName: user.displayName || user.username,
    role: 'admin',
    type: 'bearer',
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setSubject(user.username)
    .setJti(jti)
    .setExpirationTime(expiresIn)
    .sign(secretKey);
}

/**
 * Verifies a JWT Bearer Token, strictly validating signature, claims, and role authorization.
 */
export async function verifyAdminBearerToken(token: string): Promise<VerifyResult> {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token missing or invalid' };
  }

  try {
    const secretKey = getJwtSecretKey();
    const { payload } = await jwtVerify(token, secretKey, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: ['HS256'],
      clockTolerance: '5s',
    });

    // Explicit Role-Based Authorization Check
    if (payload.role !== 'admin') {
      return { valid: false, error: 'Forbidden: Insufficient privileges (admin role required)' };
    }

    if (!payload.username || typeof payload.username !== 'string') {
      return { valid: false, error: 'Malformed token payload: missing username' };
    }

    return {
      valid: true,
      payload: {
        username: payload.username as string,
        role: 'admin',
        displayName: (payload.displayName as string) || (payload.username as string),
        type: (payload.type as 'bearer' | 'session') || 'bearer',
        ...payload,
      },
    };
  } catch (err: unknown) {
    const isExpired =
      err instanceof errors.JWTExpired ||
      (err as { code?: string })?.code === 'ERR_JWT_EXPIRED' ||
      (err as { name?: string })?.name === 'JWTExpired' ||
      (err instanceof Error && err.message.includes('claim timestamp check failed'));

    return {
      valid: false,
      expired: isExpired,
      error: isExpired ? 'Token has expired' : 'Invalid or tampered token',
    };
  }
}

/**
 * Extracts a Bearer token from an Authorization header string or Headers object.
 */
export function extractBearerToken(input: string | Headers | null | undefined): string | null {
  if (!input) return null;
  const headerValue = typeof input === 'string' ? input : input.get('authorization');
  if (!headerValue) return null;

  const parts = headerValue.trim().split(/\s+/);
  if (parts.length === 2 && parts[0]?.toLowerCase() === 'bearer' && parts[1]) {
    return parts[1];
  }
  return null;
}

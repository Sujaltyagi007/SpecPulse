import 'dotenv/config';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from '@/lib/rate-limit';
import { signAdminBearerToken, verifyAdminBearerToken, extractBearerToken } from '@/lib/jwt';
import { verifyAdminCredentials } from '@/lib/auth';
import { SignJWT } from 'jose';

test('rate limiter: tracks failed attempts and enforces lockout', () => {
  const testKey = 'test-ip-key-' + Date.now();
  resetRateLimit(testKey);

  // Initial check should be allowed
  const initial = checkRateLimit(testKey);
  assert.equal(initial.allowed, true);
  assert.equal(initial.remainingAttempts, 5);

  // 1st failed attempt
  const f1 = recordFailedAttempt(testKey);
  assert.equal(f1.allowed, true);
  assert.equal(f1.remainingAttempts, 4);

  // 2nd through 4th failed attempts
  recordFailedAttempt(testKey);
  recordFailedAttempt(testKey);
  recordFailedAttempt(testKey);

  // 5th failed attempt should lock out
  const f5 = recordFailedAttempt(testKey);
  assert.equal(f5.allowed, false);
  assert.equal(f5.remainingAttempts, 0);
  assert.match(f5.error || '', /locked/i);

  // Subsequent check is blocked
  const blockedCheck = checkRateLimit(testKey);
  assert.equal(blockedCheck.allowed, false);

  // Resetting unlocks
  resetRateLimit(testKey);
  const afterReset = checkRateLimit(testKey);
  assert.equal(afterReset.allowed, true);
  assert.equal(afterReset.remainingAttempts, 5);
});

test('jwt: signs and verifies admin Bearer token with full authorization', async () => {
  const token = await signAdminBearerToken({ username: 'SuperAdmin', displayName: 'Super Administrator' }, '1h');
  assert.ok(typeof token === 'string' && token.length > 20);

  const result = await verifyAdminBearerToken(token);
  assert.equal(result.valid, true);
  assert.ok(result.payload);
  assert.equal(result.payload.username, 'SuperAdmin');
  assert.equal(result.payload.role, 'admin');
  assert.equal(result.payload.type, 'bearer');
});

test('jwt: rejects tampered or malformed tokens', async () => {
  const token = await signAdminBearerToken({ username: 'SuperAdmin' });
  const tamperedToken = token.slice(0, -6) + 'abcdef';

  const result = await verifyAdminBearerToken(tamperedToken);
  assert.equal(result.valid, false);
  assert.match(result.error || '', /invalid|tampered|signature/i);

  const malformed = await verifyAdminBearerToken('not.a.valid.jwt');
  assert.equal(malformed.valid, false);
});

test('jwt: rejects tokens with non-admin roles (authorization enforcement)', async () => {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'dev-fallback-insecure-secret-must-replace-in-env-at-least-32-bytes';
  const secretKey = new TextEncoder().encode(secret);

  // Create a valid signed token, but with role: 'viewer' instead of 'admin'
  const nonAdminToken = await new SignJWT({
    username: 'NormalUser',
    role: 'viewer',
    type: 'bearer',
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setIssuer('specpulse-admin')
    .setAudience('specpulse-admin-api')
    .setSubject('NormalUser')
    .setExpirationTime('1h')
    .sign(secretKey);

  const result = await verifyAdminBearerToken(nonAdminToken);
  assert.equal(result.valid, false);
  assert.match(result.error || '', /privileges|admin role required/i);
});

test('jwt: rejects expired tokens', async () => {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'dev-fallback-insecure-secret-must-replace-in-env-at-least-32-bytes';
  const secretKey = new TextEncoder().encode(secret);

  // Create a token that expired 10 seconds ago
  const expiredToken = await new SignJWT({
    username: 'SuperAdmin',
    role: 'admin',
    type: 'bearer',
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(Math.floor(Date.now() / 1000) - 100)
    .setIssuer('specpulse-admin')
    .setAudience('specpulse-admin-api')
    .setSubject('SuperAdmin')
    .setExpirationTime(Math.floor(Date.now() / 1000) - 10)
    .sign(secretKey);

  const result = await verifyAdminBearerToken(expiredToken);
  assert.equal(result.valid, false);
  assert.equal(result.expired, true);
  assert.match(result.error || '', /expired/i);
});

test('extractBearerToken: extracts token string correctly', () => {
  assert.equal(extractBearerToken('Bearer abc.def.ghi'), 'abc.def.ghi');
  assert.equal(extractBearerToken('bearer abc.def.ghi'), 'abc.def.ghi');
  assert.equal(extractBearerToken('BEARER abc.def.ghi'), 'abc.def.ghi');

  const headers = new Headers();
  headers.set('authorization', 'Bearer token123');
  assert.equal(extractBearerToken(headers), 'token123');

  assert.equal(extractBearerToken('Basic abc:123'), null);
  assert.equal(extractBearerToken(''), null);
  assert.equal(extractBearerToken(null), null);
});

test('verifyAdminCredentials: authenticates configured admin user', async () => {
  const validUser = process.env.ADMIN_USER || 'SuperAdmin';
  const validPass = process.env.ADMIN_PASSWORD || 'AdminSuper#@123';

  // Valid credentials
  const ok = await verifyAdminCredentials(validUser, validPass, '127.0.0.1');
  assert.equal(ok.success, true);
  assert.ok(ok.user);
  assert.equal(ok.user.username, validUser);
  assert.equal(ok.user.role, 'admin');

  // Wrong password
  const badPass = await verifyAdminCredentials(validUser, 'WrongPassword123!', '127.0.0.2');
  assert.equal(badPass.success, false);
  assert.match(badPass.error || '', /invalid username or password/i);

  // Wrong username
  const badUser = await verifyAdminCredentials('NonExistentUser', validPass, '127.0.0.3');
  assert.equal(badUser.success, false);
  assert.match(badUser.error || '', /invalid username or password/i);
});

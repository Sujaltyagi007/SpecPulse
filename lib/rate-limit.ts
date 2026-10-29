/**
 * In-memory sliding-window rate limiter for brute-force attack prevention.
 * Tracks failed authentication attempts by key (e.g. client IP + username).
 */

interface RateLimitRecord {
  count: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

const store = new Map<string, RateLimitRecord>();

// Configuration defaults
const MAX_ATTEMPTS = 5; // 5 failed attempts allowed
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes window
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout after threshold

/**
 * Periodically purge stale records to prevent memory leak
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (record.lockedUntil && record.lockedUntil > now) continue;
    if (now - record.firstAttempt > WINDOW_MS) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000).unref?.();

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds?: number;
  error?: string;
}

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const record = store.get(key);

  if (!record) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  // Check if actively locked out
  if (record.lockedUntil && record.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    const minutes = Math.ceil(retryAfterSeconds / 60);
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds,
      error: `Too many failed login attempts. Account locked. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`,
    };
  }

  // If window expired and not locked, reset
  if (now - record.firstAttempt > WINDOW_MS) {
    store.delete(key);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  const remaining = Math.max(0, MAX_ATTEMPTS - record.count);
  return { allowed: remaining > 0, remainingAttempts: remaining };
}

export function recordFailedAttempt(key: string): RateLimitResult {
  const now = Date.now();
  let record = store.get(key);

  if (!record || now - record.firstAttempt > WINDOW_MS) {
    record = { count: 1, firstAttempt: now, lockedUntil: null };
    store.set(key, record);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1 };
  }

  record.count += 1;

  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS;
    const retryAfterSeconds = Math.ceil(LOCKOUT_MS / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds,
      error: `Too many failed login attempts. Locked out for 15 minutes.`,
    };
  }

  return { allowed: true, remainingAttempts: MAX_ATTEMPTS - record.count };
}

export function resetRateLimit(key: string): void {
  store.delete(key);
}


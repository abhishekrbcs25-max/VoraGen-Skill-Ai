import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

let cachedSessionSecret: string | null = null;

export function getSessionSecret(): string {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 16) {
    return process.env.SESSION_SECRET.trim();
  }
  if (cachedSessionSecret) return cachedSessionSecret;

  const secretPath = path.resolve(process.cwd(), '.pathforge-data', '.session-secret');
  try {
    if (fs.existsSync(secretPath)) {
      const existing = fs.readFileSync(secretPath, 'utf-8').trim();
      if (existing.length >= 32) {
        cachedSessionSecret = existing;
        return cachedSessionSecret;
      }
    }
    const generated = crypto.randomBytes(32).toString('hex');
    fs.mkdirSync(path.dirname(secretPath), { recursive: true });
    fs.writeFileSync(secretPath, generated, { mode: 0o600 });
    cachedSessionSecret = generated;
    return cachedSessionSecret;
  } catch {
    cachedSessionSecret = crypto.randomBytes(32).toString('hex');
    return cachedSessionSecret;
  }
}

export function isValidEmailFormat(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, hexHash] = storedHash.split(':');
  if (!salt || !hexHash) return false;
  try {
    const expected = Buffer.from(hexHash, 'hex');
    const actual = crypto.scryptSync(password, salt, expected.length);
    if (expected.length !== actual.length) return false;
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function signSessionToken(
  userKey: string,
  ttlMs = 7 * 24 * 60 * 60_000,
  now = Date.now(),
  secret = getSessionSecret(),
): string {
  const payload = Buffer.from(
    JSON.stringify({
      sub: userKey.toLowerCase(),
      exp: now + ttlMs,
    }),
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySessionToken(
  token: string,
  expectedKey?: string,
  now = Date.now(),
  secret = getSessionSecret(),
): { valid: boolean; sub?: string } {
  if (!token || !token.includes('.')) return { valid: false };
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return { valid: false };

  try {
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return { valid: false };
    }

    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as {
      sub?: string;
      exp?: number;
    };
    if (!parsed.sub || typeof parsed.exp !== 'number' || parsed.exp <= now) {
      return { valid: false };
    }
    if (expectedKey && parsed.sub !== expectedKey.toLowerCase()) {
      return { valid: false };
    }
    return { valid: true, sub: parsed.sub };
  } catch {
    return { valid: false };
  }
}

export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number,
  ) {}

  allow(key: string, now = Date.now()): boolean {
    const cutoff = now - this.windowMs;
    const prev = (this.hits.get(key) || []).filter((ts) => ts > cutoff);
    if (prev.length >= this.maxRequests) {
      this.hits.set(key, prev);
      return false;
    }
    prev.push(now);
    this.hits.set(key, prev);
    if (this.hits.size > 2000) {
      for (const [k, list] of this.hits.entries()) {
        if (list.every((ts) => ts <= cutoff)) this.hits.delete(k);
      }
    }
    return true;
  }
}

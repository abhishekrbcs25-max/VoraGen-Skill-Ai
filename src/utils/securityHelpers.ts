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

export function normalizePhoneNumber(raw: string): string {
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';
  return hasPlus ? `+${digits}` : `+${digits}`;
}

export function isValidPhoneNumber(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

export function maskTargetContact(target: string, channel: 'email' | 'phone'): string {
  if (channel === 'email') {
    const [local, domain] = target.split('@');
    if (!local || !domain) return '***';
    const prefix = local.slice(0, 2);
    return `${prefix}${'*'.repeat(Math.max(2, local.length - 2))}@${domain}`;
  }
  const digits = target.replace(/\D/g, '');
  if (digits.length <= 4) return '****';
  return `${'*'.repeat(Math.max(4, digits.length - 4))}${digits.slice(-4)}`;
}

export function generateOtpCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export function hashOtpCode(code: string, salt: string): string {
  return crypto.createHmac('sha256', salt).update(code.trim()).digest('hex');
}

export function verifyOtpCode(code: string, expectedHash: string, salt: string): boolean {
  if (!code || !expectedHash || !salt) return false;
  try {
    const actualBuf = Buffer.from(hashOtpCode(code, salt), 'hex');
    const expectedBuf = Buffer.from(expectedHash, 'hex');
    if (actualBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(actualBuf, expectedBuf);
  } catch {
    return false;
  }
}

export function parseDeviceLabel(userAgent = ''): {
  deviceLabel: string;
  browser: string;
  os: string;
} {
  const ua = userAgent.trim();
  let os = 'Desktop';
  if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/mac os x|macintosh/i.test(ua)) os = 'macOS';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = 'Web Browser';
  if (/edg\//i.test(ua)) browser = 'Microsoft Edge';
  else if (/opr\//i.test(ua) || /opera/i.test(ua)) browser = 'Opera';
  else if (/chrome|crios/i.test(ua) && !/edg\//i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = 'Safari';
  else if (/node|undici|curl/i.test(ua) || !ua) browser = 'API Client';

  const deviceKind = /mobile|iphone|android/i.test(ua) && !/ipad/i.test(ua) ? 'Mobile' : /ipad|tablet/i.test(ua) ? 'Tablet' : 'Desktop';
  return {
    deviceLabel: `${browser} on ${os} (${deviceKind})`,
    browser,
    os,
  };
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
  extras?: { jti?: string; role?: string },
): string {
  const body: Record<string, unknown> = {
    sub: userKey.toLowerCase(),
    exp: now + ttlMs,
  };
  if (extras?.jti) body.jti = extras.jti;
  if (extras?.role) body.role = extras.role;

  const payload = Buffer.from(JSON.stringify(body)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySessionToken(
  token: string,
  expectedKey?: string,
  now = Date.now(),
  secret = getSessionSecret(),
): { valid: boolean; sub?: string; jti?: string; role?: string } {
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
      jti?: string;
      role?: string;
    };
    if (!parsed.sub || typeof parsed.exp !== 'number' || parsed.exp <= now) {
      return { valid: false };
    }
    if (expectedKey && parsed.sub !== expectedKey.toLowerCase()) {
      return { valid: false };
    }
    return {
      valid: true,
      sub: parsed.sub,
      ...(parsed.jti ? { jti: parsed.jti } : {}),
      ...(parsed.role ? { role: parsed.role } : {}),
    };
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

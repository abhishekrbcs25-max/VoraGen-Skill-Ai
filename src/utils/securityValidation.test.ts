import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  getSessionSecret,
  hashPassword,
  isValidEmailFormat,
  verifyPassword,
  signSessionToken,
  verifySessionToken,
  SlidingWindowRateLimiter,
} from './securityHelpers';
import { sanitizeExternalUrl, sanitizeUserProfile } from './validation';
import { searchPlatformOptions } from './searchIndex';
import { createBlankUnauthenticatedProfile } from '../data/careerData';

process.env.VORAGEN_TEST_MODE = '1';
const { createApiApp } = await import('../../server');

test('hashPassword and verifyPassword validate matching passwords and reject mismatches/malformed hashes', () => {
  const hash = hashPassword('superSecret!23');
  assert.equal(verifyPassword('superSecret!23', hash), true);
  assert.equal(verifyPassword('wrongPassword', hash), false);
  assert.equal(verifyPassword('superSecret!23', 'not-a-valid-hash'), false);
  assert.equal(verifyPassword('superSecret!23', ''), false);
});

test('getSessionSecret never uses predictable literal or GEMINI_API_KEY fallback', () => {
  const secret = getSessionSecret();
  assert.ok(secret.length >= 32);
  assert.notEqual(secret, 'voragen-local-ephemeral-session-secret');
  if (process.env.GEMINI_API_KEY) {
    assert.notEqual(secret, process.env.GEMINI_API_KEY);
  }
});

test('isValidEmailFormat enforces RFC-style user@domain.tld structure', () => {
  assert.equal(isValidEmailFormat('arjun.rao@voragen.dev'), true);
  assert.equal(isValidEmailFormat('invalid-email'), false);
  assert.equal(isValidEmailFormat('user@localhost'), false);
  assert.equal(isValidEmailFormat('@domain.com'), false);
});

test('signSessionToken and verifySessionToken enforce signature, user binding, and expiry', () => {
  const now = 1_700_000_000_000;
  const token = signSessionToken('arjun@voragen.test', 60_000, now, 'test-secret');

  assert.deepEqual(verifySessionToken(token, 'arjun@voragen.test', now + 10_000, 'test-secret'), {
    valid: true,
    sub: 'arjun@voragen.test',
  });

  // Tampered signature rejected
  const tampered = `${token.slice(0, -4)}XXXX`;
  assert.equal(verifySessionToken(tampered, 'arjun@voragen.test', now + 10_000, 'test-secret').valid, false);

  // Wrong expected user key rejected
  assert.equal(verifySessionToken(token, 'other@voragen.test', now + 10_000, 'test-secret').valid, false);

  // Expired token rejected
  assert.equal(verifySessionToken(token, 'arjun@voragen.test', now + 60_001, 'test-secret').valid, false);
});

test('SlidingWindowRateLimiter allows within quota, blocks excess, and resets after window', () => {
  const limiter = new SlidingWindowRateLimiter(3, 1000);
  assert.equal(limiter.allow('127.0.0.1', 100), true);
  assert.equal(limiter.allow('127.0.0.1', 200), true);
  assert.equal(limiter.allow('127.0.0.1', 300), true);
  assert.equal(limiter.allow('127.0.0.1', 400), false);
  // After 1000ms window passes from first hit, slot opens
  assert.equal(limiter.allow('127.0.0.1', 1150), true);
});

test('sanitizeExternalUrl blocks XSS URI schemes and normalizes safe domains', () => {
  assert.equal(sanitizeExternalUrl('javascript:alert(1)'), undefined);
  assert.equal(sanitizeExternalUrl('data:text/html,<script>alert(1)</script>'), undefined);
  assert.equal(sanitizeExternalUrl('vbscript:msgbox(1)'), undefined);
  assert.equal(sanitizeExternalUrl('file:///etc/passwd'), undefined);
  assert.equal(sanitizeExternalUrl('https://github.com/voragen'), 'https://github.com/voragen');
  assert.equal(sanitizeExternalUrl('github.com/user'), 'https://github.com/user');
});

test('sanitizeUserProfile clamps skill levels, strips unsafe URLs, and trims control chars', () => {
  const base = createBlankUnauthenticatedProfile();
  const dirty = sanitizeUserProfile({
    ...base,
    name: '  Arjun\u0000 Rao  ',
    githubUrl: 'javascript:alert(1)',
    linkedinUrl: 'linkedin.com/in/arjun',
    skills: [
      { name: 'TypeScript\u0007', level: 185, category: 'Frontend', verified: true },
      { name: 'SQL', level: -20, category: 'Backend', verified: false },
    ],
    projects: [
      {
        id: 'p1',
        title: 'App',
        description: 'Built\u0001 app',
        skillsUsed: ['React'],
        repoUrl: 'data:text/html,xss',
      },
    ],
  });

  assert.equal(dirty.name, 'Arjun Rao');
  assert.equal(dirty.githubUrl, '');
  assert.equal(dirty.linkedinUrl, 'https://linkedin.com/in/arjun');
  assert.equal(dirty.skills[0].name, 'TypeScript');
  assert.equal(dirty.skills[0].level, 100);
  assert.equal(dirty.skills[1].level, 0);
  assert.equal(dirty.projects[0].description, 'Built app');
  assert.equal(dirty.projects[0].repoUrl, undefined);
});

test('searchPlatformOptions returns expected targets for resume, Sudoku, Vora Generation, and 3D', () => {
  assert.equal(searchPlatformOptions('resume')[0]?.targetSection, 'resume');
  assert.equal(searchPlatformOptions('Sudoku')[0]?.subTarget, 'sudoku');
  assert.equal(searchPlatformOptions('Vora Generation')[0]?.targetSection, 'support');
  assert.equal(searchPlatformOptions('3D')[0]?.subTarget, 'skill-defender-3d');
});

test('HTTP API enforces password auth, blocks OAuth account takeover, verifies session tokens, and sanitizes XSS URLs', async () => {
  const app = createApiApp({
    profileStore: {},
    credentialsStore: {},
    persistStores: false,
    verifyIdTokenFn: async (token) => {
      if (token === 'valid-google-token') {
        return { email: 'oauth.user@voragen.test', email_verified: true };
      }
      throw new Error('Invalid token');
    },
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Security headers check
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    assert.equal(healthRes.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(healthRes.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.equal(healthRes.headers.get('x-permitted-cross-domain-policies'), 'none');
    assert.match(healthRes.headers.get('content-security-policy') || '', /object-src 'none'/);

    // 2. Reject invalid email format
    const badReg = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: 'password123', authProvider: 'email' }),
    });
    assert.equal(badReg.status, 400);

    // 3. Register email account & get signed session token
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Meera Nair',
        email: 'meera@voragen.test',
        password: 'strongPassword!9',
        authProvider: 'email',
        acceptedTerms: true,
        acceptedPrivacy: true,
      }),
    });
    assert.equal(regRes.status, 200);
    const regBody = (await regRes.json()) as { token: string; key: string };
    assert.ok(regBody.token);
    assert.equal(regBody.key, 'meera@voragen.test');

    // 4. Duplicate registration returns 409
    const dupRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'meera@voragen.test',
        password: 'strongPassword!9',
        authProvider: 'email',
        acceptedTerms: true,
        acceptedPrivacy: true,
      }),
    });
    assert.equal(dupRes.status, 409);

    // 5. Wrong password returns 401
    const wrongPassRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'meera@voragen.test',
        password: 'wrongPassword',
        authProvider: 'email',
      }),
    });
    assert.equal(wrongPassRes.status, 401);

    // 6. OAuth spoofing takeover attempt against email account blocked with 403
    const takeoverRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'meera@voragen.test',
        authProvider: 'google',
      }),
    });
    assert.equal(takeoverRes.status, 403);

    // 7. Verified Google idToken succeeds
    const oauthOkRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'oauth.user@voragen.test',
        name: 'OAuth User',
        authProvider: 'google',
        idToken: 'valid-google-token',
      }),
    });
    assert.equal(oauthOkRes.status, 200);

    // 8. Missing or tampered x-voragen-token blocked on profile GET/PUT
    const unauthGet = await fetch(`${baseUrl}/api/profile?key=meera@voragen.test`);
    assert.equal(unauthGet.status, 401);

    // 9. Valid token allows PUT /api/profile, preserves authProvider, and strips XSS URLs
    const authGet = await fetch(`${baseUrl}/api/profile?key=meera@voragen.test`, {
      headers: { 'x-voragen-token': regBody.token },
    });
    assert.equal(authGet.status, 200);
    const currentProfile = (await authGet.json()) as Record<string, unknown>;

    const putRes = await fetch(`${baseUrl}/api/profile?key=meera@voragen.test`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-voragen-token': regBody.token,
      },
      body: JSON.stringify({
        ...currentProfile,
        authProvider: 'google', // Attempted provider mutation should be ignored
        githubUrl: 'javascript:alert(1)',
        projects: [
          {
            id: 'p1',
            title: 'Portfolio',
            description: 'Demo',
            skillsUsed: ['TypeScript'],
            repoUrl: 'javascript:alert(document.cookie)',
          },
        ],
      }),
    });
    assert.equal(putRes.status, 200);
    const putBody = (await putRes.json()) as {
      profile: { authProvider: string; githubUrl: string; projects: Array<{ repoUrl?: string }> };
    };
    assert.equal(putBody.profile.authProvider, 'email');
    assert.equal(putBody.profile.githubUrl, '');
    assert.equal(putBody.profile.projects[0].repoUrl, undefined);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
});

test('phone validation, OTP hash verification, and avatar/resume sanitization block XSS payloads', async () => {
  const { isValidPhoneNumber, normalizePhoneNumber, generateOtpCode, hashOtpCode, verifyOtpCode } =
    await import('./securityHelpers');
  const { sanitizeAvatarImageUrl, sanitizeResumeFile } = await import('./validation');

  assert.equal(isValidPhoneNumber('+91 98765-43210'), true);
  assert.equal(isValidPhoneNumber('12345'), false);
  assert.equal(normalizePhoneNumber(' +91 (987) 654-3210 '), '+919876543210');

  const otp = generateOtpCode();
  assert.match(otp, /^\d{6}$/);
  const hash = hashOtpCode(otp, 'salt-123');
  assert.equal(verifyOtpCode(otp, hash, 'salt-123'), true);
  assert.equal(verifyOtpCode('000000', hash, 'salt-123'), false);

  assert.equal(sanitizeAvatarImageUrl('data:image/svg+xml;base64,PHN2Zz4='), undefined);
  assert.equal(sanitizeAvatarImageUrl('javascript:alert(1)'), undefined);
  assert.equal(sanitizeAvatarImageUrl('data:image/png;base64,iVBORw0KGgo='), 'data:image/png;base64,iVBORw0KGgo=');

  assert.equal(
    sanitizeResumeFile({ fileName: 'bad.exe', mimeType: 'application/x-msdownload', sizeBytes: 100 }),
    undefined,
  );
  const okResume = sanitizeResumeFile({
    fileName: 'resume.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    uploadedAt: '2026-11-15',
  });
  assert.equal(okResume?.fileName, 'resume.pdf');
});


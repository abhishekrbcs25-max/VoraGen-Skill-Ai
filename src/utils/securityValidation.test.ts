import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hashPassword,
  verifyPassword,
  signSessionToken,
  verifySessionToken,
  SlidingWindowRateLimiter,
} from './securityHelpers';
import { sanitizeExternalUrl, sanitizeUserProfile } from './validation';
import { searchPlatformOptions } from './searchIndex';
import { createBlankUnauthenticatedProfile } from '../data/careerData';

test('hashPassword and verifyPassword validate matching passwords and reject mismatches/malformed hashes', () => {
  const hash = hashPassword('superSecret!23');
  assert.equal(verifyPassword('superSecret!23', hash), true);
  assert.equal(verifyPassword('wrongPassword', hash), false);
  assert.equal(verifyPassword('superSecret!23', 'not-a-valid-hash'), false);
  assert.equal(verifyPassword('superSecret!23', ''), false);
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

test('searchPlatformOptions returns expected targets for resume, Sudoku, Abhishek, and 3D', () => {
  assert.equal(searchPlatformOptions('resume')[0]?.targetSection, 'resume');
  assert.equal(searchPlatformOptions('Sudoku')[0]?.subTarget, 'sudoku');
  assert.equal(searchPlatformOptions('Abhishek')[0]?.targetSection, 'support');
  assert.equal(searchPlatformOptions('3D')[0]?.subTarget, 'skill-defender-3d');
});

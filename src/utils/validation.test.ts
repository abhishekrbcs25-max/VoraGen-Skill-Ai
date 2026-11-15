import test from 'node:test';
import assert from 'node:assert/strict';
import { createBlankUnauthenticatedProfile } from '../data/careerData';
import {
  clampSkillLevel,
  sanitizeExternalUrl,
  sanitizeTextField,
  sanitizeUserProfile,
} from './validation';

test('sanitizeTextField strips control chars, enforces maxLen, and handles non-strings', () => {
  assert.equal(sanitizeTextField(12345), '');
  assert.equal(sanitizeTextField(null), '');
  assert.equal(sanitizeTextField('  Hello\u0000\u0007 World  '), 'Hello World');
  assert.equal(sanitizeTextField('abcdef', 3), 'abc');
});

test('sanitizeExternalUrl rejects dangerous schemes, invalid hosts, and preserves valid http/https links', () => {
  assert.equal(sanitizeExternalUrl(undefined), undefined);
  assert.equal(sanitizeExternalUrl('   '), undefined);
  assert.equal(sanitizeExternalUrl('javascript:void(0)'), undefined);
  assert.equal(sanitizeExternalUrl('DATA:text/plain,hi'), undefined);
  assert.equal(sanitizeExternalUrl('ftp://files.example.com/a'), undefined);
  assert.equal(sanitizeExternalUrl('http://localhost:3000/docs'), 'http://localhost:3000/docs');
  assert.equal(sanitizeExternalUrl('not a valid :: url'), undefined);
});

test('clampSkillLevel handles NaN, Infinity, negative numbers, and overflow', () => {
  assert.equal(clampSkillLevel(NaN), 0);
  assert.equal(clampSkillLevel(Infinity), 0);
  assert.equal(clampSkillLevel(-15), 0);
  assert.equal(clampSkillLevel(142.6), 100);
  assert.equal(clampSkillLevel('67.4'), 67);
});

test('sanitizeUserProfile cleans educationHistory, certifications, careerGoals, and negative counters', () => {
  const base = createBlankUnauthenticatedProfile();
  const clean = sanitizeUserProfile({
    ...base,
    name: '  Elena ',
    email: 'ELENA@VORAGEN.DEV ',
    streakDays: -4,
    streakPoints: -99,
    gamesWon: 3.7,
    educationHistory: [
      {
        id: '',
        institution: ' MIT ',
        degree: ' B.S. ',
        fieldOfStudy: 'CS',
        startYear: '2021',
        endYear: '2025',
        gpaOrScore: '3.9',
        highlights: 'Dean list',
      },
    ],
    certifications: [
      {
        id: '',
        title: ' Security+ ',
        issuer: ' CompTIA ',
        year: '2026',
        credentialId: 'SEC-9',
      },
    ],
    careerGoals: ['  Ship resilient APIs  ', ''],
  });

  assert.equal(clean.email, 'elena@voragen.dev');
  assert.equal(clean.streakDays, 0);
  assert.equal(clean.streakPoints, 0);
  assert.equal(clean.gamesWon, 4);
  assert.equal(clean.educationHistory?.[0].institution, 'MIT');
  assert.equal(clean.certifications[0].title, 'Security+');
  assert.deepEqual(clean.careerGoals, ['Ship resilient APIs']);
});

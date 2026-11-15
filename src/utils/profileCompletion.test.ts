import test from 'node:test';
import assert from 'node:assert/strict';
import { createBlankUnauthenticatedProfile } from '../data/careerData';
import { calculateProfileCompletion } from './profileCompletion';

test('calculateProfileCompletion starts near 0% for blank profile and scales to 100% when complete', () => {
  const blank = createBlankUnauthenticatedProfile();
  const emptyRes = calculateProfileCompletion(blank);
  assert.equal(emptyRes.percentage, 0);
  assert.equal(emptyRes.completedCount, 0);
  assert.equal(emptyRes.tierLabel, 'Starter');
  assert.equal(emptyRes.missingItems.length, emptyRes.totalCount);

  const partial = {
    ...blank,
    name: 'Diya Patel',
    headline: 'CS Senior · Full Stack Engineer',
    email: 'diya@voragen.test',
    phone: '+919876543210',
    skills: [{ name: 'TypeScript', level: 82, category: 'Frontend' as const, verified: true }],
  };
  const partialRes = calculateProfileCompletion(partial);
  assert.ok(partialRes.percentage > 15 && partialRes.percentage < 40);
  assert.equal(partialRes.completedCount, 3);

  const complete = {
    ...partial,
    avatarUrl: 'https://example.com/avatar.png',
    emailVerified: true,
    location: 'Bengaluru, India',
    preferredWorkLocation: 'Hyderabad / Remote',
    collegeName: 'NIT Surathkal',
    currentEducationStatus: 'Pursuing Undergraduate' as const,
    graduationYear: '2026',
    cgpaOrPercentage: '9.1 CGPA',
    softSkills: ['System Design Communication', 'Mentoring'],
    nonTechnicalSkills: ['Product Discovery'],
    languagesKnown: [{ id: 'l1', language: 'English', proficiency: 'Fluent' as const }],
    internshipExperience: [
      {
        id: 'exp1',
        organization: 'VoraGen Labs',
        roleTitle: 'Backend Intern',
        startDate: '2025-05',
        endDate: '2025-08',
        description: 'Built API pipelines',
      },
    ],
    projects: [
      {
        id: 'p1',
        title: 'Realtime Telemetry',
        description: 'Streaming metrics service',
        skillsUsed: ['TypeScript'],
      },
    ],
    certifications: [
      { id: 'c1', title: 'AWS SAA', issuer: 'AWS', year: '2026' },
    ],
    githubUrl: 'https://github.com/diya',
    uploadedResume: {
      fileName: 'diya-resume.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 120_000,
      uploadedAt: '2026-11-15',
    },
    careerInterests: ['Distributed Systems'],
    workModePreference: 'Hybrid' as const,
    availabilityNoticePeriod: 'Immediate',
  };

  const fullRes = calculateProfileCompletion(complete);
  assert.equal(fullRes.percentage, 100);
  assert.equal(fullRes.tierLabel, 'All-Star');
  assert.equal(fullRes.missingItems.length, 0);
});

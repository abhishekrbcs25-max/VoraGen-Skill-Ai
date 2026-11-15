import test from 'node:test';
import assert from 'node:assert/strict';
import { createBlankUnauthenticatedProfile } from '../data/careerData';
import {
  buildResumeMarkdown,
  calculateResumeCompleteness,
  draftResumeSummary,
  sortEducationEntries,
} from './resumeHelpers';

test('sortEducationEntries orders by endYear descending and breaks ties using startYear', () => {
  const sorted = sortEducationEntries([
    {
      id: '1',
      institution: 'Institute A',
      degree: 'B.Sc',
      fieldOfStudy: 'CS',
      startYear: '2018',
      endYear: '2022',
    },
    {
      id: '2',
      institution: 'Institute B',
      degree: 'Bootcamp',
      fieldOfStudy: 'Web',
      startYear: '2021',
      endYear: '2022',
    },
    {
      id: '3',
      institution: 'High School',
      degree: 'XII',
      fieldOfStudy: 'Math',
      startYear: '2016',
      endYear: '',
    },
  ]);

  assert.equal(sorted[0].id, '2');
  assert.equal(sorted[1].id, '1');
  assert.equal(sorted[2].id, '3');
});

test('buildResumeMarkdown renders clean placeholders on blank profiles and rich sections on filled profiles', () => {
  const blank = createBlankUnauthenticatedProfile();
  const blankMd = buildResumeMarkdown(blank, 'Cloud Architect');
  assert.ok(blankMd.includes('# Candidate Name'));
  assert.ok(blankMd.includes('**Target Role: Cloud Architect**'));
  assert.ok(blankMd.includes('- Not added yet'));

  const blankDraft = draftResumeSummary(blank, 'Cloud Architect');
  assert.ok(blankDraft.includes('Motivated Cloud Architect candidate'));

  const singleEducationFallback = {
    ...blank,
    name: 'Kiran Das',
    headline: 'Backend Developer',
    email: 'kiran@voragen.dev',
    education: 'B.E. Information Science',
    resumeSummary: 'Focused on APIs and databases.',
    skills: [{ name: 'Node.js', level: 82, category: 'Backend' as const, verified: true }],
    projects: [
      {
        id: 'p1',
        title: 'Ledger API',
        description: 'Fast REST backend',
        skillsUsed: ['Node.js', 'SQL'],
        repoUrl: 'https://github.com/kiran/ledger',
      },
    ],
    certifications: [
      {
        id: 'c1',
        title: 'PostgreSQL Associate',
        issuer: 'EDB',
        year: '2025',
        credentialId: 'EDB-441',
      },
    ],
  };

  assert.equal(calculateResumeCompleteness(singleEducationFallback).scorePct, 100);
  const fullMd = buildResumeMarkdown(singleEducationFallback, 'Backend Engineer');
  assert.ok(fullMd.includes('## Professional Summary'));
  assert.ok(fullMd.includes('- B.E. Information Science'));
  assert.ok(fullMd.includes('Node.js (82%, Verified)'));
  assert.ok(fullMd.includes('Tech Stack: Node.js, SQL'));
  assert.ok(fullMd.includes('ID: EDB-441'));
});

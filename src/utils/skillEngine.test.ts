import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSkillMatch,
  recalibrateFromAssessment,
  generateAdaptiveRoadmap,
  computeCodingStreakUpdate,
  calculateJobSkillMatchPct,
  evaluateSkillAuthenticity,
  extractSkillsFromText,
  buildProductivityHeatmap,
} from './skillEngine';
import type { CareerRole, LearningModule, UserProfile } from '../types';

const fullStackRole: CareerRole = {
  id: 'fullstack-dev',
  title: 'Full Stack Developer',
  domain: 'Web Engineering',
  salaryRange: '$95k - $155k',
  demandGrowth: '+24% YoY',
  summary: 'Build end-to-end applications.',
  requiredSkills: [
    { name: 'JavaScript', targetLevel: 85, weight: 5, category: 'Frontend' },
    { name: 'React', targetLevel: 80, weight: 5, category: 'Frontend' },
    { name: 'Node.js', targetLevel: 80, weight: 4, category: 'Backend' },
    { name: 'SQL', targetLevel: 75, weight: 3, category: 'Backend' },
    { name: 'HTML/CSS', targetLevel: 75, weight: 3, category: 'Frontend' },
  ],
};

const sampleProfile: UserProfile = {
  id: 'u1',
  name: 'Alex Student',
  email: 'alex@example.com',
  authProvider: 'guest',
  isSignedIn: false,
  headline: 'CS Undergrad',
  education: 'B.Sc Computer Science',
  targetCareerId: 'fullstack-dev',
  careerGoals: ['Become a Full Stack Developer'],
  skills: [
    { name: 'Python', level: 70, category: 'Backend' },
    { name: 'SQL', level: 65, category: 'Backend' },
    { name: 'HTML/CSS', level: 45, category: 'Frontend' },
  ],
  certifications: [],
  projects: [],
  assessments: [],
  completedModuleIds: [],
  remedialSkills: [],
  streakDays: 3,
  streakPoints: 100,
  solvedChallengeIds: [],
  gamesWon: 0,
  applications: [],
};

test('calculateSkillMatch starts strictly at 0% for unverified skills/certs/projects and scores only verified skills', () => {
  // Unverified claimed skills + certifications + projects yield strictly 0% readiness
  const unverifiedMatch = calculateSkillMatch(
    sampleProfile.skills,
    fullStackRole,
    [{ id: 'c1', title: 'AWS CCP', issuer: 'AWS', year: '2026' }],
    [{ id: 'p1', title: 'Portfolio', description: 'Built API', skillsUsed: ['React'] }],
  );
  assert.equal(unverifiedMatch.overallReadinessPct, 0);
  assert.deepEqual(unverifiedMatch.missingSkillNames, ['JavaScript', 'React', 'Node.js', 'SQL', 'HTML/CSS']);

  // Verified skills contribute proportionally + unlock portfolio bonus
  const verifiedSkills = sampleProfile.skills.map((s) => ({ ...s, verified: true }));
  const verifiedMatch = calculateSkillMatch(verifiedSkills, fullStackRole);
  assert.deepEqual(verifiedMatch.missingSkillNames, ['JavaScript', 'React', 'Node.js']);
  assert.ok(verifiedMatch.overallReadinessPct > 15 && verifiedMatch.overallReadinessPct < 45);
});

test('recalibrateFromAssessment gates progress on exam pass (>= 60%) and triggers remedial when < 60%', () => {
  const failOutcome = recalibrateFromAssessment(sampleProfile, 'JavaScript', 42, fullStackRole);
  assert.equal(failOutcome.remedialTriggered, true);
  assert.equal(failOutcome.newReadinessPct, 0);
  assert.ok(failOutcome.updatedProfile.remedialSkills.includes('JavaScript'));
  assert.equal(failOutcome.updatedProfile.assessments[0].scorePct, 42);

  const passOutcome = recalibrateFromAssessment(sampleProfile, 'JavaScript', 85, fullStackRole);
  assert.equal(passOutcome.remedialTriggered, false);
  assert.ok(passOutcome.newReadinessPct > 0);
  const verifiedJs = passOutcome.updatedProfile.skills.find((s) => s.name === 'JavaScript');
  assert.equal(verifiedJs?.verified, true);
});

test('generateAdaptiveRoadmap prioritizes remedial modules first', () => {
  const catalog: LearningModule[] = [
    {
      id: 'react-1',
      title: 'React Hooks Deep Dive',
      skillName: 'React',
      type: 'Course',
      provider: 'PathForge',
      durationHours: 10,
      priority: 'Critical Gap',
      completed: false,
      url: 'https://react.dev',
      description: 'Learn React.',
    },
  ];
  const roadmap = generateAdaptiveRoadmap(
    sampleProfile.skills.map((s) => ({ ...s, verified: true })),
    fullStackRole,
    ['JavaScript'],
    [],
    catalog,
  );
  assert.equal(roadmap[0].priority, 'Remedial Focus');
  assert.equal(roadmap[0].skillName, 'JavaScript');
});

test('computeCodingStreakUpdate awards Easy=10, Medium=25, Hard=50 without duplicates', () => {
  const step1 = computeCodingStreakUpdate(100, 3, [], 'ch-1', 'Medium');
  assert.equal(step1.newPoints, 125);
  assert.equal(step1.newStreak, 4);
  assert.equal(step1.pointsAwarded, 25);

  const dup = computeCodingStreakUpdate(step1.newPoints, step1.newStreak, step1.newSolvedIds, 'ch-1', 'Medium');
  assert.equal(dup.newPoints, 125);
  assert.equal(dup.pointsAwarded, 0);
});

test('calculateJobSkillMatchPct computes accurate skill match percentage', () => {
  const pct = calculateJobSkillMatchPct(sampleProfile.skills, ['Python', 'SQL', 'React']);
  assert.equal(pct, Math.round((70 + 65 + 0) / 3));
});

test('evaluateSkillAuthenticity flags overclaimed skills and verifies genuine skills', () => {
  const genuine = evaluateSkillAuthenticity('Python', 75, 3, 3);
  assert.equal(genuine.isGenuine, true);
  assert.equal(genuine.verdict, 'Underestimated · Upgraded');

  const overclaimed = evaluateSkillAuthenticity('React', 90, 1, 3);
  assert.equal(overclaimed.isGenuine, false);
  assert.equal(overclaimed.verdict, 'Overclaimed · Needs Practice');
  assert.equal(overclaimed.verifiedLevel, 33);
});

test('extractSkillsFromText detects skills from resume/job text', () => {
  const detected = extractSkillsFromText('Built REST APIs with Node.js, Python, PostgreSQL SQL, and React TypeScript.');
  assert.ok(detected.includes('React'));
  assert.ok(detected.includes('Python'));
  assert.ok(detected.includes('SQL'));
  assert.ok(detected.includes('TypeScript'));
});

test('buildProductivityHeatmap generates 30 days accurately for fresh vs active profiles', () => {
  const freshProfile: UserProfile = {
    ...sampleProfile,
    streakDays: 0,
    streakPoints: 0,
    solvedChallengeIds: [],
    completedModuleIds: [],
    assessments: [],
    gamesWon: 0,
    applications: [],
  };
  const emptyMap = buildProductivityHeatmap(freshProfile, '2026-11-13');
  assert.equal(emptyMap.days.length, 30);
  assert.equal(emptyMap.totalActions, 0);
  assert.equal(emptyMap.activeDays, 0);

  const activeProfile: UserProfile = {
    ...sampleProfile,
    streakDays: 5,
    solvedChallengeIds: ['c1', 'c2'],
    assessments: [
      {
        id: 'a1',
        skillName: 'Python',
        scorePct: 85,
        date: '2026-11-10',
        remedialTriggered: false,
        notes: 'Pass',
      },
    ],
  };
  const activeMap = buildProductivityHeatmap(activeProfile, '2026-11-13');
  assert.equal(activeMap.days.length, 30);
  assert.equal(activeMap.days[29].date, '2026-11-13');
  assert.equal(activeMap.activeDays, 5);
  assert.ok(activeMap.totalActions >= 7);
});

import {
  buildInitialNotifications,
  countUnreadNotifications,
  createNotification,
  markAllNotificationsRead,
  markNotificationRead,
  prependNotification,
} from './notifications';

test('notifications helper tracks live updates, unread badges, and read transitions', () => {
  const initial = buildInitialNotifications('Aarav', 'Full Stack Developer');
  assert.equal(initial.length, 2);
  assert.equal(countUnreadNotifications(initial), 2);

  const added = prependNotification(
    initial,
    createNotification({
      title: 'Challenge Solved',
      detail: 'Earned +25 streak points in Code Arena',
      category: 'code',
      targetSection: 'code-arena',
    }),
  );
  assert.equal(added.length, 3);
  assert.equal(added[0].title, 'Challenge Solved');
  assert.equal(countUnreadNotifications(added), 3);

  const oneRead = markNotificationRead(added, added[0].id);
  assert.equal(countUnreadNotifications(oneRead), 2);

  const allRead = markAllNotificationsRead(oneRead);
  assert.equal(countUnreadNotifications(allRead), 0);
});

import {
  buildProfileCollaborationKey,
  ModelCooldownTracker,
  parseQuotaCooldownMs,
  TtlResponseCache,
} from './geminiResilience';

test('geminiResilience detects 429 quota errors, manages model cooldowns, and fails over cleanly', () => {
  const err429 = new Error(
    '{"error":{"code":429,"status":"RESOURCE_EXHAUSTED","details":[{"retryDelay":"120s"}]}}',
  );
  assert.equal(parseQuotaCooldownMs(err429), 120_000);
  assert.equal(parseQuotaCooldownMs(new Error('network timeout')), null);

  const tracker = new ModelCooldownTracker();
  const t0 = 1_000_000;
  assert.equal(tracker.pickAvailableModel('gemini-4-hydrogen', t0), 'gemini-4-hydrogen');

  assert.equal(tracker.recordError('gemini-4-hydrogen', err429, t0), true);
  assert.equal(tracker.isAvailable('gemini-4-hydrogen', t0 + 10_000), false);
  assert.equal(tracker.pickAvailableModel('gemini-4-hydrogen', t0 + 10_000), 'gemini-3.1-flash-lite');

  assert.equal(tracker.recordError('gemini-3.1-flash-lite', err429, t0 + 10_000), true);
  assert.equal(tracker.pickAvailableModel('gemini-4-hydrogen', t0 + 20_000), null);
  assert.equal(tracker.pickAvailableModel('gemini-4-hydrogen', t0 + 125_000), 'gemini-4-hydrogen');

  const cache = new TtlResponseCache<string>(5_000, 2);
  cache.set('k1', 'v1', t0);
  assert.equal(cache.get('k1', t0 + 1_000), 'v1');
  assert.equal(cache.get('k1', t0 + 6_000), null);

  const keyA = buildProfileCollaborationKey(sampleProfile, 'Sync A');
  const keyB = buildProfileCollaborationKey(sampleProfile, 'Sync B');
  assert.notEqual(keyA, keyB);
});

import { createBlankUnauthenticatedProfile } from '../data/careerData';
import {
  buildResumeMarkdown,
  calculateResumeCompleteness,
  draftResumeSummary,
  sortEducationEntries,
} from './resumeHelpers';

test('createBlankUnauthenticatedProfile returns completely empty signed-out state', () => {
  const blank = createBlankUnauthenticatedProfile();
  assert.equal(blank.isSignedIn, false);
  assert.equal(blank.name, '');
  assert.equal(blank.email, '');
  assert.equal(blank.skills.length, 0);
  assert.equal(blank.projects.length, 0);
  assert.equal(blank.certifications.length, 0);
  assert.equal(blank.streakDays, 0);
  assert.equal(blank.streakPoints, 0);
});

test('resumeHelpers computes completeness, sorts education, and exports Markdown', () => {
  const blank = createBlankUnauthenticatedProfile();
  const zeroComp = calculateResumeCompleteness(blank);
  assert.equal(zeroComp.scorePct, 0);
  assert.equal(zeroComp.missingSections.length, 5);

  const enriched: UserProfile = {
    ...sampleProfile,
    isSignedIn: true,
    phone: '+91 9876543210',
    location: 'Bengaluru',
    educationHistory: [
      {
        id: 'e1',
        institution: 'Higher Secondary School',
        degree: 'Class XII',
        fieldOfStudy: 'Science',
        startYear: '2020',
        endYear: '2022',
      },
      {
        id: 'e2',
        institution: 'State Tech University',
        degree: 'B.Tech',
        fieldOfStudy: 'Computer Science',
        startYear: '2022',
        endYear: '2026',
        gpaOrScore: '9.1 CGPA',
      },
    ],
    projects: [
      {
        id: 'p1',
        title: 'TaskFlow API',
        description: 'Built distributed task queue',
        skillsUsed: ['Node.js', 'SQL'],
      },
    ],
    certifications: [
      {
        id: 'c1',
        title: 'AWS Cloud Practitioner',
        issuer: 'AWS',
        year: '2025',
      },
    ],
  };

  const sorted = sortEducationEntries(enriched.educationHistory);
  assert.equal(sorted[0].degree, 'B.Tech');

  const comp = calculateResumeCompleteness(enriched);
  assert.equal(comp.scorePct, 100);
  assert.equal(comp.missingSections.length, 0);

  const drafted = draftResumeSummary(enriched, 'Full Stack Developer');
  assert.ok(drafted.includes('State Tech University'));

  const md = buildResumeMarkdown(enriched, 'Full Stack Developer');
  assert.ok(md.includes('# Alex Student'));
  assert.ok(md.includes('## Educational Background'));
  assert.ok(md.includes('State Tech University'));
  assert.ok(md.includes('## Skills Gained'));
  assert.ok(md.includes('## Projects'));
  assert.ok(md.includes('TaskFlow API'));
  assert.ok(md.includes('## Certifications Obtained'));
  assert.ok(md.includes('AWS Cloud Practitioner'));
});

import { CAREER_ROLES } from '../data/careerData';
import { searchCareerRoles } from '../data/careerRolesCatalog';
import { getAssessmentQuestionsForSkill } from '../data/assessmentBank';
import { executeCodeInSandbox } from './codeSandbox';
import { gradeInteractiveAssessment } from './skillEngine';

test('CAREER_ROLES contains 200+ career goals and searchCareerRoles filters by keyword and domain', () => {
  assert.ok(CAREER_ROLES.length >= 200, `Expected >=200 career roles, got ${CAREER_ROLES.length}`);
  const roboticsMatches = searchCareerRoles(CAREER_ROLES, 'Robotics');
  assert.ok(roboticsMatches.length > 0);
  assert.ok(roboticsMatches.every((r) => `${r.title} ${r.domain} ${r.summary}`.toLowerCase().includes('robotics')));

  const domainFiltered = searchCareerRoles(CAREER_ROLES, '', 'Cybersecurity & Risk');
  assert.ok(domainFiltered.length > 0);
  assert.ok(domainFiltered.every((r) => r.domain === 'Cybersecurity & Risk'));
});

test('getAssessmentQuestionsForSkill delivers >= 20 questions with coding problems and grades interactively', async () => {
  const jsExam = getAssessmentQuestionsForSkill('JavaScript');
  assert.ok(jsExam.length >= 20);
  const jsCoding = jsExam.filter((q) => q.kind === 'coding');
  assert.ok(jsCoding.length >= 4);

  const arbitraryExam = getAssessmentQuestionsForSkill('Quantum Rust Systems');
  assert.ok(arbitraryExam.length >= 20);
  const dynCoding = arbitraryExam.filter((q) => q.kind === 'coding');
  assert.ok(dynCoding.length >= 4);

  // Execute one coding problem through sandbox and verify gradeInteractiveAssessment scoring
  const firstDynCoding = dynCoding[0];
  const run = await executeCodeInSandbox(
    'function solve(scores, threshold) { return scores.filter((s) => s >= threshold).length; }',
    firstDynCoding.testCases || [],
  );
  assert.equal(run.passed, true);

  const mcqAnswers: Record<string, number> = {};
  for (const q of arbitraryExam) {
    if (q.kind === 'mcq') mcqAnswers[q.id] = q.correctIndex;
  }
  const codingPassMap: Record<string, boolean> = { [firstDynCoding.id]: run.passed };
  const graded = gradeInteractiveAssessment(arbitraryExam, mcqAnswers, codingPassMap);
  assert.equal(graded.totalQuestions, arbitraryExam.length);
  assert.equal(graded.codingPassed, 1);
  assert.ok(graded.scorePct >= 80);
});


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

test('calculateSkillMatch identifies missing JavaScript, React, Node.js for sample student', () => {
  const result = calculateSkillMatch(sampleProfile.skills, fullStackRole);
  assert.deepEqual(result.missingSkillNames, ['JavaScript', 'React', 'Node.js']);
  assert.ok(result.overallReadinessPct > 15 && result.overallReadinessPct < 45);
});

test('recalibrateFromAssessment triggers remedial focus when score < 60%', () => {
  const outcome = recalibrateFromAssessment(sampleProfile, 'JavaScript', 42, fullStackRole);
  assert.equal(outcome.remedialTriggered, true);
  assert.ok(outcome.updatedProfile.remedialSkills.includes('JavaScript'));
  assert.equal(outcome.updatedProfile.assessments[0].scorePct, 42);
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
    sampleProfile.skills,
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


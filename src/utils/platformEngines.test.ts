import test from 'node:test';
import assert from 'node:assert/strict';
import { CAREER_ROLES, createBlankUnauthenticatedProfile } from '../data/careerData';
import { FLAGSHIP_COMPANIES } from '../data/companiesCatalog';
import { PLACEMENT_DRIVES_CATALOG } from '../data/projectsCatalog';
import {
  analyzeJobScamRisk,
  buildAptitudePerformanceReport,
  buildCertificateVerificationId,
  buildGstInvoiceHtml,
  buildJobMarketIntelligence,
  buildLocalStudyToolResponse,
  calculateSubscriptionCheckout,
  computeEarnedBadges,
  evaluateDriveEligibility,
  generateCoverLetterDraft,
  generateDeterministicQrMatrix,
  rankCandidatesForJob,
  scoreResumeAtsAndGrammar,
} from './platformEngines';

test('QR matrix generator and certificate ID builder produce deterministic verified credentials', () => {
  const m1 = generateDeterministicQrMatrix('VG-REACT-USER-2026', 15);
  const m2 = generateDeterministicQrMatrix('VG-REACT-USER-2026', 15);
  assert.equal(m1.length, 15);
  assert.deepEqual(m1, m2);

  const idFromExplicit = buildCertificateVerificationId(
    { id: 'c1', title: 'React Mastery', issuer: 'VoraGen', year: '2026', credentialId: 'vg-abc-123' },
    'Arjun',
  );
  assert.equal(idFromExplicit, 'VG-ABC-123');

  const generatedId = buildCertificateVerificationId(
    { id: 'c2', title: 'TypeScript', issuer: 'VoraGen', year: '2026' },
    'Arjun Rao',
  );
  assert.match(generatedId, /^VG-TYPE-ARJU-2026$/);
});

test('computeEarnedBadges unlocks badges progressively only when thresholds are met', () => {
  const blank = createBlankUnauthenticatedProfile();
  assert.equal(computeEarnedBadges(blank, 0).length, 0);

  const active = {
    ...blank,
    assessments: [
      { id: 'a1', skillName: 'React', scorePct: 82, date: '2026-11-12', remedialTriggered: false, notes: 'Pass' },
    ],
    completedModuleIds: ['m1', 'm2', 'm3'],
    projects: [{ id: 'p1', title: 'Rate Limiter', description: 'Built limiter', skillsUsed: ['Node.js'] }],
    streakDays: 7,
    certifications: [{ id: 'cert-1', title: 'Backend Track', issuer: 'VoraGen', year: '2026' }],
  };
  const earned = computeEarnedBadges(active, 72);
  assert.equal(earned.length, 5);
});

test('analyzeJobScamRisk flags deposit requests and free webmail recruiters accurately', () => {
  const safe = analyzeJobScamRisk({
    companyName: 'Google',
    contactEmail: 'recruiting@google.com',
    website: 'https://careers.google.com',
    salaryText: 'INR 28 LPA',
    description: 'Full-stack engineering team building distributed systems with TypeScript and SQL.',
  });
  assert.equal(safe.verdict, 'Verified Low Risk');
  assert.ok(safe.riskScore < 30);

  const risky = analyzeJobScamRisk({
    companyName: 'QuickHire',
    contactEmail: 'quickhire.hr@gmail.com',
    website: '',
    salaryText: 'INR 50k/week guaranteed',
    description: 'Pay security deposit INR 2500 via UPI fee. WhatsApp only instant offer, send Aadhaar photo.',
  });
  assert.equal(risky.verdict, 'High Scam Risk');
  assert.ok(risky.riskScore >= 60);
  assert.ok(risky.flags.length >= 3);
});

test('buildJobMarketIntelligence computes hotspots, rising skills, and remote share', () => {
  const intel = buildJobMarketIntelligence(CAREER_ROLES[0], FLAGSHIP_COMPANIES.slice(0, 4));
  assert.equal(intel.targetRoleTitle, CAREER_ROLES[0].title);
  assert.ok(intel.topRisingSkills.length > 0);
  assert.ok(intel.hiringHotspots.length > 0);
  assert.ok(intel.remoteSharePct >= 0 && intel.remoteSharePct <= 100);
});

test('scoreResumeAtsAndGrammar and generateCoverLetterDraft score JD match and format tailored drafts', () => {
  const profile = {
    ...createBlankUnauthenticatedProfile(),
    name: 'Meera Iyer',
    headline: 'Full Stack Developer | React & SQL',
    resumeSummary: 'Engineered scalable React and SQL dashboards that improved checkout conversion by 28%.',
    githubUrl: 'https://github.com/meeraiyer',
    skills: [
      { name: 'React', level: 85, category: 'Frontend' as const, verified: true },
      { name: 'SQL', level: 78, category: 'Backend' as const, verified: true },
    ],
    projects: [
      {
        id: 'p1',
        title: 'Realtime Order Tracker',
        description: 'Architected event-driven React and SQL analytics pipeline for live logistics visibility.',
        skillsUsed: ['React', 'SQL'],
      },
    ],
  };

  const ats = scoreResumeAtsAndGrammar(profile, 'Looking for React, SQL, Docker, and Kubernetes engineer.');
  assert.ok(ats.atsScorePct >= 40);
  assert.ok(ats.matchedKeywords.includes('React'));
  assert.ok(ats.missingKeywords.some((k) => k.includes('Docker') || k.includes('Kubernetes')));
  assert.ok(ats.linkedinTips.length >= 3);

  const letter = generateCoverLetterDraft({
    candidateName: 'Meera Iyer',
    companyName: 'CloudScale',
    roleTitle: 'Frontend Engineer',
    tone: 'Impact-Driven',
    topSkills: ['React', 'TypeScript', 'SQL'],
    highlightProject: 'Realtime Order Tracker',
  });
  assert.match(letter, /CloudScale/);
  assert.match(letter, /Meera Iyer/);
  assert.match(letter, /Realtime Order Tracker/);
});

test('calculateSubscriptionCheckout computes 18% GST and promo discounts accurately and formats GST invoice', () => {
  const summary = calculateSubscriptionCheckout('pro-monthly', 'STUDENT50');
  assert.equal(summary.subtotalInr, 499);
  assert.equal(summary.discountInr, 250);
  assert.equal(summary.taxableInr, 249);
  assert.equal(summary.gstInr, Math.round(249 * 0.18));
  assert.equal(summary.totalInr, 249 + summary.gstInr);
  assert.match(summary.couponLabel || '', /STUDENT50/);

  const html = buildGstInvoiceHtml({
    id: 'tx-1',
    invoiceNumber: 'INV-VG-1001',
    userKey: 'meera@voragen.dev',
    userName: 'Meera Iyer',
    userEmail: 'meera@voragen.dev',
    planId: 'pro-monthly',
    planName: 'VoraGen Pro Monthly',
    paymentMethod: 'UPI',
    couponApplied: summary.couponLabel,
    subtotalInr: summary.subtotalInr,
    discountInr: summary.discountInr,
    gstInr: summary.gstInr,
    totalInr: summary.totalInr,
    status: 'Paid',
    createdAt: '2026-11-15',
  });
  assert.match(html, /INV-VG-1001/);
  assert.match(html, /voragenerationnetwork@gmail\.com/);
});

test('rankCandidatesForJob, buildAptitudePerformanceReport, evaluateDriveEligibility, and buildLocalStudyToolResponse work cleanly', () => {
  const ranked = rankCandidatesForJob(
    [
      {
        id: 'c1',
        jobId: 'job-1',
        jobTitle: 'Full Stack Engineer',
        companyName: 'Vora Partner Labs',
        candidateName: 'Aarav',
        candidateEmail: 'aarav@example.com',
        education: 'B.Tech CSE',
        resumeSummary: 'Built responsive web portals.',
        matchPct: 65,
        cgpa: '7.8',
        skills: ['HTML', 'CSS'],
        status: 'Applied',
        appliedAt: '2026-11-10',
      },
      {
        id: 'c2',
        jobId: 'job-1',
        jobTitle: 'Full Stack Engineer',
        companyName: 'Vora Partner Labs',
        candidateName: 'Divya',
        candidateEmail: 'divya@example.com',
        education: 'B.Tech CSE',
        resumeSummary: 'Architected React TypeScript and SQL apps.',
        matchPct: 88,
        cgpa: '9.1',
        skills: ['React', 'TypeScript', 'SQL', 'Node.js'],
        status: 'Applied',
        appliedAt: '2026-11-11',
      },
    ],
    ['React', 'TypeScript', 'SQL'],
  );
  assert.equal(ranked[0].candidateName, 'Divya');
  assert.ok(ranked[0].aiRankScore > ranked[1].aiRankScore);

  const report = buildAptitudePerformanceReport({
    category: 'Technical Aptitude',
    difficulty: 'Medium',
    questions: [
      { id: 'q1', subTopic: 'Arrays', correctIndex: 1 },
      { id: 'q2', subTopic: 'SQL Joins', correctIndex: 2 },
    ],
    answers: { q1: 1, q2: 0 },
  });
  assert.equal(report.scorePct, 50);
  assert.deepEqual(report.strengths, ['Arrays']);
  assert.deepEqual(report.weaknesses, ['SQL Joins']);
  assert.ok(report.recommendedCourses.length > 0);

  const blank = createBlankUnauthenticatedProfile();
  const blocked = evaluateDriveEligibility(PLACEMENT_DRIVES_CATALOG[0], { ...blank, cgpaOrPercentage: '5.5' });
  assert.equal(blocked.eligible, false);
  const eligible = evaluateDriveEligibility(PLACEMENT_DRIVES_CATALOG[0], { ...blank, cgpaOrPercentage: '9.2' });
  assert.equal(eligible.eligible, true);

  const studyOut = buildLocalStudyToolResponse({
    mode: 'study-plan',
    topicOrCode: 'React Hooks',
    language: 'Tamil',
    profile: blank,
    targetRoleTitle: 'Full Stack Developer',
  });
  assert.match(studyOut, /Tamil Study Mode/);
  assert.match(studyOut, /7-Day Study Plan/);
});

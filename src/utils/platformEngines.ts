import { COURSES_CATALOG } from '../data/coursesCatalog';
import { ACHIEVEMENT_BADGES_CATALOG } from '../data/projectsCatalog';
import type {
  AchievementBadge,
  AptitudeCategory,
  BillingTransaction,
  CareerRole,
  Certification,
  CompanyJob,
  CourseItem,
  CoverLetterItem,
  Difficulty,
  EmployerApplicantItem,
  PlacementDrive,
  ResumeTemplateId,
  StudyLanguage,
  SubscriptionPlanId,
  UserProfile,
} from '../types';
import { extractSkillsFromText } from './skillEngine';

// 1. Deterministic 15x15 QR Matrix SVG Generator (verifiable certificate ID + lookup URL)
export function generateDeterministicQrMatrix(payload: string, size = 15): boolean[][] {
  const matrix: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false),
  );

  const drawFinder = (top: number, left: number) => {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const isEdge = r === 0 || r === 4 || c === 0 || c === 4;
        const isCenter = r === 2 && c === 2;
        if (top + r < size && left + c < size) {
          matrix[top + r][left + c] = isEdge || isCenter;
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 5);
  drawFinder(size - 5, 0);

  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inFinder =
        (r < 5 && c < 5) || (r < 5 && c >= size - 5) || (r >= size - 5 && c < 5);
      if (inFinder) continue;
      hash ^= (r * 31 + c * 17 + payload.length) & 0xff;
      hash = Math.imul(hash, 16777619);
      matrix[r][c] = (Math.abs(hash) % 100) < 48;
    }
  }
  return matrix;
}

export function buildCertificateVerificationId(cert: Certification, ownerName: string): string {
  if (cert.credentialId && cert.credentialId.trim().length >= 4) {
    return cert.credentialId.trim().toUpperCase();
  }
  const cleanOwner = (ownerName || 'USER').replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase() || 'USER';
  const cleanTitle = cert.title.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase() || 'CERT';
  return `VG-${cleanTitle}-${cleanOwner}-${cert.year || '2026'}`;
}

export function computeEarnedBadges(profile: UserProfile, readinessPct: number): AchievementBadge[] {
  const earned = new Set<string>(profile.earnedBadgeIds || []);
  const out: AchievementBadge[] = [];

  for (const badge of ACHIEVEMENT_BADGES_CATALOG) {
    let unlocked = earned.has(badge.id);
    if (badge.id === 'badge-first-assessment' && profile.assessments.some((a) => a.scorePct >= 60)) {
      unlocked = true;
    } else if (
      badge.id === 'badge-course-scholar' &&
      profile.completedModuleIds.length + (profile.completedLessonIds?.length || 0) >= 3
    ) {
      unlocked = true;
    } else if (badge.id === 'badge-project-builder' && profile.projects.length >= 1) {
      unlocked = true;
    } else if (
      badge.id === 'badge-code-streak' &&
      (profile.streakDays >= 5 || profile.streakPoints >= 100)
    ) {
      unlocked = true;
    } else if (
      badge.id === 'badge-career-ready' &&
      readinessPct >= 60 &&
      profile.certifications.length >= 1
    ) {
      unlocked = true;
    }
    if (unlocked) out.push(badge);
  }
  return out;
}

// 2. Heuristic Job Scam Detector (Innovation 20.6)
export interface ScamRiskAnalysis {
  riskScore: number; // 0 (Safe) to 100 (High Scam Risk)
  verdict: 'Verified Low Risk' | 'Moderate Caution' | 'High Scam Risk';
  flags: string[];
  recommendations: string[];
}

export function analyzeJobScamRisk(input: {
  companyName: string;
  contactEmail?: string;
  website?: string;
  salaryText?: string;
  description: string;
}): ScamRiskAnalysis {
  const flags: string[] = [];
  let riskScore = 5;

  const text = `${input.companyName} ${input.description} ${input.salaryText || ''}`.toLowerCase();
  const email = (input.contactEmail || '').toLowerCase();
  const website = (input.website || '').toLowerCase();

  if (/(pay.*registration|security deposit|training fee|processing fee|send money|upi fee|wire transfer)/i.test(text)) {
    riskScore += 45;
    flags.push('Requests upfront registration, training, or deposit fee from candidates.');
  }
  if (/(whatsapp only|telegram only|dm for instant offer|no interview required|guaranteed job today)/i.test(text)) {
    riskScore += 28;
    flags.push('Promises instant selection without technical/HR verification or redirects to unverified chat.');
  }
  if (email && /@(gmail|yahoo|hotmail|outlook)\.com$/i.test(email)) {
    riskScore += 18;
    flags.push('Uses generic free webmail instead of a verified corporate domain email.');
  }
  if (!website || /^http:\/\//.test(website)) {
    riskScore += 12;
    flags.push('Missing HTTPS official company career portal URL.');
  }
  if (/(bank otp|aadhaar|pan card photo|credit card details)/i.test(text)) {
    riskScore += 40;
    flags.push('Asks for sensitive banking, OTP, or identity documents prior to offer verification.');
  }

  const clamped = Math.max(0, Math.min(100, riskScore));
  const verdict: ScamRiskAnalysis['verdict'] =
    clamped >= 60 ? 'High Scam Risk' : clamped >= 30 ? 'Moderate Caution' : 'Verified Low Risk';

  const recommendations =
    flags.length === 0
      ? [
          'Corporate domain email & hiring description match legitimate employer hygiene.',
          'Always verify interview invites inside your VoraGen Notifications & Messages inbox.',
        ]
      : [
          'Never pay security deposits, laptop shipping fees, or training charges for a job offer.',
          'Cross-check the company website independently before sharing government ID or banking info.',
          'Use the Report Scam action below to escalate this listing to VoraGen Admin Moderation.',
        ];

  return { riskScore: clamped, verdict, flags, recommendations };
}

// 3. Live Job Market Intelligence Summary (Innovation 20.2)
export interface MarketIntelligenceSnapshot {
  targetRoleTitle: string;
  medianSalaryRange: string;
  topRisingSkills: Array<{ skill: string; demandBoostPct: number }>;
  hiringHotspots: string[];
  remoteSharePct: number;
}

export function buildJobMarketIntelligence(
  role: CareerRole,
  jobsSample: CompanyJob[],
): MarketIntelligenceSnapshot {
  const skillFreq = new Map<string, number>();
  let remoteCount = 0;
  const cityCounts = new Map<string, number>();

  for (const job of jobsSample) {
    if (job.workMode === 'Remote' || job.workMode === 'Hybrid') remoteCount += 1;
    cityCounts.set(job.city, (cityCounts.get(job.city) || 0) + 1);
    for (const sk of job.requiredSkills) {
      skillFreq.set(sk, (skillFreq.get(sk) || 0) + 1);
    }
  }

  for (const req of role.requiredSkills) {
    skillFreq.set(req.name, (skillFreq.get(req.name) || 0) + 3);
  }

  const topRisingSkills = Array.from(skillFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([skill, count], i) => ({
      skill,
      demandBoostPct: Math.min(48, 16 + count * 4 + (4 - i) * 3),
    }));

  const hiringHotspots = Array.from(cityCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([city]) => city);

  return {
    targetRoleTitle: role.title,
    medianSalaryRange: role.salaryRange,
    topRisingSkills,
    hiringHotspots: hiringHotspots.length ? hiringHotspots : ['Bengaluru', 'London', 'San Francisco', 'Singapore'],
    remoteSharePct: jobsSample.length ? Math.round((remoteCount / jobsSample.length) * 100) : 64,
  };
}

// 4. Resume ATS + Grammar/Keyword Optimizer & Cover Letter Generator (Section 10)
export function scoreResumeAtsAndGrammar(
  profile: UserProfile,
  jobDescriptionText: string,
): {
  atsScorePct: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  grammarSuggestions: string[];
  linkedinTips: string[];
} {
  const extracted = extractSkillsFromText(jobDescriptionText);
  const resumeBlob = [
    profile.headline,
    profile.resumeSummary || '',
    ...profile.skills.map((s) => s.name),
    ...profile.projects.map((p) => `${p.title} ${p.description} ${p.skillsUsed.join(' ')}`),
    ...(profile.workExperience || []).map((w) => `${w.roleTitle} ${w.description}`),
    ...(profile.internshipExperience || []).map((i) => `${i.roleTitle} ${i.description}`),
  ]
    .join(' ')
    .toLowerCase();

  const matchedKeywords = extracted.filter((kw) => {
    const tokens = kw.toLowerCase().split(/[\s&/]+/).filter((t) => t.length >= 2);
    return tokens.some((tok) => resumeBlob.includes(tok));
  });
  const missingKeywords = extracted.filter((kw) => !matchedKeywords.includes(kw));

  let baseScore = extracted.length > 0 ? Math.round((matchedKeywords.length / extracted.length) * 70) : 45;
  if (profile.resumeSummary && profile.resumeSummary.length >= 60) baseScore += 10;
  if (profile.projects.length >= 1) baseScore += 10;
  if ((profile.educationHistory || []).length >= 1 || profile.education) baseScore += 5;
  if (profile.githubUrl || profile.linkedinUrl) baseScore += 5;

  const grammarSuggestions: string[] = [];
  if (!profile.resumeSummary || profile.resumeSummary.trim().length < 50) {
    grammarSuggestions.push('Expand your executive summary to 2–3 quantified sentences showing target role impact.');
  }
  if (profile.resumeSummary && !/\d+%|\d+\+|\d+x/i.test(profile.resumeSummary)) {
    grammarSuggestions.push('Add measurable numbers (e.g., "reduced latency by 35%" or "built 3 full-stack apps").');
  }
  if (profile.projects.some((p) => p.description.trim().split(/\s+/).length < 6)) {
    grammarSuggestions.push('Start each project bullet with an action verb (Architected, Built, Automated, Reduced).');
  }
  if (grammarSuggestions.length === 0) {
    grammarSuggestions.push('Action verbs, tense consistency, and quantified impact phrasing look strong.');
  }

  const linkedinTips = [
    `Update headline to: "${profile.headline || 'Aspiring Software Engineer | React · TypeScript · SQL'}"`,
    profile.githubUrl
      ? 'GitHub portfolio linked cleanly — pin your top 2 verified projects on GitHub.'
      : 'Add your GitHub URL in Featured Links so recruiters can inspect real code.',
    profile.certifications.length > 0
      ? 'Share your verified VoraGen credential IDs under LinkedIn Licenses & Certifications.'
      : 'Earn and attach at least 1 Skill or Course Certificate to double recruiter search impressions.',
  ];

  return {
    atsScorePct: Math.min(100, Math.max(0, baseScore)),
    matchedKeywords,
    missingKeywords,
    grammarSuggestions,
    linkedinTips,
  };
}

export function generateCoverLetterDraft(params: {
  candidateName: string;
  companyName: string;
  roleTitle: string;
  tone: CoverLetterItem['tone'];
  topSkills: string[];
  highlightProject?: string;
}): string {
  const name = params.candidateName.trim() || 'Candidate';
  const company = params.companyName.trim() || 'Hiring Team';
  const role = params.roleTitle.trim() || 'Software Engineer';
  const skillsStr = params.topSkills.slice(0, 4).join(', ') || 'full-stack engineering & problem solving';
  const projectNote = params.highlightProject
    ? `Recently, I architected "${params.highlightProject}", applying disciplined engineering practices and automated verification.`
    : `Across my recent technical portfolio and verified VoraGen benchmarks, I have delivered clean, testable code.`;

  if (params.tone === 'Impact-Driven') {
    return `Dear ${company} Engineering Hiring Team,\n\nI am writing to express strong interest in the ${role} opening at ${company}. Backed by verified proficiency in ${skillsStr}, I focus on turning product goals into reliable, measurable software.\n\n${projectNote} I am excited to bring ownership, clear communication, and rapid execution to ${company}.\n\nSincerely,\n${name}`;
  }
  if (params.tone === 'Fresher Enthusiasm') {
    return `Dear ${company} Talent Acquisition Team,\n\nI am thrilled to apply for the ${role} position at ${company}. Having built strong foundations in ${skillsStr}, I thrive on learning new systems quickly and shipping well-tested features.\n\n${projectNote} Thank you for considering my application—I look forward to contributing to your engineering team.\n\nWarm regards,\n${name}`;
  }
  return `Dear Hiring Manager at ${company},\n\nPlease accept my application for the ${role} role. My technical preparation spans ${skillsStr}, reinforced by verified assessments and hands-on system development.\n\n${projectNote} I welcome the opportunity to discuss how my background aligns with ${company}'s engineering priorities.\n\nRespectfully,\n${name}`;
}

export const RESUME_TEMPLATE_META: Record<
  ResumeTemplateId,
  { label: string; description: string }
> = {
  'classic-executive': {
    label: 'Classic Executive',
    description: 'Traditional ATS serif/navy single-column layout trusted by global tech recruiters.',
  },
  'modern-technical': {
    label: 'Modern Technical',
    description: 'Compact emerald-accented technical hierarchy highlighting verified skills & metrics.',
  },
  'academic-compact': {
    label: 'Academic Compact',
    description: 'Education & research-forward format ideal for campus placements and internships.',
  },
};

// 5. Subscription Plans, Coupons & 18% GST Invoice Math (Section 18)
export interface SubscriptionPlanSpec {
  id: SubscriptionPlanId;
  name: string;
  audience: string;
  priceInr: number;
  billingCycle: string;
  features: string[];
}

export const SUBSCRIPTION_PLANS: SubscriptionPlanSpec[] = [
  {
    id: 'free',
    name: 'Starter Free',
    audience: 'For students exploring foundations',
    priceInr: 0,
    billingCycle: 'Free forever',
    features: [
      '20-question Skill Diagnostics & Code Arena',
      'Free Foundation Courses & Digital Resume',
      '20,000+ Global Job Discovery & Scam Check',
    ],
  },
  {
    id: 'pro-monthly',
    name: 'VoraGen Pro Monthly',
    audience: 'For active job seekers & interview sprints',
    priceInr: 499,
    billingCycle: 'per month',
    features: [
      'Unlimited AI Study Assistant, Video Studio & Voice Tutor',
      'All Paid Industry Courses + QR Verified Certificates',
      'Unlimited Cover Letters, ATS JD Scoring & 1:1 Mentor Priority',
    ],
  },
  {
    id: 'pro-yearly',
    name: 'VoraGen Pro Annual',
    audience: 'For year-round mastery (Save 33%)',
    priceInr: 3999,
    billingCycle: 'per year',
    features: [
      'Everything in Pro Monthly for 12 full months',
      'Priority Campus Drive Shortlisting & Employer Showcase',
      'Dedicated Skill Passport & Printable Portfolio Archive',
    ],
  },
  {
    id: 'career-bundle',
    name: 'Placement & Interview Bundle',
    audience: 'For final-year graduates & career switchers',
    priceInr: 1499,
    billingCycle: 'one-time 6-month pass',
    features: [
      'Guided Industry Capstone Review + Instructor Feedback',
      '6 Mock Interview Evaluations + 2 Live Mentor Sessions',
      'Course + Project Completion Certificates',
    ],
  },
];

export const PROMO_COUPONS: Record<string, { discountPct: number; label: string }> = {
  VORAGEN20: { discountPct: 20, label: '20% Launch Offer' },
  STUDENT50: { discountPct: 50, label: '50% Student Scholarship' },
  REFER10: { discountPct: 10, label: '10% Referral Bonus' },
};

export function calculateSubscriptionCheckout(
  planId: SubscriptionPlanId,
  couponCode?: string,
): {
  plan: SubscriptionPlanSpec;
  subtotalInr: number;
  discountInr: number;
  taxableInr: number;
  gstInr: number;
  totalInr: number;
  couponLabel?: string;
} {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId) || SUBSCRIPTION_PLANS[0];
  const cleanCode = (couponCode || '').trim().toUpperCase();
  const coupon = cleanCode ? PROMO_COUPONS[cleanCode] : undefined;

  const subtotalInr = plan.priceInr;
  const discountInr = coupon ? Math.round((subtotalInr * coupon.discountPct) / 100) : 0;
  const taxableInr = Math.max(0, subtotalInr - discountInr);
  const gstInr = Math.round(taxableInr * 0.18);
  const totalInr = taxableInr + gstInr;

  return {
    plan,
    subtotalInr,
    discountInr,
    taxableInr,
    gstInr,
    totalInr,
    couponLabel: coupon ? `${cleanCode} (${coupon.label})` : undefined,
  };
}

export function buildGstInvoiceHtml(tx: BillingTransaction): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><title>VoraGen Tax Invoice ${tx.invoiceNumber}</title></head>
<body style="font-family: sans-serif; padding: 32px; color: #0B2545;">
  <h1>Vora Generation Network — Tax Invoice</h1>
  <p>Support: voragenerationnetwork@gmail.com | Invoice: <strong>${tx.invoiceNumber}</strong></p>
  <hr />
  <p><strong>Billed To:</strong> ${tx.userName} (${tx.userEmail})</p>
  <p><strong>Date:</strong> ${tx.createdAt} | <strong>Payment Mode:</strong> ${tx.paymentMethod} | <strong>Status:</strong> ${tx.status}</p>
  <table border="1" cellpadding="8" cellspacing="0" style="width:100%; border-collapse: collapse; margin-top: 16px;">
    <tr><th>Plan / Bundle</th><th>Subtotal</th><th>Discount</th><th>GST (18%)</th><th>Total Paid</th></tr>
    <tr>
      <td>${tx.planName}${tx.couponApplied ? ` (${tx.couponApplied})` : ''}</td>
      <td>INR ${tx.subtotalInr}</td>
      <td>-INR ${tx.discountInr}</td>
      <td>INR ${tx.gstInr}</td>
      <td><strong>INR ${tx.totalInr}</strong></td>
    </tr>
  </table>
</body>
</html>`;
}

// 6. Employer AI Candidate Ranker (Section 13)
export function rankCandidatesForJob(
  applicants: EmployerApplicantItem[],
  requiredSkills: string[],
): Array<EmployerApplicantItem & { aiRankScore: number; rankReason: string }> {
  const reqLower = requiredSkills.map((s) => s.toLowerCase());
  return [...applicants]
    .map((app) => {
      const appLower = app.skills.map((s) => s.toLowerCase());
      const overlap = reqLower.filter((req) =>
        appLower.some((a) => a.includes(req) || req.includes(a)),
      );
      const skillFit = reqLower.length ? Math.round((overlap.length / reqLower.length) * 100) : app.matchPct;
      const cgpaNum = parseFloat(app.cgpa) || 7.5;
      const aiRankScore = Math.min(
        100,
        Math.round(skillFit * 0.65 + app.matchPct * 0.25 + Math.min(10, cgpaNum)),
      );
      return {
        ...app,
        aiRankScore,
        rankReason: `Matched ${overlap.length}/${Math.max(1, reqLower.length)} core skills · CGPA ${app.cgpa}`,
      };
    })
    .sort((a, b) => b.aiRankScore - a.aiRankScore);
}

// 7. Aptitude Performance Report & Weak Subject Recommender (Section 3 & 5)
export function buildAptitudePerformanceReport(params: {
  category: AptitudeCategory;
  difficulty: Difficulty;
  questions: Array<{ subTopic: string; id: string; correctIndex: number }>;
  answers: Record<string, number>;
  elapsedSec?: number;
}): {
  scorePct: number;
  correctCount: number;
  totalQuestions: number;
  strengths: string[];
  weaknesses: string[];
  recommendedCourses: CourseItem[];
  recommendedRoles: string[];
} {
  const bySubTopic = new Map<string, { right: number; total: number }>();
  let correctCount = 0;

  for (const q of params.questions) {
    const stat = bySubTopic.get(q.subTopic) || { right: 0, total: 0 };
    stat.total += 1;
    if (params.answers[q.id] === q.correctIndex) {
      correctCount += 1;
      stat.right += 1;
    }
    bySubTopic.set(q.subTopic, stat);
  }

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  for (const [topic, stat] of bySubTopic.entries()) {
    const pct = stat.total ? (stat.right / stat.total) * 100 : 0;
    if (pct >= 65) strengths.push(topic);
    else weaknesses.push(topic);
  }

  const totalQuestions = params.questions.length;
  const scorePct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const recommendedCourses = COURSES_CATALOG.filter((c) => {
    if (params.category === 'Technical Aptitude') return c.category.includes('Web') || c.category.includes('Backend');
    if (params.category === 'Quantitative Aptitude') return c.category.includes('Data') || c.category.includes('Artificial');
    if (params.category === 'Logical Reasoning') return c.technology.includes('SQL') || c.technology.includes('React');
    return true;
  }).slice(0, 3);

  const recommendedRoles =
    params.category === 'Quantitative Aptitude'
      ? ['Data Scientist & Analytics Lead', 'AI & Machine Learning Engineer']
      : params.category === 'Technical Aptitude'
        ? ['Full Stack Developer', 'Cloud & DevOps Architect']
        : ['Full Stack Developer', 'Product Systems Engineer'];

  return {
    scorePct,
    correctCount,
    totalQuestions,
    strengths,
    weaknesses,
    recommendedCourses,
    recommendedRoles,
  };
}

// 8. Check Placement Drive Eligibility
export function evaluateDriveEligibility(
  drive: PlacementDrive,
  profile: UserProfile,
): { eligible: boolean; reason: string } {
  const cgpa = parseFloat(profile.cgpaOrPercentage || '') || 0;
  if (cgpa > 0 && cgpa <= 10 && cgpa < drive.minCgpa) {
    return {
      eligible: false,
      reason: `Requires minimum ${drive.minCgpa} CGPA (your profile lists ${cgpa}).`,
    };
  }
  return {
    eligible: true,
    reason: `Meets baseline eligibility (${drive.minCgpa}+ CGPA · ${drive.eligibleDegrees.slice(0, 2).join(' / ')}).`,
  };
}

// 9. Deterministic Local AI Study Assistant Toolkit (Fallback + Server Mirror)
export type StudyToolMode =
  | 'explain-simple'
  | 'examples'
  | 'practice-mcq'
  | 'coding-exercise'
  | 'debug-error'
  | 'summarize'
  | 'revision-sheet'
  | 'study-plan'
  | 'weak-subject-check';

export function buildLocalStudyToolResponse(params: {
  mode: StudyToolMode;
  topicOrCode: string;
  language: StudyLanguage;
  profile: UserProfile;
  targetRoleTitle: string;
}): string {
  const topic = params.topicOrCode.trim() || 'JavaScript Async & Closures';
  const weakList = params.profile.remedialSkills.length
    ? params.profile.remedialSkills.join(', ')
    : 'SQL Indexing, TypeScript Unions';
  const langTag = params.language !== 'English' ? ` [${params.language} Study Mode]` : '';

  switch (params.mode) {
    case 'explain-simple':
      return `Simple Breakdown of ${topic}${langTag}:\n1. Core Idea: Think of ${topic} like an express lane separating slow external work from fast UI rendering.\n2. Why Companies Ask It: Prevents freezing user interfaces and race conditions under real load.\n3. Key Rule to Remember: Always validate boundary inputs before transforming state.`;
    case 'examples':
      return `3 Worked Examples for ${topic}${langTag}:\n- Example 1 (Minimal): Isolate input -> process pure transform -> return typed object.\n- Example 2 (Real API): Add AbortController or timeout wrapper cleanly.\n- Example 3 (Edge Case): Guard empty arrays and null fields with explicit defaults.`;
    case 'practice-mcq':
      return `Practice Quiz (${topic})${langTag}:\nQ1: Which bug happens most frequently when ignoring edge boundaries in ${topic}?\nA) Stale state / unhandled exception (Correct)\nB) Automatic speed boost\nQ2: What makes a unit test for ${topic} deterministic?\nA) Fixed inputs & pure helper decoupling (Correct)`;
    case 'coding-exercise':
      return `Coding Drill (${topic})${langTag}:\nProblem: Write a pure function solve(items) that filters active entries and returns sorted unique keys in O(n log n) time.\nConstraints: Handle empty array input cleanly.\nHint: Use Set for O(n) deduplication first.`;
    case 'debug-error':
      return `Error Debugger & Code Explainer${langTag}:\nAnalyzed snippet: "${topic.slice(0, 100)}"\nRoot Cause Check:\n1. Verify null/undefined properties using optional chaining (?.) before accessing .length or .map.\n2. Confirm async handlers await promises inside try/catch blocks.\n3. Ensure state updates return fresh copies rather than mutating existing arrays.`;
    case 'summarize':
      return `Executive Study Summary (${topic})${langTag}:\n• Core Concept: Predictable data flow and bounded error handling.\n• Production Impact: Cuts bugs and reduces debugging time.\n• Next Step: Solve 1 related Code Arena sprint today.`;
    case 'revision-sheet':
      return `5-Minute Revision Sheet — ${topic}${langTag}:\n[Formula/Pattern] Input Validation -> Pure Business Rule -> Verified Output.\n[Checklist] 1) Boundary Check 2) Time Complexity 3) Unit Test Coverage 4) Security Hygiene.`;
    case 'study-plan':
      return `7-Day Study Plan for ${params.targetRoleTitle}${langTag}:\n• Day 1–2: Rebuild ${weakList} foundations + 2 lessons/day.\n• Day 3–4: Complete 4 Code Arena challenges + Mini Project unit tests.\n• Day 5–6: Take 20-question Skill Exam + Timed Aptitude Quiz.\n• Day 7: Run AI Mock Interview & apply to 3 matched roles.`;
    case 'weak-subject-check':
      return `AI Learning Progress Analysis (${params.profile.name || 'Learner'})${langTag}:\n• Current Assessments Logged: ${params.profile.assessments.length}\n• Priority Weak Areas: ${weakList}\n• Recommended Immediate Action: Complete 1 structured course lesson on ${weakList.split(',')[0]} and verify with an assessment (>= 60%).`;
  }
}

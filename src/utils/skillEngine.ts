import type {
  AssessmentRecord,
  CareerRole,
  Certification,
  Difficulty,
  LearningModule,
  ProjectItem,
  SkillMatchBreakdown,
  UserProfile,
  UserSkill,
} from '../types';

export function normalizeSkillName(name: string): string {
  return name.trim().toLowerCase();
}

export function findUserSkill(skills: UserSkill[], skillName: string): UserSkill | undefined {
  const norm = normalizeSkillName(skillName);
  return skills.find((s) => {
    const sNorm = normalizeSkillName(s.name);
    return sNorm === norm || sNorm.includes(norm) || norm.includes(sNorm);
  });
}

export function calculateSkillMatch(
  skills: UserSkill[],
  role: CareerRole,
  certifications: Certification[] = [],
  projects: ProjectItem[] = [],
): SkillMatchBreakdown {
  let totalWeight = 0;
  let earnedWeight = 0;

  const matchedSkills: SkillMatchBreakdown['matchedSkills'] = [];
  const missingSkillNames: string[] = [];
  const weakSkillNames: string[] = [];
  const strongSkillNames: string[] = [];

  for (const req of role.requiredSkills) {
    totalWeight += req.weight;
    const found = findUserSkill(skills, req.name);
    const currentLevel = found ? Math.max(0, Math.min(100, found.level)) : 0;
    const ratio = Math.min(1, currentLevel / Math.max(1, req.targetLevel));
    earnedWeight += req.weight * ratio;

    const gap = Math.max(0, req.targetLevel - currentLevel);
    let status: 'Mastered' | 'In Progress' | 'Missing';

    if (currentLevel === 0) {
      status = 'Missing';
      missingSkillNames.push(req.name);
    } else if (currentLevel >= req.targetLevel) {
      status = 'Mastered';
      strongSkillNames.push(req.name);
    } else {
      status = 'In Progress';
      if (currentLevel < 60) {
        weakSkillNames.push(req.name);
      } else {
        strongSkillNames.push(req.name);
      }
    }

    matchedSkills.push({
      name: req.name,
      currentLevel,
      targetLevel: req.targetLevel,
      status,
      gap,
    });
  }

  const baseSkillMatchPct =
    totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

  // Certifications & Projects provide up to +12% readiness boost when aligned
  const certBoost = Math.min(6, certifications.length * 2);
  const projectBoost = Math.min(6, projects.length * 2);
  const portfolioBonusPct = Math.min(12, certBoost + projectBoost);

  const overallReadinessPct = Math.min(100, baseSkillMatchPct + portfolioBonusPct);

  const remainingGapSum = matchedSkills.reduce((acc, s) => acc + s.gap, 0);
  const estimatedWeeksToReady = Math.max(1, Math.ceil(remainingGapSum / 45));

  return {
    overallReadinessPct,
    baseSkillMatchPct,
    portfolioBonusPct,
    matchedSkills,
    missingSkillNames,
    weakSkillNames,
    strongSkillNames,
    estimatedWeeksToReady,
  };
}

export function recalibrateFromAssessment(
  profile: UserProfile,
  skillName: string,
  scorePct: number,
  targetRole: CareerRole,
  remedialThresholdPct = 60,
): {
  updatedProfile: UserProfile;
  remedialTriggered: boolean;
  newReadinessPct: number;
  message: string;
} {
  const clampedScore = Math.max(0, Math.min(100, Math.round(scorePct)));
  const remedialTriggered = clampedScore < remedialThresholdPct;

  const existingIndex = profile.skills.findIndex(
    (s) => normalizeSkillName(s.name) === normalizeSkillName(skillName),
  );

  const updatedSkills = [...profile.skills];
  const reqRoleSkill = targetRole.requiredSkills.find(
    (r) => normalizeSkillName(r.name) === normalizeSkillName(skillName),
  );

  if (existingIndex >= 0) {
    const prev = updatedSkills[existingIndex];
    // Weighted blend so a poor assessment visibly pulls down inflated self-ratings,
    // and strong assessment lifts verified level
    const newLevel = remedialTriggered
      ? Math.min(prev.level, Math.max(20, Math.round((prev.level + clampedScore) / 2)))
      : Math.max(prev.level, clampedScore);
    updatedSkills[existingIndex] = {
      ...prev,
      level: newLevel,
      verified: clampedScore >= 70,
    };
  } else {
    updatedSkills.push({
      name: skillName,
      level: clampedScore,
      category: reqRoleSkill?.category ?? 'Foundations',
      verified: clampedScore >= 70,
    });
  }

  const newRecord: AssessmentRecord = {
    id: `assess-${Date.now()}`,
    skillName,
    scorePct: clampedScore,
    date: new Date().toISOString().split('T')[0],
    remedialTriggered,
    notes: remedialTriggered
      ? `Scored ${clampedScore}% (< 60% threshold). AI Curriculum Agent injected remedial foundations for ${skillName}.`
      : `Scored ${clampedScore}%. Skill verified and roadmap accelerated.`,
  };

  const remedialSet = new Set(profile.remedialSkills);
  if (remedialTriggered) {
    remedialSet.add(skillName);
  } else if (clampedScore >= 75) {
    remedialSet.delete(skillName);
  }

  const updatedProfile: UserProfile = {
    ...profile,
    skills: updatedSkills,
    assessments: [newRecord, ...profile.assessments],
    remedialSkills: Array.from(remedialSet),
  };

  const breakdown = calculateSkillMatch(
    updatedProfile.skills,
    targetRole,
    updatedProfile.certifications,
    updatedProfile.projects,
  );

  return {
    updatedProfile,
    remedialTriggered,
    newReadinessPct: breakdown.overallReadinessPct,
    message: remedialTriggered
      ? `Adaptive Recalibration Triggered: ${skillName} scored ${clampedScore}%. Added remedial bootcamp modules and prioritized fundamentals.`
      : `Assessment Passed (${clampedScore}%): ${skillName} proficiency updated. Readiness is now ${breakdown.overallReadinessPct}%.`,
  };
}

export function generateAdaptiveRoadmap(
  skills: UserSkill[],
  role: CareerRole,
  remedialSkills: string[],
  completedModuleIds: string[],
  resourceCatalog: LearningModule[],
): LearningModule[] {
  const breakdown = calculateSkillMatch(skills, role);
  const completedSet = new Set(completedModuleIds);
  const remedialNorms = new Set(remedialSkills.map(normalizeSkillName));

  const roadmap: LearningModule[] = [];

  // 1. Remedial modules come FIRST for any low-scoring assessment skills
  for (const rSkill of remedialSkills) {
    const existing = resourceCatalog.find(
      (m) =>
        normalizeSkillName(m.skillName) === normalizeSkillName(rSkill) &&
        m.type === 'Remedial Bootcamp',
    );
    if (existing) {
      roadmap.push({
        ...existing,
        priority: 'Remedial Focus',
        completed: completedSet.has(existing.id),
      });
    } else {
      const id = `remedial-${normalizeSkillName(rSkill).replace(/[^a-z0-9]/g, '-')}`;
      roadmap.push({
        id,
        title: `${rSkill} Foundations Recovery Lab`,
        skillName: rSkill,
        type: 'Remedial Bootcamp',
        provider: 'Voragen AI Curriculum',
        durationHours: 4,
        priority: 'Remedial Focus',
        completed: completedSet.has(id),
        url: 'https://developer.mozilla.org/',
        description: `Targeted step-by-step exercises generated after scoring below 60% in ${rSkill}.`,
      });
    }
  }

  // 2. Missing & in-progress required skills sorted by largest gap
  const sortedGaps = [...breakdown.matchedSkills]
    .filter((s) => s.status !== 'Mastered')
    .sort((a, b) => b.gap - a.gap);

  for (const item of sortedGaps) {
    const matches = resourceCatalog.filter(
      (m) =>
        normalizeSkillName(m.skillName) === normalizeSkillName(item.name) &&
        m.type !== 'Remedial Bootcamp',
    );
    for (const mod of matches) {
      if (!roadmap.some((r) => r.id === mod.id)) {
        const isRemedial = remedialNorms.has(normalizeSkillName(item.name));
        roadmap.push({
          ...mod,
          priority: isRemedial
            ? 'Remedial Focus'
            : item.status === 'Missing'
              ? 'Critical Gap'
              : 'Core Requirement',
          completed: completedSet.has(mod.id),
        });
      }
    }
  }

  return roadmap;
}

export function getPointsForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'Easy':
      return 10;
    case 'Medium':
      return 25;
    case 'Hard':
      return 50;
  }
}

export function computeCodingStreakUpdate(
  currentPoints: number,
  currentStreak: number,
  solvedChallengeIds: string[],
  challengeId: string,
  difficulty: Difficulty,
): {
  newPoints: number;
  newStreak: number;
  newSolvedIds: string[];
  pointsAwarded: number;
} {
  if (solvedChallengeIds.includes(challengeId)) {
    return {
      newPoints: currentPoints,
      newStreak: currentStreak,
      newSolvedIds: solvedChallengeIds,
      pointsAwarded: 0,
    };
  }
  const pointsAwarded = getPointsForDifficulty(difficulty);
  return {
    newPoints: currentPoints + pointsAwarded,
    newStreak: currentStreak + 1,
    newSolvedIds: [...solvedChallengeIds, challengeId],
    pointsAwarded,
  };
}

export function calculateJobSkillMatchPct(
  userSkills: UserSkill[],
  requiredSkills: string[],
): number {
  if (requiredSkills.length === 0) return 100;
  let scoreSum = 0;
  for (const req of requiredSkills) {
    const found = findUserSkill(userSkills, req);
    if (found) {
      scoreSum += Math.min(100, Math.max(35, found.level));
    }
  }
  return Math.round(scoreSum / requiredSkills.length);
}

export function evaluateSkillAuthenticity(
  skillName: string,
  claimedLevel: number,
  correctCount: number,
  totalQuestions: number,
): {
  skillName: string;
  claimedLevel: number;
  actualScorePct: number;
  verifiedLevel: number;
  isGenuine: boolean;
  verdict: 'Genuine · Verified' | 'Overclaimed · Needs Practice' | 'Underestimated · Upgraded';
  summary: string;
} {
  const safeClaim = Math.max(0, Math.min(100, Math.round(claimedLevel)));
  const actualScorePct =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  if (actualScorePct >= 60 && safeClaim - actualScorePct <= 25) {
    if (actualScorePct > safeClaim + 15) {
      return {
        skillName,
        claimedLevel: safeClaim,
        actualScorePct,
        verifiedLevel: actualScorePct,
        isGenuine: true,
        verdict: 'Underestimated · Upgraded',
        summary: `Genuine mastery confirmed! You claimed ${safeClaim}% in ${skillName} and scored ${actualScorePct}%. Upgraded verified proficiency to ${actualScorePct}%.`,
      };
    }
    return {
      skillName,
      claimedLevel: safeClaim,
      actualScorePct,
      verifiedLevel: Math.max(safeClaim, actualScorePct),
      isGenuine: true,
      verdict: 'Genuine · Verified',
      summary: `Genuine skill confirmed! Your ${skillName} test score (${actualScorePct}%) aligns closely with your claimed proficiency (${safeClaim}%).`,
    };
  }

  return {
    skillName,
    claimedLevel: safeClaim,
    actualScorePct,
    verifiedLevel: Math.max(20, actualScorePct),
    isGenuine: false,
    verdict: 'Overclaimed · Needs Practice',
    summary: `Authenticity mismatch: you claimed ${safeClaim}% in ${skillName}, but scored ${actualScorePct}%. Adjusted level to ${Math.max(20, actualScorePct)}% and queued targeted remedial drills.`,
  };
}

const KNOWN_TECH_KEYWORDS = [
  'JavaScript',
  'TypeScript',
  'React',
  'Node.js',
  'Python',
  'SQL',
  'HTML/CSS',
  'Git & CI/CD',
  'Machine Learning',
  'PyTorch',
  'LLM & Agent Systems',
  'Docker & Kubernetes',
  'Linux & Networking',
  'Cloud Security',
  'OWASP & AppSec',
  'React Native',
];

export function extractSkillsFromText(rawText: string): string[] {
  const lower = rawText.toLowerCase();
  const found: string[] = [];

  for (const skill of KNOWN_TECH_KEYWORDS) {
    const tokens = skill
      .toLowerCase()
      .split(/[\s&/]+/)
      .filter((t) => t.length >= 2);
    if (tokens.some((tok) => lower.includes(tok))) {
      found.push(skill);
    }
  }
  return found;
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function buildProductivityHeatmap(
  profile: UserProfile,
  referenceDateStr?: string,
): {
  days: Array<{
    date: string;
    label: string;
    weekday: number;
    codingDrills: number;
    assessmentsCount: number;
    modulesCount: number;
    applicationsCount: number;
    totalActions: number;
    intensity: 0 | 1 | 2 | 3 | 4;
    inStreak: boolean;
  }>;
  totalActions: number;
  activeDays: number;
  peakActions: number;
  peakDateLabel: string;
} {
  const refDate = referenceDateStr
    ? new Date(`${referenceDateStr}T12:00:00Z`)
    : new Date();

  const days: Array<{
    date: string;
    label: string;
    weekday: number;
    codingDrills: number;
    assessmentsCount: number;
    modulesCount: number;
    applicationsCount: number;
    totalActions: number;
    intensity: 0 | 1 | 2 | 3 | 4;
    inStreak: boolean;
  }> = [];

  // Map explicit dated records
  const assessmentByDate = new Map<string, number>();
  for (const a of profile.assessments) {
    assessmentByDate.set(a.date, (assessmentByDate.get(a.date) || 0) + 1);
  }

  const appsByDate = new Map<string, number>();
  for (const app of profile.applications) {
    appsByDate.set(app.appliedAt, (appsByDate.get(app.appliedAt) || 0) + 1);
  }

  const streakDaysClamped = Math.max(0, Math.min(30, profile.streakDays));
  const solvedCount = profile.solvedChallengeIds.length;
  const completedMods = profile.completedModuleIds.length;
  const gamesWon = profile.gamesWon;

  // Build exactly 30 days ending on refDate
  for (let offset = 29; offset >= 0; offset--) {
    const d = new Date(refDate);
    d.setUTCDate(refDate.getUTCDate() - offset);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const iso = `${yyyy}-${mm}-${dd}`;
    const label = `${MONTH_ABBR[d.getUTCMonth()]} ${d.getUTCDate()}`;
    const weekday = d.getUTCDay();

    const assessmentsCount = assessmentByDate.get(iso) || 0;
    const applicationsCount = appsByDate.get(iso) || 0;
    const inStreak = streakDaysClamped > 0 && offset < streakDaysClamped;

    // Distribute verified coding/module/game efforts across active streak window + today
    let codingDrills = 0;
    let modulesCount = 0;

    if (inStreak) {
      // Base daily coding habit during active streak + extra weight on today (offset === 0)
      codingDrills = offset === 0 ? Math.max(1, Math.min(4, solvedCount)) : 1 + ((offset + solvedCount) % 2);
      if (offset === 0 && completedMods > 0) {
        modulesCount = Math.min(3, completedMods);
      } else if (completedMods > 0 && offset % 3 === 0) {
        modulesCount = 1;
      }
      if (gamesWon > 0 && offset % 2 === 0) {
        codingDrills += 1;
      }
    } else if (offset === 0 && (solvedCount > 0 || completedMods > 0 || gamesWon > 0)) {
      codingDrills = Math.min(3, solvedCount + (gamesWon > 0 ? 1 : 0));
      modulesCount = Math.min(2, completedMods);
    }

    const totalActions = codingDrills + assessmentsCount * 2 + modulesCount + applicationsCount;

    let intensity: 0 | 1 | 2 | 3 | 4 = 0;
    if (totalActions >= 6) intensity = 4;
    else if (totalActions >= 4) intensity = 3;
    else if (totalActions >= 2) intensity = 2;
    else if (totalActions >= 1) intensity = 1;

    days.push({
      date: iso,
      label,
      weekday,
      codingDrills,
      assessmentsCount,
      modulesCount,
      applicationsCount,
      totalActions,
      intensity,
      inStreak,
    });
  }

  let totalActions = 0;
  let activeDays = 0;
  let peakActions = 0;
  let peakDateLabel = days[days.length - 1]?.label ?? '';

  for (const day of days) {
    totalActions += day.totalActions;
    if (day.totalActions > 0) activeDays++;
    if (day.totalActions >= peakActions) {
      peakActions = day.totalActions;
      peakDateLabel = day.label;
    }
  }

  return {
    days,
    totalActions,
    activeDays,
    peakActions,
    peakDateLabel,
  };
}



import { sanitizeIsoDate } from './certExpiry';
import type {
  AccountRole,
  AchievementItem,
  Certification,
  EducationEntry,
  EducationStatus,
  EmploymentPreference,
  ExperienceEntry,
  LanguageEntry,
  LanguageProficiency,
  ProfileVisibility,
  ProjectItem,
  UploadedResumeFile,
  UserProfile,
  UserSkill,
  WorkModePreference,
} from '../types';

const ALLOWED_ROLES: AccountRole[] = [
  'student',
  'working-professional',
  'job-seeker',
  'employer',
  'admin',
];

const ALLOWED_VISIBILITIES: ProfileVisibility[] = ['public', 'recruiters', 'private'];
const ALLOWED_WORK_MODES: WorkModePreference[] = ['Remote', 'Hybrid', 'On-Site', 'Flexible'];
const ALLOWED_EMP_PREFS: EmploymentPreference[] = [
  'Full-Time',
  'Internship',
  'Part-Time',
  'Contract',
  'Freelance',
];
const ALLOWED_EDU_STATUSES: EducationStatus[] = [
  'High School',
  'Pursuing Undergraduate',
  "Graduated (Bachelor's)",
  'Pursuing Postgraduate',
  "Graduated (Master's / PhD)",
  'Diploma / Bootcamp',
  'Working Professional',
];
const ALLOWED_LANG_PROFICIENCY: LanguageProficiency[] = [
  'Basic',
  'Conversational',
  'Fluent',
  'Native',
];

const ALLOWED_RESUME_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
]);

export function sanitizeTextField(raw: unknown, maxLen = 200): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, maxLen);
}

export function sanitizeExternalUrl(raw?: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:') ||
    (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:/i.test(trimmed))
  ) {
    return undefined;
  }

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || !parsed.hostname.includes('.')) {
      if (parsed.hostname !== 'localhost') {
        return undefined;
      }
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
}

export function sanitizeAvatarImageUrl(raw?: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  // Allow safe base64 raster images (no SVG XML scripts) up to ~600 KB encoded
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=]+$/i.test(trimmed)) {
    return trimmed.length <= 650_000 ? trimmed : undefined;
  }

  return sanitizeExternalUrl(trimmed);
}

export function sanitizeResumeFile(raw?: unknown): UploadedResumeFile | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const rec = raw as Partial<UploadedResumeFile>;
  const fileName = sanitizeTextField(rec.fileName || '', 160);
  const mimeType = sanitizeTextField(rec.mimeType || '', 120).toLowerCase();
  if (!fileName || !ALLOWED_RESUME_MIME_TYPES.has(mimeType)) return undefined;

  const sizeBytes = Number.isFinite(Number(rec.sizeBytes))
    ? Math.max(0, Math.min(2_500_000, Math.round(Number(rec.sizeBytes))))
    : 0;
  const uploadedAt = sanitizeIsoDate(rec.uploadedAt) || new Date().toISOString().split('T')[0];

  let safeDataUrl: string | undefined;
  if (typeof rec.dataUrl === 'string' && rec.dataUrl.length <= 3_500_000) {
    if (/^data:(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|text\/plain|text\/markdown);base64,[a-z0-9+/=]+$/i.test(rec.dataUrl)) {
      safeDataUrl = rec.dataUrl;
    }
  }

  return {
    fileName,
    mimeType,
    sizeBytes,
    uploadedAt,
    ...(safeDataUrl ? { dataUrl: safeDataUrl } : {}),
  };
}

export function clampSkillLevel(level: unknown): number {
  const num = typeof level === 'number' ? level : Number(level);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function sanitizeStringTags(raw: unknown, maxItems = 25, maxLen = 60): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const clean = sanitizeTextField(item, maxLen);
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
    if (out.length >= maxItems) break;
  }
  return out;
}

function sanitizeExperienceList(raw: unknown): ExperienceEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item.organization === 'string' && typeof item.roleTitle === 'string')
    .map((item) => ({
      id: sanitizeTextField(item.id || `exp-${Date.now()}`, 64),
      organization: sanitizeTextField(item.organization, 120),
      roleTitle: sanitizeTextField(item.roleTitle, 120),
      startDate: sanitizeTextField(item.startDate || '', 24),
      endDate: item.current ? 'Present' : sanitizeTextField(item.endDate || '', 24),
      current: Boolean(item.current),
      location: sanitizeTextField(item.location || '', 80) || undefined,
      description: sanitizeTextField(item.description || '', 600),
    }))
    .filter((item) => item.organization && item.roleTitle)
    .slice(0, 15);
}

export function sanitizeUserProfile(input: UserProfile): UserProfile {
  const skills: UserSkill[] = Array.isArray(input.skills)
    ? input.skills
        .filter((s) => s && typeof s.name === 'string' && s.name.trim().length > 0)
        .map((s) => ({
          name: sanitizeTextField(s.name, 60),
          level: clampSkillLevel(s.level),
          category: s.category || 'Foundations',
          verified: Boolean(s.verified),
        }))
    : [];

  const educationHistory: EducationEntry[] = Array.isArray(input.educationHistory)
    ? input.educationHistory
        .filter((e) => e && typeof e.institution === 'string' && typeof e.degree === 'string')
        .map((e) => ({
          id: sanitizeTextField(e.id || `edu-${Date.now()}`, 64),
          institution: sanitizeTextField(e.institution, 120),
          degree: sanitizeTextField(e.degree, 80),
          fieldOfStudy: sanitizeTextField(e.fieldOfStudy || '', 100),
          startYear: sanitizeTextField(e.startYear || '', 12),
          endYear: sanitizeTextField(e.endYear || '', 12),
          gpaOrScore: sanitizeTextField(e.gpaOrScore || '', 40) || undefined,
          highlights: sanitizeTextField(e.highlights || '', 300) || undefined,
        }))
    : [];

  const projects: ProjectItem[] = Array.isArray(input.projects)
    ? input.projects
        .filter((p) => p && typeof p.title === 'string' && typeof p.description === 'string')
        .map((p) => ({
          id: sanitizeTextField(p.id || `proj-${Date.now()}`, 64),
          title: sanitizeTextField(p.title, 120),
          description: sanitizeTextField(p.description, 500),
          skillsUsed: Array.isArray(p.skillsUsed)
            ? p.skillsUsed.map((sk) => sanitizeTextField(sk, 40)).filter(Boolean).slice(0, 12)
            : [],
          repoUrl: sanitizeExternalUrl(p.repoUrl),
        }))
    : [];

  const certifications: Certification[] = Array.isArray(input.certifications)
    ? input.certifications
        .filter((c) => c && typeof c.title === 'string' && typeof c.issuer === 'string')
        .map((c) => ({
          id: sanitizeTextField(c.id || `cert-${Date.now()}`, 64),
          title: sanitizeTextField(c.title, 120),
          issuer: sanitizeTextField(c.issuer, 100),
          year: sanitizeTextField(c.year || '2026', 12),
          expiryDate: sanitizeIsoDate(c.expiryDate),
          credentialId: sanitizeTextField(c.credentialId || '', 80) || undefined,
          credentialUrl: sanitizeExternalUrl(c.credentialUrl),
          issuerLogoId: sanitizeTextField(c.issuerLogoId || '', 64) || undefined,
        }))
    : [];

  const languagesKnown: LanguageEntry[] = Array.isArray(input.languagesKnown)
    ? input.languagesKnown
        .filter((l) => l && typeof l.language === 'string' && l.language.trim().length > 0)
        .map((l) => ({
          id: sanitizeTextField(l.id || `lang-${Date.now()}`, 64),
          language: sanitizeTextField(l.language, 50),
          proficiency: ALLOWED_LANG_PROFICIENCY.includes(l.proficiency)
            ? l.proficiency
            : 'Conversational',
        }))
        .slice(0, 15)
    : [];

  const achievements: AchievementItem[] = Array.isArray(input.achievements)
    ? input.achievements
        .filter((a) => a && typeof a.title === 'string' && a.title.trim().length > 0)
        .map((a) => ({
          id: sanitizeTextField(a.id || `ach-${Date.now()}`, 64),
          title: sanitizeTextField(a.title, 140),
          issuer: sanitizeTextField(a.issuer || '', 100),
          year: sanitizeTextField(a.year || '2026', 12),
          description: sanitizeTextField(a.description || '', 300) || undefined,
        }))
        .slice(0, 20)
    : [];

  const rawLoc = input.locationCoords;
  const locationCoords =
    rawLoc && Number.isFinite(Number(rawLoc.lat)) && Number.isFinite(Number(rawLoc.lng))
      ? {
          lat: Math.max(-90, Math.min(90, Number(rawLoc.lat))),
          lng: Math.max(-180, Math.min(180, Number(rawLoc.lng))),
          city: sanitizeTextField(rawLoc.city || '', 80) || 'Custom Location',
          country: sanitizeTextField(rawLoc.country || '', 80) || 'Global',
          mode: rawLoc.mode === 'auto' ? ('auto' as const) : ('manual' as const),
        }
      : undefined;

  const safeDob = sanitizeIsoDate(input.dateOfBirth);
  const safeRole: AccountRole =
    input.role && ALLOWED_ROLES.includes(input.role) ? input.role : 'student';
  const safeVisibility: ProfileVisibility =
    input.profileVisibility && ALLOWED_VISIBILITIES.includes(input.profileVisibility)
      ? input.profileVisibility
      : 'recruiters';
  const safeWorkMode =
    input.workModePreference && ALLOWED_WORK_MODES.includes(input.workModePreference)
      ? input.workModePreference
      : undefined;
  const safeEduStatus =
    input.currentEducationStatus && ALLOWED_EDU_STATUSES.includes(input.currentEducationStatus)
      ? input.currentEducationStatus
      : undefined;
  const employmentPreferences = Array.isArray(input.employmentPreferences)
    ? input.employmentPreferences.filter((p): p is EmploymentPreference =>
        ALLOWED_EMP_PREFS.includes(p),
      )
    : [];

  return {
    ...input,
    name: sanitizeTextField(input.name, 80),
    email: sanitizeTextField(input.email, 160).toLowerCase(),
    role: safeRole,
    avatarUrl: sanitizeAvatarImageUrl(input.avatarUrl) || '',
    headline: sanitizeTextField(input.headline || '', 160),
    education: sanitizeTextField(input.education || '', 160),
    phone: sanitizeTextField(input.phone || '', 40),
    dateOfBirth: safeDob || '',
    location: sanitizeTextField(input.location || '', 100),
    preferredWorkLocation: sanitizeTextField(input.preferredWorkLocation || '', 100),
    locationCoords,
    linkedinUrl: sanitizeExternalUrl(input.linkedinUrl) || '',
    githubUrl: sanitizeExternalUrl(input.githubUrl) || '',
    portfolioUrl: sanitizeExternalUrl(input.portfolioUrl) || '',
    resumeSummary: sanitizeTextField(input.resumeSummary || '', 800),
    currentEducationStatus: safeEduStatus,
    collegeName: sanitizeTextField(input.collegeName || '', 140),
    graduationYear: sanitizeTextField(input.graduationYear || '', 12),
    cgpaOrPercentage: sanitizeTextField(input.cgpaOrPercentage || '', 30),
    educationHistory,
    skills,
    nonTechnicalSkills: sanitizeStringTags(input.nonTechnicalSkills, 25, 60),
    softSkills: sanitizeStringTags(input.softSkills, 25, 60),
    languagesKnown,
    workExperience: sanitizeExperienceList(input.workExperience),
    internshipExperience: sanitizeExperienceList(input.internshipExperience),
    projects,
    certifications,
    achievements,
    uploadedResume: sanitizeResumeFile(input.uploadedResume),
    careerInterests: sanitizeStringTags(input.careerInterests, 20, 60),
    preferredJobRoles: sanitizeStringTags(input.preferredJobRoles, 15, 80),
    expectedSalary: sanitizeTextField(input.expectedSalary || '', 60),
    employmentPreferences,
    workModePreference: safeWorkMode,
    availabilityNoticePeriod: sanitizeTextField(input.availabilityNoticePeriod || '', 60),
    profileVisibility: safeVisibility,
    emailVerified: Boolean(input.emailVerified),
    phoneVerified: Boolean(input.phoneVerified),
    twoFactorEnabled: Boolean(input.twoFactorEnabled),
    twoFactorMethod: input.twoFactorMethod === 'phone' ? 'phone' : 'email',
    acceptedTermsAt: sanitizeTextField(input.acceptedTermsAt || '', 40) || undefined,
    acceptedPrivacyAt: sanitizeTextField(input.acceptedPrivacyAt || '', 40) || undefined,
    careerGoals: Array.isArray(input.careerGoals)
      ? input.careerGoals.map((g) => sanitizeTextField(g, 160)).filter(Boolean).slice(0, 15)
      : [],
    streakDays: Math.max(0, Math.round(Number(input.streakDays) || 0)),
    streakPoints: Math.max(0, Math.round(Number(input.streakPoints) || 0)),
    gamesWon: Math.max(0, Math.round(Number(input.gamesWon) || 0)),
    enrolledCourseIds: sanitizeStringTags(input.enrolledCourseIds, 40, 64),
    completedLessonIds: sanitizeStringTags(input.completedLessonIds, 200, 64),
    bookmarkedLessonIds: sanitizeStringTags(input.bookmarkedLessonIds, 100, 64),
    offlineCourseIds: sanitizeStringTags(input.offlineCourseIds, 40, 64),
    savedJobIds: sanitizeStringTags(input.savedJobIds, 60, 64),
    registeredDriveIds: sanitizeStringTags(input.registeredDriveIds, 30, 64),
    registeredFairIds: sanitizeStringTags(input.registeredFairIds, 30, 64),
    earnedBadgeIds: sanitizeStringTags(input.earnedBadgeIds, 40, 64),
    jobAlertsEnabled: input.jobAlertsEnabled ?? true,
    preferredStudyLanguage: input.preferredStudyLanguage || 'English',
    resumeTemplate: input.resumeTemplate || 'classic-executive',
    subscriptionPlan: input.subscriptionPlan || 'free',
    autoRenewSubscription: input.autoRenewSubscription ?? true,
    referralCode: sanitizeTextField(input.referralCode || '', 32) || undefined,
    referredUsersCount: Math.max(0, Math.round(Number(input.referredUsersCount) || 0)),
  };
}


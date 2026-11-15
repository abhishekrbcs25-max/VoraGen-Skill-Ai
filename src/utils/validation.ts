import type { Certification, EducationEntry, ProjectItem, UserProfile, UserSkill } from '../types';

export function sanitizeTextField(raw: unknown, maxLen = 200): string {
  if (typeof raw !== 'string') return '';
  // Strip ASCII control chars except newline/tab where needed, collapse outer whitespace
  return raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, maxLen);
}

export function sanitizeExternalUrl(raw?: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  // Reject dangerous or non-web URI schemes (XSS / script / data / custom scheme injection)
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

export function clampSkillLevel(level: unknown): number {
  const num = typeof level === 'number' ? level : Number(level);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
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
          credentialId: sanitizeTextField(c.credentialId || '', 80) || undefined,
        }))
    : [];

  return {
    ...input,
    name: sanitizeTextField(input.name, 80),
    email: sanitizeTextField(input.email, 160).toLowerCase(),
    headline: sanitizeTextField(input.headline || '', 160),
    education: sanitizeTextField(input.education || '', 160),
    phone: sanitizeTextField(input.phone || '', 40),
    location: sanitizeTextField(input.location || '', 100),
    linkedinUrl: sanitizeExternalUrl(input.linkedinUrl) || '',
    githubUrl: sanitizeExternalUrl(input.githubUrl) || '',
    portfolioUrl: sanitizeExternalUrl(input.portfolioUrl) || '',
    resumeSummary: sanitizeTextField(input.resumeSummary || '', 800),
    educationHistory,
    skills,
    projects,
    certifications,
    careerGoals: Array.isArray(input.careerGoals)
      ? input.careerGoals.map((g) => sanitizeTextField(g, 160)).filter(Boolean).slice(0, 15)
      : [],
    streakDays: Math.max(0, Math.round(Number(input.streakDays) || 0)),
    streakPoints: Math.max(0, Math.round(Number(input.streakPoints) || 0)),
    gamesWon: Math.max(0, Math.round(Number(input.gamesWon) || 0)),
  };
}

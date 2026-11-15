import type { CareerRole, SkillMatchBreakdown, UserProfile } from '../types';

export type TimeGreeting = 'Good Morning' | 'Good Afternoon' | 'Good Evening';

export interface SkillProgressTrackItem {
  name: string;
  currentLevel: number;
  targetLevel: number;
  progressPct: number;
  status: 'Mastered' | 'In Progress' | 'Missing';
  verified: boolean;
  isRoleRequired: boolean;
}

export function getTimeOfDayGreeting(
  date: Date = new Date(),
  timeZone?: string,
): TimeGreeting {
  let hour = date.getHours();
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      ...(timeZone ? { timeZone } : {}),
    });
    const hourPart = formatter.formatToParts(date).find((part) => part.type === 'hour');
    const parsed = hourPart ? Number.parseInt(hourPart.value, 10) : NaN;
    if (!Number.isNaN(parsed)) {
      hour = parsed === 24 ? 0 : parsed;
    }
  } catch {
    hour = date.getHours();
  }

  if (hour >= 5 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function formatUserTimeZoneContext(
  date: Date = new Date(),
  timeZone?: string,
): { timeZoneName: string; localTime: string } {
  let resolvedTz = timeZone || 'Local Time';
  try {
    if (!timeZone) {
      resolvedTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local Time';
    }
  } catch {
    resolvedTz = timeZone || 'Local Time';
  }

  let localTime = '';
  try {
    localTime = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      ...(timeZone ? { timeZone } : {}),
    }).format(date);
  } catch {
    localTime = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  return {
    timeZoneName: resolvedTz,
    localTime,
  };
}

export function buildSkillProgressTracks(
  profile: UserProfile,
  targetRole: CareerRole,
  match: SkillMatchBreakdown,
): SkillProgressTrackItem[] {
  const verifiedMap = new Map<string, boolean>();
  for (const sk of profile.skills) {
    verifiedMap.set(sk.name.toLowerCase(), Boolean(sk.verified));
  }

  const requiredNames = new Set(targetRole.requiredSkills.map((r) => r.name.toLowerCase()));

  const roleTracks: SkillProgressTrackItem[] = match.matchedSkills.map((item) => ({
    name: item.name,
    currentLevel: item.currentLevel,
    targetLevel: item.targetLevel,
    progressPct: Math.min(100, Math.round((item.currentLevel / Math.max(1, item.targetLevel)) * 100)),
    status: item.status,
    verified: verifiedMap.get(item.name.toLowerCase()) ?? false,
    isRoleRequired: true,
  }));

  const extraTracks: SkillProgressTrackItem[] = profile.skills
    .filter((sk) => !requiredNames.has(sk.name.toLowerCase()))
    .map((sk) => {
      const targetLevel = 80;
      return {
        name: sk.name,
        currentLevel: sk.level,
        targetLevel,
        progressPct: Math.min(100, Math.round((sk.level / targetLevel) * 100)),
        status: sk.level >= targetLevel ? 'Mastered' : 'In Progress',
        verified: Boolean(sk.verified),
        isRoleRequired: false,
      };
    });

  return [...roleTracks, ...extraTracks];
}

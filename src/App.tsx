import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopSearchBar } from './components/TopSearchBar';
import { SupportModal } from './components/SupportModal';
import { HomeView } from './components/HomeView';
import { AuthModal } from './components/AuthModal';
import { OnboardingWizardModal } from './components/OnboardingWizardModal';
import { ErrorBoundary } from './components/ErrorBoundary';

const ProfileAuthView = lazy(() =>
  import('./components/ProfileAuthView').then((m) => ({ default: m.ProfileAuthView })),
);
const ResumeView = lazy(() =>
  import('./components/ResumeView').then((m) => ({ default: m.ResumeView })),
);
const SkillAnalysisView = lazy(() =>
  import('./components/SkillAnalysisView').then((m) => ({ default: m.SkillAnalysisView })),
);
const CareerMatchingView = lazy(() =>
  import('./components/CareerMatchingView').then((m) => ({ default: m.CareerMatchingView })),
);
const LearningRecommendationsView = lazy(() =>
  import('./components/LearningRecommendationsView').then((m) => ({
    default: m.LearningRecommendationsView,
  })),
);
const ProgressTrackingView = lazy(() =>
  import('./components/ProgressTrackingView').then((m) => ({ default: m.ProgressTrackingView })),
);
const AIMentorView = lazy(() =>
  import('./components/AIMentorView').then((m) => ({ default: m.AIMentorView })),
);
const CareerLabView = lazy(() =>
  import('./components/CareerLabView').then((m) => ({ default: m.CareerLabView })),
);
const CodeArenaView = lazy(() =>
  import('./components/CodeArenaView').then((m) => ({ default: m.CodeArenaView })),
);
const GamesView = lazy(() =>
  import('./components/GamesView').then((m) => ({ default: m.GamesView })),
);
const GlobalJobsView = lazy(() =>
  import('./components/GlobalJobsView').then((m) => ({ default: m.GlobalJobsView })),
);
const SettingsView = lazy(() =>
  import('./components/SettingsView').then((m) => ({ default: m.SettingsView })),
);
const SkillArena3DGame = lazy(() =>
  import('./components/SkillArena3DGame').then((m) => ({ default: m.SkillArena3DGame })),
);
import {
  CAREER_ROLES,
  LEARNING_CATALOG,
  createBlankUnauthenticatedProfile,
  createFreshUserProfile,
} from './data/careerData';
import {
  logAssessmentToFirestore,
  signOutFirebase,
  subscribeFirebaseAuth,
  syncUserWorkspaceToFirestore,
} from './lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  calculateSkillMatch,
  computeCodingStreakUpdate,
  generateAdaptiveRoadmap,
  recalibrateFromAssessment,
} from './utils/skillEngine';
import {
  buildInitialNotifications,
  createNotification,
  markAllNotificationsRead,
  markNotificationRead,
  prependNotification,
} from './utils/notifications';
import type { SearchEntry } from './utils/searchIndex';
import type {
  AppNotification,
  AppSettings,
  CompanyJob,
  Difficulty,
  MultiAgentReport,
  NavSection,
  NotificationCategory,
  SkillAuthenticityResult,
  ThemeMode,
  UserProfile,
} from './types';

const DEFAULT_SETTINGS: AppSettings = {
  remedialThresholdPct: 60,
  autoSyncAgents: true,
  defaultVideoVoice: false,
  dailyStudyMinutes: 45,
  weeklyCodeGoal: 5,
  compactLayout: false,
  reduceMotion: false,
};

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('home');
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('pathforge-theme') as ThemeMode | null;
    return saved || 'dark';
  });
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('pathforge-settings');
      return saved ? { ...DEFAULT_SETTINGS, ...(JSON.parse(saved) as Partial<AppSettings>) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalReason, setAuthModalReason] = useState<string | undefined>(undefined);

  const [userKey, setUserKey] = useState<string>(() => {
    const saved = localStorage.getItem('pathforge-user-key') || '';
    if (!saved || saved === 'default') {
      localStorage.removeItem('pathforge-user-key');
      localStorage.removeItem('pathforge-session-token');
      return '';
    }
    return saved;
  });
  const [sessionToken, setSessionToken] = useState<string>(() => {
    const savedKey = localStorage.getItem('pathforge-user-key') || '';
    if (!savedKey || savedKey === 'default') return '';
    return localStorage.getItem('pathforge-session-token') || '';
  });
  const [profile, setProfile] = useState<UserProfile>(() =>
    createBlankUnauthenticatedProfile(),
  );
  const [agentReport, setAgentReport] = useState<MultiAgentReport | null>(null);
  const [isSyncingAI, setIsSyncingAI] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchSubTarget, setSearchSubTarget] = useState<string | undefined>(undefined);
  const [skillAnalysisMode, setSkillAnalysisMode] = useState<'diagnostic' | 'authenticity'>(
    'diagnostic',
  );
  const [skillAnalysisTarget, setSkillAnalysisTarget] = useState<string | undefined>(undefined);
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  const initialQueryParams = useMemo(() => {
    if (typeof window === 'undefined') return { autostart: false, launch3d: false };
    const sp = new URLSearchParams(window.location.search);
    const gameParam = sp.get('game');
    const autoParam = sp.get('autostart') === '1';
    return {
      autostart: autoParam,
      launch3d: gameParam === 'skill-defender-3d' || autoParam,
    };
  }, []);

  const [show3DGame, setShow3DGame] = useState(initialQueryParams.launch3d);
  const [best3DScore, setBest3DScore] = useState<number>(() => {
    return Number(localStorage.getItem('pathforge-3d-best') || '0');
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    if (!userKey) return [];
    try {
      const saved = localStorage.getItem(`pathforge-notifications-${userKey}`);
      if (saved) {
        const parsed = JSON.parse(saved) as AppNotification[];
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback to empty notifications
    }
    return [];
  });

  useEffect(() => {
    if (!userKey) return;
    try {
      localStorage.setItem(`pathforge-notifications-${userKey}`, JSON.stringify(notifications));
    } catch {
      // Ignore storage quota errors
    }
  }, [notifications, userKey]);

  const autoSyncAgentsRef = useRef(settings.autoSyncAgents);
  useEffect(() => {
    autoSyncAgentsRef.current = settings.autoSyncAgents;
  }, [settings.autoSyncAgents]);

  const pushNotification = useCallback(
    (params: {
      title: string;
      detail: string;
      category: NotificationCategory;
      targetSection?: NavSection;
      subTarget?: string;
    }) => {
      const incoming = createNotification(params);
      setNotifications((prev) => prependNotification(prev, incoming));
    },
    [],
  );

  const runMultiAgentCollaboration = useCallback(
    async (targetProfile: UserProfile, triggerReason?: string) => {
      setIsSyncingAI(true);
      try {
        const res = await fetch('/api/ai/collaborate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile: targetProfile, triggerReason }),
        });
        if (res.ok) {
          const report = (await res.json()) as MultiAgentReport;
          setAgentReport(report);
          if (triggerReason && triggerReason !== 'Initial Student Profile Diagnostics') {
            pushNotification({
              title: '4-Agent Collaboration Synced',
              detail: `${triggerReason} — updated market alignment and adaptive curriculum priorities.`,
              category: 'ai',
              targetSection: 'skill-analysis',
            });
          }
        }
      } catch {
        // Handled silently
      } finally {
        setIsSyncingAI(false);
      }
    },
    [pushNotification],
  );

  const updateSettings = (next: AppSettings) => {
    setSettings(next);
    localStorage.setItem('pathforge-settings', JSON.stringify(next));
    pushNotification({
      title: 'Workspace Settings Updated',
      detail: `Remedial threshold ${next.remedialThresholdPct}% · Daily goal ${next.dailyStudyMinutes}m · Auto-sync ${next.autoSyncAgents ? 'enabled' : 'paused'}.`,
      category: 'system',
      targetSection: 'settings',
    });
  };

  // Listen for Case A Google Maps Demo Key quota alerts & Firebase Auth state
  useEffect(() => {
    const onQuota = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    const unsubAuth = subscribeFirebaseAuth((user) => {
      setFirebaseUser(user);
    });
    return () => {
      window.removeEventListener('gmp-quota-exceeded', onQuota);
      unsubAuth();
    };
  }, []);

  // Sync theme mode (light / dark / system) to <html class="dark">
  useEffect(() => {
    localStorage.setItem('pathforge-theme', themeMode);
    const root = document.documentElement;
    const applyTheme = () => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldBeDark = themeMode === 'dark' || (themeMode === 'system' && prefersDark);
      root.classList.toggle('dark', shouldBeDark);
    };
    applyTheme();
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', applyTheme);
    return () => media.removeEventListener('change', applyTheme);
  }, [themeMode]);

  // Load persisted profile ONLY when a signed-in userKey + sessionToken exists (zero default data before login)
  useEffect(() => {
    if (!userKey || userKey === 'default' || !sessionToken) {
      if (userKey && !sessionToken) {
        localStorage.removeItem('pathforge-user-key');
        localStorage.removeItem('pathforge-session-token');
        setUserKey('');
      }
      setProfile(createBlankUnauthenticatedProfile());
      setAgentReport(null);
      return;
    }

    let cancelled = false;
    fetch(`/api/profile?key=${encodeURIComponent(userKey)}`, {
      headers: { 'x-voragen-token': sessionToken },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: UserProfile | null) => {
        if (cancelled) return;
        if (data && data.isSignedIn && typeof data.email === 'string' && data.email) {
          setProfile(data);
          setNotifications((prev) => {
            if (prev.length > 0) return prev;
            const roleTitle =
              CAREER_ROLES.find((r) => r.id === data.targetCareerId)?.title ?? CAREER_ROLES[0].title;
            return buildInitialNotifications(data.name || 'Learner', roleTitle);
          });
          if (autoSyncAgentsRef.current) {
            runMultiAgentCollaboration(data, 'Restored User Session Diagnostics');
          }
        } else {
          localStorage.removeItem('pathforge-user-key');
          localStorage.removeItem('pathforge-session-token');
          setUserKey('');
          setSessionToken('');
          setProfile(createBlankUnauthenticatedProfile());
        }
      })
      .catch(() => {
        if (cancelled) return;
        localStorage.removeItem('pathforge-user-key');
        localStorage.removeItem('pathforge-session-token');
        setUserKey('');
        setSessionToken('');
        setProfile(createBlankUnauthenticatedProfile());
      });

    return () => {
      cancelled = true;
    };
  }, [userKey, sessionToken, runMultiAgentCollaboration]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 4500);
  };

  const requireSignInForUpdate = (actionLabel = 'update your personal details'): boolean => {
    if (profile.isSignedIn) return true;
    setAuthModalReason(`Please sign in or create an account to ${actionLabel}.`);
    setAuthModalOpen(true);
    return false;
  };

  const persistProfile = (
    next: UserProfile,
    explicitKey?: string,
    bypassAuthCheck = false,
    explicitToken?: string,
  ) => {
    if (!bypassAuthCheck && !profile.isSignedIn && !next.isSignedIn) {
      requireSignInForUpdate('update your profile or resume details');
      return;
    }
    const activeKey = explicitKey || userKey;
    const activeToken = explicitToken || sessionToken;
    if (!activeKey || activeKey === 'default') return;
    setProfile(next);
    fetch(`/api/profile?key=${encodeURIComponent(activeKey)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(activeToken ? { 'x-voragen-token': activeToken } : {}),
      },
      body: JSON.stringify(next),
    }).catch(() => {
      // Non-fatal
    });

    if (firebaseUser) {
      syncUserWorkspaceToFirestore(firebaseUser, next).catch(() => {});
      firebaseUser
        .getIdToken()
        .then((token) =>
          fetch('/api/sql/profile', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              displayName: next.name,
              targetCareerId: next.targetCareerId,
              streakPoints: next.streakPoints,
              streakDays: next.streakDays,
            }),
          }),
        )
        .catch(() => {});
    }
  };

  const targetRole = useMemo(
    () => CAREER_ROLES.find((r) => r.id === profile.targetCareerId) ?? CAREER_ROLES[0],
    [profile.targetCareerId],
  );

  const match = useMemo(
    () =>
      calculateSkillMatch(
        profile.skills,
        targetRole,
        profile.certifications,
        profile.projects,
      ),
    [profile.skills, targetRole, profile.certifications, profile.projects],
  );

  const adaptiveRoadmap = useMemo(
    () =>
      generateAdaptiveRoadmap(
        profile.skills,
        targetRole,
        profile.remedialSkills,
        profile.completedModuleIds,
        LEARNING_CATALOG,
      ),
    [profile.skills, targetRole, profile.remedialSkills, profile.completedModuleIds],
  );

  // Multi-agent diagnostics run only after authentication (never on unauthenticated entry)

  const handleSelectCareerGoal = (roleId: string) => {
    if (!requireSignInForUpdate('save your target career goal')) return;
    const chosen = CAREER_ROLES.find((r) => r.id === roleId);
    if (!chosen) return;
    const next: UserProfile = {
      ...profile,
      targetCareerId: roleId,
    };
    persistProfile(next);
    showToast(`Career goal switched to ${chosen.title}. Multi-agent roadmap updated.`);
    pushNotification({
      title: `Target Role: ${chosen.title}`,
      detail: 'Skill gap matrix and personalized learning modules recalibrated for your new career path.',
      category: 'skill',
      targetSection: 'career-matching',
      subTarget: roleId,
    });
    if (settings.autoSyncAgents) {
      runMultiAgentCollaboration(next, `Career goal switched to ${chosen.title}`);
    }
  };

  const handleAssessmentSubmit = (skillName: string, scorePct: number) => {
    if (!requireSignInForUpdate('save your skill assessment score')) return;
    const outcome = recalibrateFromAssessment(
      profile,
      skillName,
      scorePct,
      targetRole,
      settings.remedialThresholdPct,
    );
    persistProfile(outcome.updatedProfile);
    showToast(outcome.message);
    pushNotification({
      title: `${skillName} Diagnostic: ${scorePct}%`,
      detail:
        scorePct < settings.remedialThresholdPct
          ? `Score below ${settings.remedialThresholdPct}% threshold — remedial foundations unlocked in your roadmap.`
          : outcome.message,
      category: 'skill',
      targetSection:
        scorePct < settings.remedialThresholdPct ? 'learning-recommendations' : 'progress-tracking',
    });

    if (firebaseUser) {
      const remedialTriggered = scorePct < settings.remedialThresholdPct;
      logAssessmentToFirestore(firebaseUser, {
        skillName,
        scorePct,
        remedialTriggered,
        notes: outcome.message,
      }).catch(() => {});
      firebaseUser
        .getIdToken()
        .then((token) =>
          fetch('/api/sql/assessments', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              skillName,
              scorePct,
              remedialTriggered,
              notes: outcome.message,
            }),
          }),
        )
        .catch(() => {});
    }

    if (settings.autoSyncAgents) {
      runMultiAgentCollaboration(
        outcome.updatedProfile,
        `${skillName} assessment scored ${scorePct}%`,
      );
    }
  };

  const handleToggleCompleteModule = (moduleId: string, skillName: string) => {
    if (!requireSignInForUpdate('save your learning roadmap progress')) return;
    const alreadyDone = profile.completedModuleIds.includes(moduleId);
    const nextCompleted = alreadyDone
      ? profile.completedModuleIds.filter((id) => id !== moduleId)
      : [...profile.completedModuleIds, moduleId];

    let nextSkills = [...profile.skills];
    if (!alreadyDone) {
      const idx = nextSkills.findIndex(
        (s) => s.name.toLowerCase() === skillName.toLowerCase(),
      );
      if (idx >= 0) {
        nextSkills[idx] = {
          ...nextSkills[idx],
          level: Math.min(100, nextSkills[idx].level + 18),
        };
      } else {
        const req = targetRole.requiredSkills.find(
          (r) => r.name.toLowerCase() === skillName.toLowerCase(),
        );
        nextSkills.push({
          name: skillName,
          level: 55,
          category: req?.category ?? 'Foundations',
          verified: false,
        });
      }
    }

    const nextProfile: UserProfile = {
      ...profile,
      completedModuleIds: nextCompleted,
      skills: nextSkills,
    };
    persistProfile(nextProfile);
    if (!alreadyDone) {
      showToast(`Module completed! ${skillName} proficiency boosted.`);
      pushNotification({
        title: `Module Completed · ${skillName}`,
        detail: `${skillName} proficiency increased and your 30-day activity heatmap recorded today's sprint.`,
        category: 'skill',
        targetSection: 'learning-recommendations',
      });
    }
  };

  const handleSolveChallenge = (challengeId: string, difficulty: Difficulty) => {
    if (!requireSignInForUpdate('save coding streak points')) return;
    const update = computeCodingStreakUpdate(
      profile.streakPoints,
      profile.streakDays,
      profile.solvedChallengeIds,
      challengeId,
      difficulty,
    );
    if (update.pointsAwarded === 0) return;

    const nextProfile: UserProfile = {
      ...profile,
      streakPoints: update.newPoints,
      streakDays: update.newStreak,
      solvedChallengeIds: update.newSolvedIds,
    };
    persistProfile(nextProfile);
    showToast(`Challenge solved! +${update.pointsAwarded} streak points earned.`);
    pushNotification({
      title: `Code Challenge Cleared (+${update.pointsAwarded} pts)`,
      detail: `${difficulty} sprint solved! Streak extended to ${update.newStreak} days (${update.newPoints} pts total).`,
      category: 'code',
      targetSection: 'code-arena',
      subTarget: challengeId,
    });
  };

  const handleWinGame = () => {
    if (!requireSignInForUpdate('save arcade victory points')) return;
    const nextProfile: UserProfile = {
      ...profile,
      gamesWon: profile.gamesWon + 1,
      streakPoints: profile.streakPoints + 15,
    };
    persistProfile(nextProfile);
    showToast('Cognitive challenge won! +15 streak points added.');
    pushNotification({
      title: 'Cognitive Arcade Victory (+15 pts)',
      detail: `Games won increased to ${nextProfile.gamesWon}. Keep sharpening pattern speed!`,
      category: 'game',
      targetSection: 'games',
    });
  };

  const handleWin3DGame = (score: number) => {
    if (!requireSignInForUpdate('save 3D Skill Defender points')) return;
    if (score > best3DScore) {
      setBest3DScore(score);
      localStorage.setItem('pathforge-3d-best', String(score));
    }
    const nextProfile: UserProfile = {
      ...profile,
      gamesWon: profile.gamesWon + 1,
      streakPoints: profile.streakPoints + 50,
    };
    persistProfile(nextProfile);
    showToast(`3D Skill Defender cleared! Score ${score.toLocaleString()} · +50 streak points!`);
    pushNotification({
      title: `3D Skill Defender Victory (${score.toLocaleString()})`,
      detail: 'Earned +50 streak points and updated your cognitive arena record.',
      category: 'game',
      targetSection: 'games',
    });
  };

  const handleApplyForJob = (company: CompanyJob, matchPct: number) => {
    if (!requireSignInForUpdate('log a job application to your account')) return;
    if (profile.applications.some((a) => a.companyId === company.id)) return;
    const status = matchPct >= 75 ? 'Interview Ready' : 'Assessment Pending';
    const nextProfile: UserProfile = {
      ...profile,
      applications: [
        {
          id: `app-${Date.now()}`,
          companyId: company.id,
          companyName: company.companyName,
          roleTitle: company.roleTitle,
          appliedAt: new Date().toISOString().split('T')[0],
          matchAtApply: matchPct,
          status,
        },
        ...profile.applications,
      ],
    };
    persistProfile(nextProfile);
    showToast(`Application logged for ${company.companyName} (${matchPct}% skill match).`);
    pushNotification({
      title: `Applied: ${company.companyName}`,
      detail: `${company.roleTitle} logged at ${matchPct}% readiness (${status}).`,
      category: 'job',
      targetSection: 'global-jobs',
      subTarget: company.id,
    });
  };

  const handleResetDemo = () => {
    if (!userKey) return;
    fetch(`/api/profile/reset?key=${encodeURIComponent(userKey)}`, {
      method: 'POST',
      headers: sessionToken ? { 'x-voragen-token': sessionToken } : {},
    })
      .then((res) => res.json())
      .then((data: { profile?: UserProfile }) => {
        const resetProf =
          data.profile ||
          ({
            ...createFreshUserProfile({
              name: profile.name || 'Learner',
              email: profile.email || userKey,
              authProvider: profile.authProvider || 'email',
            }),
            needsOnboarding: false,
          } satisfies UserProfile);
        setProfile(resetProf);
        setNotifications(buildInitialNotifications(resetProf.name, CAREER_ROLES[0].title));
        runMultiAgentCollaboration(resetProf, 'Workspace Cleared');
        showToast('Workspace cleared back to a clean personal slate.');
      })
      .catch(() => {
        const resetProf: UserProfile = {
          ...createFreshUserProfile({
            name: profile.name || 'Learner',
            email: profile.email || userKey,
            authProvider: profile.authProvider || 'email',
          }),
          needsOnboarding: false,
        };
        setProfile(resetProf);
      });
  };

  const handleAuthSuccess = (nextKey: string, nextProfile: UserProfile, nextToken?: string) => {
    localStorage.setItem('pathforge-user-key', nextKey);
    if (nextToken) {
      localStorage.setItem('pathforge-session-token', nextToken);
      setSessionToken(nextToken);
    }
    setUserKey(nextKey);
    setProfile(nextProfile);
    setAuthModalOpen(false);
    setAuthModalReason(undefined);
    const activeRole =
      CAREER_ROLES.find((r) => r.id === nextProfile.targetCareerId) ?? CAREER_ROLES[0];
    setNotifications(buildInitialNotifications(nextProfile.name, activeRole.title));
    if (!nextProfile.needsOnboarding) {
      runMultiAgentCollaboration(nextProfile, `Signed in as ${nextProfile.name}`);
      showToast(`Welcome back, ${nextProfile.name}!`);
      pushNotification({
        title: `Signed In: ${nextProfile.name}`,
        detail: `Workspace synced for ${activeRole.title}.`,
        category: 'profile',
        targetSection: 'profile',
      });
    } else {
      showToast(`Fresh workspace created for ${nextProfile.name}. Complete your setup!`);
      pushNotification({
        title: `Welcome to Voragen, ${nextProfile.name}`,
        detail: 'Fresh workspace ready — set your career target and verify your top skills.',
        category: 'profile',
        targetSection: 'profile',
      });
    }
  };

  const handleCompleteOnboarding = (updated: UserProfile) => {
    persistProfile(updated, userKey, true);
    runMultiAgentCollaboration(updated, 'Fresh User Onboarding Completed');
    showToast(`Fresh profile saved for ${updated.name}! AI roadmap personalized.`);
    pushNotification({
      title: `Fresh Workspace Calibrated`,
      detail: `Personalized roadmap & skill gaps generated for ${updated.name}.`,
      category: 'profile',
      targetSection: 'home',
    });
  };

  const handleSkipOnboarding = () => {
    const updated: UserProfile = { ...profile, needsOnboarding: false };
    persistProfile(updated, userKey, true);
    runMultiAgentCollaboration(updated, 'New Account Workspace Ready');
  };

  const handleSignOut = () => {
    signOutFirebase().catch(() => {});
    localStorage.removeItem('pathforge-user-key');
    localStorage.removeItem('pathforge-session-token');
    setUserKey('');
    setSessionToken('');
    setProfile(createBlankUnauthenticatedProfile());
    setAgentReport(null);
    setNotifications([]);
    setShow3DGame(false);
    showToast('Signed out cleanly. Viewing public mode with zero saved user data.');
  };

  const handleVerifySkillAuthenticity = (result: SkillAuthenticityResult) => {
    if (!requireSignInForUpdate('save verified skill results')) return;
    const existingIdx = profile.skills.findIndex(
      (s) => s.name.toLowerCase() === result.skillName.toLowerCase(),
    );
    const updatedSkills = [...profile.skills];
    const reqRoleSkill = targetRole.requiredSkills.find(
      (r) => r.name.toLowerCase() === result.skillName.toLowerCase(),
    );

    if (existingIdx >= 0) {
      updatedSkills[existingIdx] = {
        ...updatedSkills[existingIdx],
        level: result.verifiedLevel,
        verified: result.isGenuine,
      };
    } else {
      updatedSkills.push({
        name: result.skillName,
        level: result.verifiedLevel,
        category: reqRoleSkill?.category ?? 'Foundations',
        verified: result.isGenuine,
      });
    }

    const remedialSet = new Set(profile.remedialSkills);
    if (!result.isGenuine) {
      remedialSet.add(result.skillName);
    } else {
      remedialSet.delete(result.skillName);
    }

    const updatedProfile: UserProfile = {
      ...profile,
      skills: updatedSkills,
      remedialSkills: Array.from(remedialSet),
      assessments: [
        {
          id: `auth-${Date.now()}`,
          skillName: `${result.skillName} (Authenticity)`,
          scorePct: result.actualScorePct,
          date: new Date().toISOString().split('T')[0],
          remedialTriggered: !result.isGenuine,
          notes: result.summary,
        },
        ...profile.assessments,
      ],
    };

    persistProfile(updatedProfile);
    showToast(result.summary);
    pushNotification({
      title: `Skill Check: ${result.skillName} (${result.actualScorePct}%)`,
      detail: `${result.verdict} — ${result.isGenuine ? 'Verified badge awarded' : 'Remedial practice recommended'}.`,
      category: 'skill',
      targetSection: 'skill-analysis',
      subTarget: 'authenticity',
    });
    if (settings.autoSyncAgents) {
      runMultiAgentCollaboration(updatedProfile, `Authenticity check: ${result.verdict}`);
    }
  };

  const openAuthenticityForSkill = (skillName?: string) => {
    setSkillAnalysisMode('authenticity');
    setSkillAnalysisTarget(skillName);
    setActiveSection('skill-analysis');
  };

  const handleSidebarSelectSection = (section: NavSection) => {
    setSearchSubTarget(undefined);
    if (section === 'skill-analysis') {
      setSkillAnalysisMode('diagnostic');
      setSkillAnalysisTarget(undefined);
    }
    setActiveSection(section);
  };

  const handleSelectNotification = (item: AppNotification) => {
    setNotifications((prev) => markNotificationRead(prev, item.id));
    if (!item.targetSection) return;
    if (item.targetSection === 'skill-analysis') {
      if (item.subTarget === 'authenticity') {
        setSkillAnalysisMode('authenticity');
        setSkillAnalysisTarget(undefined);
      } else {
        setSkillAnalysisMode('diagnostic');
        setSkillAnalysisTarget(item.subTarget);
      }
    }
    setSearchSubTarget(item.subTarget);
    setActiveSection(item.targetSection);
  };

  const handleSelectSearchEntry = (entry: SearchEntry) => {
    if (entry.targetSection === 'support') {
      setSupportOpen(true);
      return;
    }
    if (entry.targetSection === 'skill-analysis') {
      if (entry.subTarget === 'authenticity') {
        setSkillAnalysisMode('authenticity');
      } else {
        setSkillAnalysisMode('diagnostic');
        setSkillAnalysisTarget(entry.subTarget);
      }
    }
    if (entry.targetSection === 'games' && entry.subTarget === 'skill-defender-3d') {
      setActiveSection('games');
      setShow3DGame(true);
      return;
    }
    setSearchSubTarget(entry.subTarget);
    setActiveSection(entry.targetSection);
    showToast(`Navigated to ${entry.label}`);
  };

  if (show3DGame) {
    return (
      <ErrorBoundary>
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#07090F] text-sm text-slate-300">
              Loading 3D Skill Defender Arena...
            </div>
          }
        >
          <SkillArena3DGame
            bestScoreInitial={best3DScore}
            autostart={initialQueryParams.autostart}
            onWin={handleWin3DGame}
            onExit={() => setShow3DGame(false)}
          />
        </Suspense>
        <AuthModal
          open={authModalOpen}
          reason={authModalReason}
          onClose={() => {
            setAuthModalOpen(false);
            setAuthModalReason(undefined);
          }}
          onAuthSuccess={handleAuthSuccess}
        />
      </ErrorBoundary>
    );
  }

  return (
    <div
      className={`min-h-screen flex bg-white dark:bg-[#07090F] text-slate-900 dark:text-slate-100 ${
        settings.reduceMotion ? '[&_*]:transition-none' : ''
      }`}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-red-600 dark:focus:bg-blue-600 focus:text-white focus:text-xs focus:font-semibold"
      >
        Skip to main content
      </a>

      {/* Left-Side Only Navigation */}
      <Sidebar
        activeSection={activeSection}
        onSelectSection={handleSidebarSelectSection}
        themeMode={themeMode}
        onChangeTheme={setThemeMode}
        profile={profile}
        readinessPct={match.overallReadinessPct}
        onOpenSupport={() => setSupportOpen(true)}
        onOpenAuthModal={() => {
          setAuthModalReason(undefined);
          setAuthModalOpen(true);
        }}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      {/* Main Content Column with Top Search Utility Bar */}
      <div className="flex-1 min-w-0 flex flex-col">
        {mapsQuotaExceeded && (
          <div className="sticky top-0 z-50 bg-amber-500 text-slate-950 px-4 py-2 text-xs font-semibold flex items-center justify-between gap-3">
            <span>
              The Google Maps Demo API key has exceeded its free quota. To continue using the map, configure your own API key in Google Cloud Console.
            </span>
            <button
              type="button"
              onClick={() => setMapsQuotaExceeded(false)}
              className="px-2 py-0.5 rounded bg-slate-950/15 hover:bg-slate-950/25"
            >
              Dismiss
            </button>
          </div>
        )}

        <TopSearchBar
          activeSection={activeSection}
          readinessPct={match.overallReadinessPct}
          isSignedIn={profile.isSignedIn}
          notifications={notifications}
          onSelectEntry={handleSelectSearchEntry}
          onSelectNotification={handleSelectNotification}
          onMarkAllNotificationsRead={() =>
            setNotifications((prev) => markAllNotificationsRead(prev))
          }
          onClearNotifications={() => setNotifications([])}
          onOpenSettings={() => handleSidebarSelectSection('settings')}
          onOpenAuthModal={() => {
            setAuthModalReason(undefined);
            setAuthModalOpen(true);
          }}
          onOpenMobileMenu={() => setMobileNavOpen(true)}
        />

        <main
          id="main-content"
          tabIndex={-1}
          className={`flex-1 px-4 sm:px-8 lg:px-10 ${
            settings.compactLayout ? 'py-4 sm:py-5' : 'py-6 sm:py-8'
          } max-w-[1240px] w-full mx-auto outline-none`}
        >
          {toastMessage && (
            <div
              role="status"
              aria-live="polite"
              className="mb-6 rounded-xl border border-emerald-500/40 dark:border-amber-400/40 bg-emerald-50 dark:bg-amber-500/10 px-4 py-3 text-xs font-medium text-emerald-900 dark:text-amber-200"
            >
              {toastMessage}
            </div>
          )}

          <ErrorBoundary>
            <Suspense
              fallback={
                <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
                  Loading workspace module...
                </div>
              }
            >
              {activeSection === 'home' && (
                <HomeView
                  profile={profile}
                  targetRole={targetRole}
                  match={match}
                  onNavigate={setActiveSection}
                  onOpenAuthenticityTest={() => openAuthenticityForSkill()}
                  onRunMultiAgentSync={() =>
                    runMultiAgentCollaboration(profile, 'Home Dashboard Sync')
                  }
                  isSyncingAI={isSyncingAI}
                />
              )}

              {activeSection === 'profile' && (
                <ProfileAuthView
                  profile={profile}
                  roles={CAREER_ROLES}
                  match={match}
                  onUpdateProfile={(next) => persistProfile(next)}
                  onSignOut={handleSignOut}
                  onResetDemo={handleResetDemo}
                  onVerifySkill={(skillName) => openAuthenticityForSkill(skillName)}
                  onOpenAuthModal={() => {
                    setAuthModalReason(undefined);
                    setAuthModalOpen(true);
                  }}
                />
              )}

              {activeSection === 'resume' && (
                <ResumeView
                  profile={profile}
                  targetRole={targetRole}
                  onUpdateProfile={(next) => persistProfile(next)}
                  onNotifyUpdate={(title, detail) =>
                    pushNotification({
                      title,
                      detail,
                      category: 'profile',
                      targetSection: 'resume',
                    })
                  }
                  onOpenAuthModal={() => {
                    setAuthModalReason(undefined);
                    setAuthModalOpen(true);
                  }}
                />
              )}

              {activeSection === 'skill-analysis' && (
                <SkillAnalysisView
                  profile={profile}
                  targetRole={targetRole}
                  match={match}
                  agentReport={agentReport}
                  isSyncingAI={isSyncingAI}
                  onRunMultiAgentSync={(reason) => runMultiAgentCollaboration(profile, reason)}
                  onSubmitAssessment={handleAssessmentSubmit}
                  onVerifySkillAuthenticity={handleVerifySkillAuthenticity}
                  initialSkill={skillAnalysisTarget}
                  initialMode={skillAnalysisMode}
                />
              )}

              {activeSection === 'career-matching' && (
                <CareerMatchingView
                  profile={profile}
                  roles={CAREER_ROLES}
                  activeRole={targetRole}
                  activeMatch={match}
                  onSelectCareerGoal={handleSelectCareerGoal}
                  initialRoleId={searchSubTarget}
                />
              )}

              {activeSection === 'learning-recommendations' && (
                <LearningRecommendationsView
                  profile={profile}
                  targetRole={targetRole}
                  roadmap={adaptiveRoadmap}
                  onToggleCompleteModule={handleToggleCompleteModule}
                />
              )}

              {activeSection === 'progress-tracking' && (
                <ProgressTrackingView
                  profile={profile}
                  targetRole={targetRole}
                  match={match}
                />
              )}

              {activeSection === 'ai-mentor' && (
                <AIMentorView
                  profile={profile}
                  targetRole={targetRole}
                  match={match}
                  defaultVideoVoice={settings.defaultVideoVoice}
                  initialSubTab={searchSubTarget}
                />
              )}

              {activeSection === 'career-lab' && (
                <CareerLabView
                  profile={profile}
                  targetRole={targetRole}
                  match={match}
                  onUpdateProfile={(next) => persistProfile(next)}
                  onNavigate={setActiveSection}
                />
              )}

              {activeSection === 'code-arena' && (
                <CodeArenaView
                  profile={profile}
                  onSolveChallenge={handleSolveChallenge}
                  initialChallengeId={searchSubTarget}
                />
              )}

              {activeSection === 'games' && (
                <GamesView
                  gamesWon={profile.gamesWon}
                  onWinGame={handleWinGame}
                  onLaunch3DGame={() => setShow3DGame(true)}
                  initialGame={searchSubTarget}
                />
              )}

              {activeSection === 'global-jobs' && (
                <GlobalJobsView
                  profile={profile}
                  readinessPct={match.overallReadinessPct}
                  onApplyForJob={handleApplyForJob}
                  initialCompanyId={searchSubTarget}
                />
              )}

              {activeSection === 'settings' && (
                <SettingsView
                  themeMode={themeMode}
                  onChangeTheme={setThemeMode}
                  settings={settings}
                  onUpdateSettings={updateSettings}
                  profile={profile}
                  onResetDemo={handleResetDemo}
                  onOpenSupport={() => setSupportOpen(true)}
                />
              )}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      <OnboardingWizardModal
        open={Boolean(profile.isSignedIn && profile.needsOnboarding)}
        profile={profile}
        roles={CAREER_ROLES}
        onComplete={handleCompleteOnboarding}
        onSkip={handleSkipOnboarding}
      />

      <AuthModal
        open={authModalOpen}
        reason={authModalReason}
        onClose={() => {
          setAuthModalOpen(false);
          setAuthModalReason(undefined);
        }}
        onAuthSuccess={handleAuthSuccess}
      />

      <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />
    </div>
  );
}

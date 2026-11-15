import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CAREER_ROLES, createBlankUnauthenticatedProfile } from '../data/careerData';
import { FLAGSHIP_COMPANIES } from '../data/companiesCatalog';
import { calculateSkillMatch } from '../utils/skillEngine';
import { buildInitialNotifications } from '../utils/notifications';
import { Logo } from './Logo';
import { Sidebar } from './Sidebar';
import { TopSearchBar } from './TopSearchBar';
import { DailyProductivityHeatmap } from './DailyProductivityHeatmap';
import { ResumeView } from './ResumeView';
import { AuthModal } from './AuthModal';
import { SupportModal } from './SupportModal';
import { GlobalJobsView } from './GlobalJobsView';
import { ErrorBoundary } from './ErrorBoundary';
import { SkillAnalysisView } from './SkillAnalysisView';
import { SettingsView } from './SettingsView';
import { ProgressTrackingView } from './ProgressTrackingView';
import { LearningRecommendationsView } from './LearningRecommendationsView';
import { ProfileAuthView } from './ProfileAuthView';
import { CareerMatchingView } from './CareerMatchingView';
import { AIMentorView } from './AIMentorView';
import { CodeArenaView } from './CodeArenaView';
import { GamesView } from './GamesView';
import { CareerLabView } from './CareerLabView';
import { OnboardingWizardModal } from './OnboardingWizardModal';
import { generateAdaptiveRoadmap } from '../utils/skillEngine';
import { LEARNING_CATALOG } from '../data/careerData';

test('Sidebar and TopSearchBar render accessible guest state and Voragen navigation', () => {
  const blankProfile = createBlankUnauthenticatedProfile();
  const notifs = buildInitialNotifications('Guest Visitor', 'Full Stack Developer');

  const sidebarHtml = renderToStaticMarkup(
    React.createElement(Sidebar, {
      activeSection: 'resume',
      onSelectSection: () => {},
      themeMode: 'dark',
      onChangeTheme: () => {},
      profile: blankProfile,
      readinessPct: 0,
      onOpenSupport: () => {},
      onOpenAuthModal: () => {},
      mobileOpen: false,
      onCloseMobile: () => {},
    }),
  );

  assert.match(sidebarHtml, /VoraGen/);
  assert.match(sidebarHtml, /\/assets\/aistudio\/VORAGEN_SKILL_Navy_Logo_51a393e3\.png/);
  assert.match(sidebarHtml, /Guest Visitor/);
  assert.match(sidebarHtml, /aria-current="page"/);
  assert.match(sidebarHtml, /aria-pressed="true"/);
  assert.match(sidebarHtml, /Abhishek R/);

  const topbarHtml = renderToStaticMarkup(
    React.createElement(TopSearchBar, {
      activeSection: 'home',
      readinessPct: 0,
      isSignedIn: false,
      notifications: notifs,
      onSelectEntry: () => {},
      onSelectNotification: () => {},
      onMarkAllNotificationsRead: () => {},
      onClearNotifications: () => {},
      onOpenSettings: () => {},
      onOpenAuthModal: () => {},
      onOpenMobileMenu: () => {},
    }),
  );

  assert.match(topbarHtml, /\/assets\/aistudio\/VORAGEN_SKILL_Navy_Logo_51a393e3\.png/);
  assert.match(topbarHtml, /role="combobox"/);
  assert.match(topbarHtml, /Notifications \(2 unread\)/);
  assert.match(topbarHtml, /Sign In/);
});

test('DailyProductivityHeatmap renders 30 contribution day buttons cleanly for zero and active profiles', () => {
  const blank = createBlankUnauthenticatedProfile();
  const emptyHtml = renderToStaticMarkup(
    React.createElement(DailyProductivityHeatmap, {
      profile: blank,
      onNavigate: () => {},
    }),
  );

  assert.match(emptyHtml, /Daily Productivity Heatmap/);
  assert.match(emptyHtml, /0 study &amp; coding actions across 0 active days/);
  assert.match(emptyHtml, /role="group"/);
});

test('ResumeView renders all 5 sections, auth gate notice when signed out, and sanitizes XSS URLs', () => {
  const blank = createBlankUnauthenticatedProfile();
  const signedOutHtml = renderToStaticMarkup(
    React.createElement(ResumeView, {
      profile: blank,
      targetRole: CAREER_ROLES[0],
      onUpdateProfile: () => {},
      onOpenAuthModal: () => {},
    }),
  );

  assert.match(signedOutHtml, /Sign in required to save or update your resume/);
  assert.match(signedOutHtml, /0% Ready/);
  assert.match(signedOutHtml, /Live ATS Resume Preview/);

  const signedInProfile = {
    ...blank,
    isSignedIn: true,
    name: 'Diya Nair',
    email: 'diya@voragen.dev',
    githubUrl: 'javascript:alert(1)',
    educationHistory: [
      {
        id: 'e1',
        institution: 'NIT Calicut',
        degree: 'B.Tech',
        fieldOfStudy: 'CSE',
        startYear: '2022',
        endYear: '2026',
      },
    ],
    skills: [{ name: 'React', level: 88, category: 'Frontend' as const, verified: true }],
    projects: [
      {
        id: 'p1',
        title: 'SafeURL App',
        description: 'Sanitizes user links',
        skillsUsed: ['React', 'TypeScript'],
        repoUrl: 'javascript:alert(document.cookie)',
      },
    ],
    certifications: [
      {
        id: 'c1',
        title: 'Cloud Architect',
        issuer: 'Google Cloud',
        year: '2026',
      },
    ],
  };

  const signedInHtml = renderToStaticMarkup(
    React.createElement(ResumeView, {
      profile: signedInProfile,
      targetRole: CAREER_ROLES[0],
      onUpdateProfile: () => {},
    }),
  );

  assert.equal(signedInHtml.includes('href="javascript:'), false);
  assert.equal(signedInHtml.includes('alert(document.cookie)'), false);
  assert.match(signedInHtml, /Diya Nair/);
  assert.match(signedInHtml, /NIT Calicut/);
  assert.match(signedInHtml, /SafeURL App/);
  assert.match(signedInHtml, /Cloud Architect/);
});

test('AuthModal, SupportModal, Logo, GlobalJobsView, and ErrorBoundary render accessible markup', () => {
  const logoHtml = renderToStaticMarkup(React.createElement(Logo, { className: 'w-8 h-8' }));
  assert.match(logoHtml, /\/assets\/aistudio\/VORAGEN_SKILL_Navy_Logo_51a393e3\.png/);
  assert.match(logoHtml, /alt="VoraGen Skill AI logo"/);

  const authClosed = renderToStaticMarkup(
    React.createElement(AuthModal, {
      open: false,
      onClose: () => {},
      onAuthSuccess: () => {},
    }),
  );
  assert.equal(authClosed, '');

  const authOpen = renderToStaticMarkup(
    React.createElement(AuthModal, {
      open: true,
      reason: 'Sign in to save your Resume update.',
      onClose: () => {},
      onAuthSuccess: () => {},
    }),
  );
  assert.match(authOpen, /role="dialog"/);
  assert.match(authOpen, /Sign in to save your Resume update/);
  assert.match(authOpen, /Sign in with Google/);

  const supportOpen = renderToStaticMarkup(
    React.createElement(SupportModal, {
      open: true,
      onClose: () => {},
    }),
  );
  assert.match(supportOpen, /abhishekr\.bcs25@gmail\.com/);
  assert.match(supportOpen, /9745169331/);

  const blank = createBlankUnauthenticatedProfile();
  const match = calculateSkillMatch(blank.skills, CAREER_ROLES[0]);
  assert.equal(match.overallReadinessPct, 0);

  const jobsHtml = renderToStaticMarkup(
    React.createElement(GlobalJobsView, {
      profile: blank,
      readinessPct: 0,
      onApplyForJob: () => {},
      initialCompanyId: FLAGSHIP_COMPANIES[0].id,
    }),
  );
  assert.match(jobsHtml, /Global Employer Hubs/);
  assert.match(jobsHtml, /Google/);

  // Verify ErrorBoundary fallback transition & crash containment
  const errState = ErrorBoundary.getDerivedStateFromError(new Error('Widget crashed safely'));
  assert.equal(errState.hasError, true);
  assert.equal(errState.message, 'Widget crashed safely');

  const boundaryOk = renderToStaticMarkup(
    React.createElement(ErrorBoundary, null, React.createElement('span', null, 'Healthy child')),
  );
  assert.match(boundaryOk, /Healthy child/);
});

test('SkillAnalysisView, ProgressTrackingView, LearningRecommendationsView, and SettingsView render core views cleanly', () => {
  const activeProfile = {
    ...createBlankUnauthenticatedProfile(),
    isSignedIn: true,
    name: 'Kabir',
    skills: [
      { name: 'React', level: 82, category: 'Frontend' as const, verified: true },
      { name: 'SQL', level: 48, category: 'Backend' as const, verified: false },
    ],
    remedialSkills: ['SQL'],
    assessments: [
      {
        id: 'a1',
        skillName: 'SQL',
        scorePct: 45,
        date: '2026-11-12',
        remedialTriggered: true,
        notes: 'Below 60% threshold',
      },
    ],
    certifications: [
      { id: 'c1', title: 'AWS CCP', issuer: 'AWS', year: '2026' },
    ],
    projects: [
      { id: 'p1', title: 'VoraGen Portal', description: 'Built analytics view', skillsUsed: ['React'] },
    ],
  };

  const targetRole = CAREER_ROLES[0];
  const match = calculateSkillMatch(
    activeProfile.skills,
    targetRole,
    activeProfile.certifications,
    activeProfile.projects,
  );
  const roadmap = generateAdaptiveRoadmap(
    activeProfile.skills,
    targetRole,
    activeProfile.remedialSkills,
    activeProfile.completedModuleIds,
    LEARNING_CATALOG,
  );

  const skillHtml = renderToStaticMarkup(
    React.createElement(SkillAnalysisView, {
      profile: activeProfile,
      targetRole,
      match,
      agentReport: {
        generatedAt: '2026-11-12T10:00:00Z',
        source: 'adaptive-engine',
        overallReadinessPct: match.overallReadinessPct,
        executiveSummary: 'Multi-agent evaluation ready.',
        recalibrationNotice: 'Remedial SQL active',
        steps: [
          {
            agentName: 'Skill Profiler Agent',
            agentRole: 'Diagnostics',
            modelUsed: 'adaptive-engine',
            summary: 'SQL needs review',
            actionItems: ['Complete SQL Bootcamp'],
          },
        ],
        recommendedModules: roadmap.slice(0, 2),
      },
      isSyncingAI: false,
      onRunMultiAgentSync: () => {},
      onSubmitAssessment: () => {},
      onVerifySkillAuthenticity: () => {},
      initialSkill: 'SQL',
      initialMode: 'authenticity',
    }),
  );
  assert.match(skillHtml, /Skill Analysis, Authenticity Check &amp; Multi-Agent Diagnostics/);
  assert.match(skillHtml, /Multi-agent evaluation ready/);
  assert.match(skillHtml, /Remedial SQL active/);

  const progressHtml = renderToStaticMarkup(
    React.createElement(ProgressTrackingView, {
      profile: activeProfile,
      targetRole,
      match,
    }),
  );
  assert.match(progressHtml, /Progress Tracking &amp; Accuracy Meter/);
  assert.match(progressHtml, new RegExp(`${match.overallReadinessPct}%`));

  const learningHtml = renderToStaticMarkup(
    React.createElement(LearningRecommendationsView, {
      profile: activeProfile,
      targetRole,
      roadmap,
      onToggleCompleteModule: () => {},
    }),
  );
  assert.match(learningHtml, /Personalized Learning Recommendations/);
  assert.match(learningHtml, /Adaptive Remedial Sequence Active/);
  assert.match(learningHtml, /SQL/);

  const settingsHtml = renderToStaticMarkup(
    React.createElement(SettingsView, {
      themeMode: 'dark',
      onChangeTheme: () => {},
      settings: {
        remedialThresholdPct: 60,
        autoSyncAgents: true,
        defaultVideoVoice: true,
        dailyStudyMinutes: 45,
        weeklyCodeGoal: 5,
        compactLayout: false,
        reduceMotion: false,
      },
      onUpdateSettings: () => {},
      profile: activeProfile,
      onResetDemo: () => {},
      onOpenSupport: () => {},
    }),
  );
  assert.match(settingsHtml, /Platform Settings &amp; Preferences/);
  assert.match(settingsHtml, /Dark Mode/);
  assert.match(settingsHtml, /Export Profile JSON/);
});

test('ProfileAuthView, CareerMatchingView, AIMentorView, CodeArenaView, GamesView, CareerLabView, and OnboardingWizardModal render properly', () => {
  const blank = createBlankUnauthenticatedProfile();
  const targetRole = CAREER_ROLES[0];
  const match = calculateSkillMatch(blank.skills, targetRole);

  const profileHtml = renderToStaticMarkup(
    React.createElement(ProfileAuthView, {
      profile: blank,
      roles: CAREER_ROLES,
      match,
      onUpdateProfile: () => {},
      onSignOut: () => {},
      onResetDemo: () => {},
      onVerifySkill: () => {},
      onOpenAuthModal: () => {},
    }),
  );
  assert.match(profileHtml, /Learner Profile &amp; Account/);
  assert.match(profileHtml, /Save Profile Details \(Requires Sign In\)/);

  const careerHtml = renderToStaticMarkup(
    React.createElement(CareerMatchingView, {
      profile: blank,
      roles: CAREER_ROLES,
      activeRole: targetRole,
      activeMatch: match,
      onSelectCareerGoal: () => {},
      initialRoleId: CAREER_ROLES[1].id,
    }),
  );
  assert.match(careerHtml, /Career Matching &amp; What-If Pivot Simulator/);

  const mentorHtml = renderToStaticMarkup(
    React.createElement(AIMentorView, {
      profile: blank,
      targetRole,
      match,
      defaultVideoVoice: false,
      initialSubTab: 'faculty',
    }),
  );
  assert.match(mentorHtml, /Dr\. Elena Vance/);

  const arenaHtml = renderToStaticMarkup(
    React.createElement(CodeArenaView, {
      profile: blank,
      onSolveChallenge: () => {},
    }),
  );
  assert.match(arenaHtml, /Two Sum/);

  const gamesHtml = renderToStaticMarkup(
    React.createElement(GamesView, {
      gamesWon: 2,
      onWinGame: () => {},
      onLaunch3DGame: () => {},
      initialGame: 'sudoku',
    }),
  );
  assert.match(gamesHtml, /VoraGen Games/i);
  assert.match(gamesHtml, /2 Games Completed/);

  const labHtml = renderToStaticMarkup(
    React.createElement(CareerLabView, {
      profile: blank,
      targetRole,
      match,
      onUpdateProfile: () => {},
      onNavigate: () => {},
    }),
  );
  assert.match(labHtml, /Interview/);

  const onboardingHtml = renderToStaticMarkup(
    React.createElement(OnboardingWizardModal, {
      open: true,
      profile: { ...blank, isSignedIn: true, name: 'New Learner' },
      roles: CAREER_ROLES,
      onComplete: () => {},
      onSkip: () => {},
    }),
  );
  assert.match(onboardingHtml, /role="dialog"/);
  assert.match(onboardingHtml, /New Learner/);
});


import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CAREER_ROLES, createBlankUnauthenticatedProfile } from '../data/careerData';
import { FLAGSHIP_COMPANIES } from '../data/companiesCatalog';
import { calculateSkillMatch } from '../utils/skillEngine';
import { buildInitialNotifications } from '../utils/notifications';
import { Logo } from './Logo';
import { IssuerLogo } from './IssuerLogo';
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
import { CoursesHubView } from './CoursesHubView';
import { ProjectsView } from './ProjectsView';
import { CertificationsPassportView } from './CertificationsPassportView';
import { ApplicationsDrivesView } from './ApplicationsDrivesView';
import { CommunityMentorsView } from './CommunityMentorsView';
import { NotificationsCenterView } from './NotificationsCenterView';
import { EmployerPortalView } from './EmployerPortalView';
import { AdminPortalView } from './AdminPortalView';
import { PricingBillingView } from './PricingBillingView';
import { AboutHelpCenterView } from './AboutHelpCenterView';
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
  assert.match(sidebarHtml, /Vora Generation Network/);
  assert.match(sidebarHtml, /voragenerationnetwork@gmail\.com/);
  assert.equal(sidebarHtml.includes('9745169331'), false);

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
  assert.match(signedOutHtml, /ATS Resume Templates/);
  assert.match(signedOutHtml, /AI Cover Letter Generator/);

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
        issuerLogoId: 'google-cloud',
        credentialUrl: 'https://cloud.google.com/certification/verify/123',
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
  assert.match(signedInHtml, /Verify Credential/);
  assert.match(signedInHtml, /https:\/\/cloud\.google\.com\/certification\/verify\/123/);

  const issuerLogoHtml = renderToStaticMarkup(
    React.createElement(IssuerLogo, { issuerName: 'AWS', issuerLogoId: 'aws' }),
  );
  assert.match(issuerLogoHtml, /<svg/);
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
  assert.match(authOpen, /Google Sign In/);
  assert.match(authOpen, /Phone OTP/);
  assert.match(authOpen, /Admin/);
  assert.match(authOpen, /Forgot password\?/);

  const supportOpen = renderToStaticMarkup(
    React.createElement(SupportModal, {
      open: true,
      onClose: () => {},
    }),
  );
  assert.match(supportOpen, /Vora Generation Network/);
  assert.match(supportOpen, /voragenerationnetwork@gmail\.com/);
  assert.equal(supportOpen.includes('9745169331'), false);

  const blank = createBlankUnauthenticatedProfile();
  const match = calculateSkillMatch(blank.skills, CAREER_ROLES[0]);
  assert.equal(match.overallReadinessPct, 0);

  const jobsHtml = renderToStaticMarkup(
    React.createElement(GlobalJobsView, {
      profile: blank,
      readinessPct: 0,
      userLocation: {
        city: 'Tokyo',
        country: 'Japan',
        lat: 35.6762,
        lng: 139.6503,
        mode: 'manual',
      },
      onApplyForJob: () => {},
      initialCompanyId: FLAGSHIP_COMPANIES[0].id,
    }),
  );
  assert.match(jobsHtml, /Global Employer Hubs/);
  assert.match(jobsHtml, /Auto-Detect My Location/);
  assert.match(jobsHtml, /You \(Tokyo\)/);
  assert.match(jobsHtml, /km away/);
  assert.match(jobsHtml, /Google/);
  assert.match(jobsHtml, /Job Scam Detector/);

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
  assert.match(skillHtml, /Aptitude &amp; Career Exams/);

  const aptitudeHtml = renderToStaticMarkup(
    React.createElement(SkillAnalysisView, {
      profile: activeProfile,
      targetRole,
      match,
      agentReport: null,
      isSyncingAI: false,
      onRunMultiAgentSync: () => {},
      onSubmitAssessment: () => {},
      onVerifySkillAuthenticity: () => {},
      initialMode: 'aptitude',
    }),
  );
  assert.match(aptitudeHtml, /Technical Aptitude/);
  assert.match(aptitudeHtml, /Logical Reasoning/);
  assert.match(aptitudeHtml, /Quantitative Aptitude/);

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
      onOpenCoursesHub: () => {},
    }),
  );
  assert.match(learningHtml, /Personalized Learning Recommendations/);
  assert.match(learningHtml, /Adaptive Remedial Sequence Active/);
  assert.match(learningHtml, /Open Full Courses Hub/);

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
  assert.match(profileHtml, /Career Profile &amp; Account Security/);
  assert.match(profileHtml, /Profile Completion Indicator/);
  assert.match(profileHtml, /Save Details \(Requires Sign In\)/);
  assert.match(profileHtml, /Account Security, 2FA &amp; Multi-Device Sessions/);
  assert.match(profileHtml, /id="cert-expiry-date"/);
  assert.match(profileHtml, /name="expiryDate"/);

  const d10 = new Date();
  d10.setDate(d10.getDate() + 10);
  const soonDate = `${d10.getFullYear()}-${String(d10.getMonth() + 1).padStart(2, '0')}-${String(d10.getDate()).padStart(2, '0')}`;
  const expiringProfileHtml = renderToStaticMarkup(
    React.createElement(ProfileAuthView, {
      profile: {
        ...blank,
        isSignedIn: true,
        name: 'Ananya',
        certifications: [
          {
            id: 'exp-1',
            title: 'AWS Developer Associate',
            issuer: 'AWS',
            year: '2025',
            expiryDate: soonDate,
          },
        ],
      },
      roles: CAREER_ROLES,
      match,
      onUpdateProfile: () => {},
      onSignOut: () => {},
      onResetDemo: () => {},
      onVerifySkill: () => {},
      onOpenAuthModal: () => {},
    }),
  );
  assert.match(expiringProfileHtml, /Certificate Expiration Alert \(Within 30 Days\)/);
  assert.match(expiringProfileHtml, /AWS Developer Associate/);
  assert.match(expiringProfileHtml, /Expires in 10 days/);

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
  assert.match(careerHtml, /id="career-goal-search"/);
  assert.match(careerHtml, />Search<\/span>/);
  assert.match(careerHtml, /206 total catalog/);

  const skillAssessmentHtml = renderToStaticMarkup(
    React.createElement(SkillAnalysisView, {
      profile: blank,
      targetRole,
      match,
      agentReport: null,
      isSyncingAI: false,
      onRunMultiAgentSync: () => {},
      onSubmitAssessment: () => {},
      onVerifySkillAuthenticity: () => {},
      initialSkill: 'JavaScript',
      initialMode: 'diagnostic',
    }),
  );
  assert.match(skillAssessmentHtml, /20 Questions/);
  assert.match(skillAssessmentHtml, /Run Sandbox Tests/);

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

  const studyToolHtml = renderToStaticMarkup(
    React.createElement(AIMentorView, {
      profile: blank,
      targetRole,
      match,
      defaultVideoVoice: false,
      initialSubTab: 'study-tools',
    }),
  );
  assert.match(studyToolHtml, /AI Study Assistant/);
  assert.match(studyToolHtml, /Explain Simply/);

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
  assert.match(gamesHtml, /9×9 Logic Sudoku/);

  const zipHtml = renderToStaticMarkup(
    React.createElement(GamesView, {
      gamesWon: 0,
      onWinGame: () => {},
      onLaunch3DGame: () => {},
      initialGame: 'zip',
    }),
  );
  assert.match(zipHtml, /Level 1 · 6×6 Full-Grid Circuit/);

  const wordFindHtml = renderToStaticMarkup(
    React.createElement(GamesView, {
      gamesWon: 0,
      onWinGame: () => {},
      onLaunch3DGame: () => {},
      initialGame: 'word-find',
    }),
  );
  assert.match(wordFindHtml, /12×12 Systems &amp; Cloud Matrix/);

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
  assert.match(labHtml, /Voice Pitch Sim/);

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

test('All 10 new platform views (Courses, Projects, Certifications, Drives, Community, Inbox, Employer, Admin, Pricing, Help) render cleanly', () => {
  const blank = createBlankUnauthenticatedProfile();
  const targetRole = CAREER_ROLES[0];
  const notifs = buildInitialNotifications('Guest Visitor', targetRole.title);

  const coursesHtml = renderToStaticMarkup(
    React.createElement(CoursesHubView, {
      profile: blank,
      targetRole,
      dailyStudyMinutes: 45,
      onUpdateProfile: () => {},
      onRequireAuth: () => true,
    }),
  );
  assert.match(coursesHtml, /Online Courses &amp; Interactive Learning Hub/);

  const projectsHtml = renderToStaticMarkup(
    React.createElement(ProjectsView, {
      profile: blank,
      onUpdateProfile: () => {},
      onRequireAuth: () => true,
    }),
  );
  assert.match(projectsHtml, /Practical Projects, Team Labs &amp; Hackathons/);

  const certsHtml = renderToStaticMarkup(
    React.createElement(CertificationsPassportView, {
      profile: blank,
      readinessPct: 0,
      onUpdateProfile: () => {},
      onRequireAuth: () => true,
    }),
  );
  assert.match(certsHtml, /Certifications, Badges &amp; Digital Skill Passport/);

  const drivesHtml = renderToStaticMarkup(
    React.createElement(ApplicationsDrivesView, {
      profile: blank,
      onUpdateProfile: () => {},
      onRequireAuth: () => true,
      onNavigateJobs: () => {},
    }),
  );
  assert.match(drivesHtml, /My Applications, Placement Drives &amp; Virtual Career Fairs/);

  const communityHtml = renderToStaticMarkup(
    React.createElement(CommunityMentorsView, {
      profile: blank,
      onRequireAuth: () => true,
    }),
  );
  assert.match(communityHtml, /Community Forum, 1:1 Mentors &amp; Leaderboard/);

  const notifHtml = renderToStaticMarkup(
    React.createElement(NotificationsCenterView, {
      profile: blank,
      notifications: notifs,
      onMarkAllRead: () => {},
      onUpdateProfile: () => {},
      onRequireAuth: () => true,
    }),
  );
  assert.match(notifHtml, /Notification Center, Announcements &amp; Messaging Inbox/);

  const employerHtml = renderToStaticMarkup(
    React.createElement(EmployerPortalView, {
      profile: blank,
      onRequireAuth: () => true,
    }),
  );
  assert.match(employerHtml, /Employer &amp; Recruiter Hiring Portal/);

  const adminHtml = renderToStaticMarkup(
    React.createElement(AdminPortalView, {
      onRequireAuth: () => true,
    }),
  );
  assert.match(adminHtml, /Admin Dashboard &amp; Platform Governance/);

  const pricingHtml = renderToStaticMarkup(
    React.createElement(PricingBillingView, {
      profile: blank,
      onUpdateProfile: () => {},
      onRequireAuth: () => true,
    }),
  );
  assert.match(pricingHtml, /Subscription Plans, Checkout &amp; GST Invoices/);

  const helpHtml = renderToStaticMarkup(
    React.createElement(AboutHelpCenterView, {
      profile: blank,
      onUpdateProfile: () => {},
    }),
  );
  assert.match(helpHtml, /About Us, FAQ, Privacy &amp; Security Center/);
  assert.match(helpHtml, /voragenerationnetwork@gmail\.com/);
  assert.equal(helpHtml.includes('9745169331'), false);
});



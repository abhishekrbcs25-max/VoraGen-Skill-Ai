export type ThemeMode = 'light' | 'dark' | 'system';

export type NavSection =
  | 'home'
  | 'profile'
  | 'resume'
  | 'skill-analysis'
  | 'career-matching'
  | 'learning-recommendations'
  | 'courses'
  | 'progress-tracking'
  | 'ai-mentor'
  | 'projects'
  | 'certifications'
  | 'code-arena'
  | 'games'
  | 'global-jobs'
  | 'applications'
  | 'career-lab'
  | 'community'
  | 'notifications-center'
  | 'employer-portal'
  | 'admin-portal'
  | 'pricing'
  | 'help-center'
  | 'settings';

export interface AppSettings {
  remedialThresholdPct: number;
  autoSyncAgents: boolean;
  defaultVideoVoice: boolean;
  dailyStudyMinutes: number;
  weeklyCodeGoal: number;
  compactLayout: boolean;
  reduceMotion: boolean;
}

export interface UserSkill {
  name: string;
  level: number; // 0 to 100
  category: 'Frontend' | 'Backend' | 'Data & AI' | 'Cloud & DevOps' | 'Security' | 'Foundations';
  verified?: boolean;
}

export interface Certification {
  id: string;
  title: string;
  issuer: string;
  year: string;
  expiryDate?: string;
  credentialId?: string;
  credentialUrl?: string;
  issuerLogoId?: string;
}

export interface UserLocation {
  lat: number;
  lng: number;
  city: string;
  country: string;
  mode: 'auto' | 'manual';
}

export interface AssessmentQuestion {
  id: string;
  skillName: string;
  kind: 'mcq' | 'coding';
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  starterCode?: string;
  testCases?: Array<{ args: unknown[]; expected: unknown }>;
  examples?: Array<{ input: string; output: string }>;
}

export interface ProjectItem {
  id: string;
  title: string;
  description: string;
  skillsUsed: string[];
  repoUrl?: string;
  demoUrl?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  teamMembers?: string[];
  aiReviewScore?: number;
  instructorFeedback?: string;
}

export interface AssessmentRecord {
  id: string;
  skillName: string;
  scorePct: number;
  date: string;
  remedialTriggered: boolean;
  notes: string;
}

export interface LearningModule {
  id: string;
  title: string;
  skillName: string;
  type: 'Course' | 'Tutorial' | 'Practical Exercise' | 'Remedial Bootcamp';
  provider: string;
  durationHours: number;
  priority: 'Critical Gap' | 'Remedial Focus' | 'Core Requirement' | 'Enhancement';
  completed: boolean;
  url: string;
  description: string;
}

export type ApplicationStatus =
  | 'Applied'
  | 'Assessment Pending'
  | 'Interview Ready'
  | 'Shortlisted'
  | 'Interview Scheduled'
  | 'Offer Issued'
  | 'Rejected'
  | 'Withdrawn';

export interface ApplicationRecord {
  id: string;
  companyId: string;
  companyName: string;
  roleTitle: string;
  appliedAt: string;
  matchAtApply: number;
  status: ApplicationStatus;
  resumeVersionTitle?: string;
  coverLetterTitle?: string;
  interviewSlot?: string;
  offerSalary?: string;
}

export type AccountRole = 'student' | 'working-professional' | 'job-seeker' | 'employer' | 'admin';

export type ProfileVisibility = 'public' | 'recruiters' | 'private';

export type WorkModePreference = 'Remote' | 'Hybrid' | 'On-Site' | 'Flexible';

export type EmploymentPreference =
  | 'Full-Time'
  | 'Internship'
  | 'Part-Time'
  | 'Contract'
  | 'Freelance';

export type EducationStatus =
  | 'High School'
  | 'Pursuing Undergraduate'
  | "Graduated (Bachelor's)"
  | 'Pursuing Postgraduate'
  | "Graduated (Master's / PhD)"
  | 'Diploma / Bootcamp'
  | 'Working Professional';

export type LanguageProficiency = 'Basic' | 'Conversational' | 'Fluent' | 'Native';

export interface LanguageEntry {
  id: string;
  language: string;
  proficiency: LanguageProficiency;
}

export interface ExperienceEntry {
  id: string;
  organization: string;
  roleTitle: string;
  startDate: string;
  endDate: string;
  current?: boolean;
  location?: string;
  description: string;
}

export interface AchievementItem {
  id: string;
  title: string;
  issuer: string;
  year: string;
  description?: string;
}

export interface UploadedResumeFile {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  dataUrl?: string;
}

export interface DeviceSessionInfo {
  sessionId: string;
  userKey: string;
  deviceLabel: string;
  browser: string;
  os: string;
  ip: string;
  createdAt: string;
  lastActiveAt: string;
  isCurrent?: boolean;
}

export interface EducationEntry {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startYear: string;
  endYear: string;
  gpaOrScore?: string;
  highlights?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  authProvider: 'guest' | 'google' | 'microsoft' | 'email' | 'phone';
  role?: AccountRole;
  isSignedIn: boolean;
  avatarUrl?: string;
  headline: string;
  education: string;
  phone?: string;
  dateOfBirth?: string;
  location?: string;
  preferredWorkLocation?: string;
  locationCoords?: UserLocation;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  resumeSummary?: string;
  currentEducationStatus?: EducationStatus;
  collegeName?: string;
  graduationYear?: string;
  cgpaOrPercentage?: string;
  educationHistory?: EducationEntry[];
  targetCareerId: string;
  careerGoals: string[];
  skills: UserSkill[];
  nonTechnicalSkills?: string[];
  softSkills?: string[];
  languagesKnown?: LanguageEntry[];
  workExperience?: ExperienceEntry[];
  internshipExperience?: ExperienceEntry[];
  certifications: Certification[];
  projects: ProjectItem[];
  achievements?: AchievementItem[];
  uploadedResume?: UploadedResumeFile;
  careerInterests?: string[];
  preferredJobRoles?: string[];
  expectedSalary?: string;
  employmentPreferences?: EmploymentPreference[];
  workModePreference?: WorkModePreference;
  availabilityNoticePeriod?: string;
  profileVisibility?: ProfileVisibility;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  twoFactorEnabled?: boolean;
  twoFactorMethod?: 'email' | 'phone';
  acceptedTermsAt?: string;
  acceptedPrivacyAt?: string;
  assessments: AssessmentRecord[];
  completedModuleIds: string[];
  remedialSkills: string[];
  streakDays: number;
  streakPoints: number;
  solvedChallengeIds: string[];
  gamesWon: number;
  applications: ApplicationRecord[];
  needsOnboarding?: boolean;
  // Extended platform state (optional for backward compatibility)
  enrolledCourseIds?: string[];
  completedLessonIds?: string[];
  bookmarkedLessonIds?: string[];
  lessonNotes?: Record<string, string>;
  offlineCourseIds?: string[];
  preferredStudyLanguage?: StudyLanguage;
  savedJobIds?: string[];
  jobAlertsEnabled?: boolean;
  registeredDriveIds?: string[];
  registeredFairIds?: string[];
  resumeTemplate?: ResumeTemplateId;
  resumeVersions?: ResumeVersion[];
  coverLetters?: CoverLetterItem[];
  earnedBadgeIds?: string[];
  subscriptionPlan?: SubscriptionPlanId;
  autoRenewSubscription?: boolean;
  referralCode?: string;
  referredUsersCount?: number;
  cookieConsent?: CookiePreferences;
  notificationPrefs?: NotificationChannelPrefs;
  scheduledInterviews?: ScheduledInterviewItem[];
  interviewHistory?: InterviewAttemptRecord[];
  aptitudeHistory?: AptitudeAttemptRecord[];
}

export interface SkillAuthenticityResult {
  skillName: string;
  claimedLevel: number;
  actualScorePct: number;
  verifiedLevel: number;
  isGenuine: boolean;
  verdict: 'Genuine · Verified' | 'Overclaimed · Needs Practice' | 'Underestimated · Upgraded';
  summary: string;
}

export interface InterviewEvaluation {
  scorePct: number;
  strengths: string[];
  improvements: string[];
  modelFeedback: string;
}

export interface RoleSkillRequirement {
  name: string;
  targetLevel: number;
  weight: number; // 1 to 5 importance
  category: UserSkill['category'];
}

export interface CareerRole {
  id: string;
  title: string;
  domain: string;
  salaryRange: string;
  demandGrowth: string;
  summary: string;
  requiredSkills: RoleSkillRequirement[];
}

export interface SkillMatchBreakdown {
  overallReadinessPct: number;
  baseSkillMatchPct: number;
  portfolioBonusPct: number;
  matchedSkills: Array<{
    name: string;
    currentLevel: number;
    targetLevel: number;
    status: 'Mastered' | 'In Progress' | 'Missing';
    gap: number;
  }>;
  missingSkillNames: string[];
  weakSkillNames: string[];
  strongSkillNames: string[];
  estimatedWeeksToReady: number;
}

export interface AgentInsightStep {
  agentName: string;
  agentRole: string;
  modelUsed: string;
  summary: string;
  actionItems: string[];
}

export interface MultiAgentReport {
  generatedAt: string;
  source: 'gemini-4-hydrogen' | 'adaptive-engine';
  overallReadinessPct: number;
  executiveSummary: string;
  recalibrationNotice?: string;
  steps: AgentInsightStep[];
  recommendedModules: LearningModule[];
}

export interface MentorTeacher {
  id: string;
  name: string;
  role: string;
  specialty: string;
  avatarUrl: string;
  bio: string;
  greeting: string;
}

export interface VideoScene {
  sceneNumber: number;
  title: string;
  narration: string;
  visualDiagramTitle: string;
  codeSnippet: string;
  keyTakeaway: string;
  durationSec: number;
}

export interface AIVideoLesson {
  id: string;
  topic: string;
  targetRole: string;
  mentorName: string;
  totalDurationSec: number;
  scenes: VideoScene[];
}

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface CodingChallenge {
  id: string;
  indexNumber: number;
  title: string;
  difficulty: Difficulty;
  points: number;
  topic: string;
  language: 'JavaScript' | 'Python' | 'SQL';
  prompt: string;
  starterCode: string;
  examples: Array<{ input: string; output: string }>;
  testCases: Array<{ args: unknown[]; expected: unknown }>;
  solutionHint: string;
  isProcedural?: boolean;
}

export interface CompanyJob {
  id: string;
  indexNumber: number;
  companyName: string;
  industry: string;
  country: string;
  city: string;
  founded: number;
  employees: string;
  website: string;
  careersUrl: string;
  contactPhone: string;
  contactEmail: string;
  logoPrimary: string;
  logoSecondary: string;
  logoMonogram: string;
  roleTitle: string;
  workMode: 'Remote' | 'Hybrid' | 'On-Site';
  salary: string;
  requiredSkills: string[];
  description: string;
  isFlagship?: boolean;
}

export interface ProductivityDay {
  date: string; // YYYY-MM-DD
  label: string; // e.g., Nov 13
  weekday: number; // 0 (Sun) - 6 (Sat)
  codingDrills: number;
  assessmentsCount: number;
  modulesCount: number;
  applicationsCount: number;
  totalActions: number;
  intensity: 0 | 1 | 2 | 3 | 4;
  inStreak: boolean;
}

export interface ProductivityHeatmapSummary {
  days: ProductivityDay[];
  totalActions: number;
  activeDays: number;
  peakActions: number;
  peakDateLabel: string;
}

export type NotificationCategory = 'ai' | 'skill' | 'code' | 'job' | 'game' | 'profile' | 'cert' | 'system';

export interface AppNotification {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  category: NotificationCategory;
  read: boolean;
  targetSection?: NavSection;
  subTarget?: string;
}

export type StudyLanguage = 'English' | 'Tamil' | 'Malayalam' | 'Hindi' | 'Spanish';

export type ResumeTemplateId = 'classic-executive' | 'modern-technical' | 'academic-compact';

export type SubscriptionPlanId = 'free' | 'pro-monthly' | 'pro-yearly' | 'career-bundle';

export interface CookiePreferences {
  essential: true;
  analytics: boolean;
  personalization: boolean;
  updatedAt: string;
}

export interface NotificationChannelPrefs {
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;
  jobAlerts: boolean;
  learningReminders: boolean;
  communityReplies: boolean;
  securityAlerts: boolean;
}

export interface ResumeVersion {
  id: string;
  title: string;
  template: ResumeTemplateId;
  updatedAt: string;
  headline: string;
  summary: string;
  skillsSnapshot: string[];
  atsScore: number;
}

export interface CoverLetterItem {
  id: string;
  title: string;
  companyName: string;
  roleTitle: string;
  tone: 'Formal' | 'Impact-Driven' | 'Fresher Enthusiasm';
  content: string;
  createdAt: string;
}

export interface ScheduledInterviewItem {
  id: string;
  companyName: string;
  roleTitle: string;
  scheduledFor: string;
  mode: 'Video' | 'Phone' | 'On-Site';
  reminderSet: boolean;
}

export interface InterviewAttemptRecord {
  id: string;
  question: string;
  category: 'Technical' | 'HR' | 'Company' | 'DSA' | 'Group Discussion';
  mode: 'text' | 'voice' | 'video-sim';
  scorePct: number;
  confidencePct: number;
  communicationPct: number;
  date: string;
}

export type AptitudeCategory =
  | 'Technical Aptitude'
  | 'Logical Reasoning'
  | 'Quantitative Aptitude'
  | 'Communication'
  | 'Career Aptitude';

export interface AptitudeAttemptRecord {
  id: string;
  category: AptitudeCategory;
  difficulty: Difficulty;
  timedSeconds?: number;
  scorePct: number;
  date: string;
  strengths: string[];
  weaknesses: string[];
}

export interface CourseLesson {
  id: string;
  title: string;
  format: 'Video' | 'Recorded Class' | 'Live Class' | 'Interactive Tutorial' | 'Assignment' | 'Quiz';
  durationMinutes: number;
  liveSchedule?: string;
  summary: string;
  codeExample?: string;
  practicalExercise: string;
  pdfTitle: string;
  ebookChapter: string;
  slidesCount: number;
  externalResourceUrl: string;
  translations: Record<StudyLanguage, string>;
  quizQuestion: {
    prompt: string;
    options: string[];
    correctIndex: number;
  };
}

export interface CourseItem {
  id: string;
  title: string;
  category: string;
  technology: string;
  industry: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  pricing: 'Free' | 'Paid';
  priceUsd: number;
  durationHours: number;
  rating: number;
  reviewsCount: number;
  trending?: boolean;
  popular?: boolean;
  newlyAdded?: boolean;
  prerequisites: string[];
  learningOutcomes: string[];
  instructor: {
    name: string;
    title: string;
    organization: string;
    bio: string;
  };
  expiresInDays?: number;
  syllabus: string[];
  lessons: CourseLesson[];
  reviews: Array<{ author: string; rating: number; comment: string; date: string }>;
}

export interface GuidedProjectTemplate {
  id: string;
  title: string;
  tier: 'Mini Project' | 'Major Project' | 'Real-World Industry';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  domain: string;
  skills: string[];
  durationHours: number;
  brief: string;
  deliverables: string[];
  starterCode: string;
  industryPartner: string;
  certificateTitle: string;
}

export interface HackathonItem {
  id: string;
  title: string;
  organizer: string;
  theme: string;
  prizePool: string;
  deadline: string;
  teamSize: string;
  mode: 'Remote' | 'Hybrid';
}

export interface AchievementBadge {
  id: string;
  title: string;
  category: 'Skill' | 'Course' | 'Project' | 'Milestone';
  criteria: string;
  xpReward: number;
}

export interface PlacementDrive {
  id: string;
  companyName: string;
  driveType: 'Campus Placement' | 'Off-Campus' | 'Walk-In Interview';
  roles: string[];
  minCgpa: number;
  eligibleDegrees: string[];
  date: string;
  location: string;
  packageRange: string;
}

export interface VirtualCareerFair {
  id: string;
  title: string;
  date: string;
  participatingCompanies: string[];
  boothsCount: number;
  focusRegion: string;
  status: 'Upcoming' | 'Live Today';
}

export interface CommunityPost {
  id: string;
  authorName: string;
  authorRole: string;
  category: 'Q&A' | 'Study Group' | 'Project Showcase' | 'Career Advice' | 'Webinar';
  title: string;
  body: string;
  tags: string[];
  votes: number;
  createdAt: string;
  reported?: boolean;
  replies: Array<{
    id: string;
    authorName: string;
    text: string;
    createdAt: string;
  }>;
}

export interface MentorBooking {
  id: string;
  mentorId: string;
  mentorName: string;
  userKey: string;
  userName: string;
  topic: string;
  slot: string;
  status: 'Confirmed' | 'Completed' | 'Cancelled';
  createdAt: string;
}

export interface PlatformMessage {
  id: string;
  senderName: string;
  senderRole: 'Recruiter' | 'Instructor' | 'Learner' | 'Support';
  recipientKey: string;
  subject: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export interface EmployerPostedJob {
  id: string;
  employerKey: string;
  companyName: string;
  roleTitle: string;
  employmentType: 'Full-Time' | 'Internship' | 'Part-Time' | 'Freelance' | 'Government';
  workMode: 'Remote' | 'Hybrid' | 'On-Site';
  location: string;
  salaryRange: string;
  experienceLevel: 'Fresher' | 'Entry-Level' | 'Mid-Level' | 'Senior';
  educationReq: string;
  requiredSkills: string[];
  vacancies: number;
  deadline: string;
  description: string;
  responsibilities: string[];
  benefits: string[];
  status: 'Pending Approval' | 'Approved' | 'Rejected';
  createdAt: string;
}

export interface EmployerApplicantItem {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  candidateName: string;
  candidateEmail: string;
  skills: string[];
  education: string;
  cgpa: string;
  resumeSummary: string;
  matchPct: number;
  status: ApplicationStatus;
  interviewSlot?: string;
  offerLetterText?: string;
  appliedAt: string;
}

export interface ScamReportItem {
  id: string;
  companyName: string;
  jobTitle: string;
  reason: string;
  riskScore: number;
  flags: string[];
  reportedBy: string;
  createdAt: string;
  resolution: 'Open' | 'Verified Legitimate' | 'Flagged & Removed';
}

export interface BillingTransaction {
  id: string;
  invoiceNumber: string;
  userKey: string;
  userName: string;
  userEmail: string;
  planId: SubscriptionPlanId;
  planName: string;
  paymentMethod: 'UPI' | 'Card' | 'NetBanking';
  couponApplied?: string;
  subtotalInr: number;
  discountInr: number;
  gstInr: number;
  totalInr: number;
  status: 'Paid' | 'Failed' | 'Refunded';
  createdAt: string;
}

export interface SecurityAuditEntry {
  id: string;
  userKey: string;
  action: string;
  detail: string;
  ip: string;
  device: string;
  suspicious?: boolean;
  timestamp: string;
}


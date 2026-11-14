export type ThemeMode = 'light' | 'dark' | 'system';

export type NavSection =
  | 'home'
  | 'profile'
  | 'resume'
  | 'skill-analysis'
  | 'career-matching'
  | 'learning-recommendations'
  | 'progress-tracking'
  | 'ai-mentor'
  | 'code-arena'
  | 'games'
  | 'global-jobs'
  | 'career-lab'
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
  credentialId?: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  description: string;
  skillsUsed: string[];
  repoUrl?: string;
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

export interface ApplicationRecord {
  id: string;
  companyId: string;
  companyName: string;
  roleTitle: string;
  appliedAt: string;
  matchAtApply: number;
  status: 'Applied' | 'Assessment Pending' | 'Interview Ready';
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
  authProvider: 'guest' | 'google' | 'microsoft' | 'email';
  isSignedIn: boolean;
  headline: string;
  education: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  resumeSummary?: string;
  educationHistory?: EducationEntry[];
  targetCareerId: string;
  careerGoals: string[];
  skills: UserSkill[];
  certifications: Certification[];
  projects: ProjectItem[];
  assessments: AssessmentRecord[];
  completedModuleIds: string[];
  remedialSkills: string[];
  streakDays: number;
  streakPoints: number;
  solvedChallengeIds: string[];
  gamesWon: number;
  applications: ApplicationRecord[];
  needsOnboarding?: boolean;
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

export type NotificationCategory = 'ai' | 'skill' | 'code' | 'job' | 'game' | 'profile' | 'system';

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

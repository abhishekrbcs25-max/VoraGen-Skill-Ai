import {
  Activity,
  Award,
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  ClipboardList,
  Code2,
  Compass,
  CreditCard,
  FileText,
  FolderGit2,
  Gamepad2,
  GraduationCap,
  HelpCircle,
  Home,
  Info,
  Laptop,
  Mic,
  Moon,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  User,
  Users,
  X,
} from 'lucide-react';
import { calculateProfileCompletion } from '../utils/profileCompletion';
import type { NavSection, ThemeMode, UserProfile } from '../types';
import { Logo } from './Logo';

const ROLE_SHORT_LABELS: Record<NonNullable<UserProfile['role']>, string> = {
  student: 'Student',
  'working-professional': 'Professional',
  'job-seeker': 'Job Seeker',
  employer: 'Employer',
  admin: 'Admin',
};

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  themeMode: ThemeMode;
  onChangeTheme: (mode: ThemeMode) => void;
  profile: UserProfile;
  readinessPct: number;
  onOpenSupport: () => void;
  onOpenAuthModal: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_GROUPS: Array<{
  heading: string;
  items: Array<{ id: NavSection; label: string; icon: typeof Home }>;
}> = [
  {
    heading: 'Overview',
    items: [
      { id: 'home', label: 'Home', icon: Home },
      { id: 'profile', label: 'User Profile', icon: User },
      { id: 'progress-tracking', label: 'Progress Tracking', icon: Compass },
      { id: 'notifications-center', label: 'Inbox & Alerts', icon: Bell },
    ],
  },
  {
    heading: 'Learning & Verification',
    items: [
      { id: 'courses', label: 'Courses Hub', icon: BookOpen },
      { id: 'learning-recommendations', label: 'Learning Roadmap', icon: GraduationCap },
      { id: 'skill-analysis', label: 'Skill & Aptitude', icon: Activity },
      { id: 'ai-mentor', label: 'AI Assistant', icon: Sparkles },
      { id: 'projects', label: 'Projects & Labs', icon: FolderGit2 },
      { id: 'certifications', label: 'Certs & Passport', icon: ShieldCheck },
      { id: 'code-arena', label: 'Code Arena', icon: Code2 },
      { id: 'games', label: 'VoraGen Games', icon: Gamepad2 },
    ],
  },
  {
    heading: 'Careers & Hiring',
    items: [
      { id: 'career-matching', label: 'Career Matching', icon: Target },
      { id: 'global-jobs', label: 'Find Jobs & Fairs', icon: Briefcase },
      { id: 'applications', label: 'My Applications', icon: ClipboardList },
      { id: 'resume', label: 'Resume & Letters', icon: FileText },
      { id: 'career-lab', label: 'Interview Prep', icon: Mic },
    ],
  },
  {
    heading: 'Portals & Governance',
    items: [
      { id: 'community', label: 'Community & Mentors', icon: Users },
      { id: 'employer-portal', label: 'Employer Portal', icon: Building2 },
      { id: 'admin-portal', label: 'Admin Portal', icon: Shield },
      { id: 'pricing', label: 'Pricing & Billing', icon: CreditCard },
      { id: 'help-center', label: 'About & Help Center', icon: Info },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function Sidebar({
  activeSection,
  onSelectSection,
  themeMode,
  onChangeTheme,
  profile,
  readinessPct,
  onOpenSupport,
  onOpenAuthModal,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const completionPct = profile.isSignedIn ? calculateProfileCompletion(profile).percentage : 0;
  const roleLabel = ROLE_SHORT_LABELS[profile.role || 'student'];

  const sidebarBody = (
    <div className="flex h-full flex-col justify-between bg-[#F4F7FB] dark:bg-[#0A1628] border-r border-slate-200 dark:border-[#1E3A5F]/60 px-4 py-5 select-none">
      {/* Top-Left Brand + Primary Left-Side Nav */}
      <div className="space-y-5 overflow-y-auto pr-0.5">
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => {
              onSelectSection('home');
              onCloseMobile();
            }}
            className="flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2545] dark:focus-visible:ring-amber-400 rounded-lg"
          >
            <Logo className="w-10 h-10 shrink-0" />
            <div>
              <span className="font-display text-lg font-bold tracking-tight text-[#0B2545] dark:text-white block leading-none">
                VoraGen
              </span>
              <span className="text-[11px] font-medium text-emerald-700 dark:text-amber-400">
                Adaptive Skill AI
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation drawer"
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-[#0B2545] dark:text-slate-400 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Compact Learner Readiness Summary */}
        <button
          type="button"
          onClick={() => {
            if (profile.isSignedIn) {
              onSelectSection('profile');
            } else {
              onOpenAuthModal();
            }
            onCloseMobile();
          }}
          className="w-full text-left rounded-xl border border-slate-200 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#05070B] p-3 transition-colors hover:border-[#0B2545]/45 dark:hover:border-amber-400/50"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#0B2545] dark:text-slate-100 truncate">
              {profile.isSignedIn ? profile.name : 'Guest Visitor'}
            </span>
            <span className="text-xs font-mono font-semibold tabular-nums text-emerald-700 dark:text-amber-400">
              {readinessPct}%
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {profile.isSignedIn
              ? `${roleLabel} · Profile ${completionPct}%`
              : 'Sign in to update & save'}
          </p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 dark:bg-[#102240] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#0B2545] via-emerald-600 to-amber-500 dark:from-[#1D4ED8] dark:via-emerald-500 dark:to-amber-400 transition-all duration-300"
              style={{ width: `${readinessPct}%` }}
            />
          </div>
        </button>

        {/* Left Navigation Links */}
        <nav aria-label="Main navigation" className="space-y-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.heading} className="space-y-1">
              <p className="px-3 text-[11px] font-semibold tracking-wide text-slate-500 dark:text-slate-400">
                {group.heading}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectSection(item.id);
                      onCloseMobile();
                    }}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-[#0B2545] text-white dark:bg-[#1D4ED8] dark:text-white shadow-sm'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-[#0B2545]/8 dark:hover:bg-white/5 hover:text-[#0B2545] dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Controls: Theme Switcher + Help & Support */}
      <div className="pt-4 mt-4 border-t border-slate-200 dark:border-[#1E3A5F]/60 space-y-3">
        <div>
          <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 px-1">
            Appearance
          </span>
          <div
            role="group"
            aria-label="Theme mode"
            className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-200/75 dark:bg-[#05070B] border border-slate-200 dark:border-[#1E3A5F]/60"
          >
            {(
              [
                { id: 'light', label: 'Light', Icon: Sun },
                { id: 'dark', label: 'Dark', Icon: Moon },
                { id: 'system', label: 'System', Icon: Laptop },
              ] as const
            ).map(({ id, label, Icon }) => {
              const active = themeMode === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChangeTheme(id)}
                  className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-white dark:bg-[#0F213E] text-[#0B2545] dark:text-amber-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-[#0B2545] dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Streak Snapshot */}
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-xs">
          <span className="flex items-center gap-1.5 font-medium text-amber-800 dark:text-amber-300">
            <Award className="w-3.5 h-3.5" />
            <span>{profile.streakDays}d Streak</span>
          </span>
          <span className="font-mono font-semibold tabular-nums text-amber-700 dark:text-amber-400">
            {profile.streakPoints} pts
          </span>
        </div>

        {/* Help & Support — Vora Generation Network */}
        <button
          type="button"
          onClick={onOpenSupport}
          className="w-full text-left rounded-lg border border-slate-200 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#05070B] p-2.5 hover:border-emerald-600/50 dark:hover:border-amber-400/50 transition-colors"
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0B2545] dark:text-white">
            <HelpCircle className="w-3.5 h-3.5 text-emerald-700 dark:text-amber-400 shrink-0" />
            <span>Help & Support</span>
          </div>
          <p className="mt-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 leading-snug">
            Vora Generation Network
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            voragenerationnetwork@gmail.com
          </p>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Left Sidebar */}
      <aside className="hidden lg:block w-[264px] shrink-0 h-screen sticky top-0 z-30">
        {sidebarBody}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[85vw] h-full z-10">{sidebarBody}</div>
        </div>
      )}
    </>
  );
}

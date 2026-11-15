import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Award,
  Briefcase,
  CheckCircle2,
  Clock,
  Code2,
  Gamepad2,
  LogIn,
  Mic,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Video,
} from 'lucide-react';
import { motion } from 'motion/react';
import { DailyProductivityHeatmap } from './DailyProductivityHeatmap';
import {
  buildSkillProgressTracks,
  formatUserTimeZoneContext,
  getTimeOfDayGreeting,
} from '../utils/greeting';
import type { CareerRole, NavSection, SkillMatchBreakdown, UserProfile } from '../types';
import capWarRoomImg from '../assets/images/cap_war_room_1794637597727.jpg';
import capVideoStudioImg from '../assets/images/cap_video_studio_1794637598824.jpg';
import capCodeArenaImg from '../assets/images/cap_code_arena_1794637598339.jpg';
import capGamesArcadeImg from '../assets/images/cap_games_arcade_1794637598430.jpg';
import capGlobalJobsImg from '../assets/images/cap_global_jobs_1794637600195.jpg';
import capCareerSimulatorImg from '../assets/images/cap_career_simulator_1794637600387.jpg';
import heroOdysseyImg from '../assets/images/hero_learning_odyssey_1794636541127.jpg';
import achievementCrestImg from '../assets/images/painting_achievement_crest_1794636543758.jpg';

interface HomeViewProps {
  profile: UserProfile;
  targetRole: CareerRole;
  match: SkillMatchBreakdown;
  onNavigate: (section: NavSection) => void;
  onOpenAuthenticityTest: () => void;
  onRunMultiAgentSync: () => void;
  onOpenAuthModal?: () => void;
  isSyncingAI: boolean;
}

export function HomeView({
  profile,
  targetRole,
  match,
  onNavigate,
  onOpenAuthenticityTest,
  onRunMultiAgentSync,
  onOpenAuthModal,
  isSyncingAI,
}: HomeViewProps) {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  const greeting = useMemo(() => getTimeOfDayGreeting(now), [now]);
  const timeZoneCtx = useMemo(() => formatUserTimeZoneContext(now), [now]);
  const skillTracks = useMemo(
    () => buildSkillProgressTracks(profile, targetRole, match),
    [profile, targetRole, match],
  );

  const masteredCount = skillTracks.filter((s) => s.status === 'Mastered').length;
  const inProgressCount = skillTracks.filter((s) => s.status === 'In Progress').length;
  const missingCount = skillTracks.filter((s) => s.status === 'Missing').length;

  const uniqueFeatures = [
    {
      title: '4-Agent Collaborative War Room',
      desc: 'Profiler, Market Matcher, Curriculum Architect, and Career Mentor agents collaborate live and recalibrate automatically when scores dip below 60%.',
      action: () => onNavigate('skill-analysis'),
      cta: 'Inspect Agents',
      Icon: Sparkles,
      imageSrc: capWarRoomImg,
      imageAlt: '4-Agent Collaborative AI War Room network illustration',
    },
    {
      title: 'AI Video Lesson Studio',
      desc: 'Generate scene-by-scene visual concept videos with live code slides and synchronized voice narration from AI Staff Teachers.',
      action: () => onNavigate('ai-mentor'),
      cta: 'Open AI Studio',
      Icon: Video,
      imageSrc: capVideoStudioImg,
      imageAlt: 'AI Video Lesson Studio broadcast visual',
    },
    {
      title: '50,000+ Code Arena & Streak Engine',
      desc: 'Solve Easy (+10), Medium (+25), and Hard (+50) algorithmic challenges with instant browser test execution.',
      action: () => onNavigate('code-arena'),
      cta: 'Enter Arena',
      Icon: Code2,
      imageSrc: capCodeArenaImg,
      imageAlt: 'Code Arena geometric algorithmic arena artwork',
    },
    {
      title: '6-Game Cognitive & Bug Arcade',
      desc: 'Sharpen pattern recognition via Word Connect, Sudoku, Zip Path, Word Search, Spot Difference, and Code Bug Hunter.',
      action: () => onNavigate('games'),
      cta: 'Play Games',
      Icon: Gamepad2,
      imageSrc: capGamesArcadeImg,
      imageAlt: 'VoraGen Games 6-game puzzle arcade illustration',
    },
    {
      title: '20,000+ Global Employer Matcher',
      desc: 'Browse verified global companies with authentic contact desks, match scores against your skills, and track applications.',
      action: () => onNavigate('global-jobs'),
      cta: 'Explore Jobs',
      Icon: Briefcase,
      imageSrc: capGlobalJobsImg,
      imageAlt: 'Global Employer Matcher career architecture artwork',
    },
    {
      title: 'What-If Career Pivot Simulator',
      desc: 'Preview transferable skills and exact weekly effort before switching between Full Stack, AI/ML, Cloud, or Security paths.',
      action: () => onNavigate('career-matching'),
      cta: 'Simulate Pivot',
      Icon: Target,
      imageSrc: capCareerSimulatorImg,
      imageAlt: 'Career Pivot Simulator architectural trajectory visual',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Logged-In Personalized Time-Zone Welcome Banner */}
      {profile.isSignedIn && (
        <section
          aria-label="Personalized learner welcome"
          data-testid="home-welcome-banner"
          className="rounded-2xl border border-[#0B2545]/20 dark:border-amber-400/30 bg-gradient-to-r from-[#0B2545] via-[#13315C] to-[#0B2545] dark:from-[#0A1628] dark:via-[#0F213E] dark:to-[#05070B] text-white p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 shadow-sm"
        >
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-amber-300">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {timeZoneCtx.timeZoneName} · {timeZoneCtx.localTime}
              </span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {greeting}, {profile.name}!
            </h2>
            <p className="text-xs sm:text-sm text-slate-200 max-w-2xl">
              Welcome back to VoraGen Skill AI. You are currently tracking{' '}
              <strong className="text-amber-300">{match.overallReadinessPct}% readiness</strong>{' '}
              for <strong className="text-emerald-300">{targetRole.title}</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onNavigate('resume')}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-400 hover:bg-emerald-300 text-slate-950 transition-colors whitespace-nowrap"
            >
              Update Resume
            </button>
            <button
              type="button"
              onClick={() => onNavigate('skill-analysis')}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors whitespace-nowrap"
            >
              Verify Skills
            </button>
          </div>
        </section>
      )}

      {/* Motivational Hero Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#0A1628] p-6 sm:p-8 flex flex-col justify-between"
        >
          <div>
            <p className="text-xs font-semibold text-emerald-700 dark:text-amber-400">
              {profile.name || 'Guest Visitor'} · Target: {targetRole.title} · {targetRole.demandGrowth}
            </p>
            <h1 className="mt-3 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#0B2545] dark:text-white leading-[1.12]">
              Turn today’s missing skills into your next career breakthrough.
            </h1>
            <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              Generic courses waste your time. VoraGen analyzes your real strengths in{' '}
              <strong className="text-[#0B2545] dark:text-emerald-400">
                {Array.from(
                  new Set([
                    ...profile.skills.filter((s) => s.verified && s.level >= 60).map((s) => s.name),
                    ...match.strongSkillNames,
                  ]),
                ).join(', ') || 'your core profile'}
              </strong>
              , verifies genuine mastery, isolates exact gaps in{' '}
              <strong className="text-amber-700 dark:text-amber-300">
                {match.missingSkillNames.join(', ') || 'advanced architecture'}
              </strong>
              , and coordinates four specialized AI agents to guide every step.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('learning-recommendations')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] transition-colors whitespace-nowrap"
            >
              <span>Continue Personalized Roadmap</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onRunMultiAgentSync}
              disabled={isSyncingAI}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border border-slate-300 dark:border-[#1E3A5F] text-[#0B2545] dark:text-slate-100 hover:bg-[#F4F7FB] dark:hover:bg-white/5 transition-colors whitespace-nowrap disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>{isSyncingAI ? 'Running AI Agents...' : 'Run Multi-Agent Sync'}</span>
            </button>
          </div>
        </motion.div>

        {/* Visual Conservatory Artwork & Live Readiness Overlay */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="lg:col-span-5 relative rounded-2xl overflow-hidden border border-slate-200 dark:border-[#1E3A5F]/70 min-h-[280px] flex flex-col justify-end"
        >
          <img
            src={heroOdysseyImg}
            alt="Sunlit architectural learning conservatory symbolizing career growth"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#05070B]/92 via-[#0A1628]/55 to-black/15" />

          <div className="relative z-10 p-6 text-white space-y-3">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs text-amber-300 font-medium">Live Career Readiness</p>
                <p className="font-display text-4xl font-bold tabular-nums leading-none mt-1">
                  {match.overallReadinessPct}%
                </p>
              </div>
              <div className="text-right text-xs text-slate-200 tabular-nums">
                <p>~{match.estimatedWeeksToReady} weeks to 85%+</p>
                <p>{match.missingSkillNames.length} skill gaps remaining</p>
              </div>
            </div>

            <div className="h-2.5 w-full rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#1D4ED8] via-emerald-400 to-amber-400 transition-all duration-500"
                style={{ width: `${match.overallReadinessPct}%` }}
              />
            </div>

            <p className="text-xs text-slate-200">
              “Small daily progress compounds into mastery. Complete one module or coding sprint today.”
            </p>
          </div>
        </motion.div>
      </section>

      {/* Permanent Current Skill Progress Track */}
      <section
        id="current-skill-progress-track"
        aria-labelledby="skill-progress-track-heading"
        data-testid="current-skill-progress-track"
        className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#0A1628] p-5 sm:p-6 space-y-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-amber-400">
              <TrendingUp className="w-4 h-4" />
              <span>Live Role Matrix · {targetRole.title}</span>
            </div>
            <h2
              id="skill-progress-track-heading"
              className="font-display text-xl font-bold text-[#0B2545] dark:text-white"
            >
              Current Skill Progress Track
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {profile.isSignedIn
                ? `Tracking ${skillTracks.length} role and personal competencies against industry target benchmarks.`
                : 'Showing 0% public baseline. Sign in to track your personal skills, verified checks, and roadmap mastery.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs tabular-nums">
            <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3.5 py-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Mastered</span>
              <span className="font-display font-bold text-sm text-emerald-700 dark:text-emerald-400">
                {masteredCount}
              </span>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3.5 py-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">In Progress</span>
              <span className="font-display font-bold text-sm text-amber-700 dark:text-amber-400">
                {inProgressCount}
              </span>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3.5 py-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Gaps Left</span>
              <span className="font-display font-bold text-sm text-[#0B2545] dark:text-sky-300">
                {missingCount}
              </span>
            </div>
          </div>
        </div>

        {/* Overall Track Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#0B2545] dark:text-slate-200">
              Overall Career Readiness Trajectory
            </span>
            <span className="font-mono font-bold tabular-nums text-emerald-700 dark:text-amber-400">
              {match.overallReadinessPct}% / 100%
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-[#05070B] border border-slate-200 dark:border-[#1E3A5F]/60 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#0B2545] via-emerald-600 to-amber-500 dark:from-[#1D4ED8] dark:via-emerald-500 dark:to-amber-400 transition-all duration-500"
              style={{ width: `${match.overallReadinessPct}%` }}
            />
          </div>
        </div>

        {/* Individual Skill Progress Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {skillTracks.map((track) => {
            const barColor =
              track.status === 'Mastered'
                ? 'bg-emerald-600 dark:bg-emerald-500'
                : track.status === 'In Progress'
                  ? 'bg-amber-500 dark:bg-amber-400'
                  : 'bg-[#0B2545]/40 dark:bg-[#1D4ED8]/50';
            const statusTextColor =
              track.status === 'Mastered'
                ? 'text-emerald-700 dark:text-emerald-400'
                : track.status === 'In Progress'
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-slate-500 dark:text-slate-400';

            return (
              <div
                key={track.name}
                className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-semibold text-[#0B2545] dark:text-white truncate">
                      {track.name}
                    </span>
                    {track.verified && (
                      <CheckCircle2
                        aria-label="Verified genuine skill"
                        className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0"
                      />
                    )}
                  </div>
                  <span className={`text-[11px] font-semibold shrink-0 ${statusTextColor}`}>
                    {track.status}
                  </span>
                </div>

                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-[#0F213E] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${track.progressPct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-400">
                  <span>Current: {track.currentLevel}%</span>
                  <span>Target: {track.targetLevel}%</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-200 dark:border-[#1E3A5F]/50">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Complete diagnostics or learning modules to advance skills from Missing to Mastered.
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            {!profile.isSignedIn && onOpenAuthModal && (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In to Track Progress</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('skill-analysis')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] transition-colors"
            >
              <span>Run Skill Assessment</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('learning-recommendations')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-emerald-600/40 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
            >
              <span>Open Roadmap</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4-Column Accurate Interactive KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('progress-tracking')}
          className="text-left rounded-xl border border-slate-200 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#0A1628] p-5 hover:border-[#0B2545]/45 dark:hover:border-amber-400/50 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Verified Readiness</span>
            <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold tabular-nums text-[#0B2545] dark:text-white">
            {match.overallReadinessPct}%
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            {match.baseSkillMatchPct}% skills + {match.portfolioBonusPct}% portfolio boost
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('code-arena')}
          className="text-left rounded-xl border border-slate-200 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#0A1628] p-5 hover:border-[#0B2545]/45 dark:hover:border-amber-400/50 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Coding Streak & Points</span>
            <Code2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold tabular-nums text-[#0B2545] dark:text-white">
            {profile.streakPoints} pts
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            {profile.streakDays}-day active streak · {profile.solvedChallengeIds.length} solved
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('profile')}
          className="text-left rounded-xl border border-slate-200 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#0A1628] p-5 hover:border-[#0B2545]/45 dark:hover:border-amber-400/50 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Credentials & Projects</span>
            <Award className="w-4 h-4 text-[#0B2545] dark:text-amber-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold tabular-nums text-[#0B2545] dark:text-white">
            {profile.certifications.length + profile.projects.length}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            {profile.certifications.length} certification{profile.certifications.length === 1 ? '' : 's'} ·{' '}
            {profile.projects.length} project{profile.projects.length === 1 ? '' : 's'}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('global-jobs')}
          className="text-left rounded-xl border border-slate-200 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#0A1628] p-5 hover:border-[#0B2545]/45 dark:hover:border-amber-400/50 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Global Opportunities</span>
            <Briefcase className="w-4 h-4 text-emerald-600 dark:text-sky-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold tabular-nums text-[#0B2545] dark:text-white">
            20,480+
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            {profile.applications.length} tracked applications · 50,000+ code drills
          </p>
        </button>
      </section>

      {/* 30-Day Daily Productivity Heatmap */}
      <DailyProductivityHeatmap profile={profile} onNavigate={onNavigate} />

      {/* Career Lab + Genuine Skill Authenticity Test */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/70 bg-gradient-to-br from-[#F4F7FB] to-white dark:from-[#0A1628] dark:to-[#0F213E] p-5 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#0B2545] dark:text-sky-300">
              <Mic className="w-4 h-4" />
              <span>Career Lab Suite</span>
            </div>
            <h2 className="font-display text-base font-bold text-[#0B2545] dark:text-white">
              AI Mock Technical Interviewer & ATS Scanner
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Practice role-specific answers with instant rubric grading, scan job descriptions, and benchmark against 400+ peers.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('career-lab')}
            className="shrink-0 px-4 py-2 rounded-lg text-xs font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] transition-colors whitespace-nowrap"
          >
            Open Career Lab
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/70 bg-gradient-to-br from-[#F4F7FB] to-white dark:from-[#0A1628] dark:to-[#0F213E] p-5 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-amber-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Skill Integrity Verification</span>
            </div>
            <h2 className="font-display text-base font-bold text-[#0B2545] dark:text-white">
              Genuine Skill Authenticity Test
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Audit whether self-reported skills are truly authentic or overclaimed—auto-recalibrating your roadmap honestly.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAuthenticityTest}
            className="shrink-0 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300 transition-colors whitespace-nowrap"
          >
            Verify Skills
          </button>
        </div>
      </section>

      {/* Gallery Painting Showcase + 6 Visual Platform Capabilities */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#0A1628] overflow-hidden">
          <div className="aspect-[4/3] w-full overflow-hidden bg-[#05070B]">
            <img
              src={achievementCrestImg}
              alt="Geometric compass and ascending gold steps painting"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-5 space-y-2">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              VoraGen Manifesto
            </p>
            <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
              Every expert started with an honest skill map.
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Even if you feel unsure of your direction today, our Career Matcher, Authenticity Audits, and AI Staff Teachers turn uncertainty into a clear weekly plan.
            </p>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold text-[#0B2545] dark:text-white">
                Platform Capabilities & Signature Modules
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Six visual signature engines designed to close skill gaps faster than static course libraries.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {uniqueFeatures.map((feat) => {
              const Icon = feat.Icon;
              return (
                <div
                  key={feat.title}
                  className="group rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#0A1628] overflow-hidden flex flex-col justify-between hover:border-[#0B2545]/45 dark:hover:border-amber-400/50 transition-colors"
                >
                  <div>
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#05070B]">
                      <img
                        src={feat.imageSrc}
                        alt={feat.imageAlt}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#05070B]/85 via-black/25 to-transparent" />
                      <div className="absolute bottom-3 left-3.5 right-3.5 flex items-center gap-2.5 text-white">
                        <div className="w-7 h-7 rounded-lg bg-white/15 backdrop-blur-xs flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-amber-300" />
                        </div>
                        <h3 className="font-display text-sm font-semibold leading-tight">
                          {feat.title}
                        </h3>
                      </div>
                    </div>

                    <p className="p-4 pb-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                  <div className="px-4 pb-4 pt-1">
                    <button
                      type="button"
                      onClick={feat.action}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B2545] dark:text-amber-400 hover:underline"
                    >
                      <span>{feat.cta}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

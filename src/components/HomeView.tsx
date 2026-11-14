import {
  Activity,
  ArrowRight,
  Award,
  Briefcase,
  Code2,
  Gamepad2,
  Mic,
  ShieldCheck,
  Sparkles,
  Target,
  Video,
} from 'lucide-react';
import { motion } from 'motion/react';
import { DailyProductivityHeatmap } from './DailyProductivityHeatmap';
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
  isSyncingAI: boolean;
}

export function HomeView({
  profile,
  targetRole,
  match,
  onNavigate,
  onOpenAuthenticityTest,
  onRunMultiAgentSync,
  isSyncingAI,
}: HomeViewProps) {
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
      imageAlt: 'Voragen Games 6-game puzzle arcade illustration',
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
      {/* Motivational Hero Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-6 sm:p-8 flex flex-col justify-between"
        >
          <div>
            <p className="text-xs font-medium text-red-700 dark:text-amber-400">
              {profile.name} · Target: {targetRole.title} · {targetRole.demandGrowth}
            </p>
            <h1 className="mt-3 font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 dark:text-white leading-[1.12]">
              Turn today’s missing skills into your next career breakthrough.
            </h1>
            <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              Generic courses waste your time. Voragen analyzes your real strengths in{' '}
              <strong className="text-slate-900 dark:text-white">
                {Array.from(
                  new Set([
                    ...profile.skills.filter((s) => s.level >= 60).map((s) => s.name),
                    ...match.strongSkillNames,
                  ]),
                ).join(', ') || 'your core profile'}
              </strong>
              , verifies genuine mastery, isolates exact gaps in{' '}
              <strong className="text-red-700 dark:text-pink-400">
                {match.missingSkillNames.join(', ') || 'advanced architecture'}
              </strong>
              , and coordinates four specialized AI agents to guide every step.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('learning-recommendations')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors whitespace-nowrap"
            >
              <span>Continue Personalized Roadmap</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onRunMultiAgentSync}
              disabled={isSyncingAI}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border border-slate-300 dark:border-white/15 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors whitespace-nowrap disabled:opacity-60"
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
          className="lg:col-span-5 relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 min-h-[280px] flex flex-col justify-end"
        >
          <img
            src={heroOdysseyImg}
            alt="Sunlit architectural learning conservatory symbolizing career growth"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/15" />

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
                className="h-full rounded-full bg-gradient-to-r from-amber-400 via-pink-500 to-blue-400 transition-all duration-500"
                style={{ width: `${match.overallReadinessPct}%` }}
              />
            </div>

            <p className="text-xs text-slate-200">
              “Small daily progress compounds into mastery. Complete one module or coding sprint today.”
            </p>
          </div>
        </motion.div>
      </section>

      {/* 4-Column Accurate Interactive KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('progress-tracking')}
          className="text-left rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-5 hover:border-red-500/40 dark:hover:border-blue-500/40 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Verified Readiness</span>
            <Activity className="w-4 h-4 text-emerald-600 dark:text-blue-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold tabular-nums text-slate-950 dark:text-white">
            {match.overallReadinessPct}%
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            {match.baseSkillMatchPct}% skills + {match.portfolioBonusPct}% portfolio boost
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('code-arena')}
          className="text-left rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-5 hover:border-red-500/40 dark:hover:border-blue-500/40 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Coding Streak & Points</span>
            <Code2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold tabular-nums text-slate-950 dark:text-white">
            {profile.streakPoints} pts
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            {profile.streakDays}-day active streak · {profile.solvedChallengeIds.length} solved
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('profile')}
          className="text-left rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-5 hover:border-red-500/40 dark:hover:border-blue-500/40 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Credentials & Projects</span>
            <Award className="w-4 h-4 text-red-600 dark:text-pink-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold tabular-nums text-slate-950 dark:text-white">
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
          className="text-left rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-5 hover:border-red-500/40 dark:hover:border-blue-500/40 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Global Opportunities</span>
            <Briefcase className="w-4 h-4 text-emerald-600 dark:text-blue-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold tabular-nums text-slate-950 dark:text-white">
            20,480+
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            {profile.applications.length} tracked applications · 50,000+ code drills
          </p>
        </button>
      </section>

      {/* 30-Day Daily Productivity Heatmap */}
      <DailyProductivityHeatmap profile={profile} onNavigate={onNavigate} />

      {/* New Hackathon Edge Strip: Career Lab + Genuine Skill Authenticity Test */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-gradient-to-br from-slate-50 to-white dark:from-[#0E131F] dark:to-[#141B2D] p-5 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-red-700 dark:text-blue-400">
              <Mic className="w-4 h-4" />
              <span>Career Lab Suite</span>
            </div>
            <h2 className="font-display text-base font-bold text-slate-950 dark:text-white">
              AI Mock Technical Interviewer & ATS Scanner
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Practice role-specific answers with instant rubric grading, scan job descriptions, and benchmark against 400+ peers.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('career-lab')}
            className="shrink-0 px-4 py-2 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors whitespace-nowrap"
          >
            Open Career Lab
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-gradient-to-br from-slate-50 to-white dark:from-[#0E131F] dark:to-[#141B2D] p-5 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-amber-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Skill Integrity Verification</span>
            </div>
            <h2 className="font-display text-base font-bold text-slate-950 dark:text-white">
              Genuine Skill Authenticity Test
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Audit whether self-reported skills are truly authentic or overclaimed—auto-recalibrating your roadmap honestly.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAuthenticityTest}
            className="shrink-0 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 transition-colors whitespace-nowrap"
          >
            Verify Skills
          </button>
        </div>
      </section>

      {/* Gallery Painting Showcase + 6 Visual Platform Capabilities */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E131F] overflow-hidden">
          <div className="aspect-[4/3] w-full overflow-hidden bg-slate-900">
            <img
              src={achievementCrestImg}
              alt="Geometric compass and ascending gold steps painting"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-5 space-y-2">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Voragen Manifesto
            </p>
            <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
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
              <h2 className="font-display text-xl font-bold text-slate-950 dark:text-white">
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
                  className="group rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E131F] overflow-hidden flex flex-col justify-between hover:border-red-500/40 dark:hover:border-blue-500/40 transition-colors"
                >
                  <div>
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-900">
                      <img
                        src={feat.imageSrc}
                        alt={feat.imageAlt}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
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
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-amber-400 hover:underline"
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


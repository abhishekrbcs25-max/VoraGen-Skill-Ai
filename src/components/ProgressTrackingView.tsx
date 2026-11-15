import { Award, CheckCircle2, TrendingUp } from 'lucide-react';
import type { CareerRole, SkillMatchBreakdown, UserProfile } from '../types';

interface ProgressTrackingViewProps {
  profile: UserProfile;
  targetRole: CareerRole;
  match: SkillMatchBreakdown;
}

export function ProgressTrackingView({
  profile,
  targetRole,
  match,
}: ProgressTrackingViewProps) {
  // Radial Gauge SVG math
  const radius = 66;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (match.overallReadinessPct / 100) * circumference;

  // Compute domain averages for clean visual bars
  const categories = ['Frontend', 'Backend', 'Data & AI', 'Cloud & DevOps', 'Security'] as const;
  const categoryStats = categories.map((cat) => {
    const reqs = targetRole.requiredSkills.filter((r) => r.category === cat);
    const skillsInCat = profile.skills.filter((s) => s.category === cat);
    const avg =
      skillsInCat.length > 0
        ? Math.round(skillsInCat.reduce((acc, s) => acc + s.level, 0) / skillsInCat.length)
        : 0;
    return {
      category: cat,
      avgLevel: avg,
      requiredCount: reqs.length,
    };
  });

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 dark:border-white/10 pb-5">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
          Progress Tracking & Accuracy Meter
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Real-time weighted competency calculation across skills, assessments, coding streaks, certifications, and projects.
        </p>
      </div>

      {/* Accurate Radial Readiness Meter + Domain Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 flex flex-col items-center justify-center text-center space-y-4">
          <div className="relative w-44 h-44 flex items-center justify-center">
            <svg className="w-44 h-44 -rotate-90" viewBox="0 0 160 160" aria-hidden="true">
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                strokeWidth="12"
                className="stroke-slate-200 dark:stroke-slate-800"
              />
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className="stroke-[#0B2545] dark:stroke-emerald-500 transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-4xl font-bold tabular-nums text-slate-950 dark:text-white">
                {match.overallReadinessPct}%
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Career Ready
              </span>
            </div>
          </div>

          <div className="w-full pt-2 border-t border-slate-200 dark:border-white/10 grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-slate-500 dark:text-slate-400">Skill Match</p>
              <p className="font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                {match.baseSkillMatchPct}%
              </p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400">Portfolio Boost</p>
              <p className="font-mono font-bold tabular-nums text-emerald-700 dark:text-amber-400">
                +{match.portfolioBonusPct}%
              </p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400">ETA</p>
              <p className="font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                {match.estimatedWeeksToReady} wks
              </p>
            </div>
          </div>
        </div>

        {/* Category Mastery Meter */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-amber-400" />
            <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
              Competency Meters by Domain
            </h2>
          </div>

          <div className="space-y-4">
            {categoryStats.map((cat) => (
              <div key={cat.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {cat.category}
                  </span>
                  <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                    {cat.avgLevel}% avg ({cat.requiredCount} role reqs)
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#0B2545] via-emerald-600 to-amber-500 dark:from-[#1D4ED8] dark:via-emerald-500 dark:to-amber-400 transition-all duration-300"
                    style={{ width: `${cat.avgLevel}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Code Arena Points: <strong className="font-mono tabular-nums text-slate-900 dark:text-white">{profile.streakPoints}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-blue-400" />
              Games Won: <strong className="font-mono tabular-nums text-slate-900 dark:text-white">{profile.gamesWon}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Assessment Performance History */}
      <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4">
        <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
          Assessment Performance Log ({profile.assessments.length})
        </h2>

        {profile.assessments.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No assessments recorded yet. Take a diagnostic test in Skill Analysis.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 pr-4 font-medium">Skill</th>
                  <th className="py-2.5 px-4 font-medium">Date</th>
                  <th className="py-2.5 px-4 font-medium text-right">Score</th>
                  <th className="py-2.5 px-4 font-medium">Adaptive Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {profile.assessments.map((a) => (
                  <tr key={a.id}>
                    <td className="py-3 pr-4 font-semibold text-slate-900 dark:text-white">
                      {a.skillName}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                      {a.date}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono font-bold tabular-nums ${
                        a.scorePct < 60
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {a.scorePct}%
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                      {a.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

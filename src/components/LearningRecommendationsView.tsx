import { useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  GraduationCap,
} from 'lucide-react';
import type { CareerRole, LearningModule, UserProfile } from '../types';

interface LearningRecommendationsViewProps {
  profile: UserProfile;
  targetRole: CareerRole;
  roadmap: LearningModule[];
  onToggleCompleteModule: (moduleId: string, skillName: string) => void;
}

export function LearningRecommendationsView({
  profile,
  targetRole,
  roadmap,
  onToggleCompleteModule,
}: LearningRecommendationsViewProps) {
  const [filterType, setFilterType] = useState<'All' | LearningModule['type']>('All');

  const filtered =
    filterType === 'All' ? roadmap : roadmap.filter((m) => m.type === filterType);

  const completedCount = roadmap.filter((m) => m.completed).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
            Personalized Learning Recommendations
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Adaptive roadmap curated for <strong>{targetRole.title}</strong> · {completedCount}/{roadmap.length} modules completed.
          </p>
        </div>

        <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-[#F4F7FB] dark:bg-[#0A1628] border border-slate-200 dark:border-[#1E3A5F]/60">
          {(['All', 'Remedial Bootcamp', 'Course', 'Tutorial', 'Practical Exercise'] as const).map(
            (type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  filterType === type
                    ? 'bg-white dark:bg-[#1D4ED8] text-[#0B2545] dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-[#0B2545] dark:hover:text-white'
                }`}
              >
                {type}
              </button>
            ),
          )}
        </div>
      </div>

      {profile.remedialSkills.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Adaptive Remedial Sequence Active</p>
            <p className="mt-0.5">
              Because recent assessments flagged {profile.remedialSkills.join(', ')} below 60%, remedial recovery bootcamps are pinned at the top of your roadmap.
            </p>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-10 text-center space-y-2">
          <GraduationCap className="w-8 h-8 mx-auto text-emerald-600 dark:text-emerald-400" />
          <p className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
            No modules match this filter
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Switch filter to All or select another target career goal to inspect additional tracks.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((mod, idx) => (
            <article
              key={mod.id}
              className={`rounded-2xl border p-5 flex flex-col justify-between transition-colors ${
                mod.completed
                  ? 'border-emerald-500/45 bg-emerald-50/40 dark:bg-emerald-500/10'
                  : 'border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span
                    className={`font-semibold ${
                      mod.priority === 'Remedial Focus'
                        ? 'text-amber-700 dark:text-amber-400'
                        : mod.priority === 'Critical Gap'
                          ? 'text-[#0B2545] dark:text-sky-300'
                          : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    Step {idx + 1} · {mod.priority}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {mod.type} · {mod.skillName}
                  </span>
                </div>

                <h2 className="mt-2 font-display text-base font-bold text-[#0B2545] dark:text-white">
                  {mod.title}
                </h2>
                <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {mod.description}
                </p>

                <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                  <span className="inline-flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    {mod.provider}
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {mod.durationHours} hrs
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onToggleCompleteModule(mod.id, mod.skillName)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    mod.completed
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB]'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{mod.completed ? 'Completed (+Skill Boost)' : 'Mark Complete'}</span>
                </button>

                <a
                  href={mod.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:underline"
                >
                  <span>Open Resource</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

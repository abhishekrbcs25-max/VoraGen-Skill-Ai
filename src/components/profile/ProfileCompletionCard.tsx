import { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Circle } from 'lucide-react';
import { calculateProfileCompletion } from '../../utils/profileCompletion';
import type { UserProfile } from '../../types';

interface ProfileCompletionCardProps {
  profile: UserProfile;
}

export function ProfileCompletionCard({ profile }: ProfileCompletionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const summary = calculateProfileCompletion(profile);

  const jumpToSection = (anchorId: string) => {
    const el = document.getElementById(anchorId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section
      aria-label="Profile completion progress"
      data-testid="profile-completion-card"
      className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-5 space-y-3.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h2 className="font-display text-base font-bold text-[#0B2545] dark:text-white">
              Profile Completion Indicator
            </h2>
            <span className="rounded-md border border-emerald-600/35 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
              {summary.tierLabel}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Completed <span className="font-mono font-semibold tabular-nums">{summary.completedCount}</span> of{' '}
            <span className="font-mono font-semibold tabular-nums">{summary.totalCount}</span> career profile milestones.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span
              data-testid="profile-completion-pct"
              className="font-mono text-2xl font-bold tabular-nums text-[#0B2545] dark:text-amber-400"
            >
              {summary.percentage}%
            </span>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400">Complete</span>
          </div>

          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-[#1E3A5F]/70 text-slate-700 dark:text-slate-200 hover:bg-[#F4F7FB] dark:hover:bg-[#05070B]"
          >
            <span>{expanded ? 'Hide Checklist' : `Checklist (${summary.missingItems.length} left)`}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-[#05070B] overflow-hidden border border-slate-200 dark:border-[#1E3A5F]/50">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#0B2545] via-emerald-600 to-amber-500 dark:from-[#1D4ED8] dark:via-emerald-500 dark:to-amber-400 transition-all duration-300"
          style={{ width: `${summary.percentage}%` }}
        />
      </div>

      {/* Missing Items Quick Strip */}
      {!expanded && summary.missingItems.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Next to add:
          </span>
          {summary.missingItems.slice(0, 4).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => jumpToSection(item.sectionAnchor)}
              className="rounded-md border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] px-2.5 py-1 text-[11px] font-medium text-[#0B2545] dark:text-amber-300 hover:border-[#0B2545] dark:hover:border-amber-400 transition-colors"
            >
              + {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Full Interactive Checklist */}
      {expanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
          {summary.items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => jumpToSection(item.sectionAnchor)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                item.completed
                  ? 'border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                  : 'border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] text-slate-700 dark:text-slate-300 hover:border-[#0B2545] dark:hover:border-amber-400'
              }`}
            >
              {item.completed ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
              <span className="truncate flex-1">{item.label}</span>
              <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 shrink-0">
                +{item.weight}%
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

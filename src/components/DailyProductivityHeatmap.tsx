import { useMemo, useState } from 'react';
import { CalendarDays, Code2, Flame, Sparkles } from 'lucide-react';
import { buildProductivityHeatmap } from '../utils/skillEngine';
import type { NavSection, ProductivityDay, UserProfile } from '../types';

interface DailyProductivityHeatmapProps {
  profile: UserProfile;
  onNavigate: (section: NavSection) => void;
}

const INTENSITY_CLASSES: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-slate-100 border-slate-200/80 dark:bg-[#141B2D] dark:border-white/5',
  1: 'bg-emerald-200 border-emerald-300 dark:bg-blue-900/85 dark:border-blue-700/70',
  2: 'bg-emerald-400 border-emerald-500 dark:bg-blue-600 dark:border-blue-400/70',
  3: 'bg-emerald-600 border-emerald-700 dark:bg-pink-500 dark:border-pink-400/80',
  4: 'bg-amber-500 border-amber-600 dark:bg-amber-400 dark:border-amber-300',
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function DailyProductivityHeatmap({
  profile,
  onNavigate,
}: DailyProductivityHeatmapProps) {
  const summary = useMemo(() => buildProductivityHeatmap(profile), [profile]);
  const [selectedDate, setSelectedDate] = useState<string>(
    () => summary.days[summary.days.length - 1]?.date ?? '',
  );

  const selectedDay: ProductivityDay =
    summary.days.find((d) => d.date === selectedDate) ??
    summary.days[summary.days.length - 1];

  // Organize 30 days into GitHub-style week columns (Sunday=0 .. Saturday=6)
  const weekColumns = useMemo(() => {
    const firstWeekday = summary.days[0]?.weekday ?? 0;
    const padded: Array<ProductivityDay | null> = [
      ...Array.from({ length: firstWeekday }, () => null),
      ...summary.days,
    ];
    while (padded.length % 7 !== 0) {
      padded.push(null);
    }
    const cols: Array<Array<ProductivityDay | null>> = [];
    for (let i = 0; i < padded.length; i += 7) {
      cols.push(padded.slice(i, i + 7));
    }
    return cols;
  }, [summary.days]);

  return (
    <section
      aria-label="Daily Productivity Heatmap"
      className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-5 sm:p-6 space-y-5"
    >
      {/* Header & Summary Stats */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-amber-400">
            <CalendarDays className="w-4 h-4" />
            <span>Daily Productivity Heatmap · Last 30 Days</span>
          </div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-slate-950 dark:text-white">
            {summary.totalActions} study & coding actions across {summary.activeDays} active days
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Every Code Arena problem, Skill Analysis check, learning module, and job application lights up your 30-day contribution graph.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#141B2D] px-3.5 py-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
              Current Streak
            </span>
            <span className="font-display font-bold text-sm tabular-nums text-slate-950 dark:text-white inline-flex items-center gap-1 mt-0.5">
              <Flame className="w-3.5 h-3.5 text-red-600 dark:text-amber-400" />
              {profile.streakDays} days
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#141B2D] px-3.5 py-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
              30-Day Peak
            </span>
            <span className="font-display font-bold text-sm tabular-nums text-slate-950 dark:text-white inline-flex items-center gap-1 mt-0.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-pink-400" />
              {summary.peakActions} ({summary.peakDateLabel})
            </span>
          </div>
        </div>
      </div>

      {/* GitHub-Style Contribution Graph Matrix + 30-Day Quick Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Left: GitHub-style 7-row Weekday Contribution Matrix */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#0B0F1A] p-4 flex flex-col items-center justify-center overflow-x-auto">
          <div className="flex items-start gap-2.5">
            {/* Weekday row labels */}
            <div className="grid grid-rows-7 gap-1.5 pt-0.5 text-[10px] font-mono text-slate-500 dark:text-slate-400 select-none">
              {WEEKDAY_LABELS.map((wd, idx) => (
                <span key={wd} className="h-5 flex items-center">
                  {idx === 1 || idx === 3 || idx === 5 ? wd : ''}
                </span>
              ))}
            </div>

            {/* Week columns */}
            <div className="flex gap-1.5" role="group" aria-label="30-day contribution matrix">
              {weekColumns.map((col, colIdx) => (
                <div key={`week-${colIdx}`} className="grid grid-rows-7 gap-1.5">
                  {col.map((day, rowIdx) => {
                    if (!day) {
                      return (
                        <div
                          key={`empty-${colIdx}-${rowIdx}`}
                          className="w-5 h-5 rounded-[4px] opacity-0 pointer-events-none"
                        />
                      );
                    }
                    const isSelected = selectedDay?.date === day.date;
                    return (
                      <button
                        key={day.date}
                        type="button"
                        onMouseEnter={() => setSelectedDate(day.date)}
                        onFocus={() => setSelectedDate(day.date)}
                        onClick={() => setSelectedDate(day.date)}
                        title={`${day.label}: ${day.totalActions} action${day.totalActions === 1 ? '' : 's'}`}
                        aria-label={`${day.label}: ${day.totalActions} study and coding actions`}
                        aria-pressed={isSelected}
                        className={`w-5 h-5 rounded-[4px] border transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 dark:focus-visible:ring-blue-400 ${
                          INTENSITY_CLASSES[day.intensity]
                        } ${
                          isSelected
                            ? 'ring-2 ring-slate-900 dark:ring-white ring-offset-1 ring-offset-white dark:ring-offset-[#0B0F1A]'
                            : ''
                        }`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Less -> More Legend */}
          <div className="mt-3.5 w-full flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>
              {summary.days[0]?.label} – {summary.days[summary.days.length - 1]?.label}
            </span>
            <div className="flex items-center gap-1">
              <span>Less</span>
              {([0, 1, 2, 3, 4] as const).map((lvl) => (
                <span
                  key={lvl}
                  aria-hidden="true"
                  className={`w-3 h-3 rounded-[3px] border ${INTENSITY_CLASSES[lvl]}`}
                />
              ))}
              <span>More</span>
            </div>
          </div>
        </div>

        {/* Right: Chronological 30-Day Strip & Selected Day Breakdown */}
        <div className="lg:col-span-7 space-y-4">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-2">
              <span className="font-medium">30-Day Daily Momentum Strip</span>
              <span>Click or hover any day to inspect</span>
            </div>
            <div className="grid grid-cols-10 sm:grid-cols-[repeat(15,minmax(0,1fr))] gap-1.5">
              {summary.days.map((day) => {
                const isSelected = selectedDay?.date === day.date;
                return (
                  <button
                    key={`strip-${day.date}`}
                    type="button"
                    onMouseEnter={() => setSelectedDate(day.date)}
                    onClick={() => setSelectedDate(day.date)}
                    aria-label={`Inspect ${day.label}`}
                    aria-pressed={isSelected}
                    className={`h-7 rounded-md border text-[10px] font-mono tabular-nums flex items-center justify-center transition-all ${
                      INTENSITY_CLASSES[day.intensity]
                    } ${
                      day.intensity >= 3
                        ? 'text-white dark:text-slate-950 font-semibold'
                        : 'text-slate-600 dark:text-slate-300'
                    } ${
                      isSelected
                        ? 'ring-2 ring-red-600 dark:ring-amber-400 scale-105'
                        : 'hover:opacity-90'
                    }`}
                  >
                    {day.date.slice(8)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Inspector */}
          {selectedDay && (
            <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#141B2D] p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-950 dark:text-white">
                    {selectedDay.label} ({selectedDay.date})
                  </span>
                  <span className="text-[11px] font-medium text-emerald-700 dark:text-amber-400">
                    {selectedDay.inStreak ? 'Active Streak Day' : 'Standard Day'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                  {selectedDay.codingDrills} coding drill{selectedDay.codingDrills === 1 ? '' : 's'} ·{' '}
                  {selectedDay.assessmentsCount} assessment{selectedDay.assessmentsCount === 1 ? '' : 's'} ·{' '}
                  {selectedDay.modulesCount} learning module{selectedDay.modulesCount === 1 ? '' : 's'} ·{' '}
                  {selectedDay.applicationsCount} job application{selectedDay.applicationsCount === 1 ? '' : 's'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('code-arena')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors whitespace-nowrap"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Boost Today’s Activity</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

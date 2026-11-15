import { useState } from 'react';
import {
  Bell,
  Check,
  Download,
  Laptop,
  Moon,
  RotateCcw,
  Sliders,
  Sun,
  Volume2,
} from 'lucide-react';
import type { AppSettings, ThemeMode, UserProfile } from '../types';

interface SettingsViewProps {
  themeMode: ThemeMode;
  onChangeTheme: (mode: ThemeMode) => void;
  settings: AppSettings;
  onUpdateSettings: (next: AppSettings) => void;
  profile: UserProfile;
  onResetDemo: () => void;
  onOpenSupport: () => void;
}

export function SettingsView({
  themeMode,
  onChangeTheme,
  settings,
  onUpdateSettings,
  profile,
  onResetDemo,
  onOpenSupport,
}: SettingsViewProps) {
  const [exported, setExported] = useState(false);

  const handleExportBackup = () => {
    const payload = JSON.stringify({ profile, settings, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `voragen-backup-${profile.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 2500);
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 dark:border-white/10 pb-5">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
          Platform Settings & Preferences
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Customize appearance themes, adaptive AI sensitivity, audio narration, daily study targets, and account data.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Appearance & Accessibility */}
        <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-[#0B2545] dark:text-amber-400" />
            <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
              Appearance & Display
            </h2>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Color Theme Mode (Light: White/Navy/Green/Gold · Dark: Black/Navy/Green/Gold)
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'light', label: 'Light Mode', Icon: Sun },
                  { id: 'dark', label: 'Dark Mode', Icon: Moon },
                  { id: 'system', label: 'System Sync', Icon: Laptop },
                ] as const
              ).map(({ id, label, Icon }) => {
                const active = themeMode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onChangeTheme(id)}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-colors ${
                      active
                        ? 'bg-[#0B2545] text-white border-[#0B2545] dark:bg-[#1D4ED8] dark:border-[#1D4ED8]'
                        : 'bg-[#F4F7FB] dark:bg-[#05070B] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-[#1E3A5F]/60 hover:border-[#0B2545] dark:hover:border-amber-400/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-white/10">
            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Compact Workspace Density
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tighter vertical spacing across analytics cards and tables.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.compactLayout}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, compactLayout: e.target.checked })
                }
                className="w-4 h-4 accent-[#0B2545] dark:accent-[#1D4ED8]"
              />
            </label>

            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Reduce UI Animations
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Minimize transition motion for focused reading.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.reduceMotion}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, reduceMotion: e.target.checked })
                }
                className="w-4 h-4 accent-[#0B2545] dark:accent-[#1D4ED8]"
              />
            </label>
          </div>
        </section>

        {/* 2. Adaptive AI & Remedial Engine */}
        <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
              Adaptive AI & Mentor Controls
            </h2>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label
                htmlFor="remedial-threshold"
                className="font-semibold text-slate-800 dark:text-slate-200"
              >
                Remedial Recalibration Threshold
              </label>
              <span className="font-mono font-bold tabular-nums text-amber-700 dark:text-amber-400">
                &lt; {settings.remedialThresholdPct}%
              </span>
            </div>
            <input
              id="remedial-threshold"
              type="range"
              min={40}
              max={75}
              step={5}
              value={settings.remedialThresholdPct}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  remedialThresholdPct: Number(e.target.value),
                })
              }
              className="w-full accent-[#0B2545] dark:accent-[#1D4ED8] cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Assessments scoring below {settings.remedialThresholdPct}% automatically trigger remedial bootcamps.
            </p>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-white/10">
            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Auto-Collaborate AI Agents on Goal Change
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Immediately re-run all 4 agents when you pivot target careers.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoSyncAgents}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, autoSyncAgents: e.target.checked })
                }
                className="w-4 h-4 accent-[#0B2545] dark:accent-[#1D4ED8]"
              />
            </label>

            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <div className="flex items-start gap-2">
                <Volume2 className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Enable AI Video Voice Narration by Default
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Automatically speak lesson scenes in AI Video Studio.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.defaultVideoVoice}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, defaultVideoVoice: e.target.checked })
                }
                className="w-4 h-4 accent-[#0B2545] dark:accent-[#1D4ED8]"
              />
            </label>
          </div>
        </section>

        {/* 3. Study Cadence & Streak Targets */}
        <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
              Learning Cadence & Goals
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="daily-study-target"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Daily Study Commitment
              </label>
              <select
                id="daily-study-target"
                value={settings.dailyStudyMinutes}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    dailyStudyMinutes: Number(e.target.value),
                  })
                }
                className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
              >
                <option value={15}>15 mins / day (Light)</option>
                <option value={30}>30 mins / day (Steady)</option>
                <option value={45}>45 mins / day (Recommended)</option>
                <option value={60}>60 mins / day (Accelerated)</option>
                <option value={90}>90 mins / day (Intensive)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="weekly-code-goal"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Weekly Code Arena Target
              </label>
              <select
                id="weekly-code-goal"
                value={settings.weeklyCodeGoal}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    weeklyCodeGoal: Number(e.target.value),
                  })
                }
                className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
              >
                <option value={3}>3 problems / week</option>
                <option value={5}>5 problems / week</option>
                <option value={7}>7 problems / week (Daily)</option>
                <option value={10}>10 problems / week (Pro)</option>
              </select>
            </div>
          </div>
        </section>

        {/* 4. Data Management & Support */}
        <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-5">
          <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
            Data Backup, Reset & Support
          </h2>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Download a portable JSON archive of your learner profile, resume details, skills, certifications, coding streak, and applications, or clear your workspace back to a clean slate.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleExportBackup}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 transition-colors"
            >
              {exported ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
              <span>{exported ? 'Backup Downloaded' : 'Export Profile JSON'}</span>
            </button>

            <button
              type="button"
              onClick={onResetDemo}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-[#1E3A5F]/70 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#0F213E]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear My Workspace</span>
            </button>

            <button
              type="button"
              onClick={onOpenSupport}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border border-amber-500/45 text-[#0B2545] dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/10"
            >
              <span>Contact Support (Vora Generation Network)</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

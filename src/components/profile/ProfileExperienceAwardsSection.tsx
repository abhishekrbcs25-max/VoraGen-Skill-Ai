import { useState } from 'react';
import { Briefcase, GraduationCap, Plus, Trash2, Trophy } from 'lucide-react';
import type { ExperienceEntry, UserProfile } from '../../types';

interface ProfileExperienceAwardsSectionProps {
  profile: UserProfile;
  onUpdateProfile: (next: UserProfile) => void;
}

export function ProfileExperienceAwardsSection({
  profile,
  onUpdateProfile,
}: ProfileExperienceAwardsSectionProps) {
  // Work experience state
  const [workOrg, setWorkOrg] = useState('');
  const [workRole, setWorkRole] = useState('');
  const [workStart, setWorkStart] = useState('');
  const [workEnd, setWorkEnd] = useState('');
  const [workCurrent, setWorkCurrent] = useState(false);
  const [workLoc, setWorkLoc] = useState('');
  const [workDesc, setWorkDesc] = useState('');

  // Internship experience state
  const [internOrg, setInternOrg] = useState('');
  const [internRole, setInternRole] = useState('');
  const [internStart, setInternStart] = useState('');
  const [internEnd, setInternEnd] = useState('');
  const [internLoc, setInternLoc] = useState('');
  const [internDesc, setInternDesc] = useState('');

  // Achievements & awards state
  const [awardTitle, setAwardTitle] = useState('');
  const [awardIssuer, setAwardIssuer] = useState('');
  const [awardYear, setAwardYear] = useState('2026');
  const [awardDesc, setAwardDesc] = useState('');

  const addExperience = (
    kind: 'workExperience' | 'internshipExperience',
    entry: Omit<ExperienceEntry, 'id'>,
    clearFn: () => void,
  ) => {
    if (!entry.organization.trim() || !entry.roleTitle.trim()) return;
    onUpdateProfile({
      ...profile,
      [kind]: [
        ...(profile[kind] || []),
        {
          ...entry,
          id: `${kind === 'workExperience' ? 'work' : 'intern'}-${Date.now()}`,
          organization: entry.organization.trim(),
          roleTitle: entry.roleTitle.trim(),
          startDate: entry.startDate.trim(),
          endDate: entry.current ? 'Present' : entry.endDate.trim(),
          location: entry.location?.trim() || undefined,
          description: entry.description.trim(),
        },
      ],
    });
    if (!profile.isSignedIn) return;
    clearFn();
  };

  const handleAddAward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!awardTitle.trim()) return;
    onUpdateProfile({
      ...profile,
      achievements: [
        ...(profile.achievements || []),
        {
          id: `ach-${Date.now()}`,
          title: awardTitle.trim(),
          issuer: awardIssuer.trim() || 'Academic / Industry Honor',
          year: awardYear.trim() || '2026',
          description: awardDesc.trim() || undefined,
        },
      ],
    });
    if (!profile.isSignedIn) return;
    setAwardTitle('');
    setAwardIssuer('');
    setAwardDesc('');
  };

  return (
    <div id="experience-section" className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Work Experience */}
        <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#0B2545] dark:text-amber-400" />
            <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
              Work Experience ({(profile.workExperience || []).length})
            </h2>
          </div>

          <div className="space-y-2.5">
            {(profile.workExperience || []).map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-3.5"
              >
                <div className="space-y-0.5 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {item.roleTitle} · {item.organization}
                  </p>
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {[item.startDate, item.current ? 'Present' : item.endDate]
                      .filter(Boolean)
                      .join(' – ')}
                    {item.location ? ` · ${item.location}` : ''}
                  </p>
                  {item.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 pt-1">
                      {item.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label={`Remove work experience ${item.roleTitle}`}
                  onClick={() =>
                    onUpdateProfile({
                      ...profile,
                      workExperience: (profile.workExperience || []).filter(
                        (x) => x.id !== item.id,
                      ),
                    })
                  }
                  className="text-slate-400 hover:text-[#0B2545] dark:hover:text-amber-400 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              addExperience(
                'workExperience',
                {
                  organization: workOrg,
                  roleTitle: workRole,
                  startDate: workStart,
                  endDate: workEnd,
                  current: workCurrent,
                  location: workLoc,
                  description: workDesc,
                },
                () => {
                  setWorkOrg('');
                  setWorkRole('');
                  setWorkStart('');
                  setWorkEnd('');
                  setWorkCurrent(false);
                  setWorkLoc('');
                  setWorkDesc('');
                },
              );
            }}
            className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/10"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={workOrg}
                onChange={(e) => setWorkOrg(e.target.value)}
                placeholder="Company / Organization"
                aria-label="Work company"
                className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
              <input
                type="text"
                value={workRole}
                onChange={(e) => setWorkRole(e.target.value)}
                placeholder="Job Title / Role"
                aria-label="Work role title"
                className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={workStart}
                onChange={(e) => setWorkStart(e.target.value)}
                placeholder="Start (e.g., Jan 2024)"
                aria-label="Work start date"
                className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
              <input
                type="text"
                value={workCurrent ? 'Present' : workEnd}
                disabled={workCurrent}
                onChange={(e) => setWorkEnd(e.target.value)}
                placeholder="End (e.g., Dec 2025)"
                aria-label="Work end date"
                className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs text-slate-900 dark:text-white disabled:opacity-60"
              />
              <input
                type="text"
                value={workLoc}
                onChange={(e) => setWorkLoc(e.target.value)}
                placeholder="Location (Remote / City)"
                aria-label="Work location"
                className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={workCurrent}
                onChange={(e) => setWorkCurrent(e.target.checked)}
                className="rounded accent-[#0B2545] dark:accent-[#1D4ED8]"
              />
              <span>I currently work here</span>
            </label>
            <textarea
              rows={2}
              value={workDesc}
              onChange={(e) => setWorkDesc(e.target.value)}
              placeholder="Key deliverables, metrics, and impact..."
              aria-label="Work description"
              className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Work Experience</span>
            </button>
          </form>
        </section>

        {/* Internship Experience */}
        <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
              Internship Experience ({(profile.internshipExperience || []).length})
            </h2>
          </div>

          <div className="space-y-2.5">
            {(profile.internshipExperience || []).map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-3.5"
              >
                <div className="space-y-0.5 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {item.roleTitle} · {item.organization}
                  </p>
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {[item.startDate, item.endDate].filter(Boolean).join(' – ')}
                    {item.location ? ` · ${item.location}` : ''}
                  </p>
                  {item.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 pt-1">
                      {item.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label={`Remove internship ${item.roleTitle}`}
                  onClick={() =>
                    onUpdateProfile({
                      ...profile,
                      internshipExperience: (profile.internshipExperience || []).filter(
                        (x) => x.id !== item.id,
                      ),
                    })
                  }
                  className="text-slate-400 hover:text-[#0B2545] dark:hover:text-amber-400 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              addExperience(
                'internshipExperience',
                {
                  organization: internOrg,
                  roleTitle: internRole,
                  startDate: internStart,
                  endDate: internEnd,
                  location: internLoc,
                  description: internDesc,
                },
                () => {
                  setInternOrg('');
                  setInternRole('');
                  setInternStart('');
                  setInternEnd('');
                  setInternLoc('');
                  setInternDesc('');
                },
              );
            }}
            className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/10"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={internOrg}
                onChange={(e) => setInternOrg(e.target.value)}
                placeholder="Company / Lab"
                aria-label="Internship organization"
                className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
              <input
                type="text"
                value={internRole}
                onChange={(e) => setInternRole(e.target.value)}
                placeholder="Intern Role (e.g., Frontend Intern)"
                aria-label="Internship role"
                className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={internStart}
                onChange={(e) => setInternStart(e.target.value)}
                placeholder="Start (e.g., May 2025)"
                aria-label="Internship start date"
                className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
              <input
                type="text"
                value={internEnd}
                onChange={(e) => setInternEnd(e.target.value)}
                placeholder="End (e.g., Aug 2025)"
                aria-label="Internship end date"
                className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
              <input
                type="text"
                value={internLoc}
                onChange={(e) => setInternLoc(e.target.value)}
                placeholder="Location"
                aria-label="Internship location"
                className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <textarea
              rows={2}
              value={internDesc}
              onChange={(e) => setInternDesc(e.target.value)}
              placeholder="Internship projects, stack, and outcomes..."
              aria-label="Internship description"
              className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-[#1D4ED8]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Internship</span>
            </button>
          </form>
        </section>
      </div>

      {/* Achievements & Awards */}
      <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
            Achievements &amp; Awards ({(profile.achievements || []).length})
          </h2>
        </div>

        {(profile.achievements || []).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(profile.achievements || []).map((ach) => (
              <div
                key={ach.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-3.5"
              >
                <div className="space-y-0.5 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {ach.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {ach.issuer} · {ach.year}
                  </p>
                  {ach.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 pt-1">
                      {ach.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label={`Remove achievement ${ach.title}`}
                  onClick={() =>
                    onUpdateProfile({
                      ...profile,
                      achievements: (profile.achievements || []).filter((a) => a.id !== ach.id),
                    })
                  }
                  className="text-slate-400 hover:text-[#0B2545] dark:hover:text-amber-400 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAddAward} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-2 border-t border-slate-200 dark:border-white/10">
          <input
            type="text"
            value={awardTitle}
            onChange={(e) => setAwardTitle(e.target.value)}
            placeholder="Award or milestone (e.g., Smart India Hackathon Finalist)"
            aria-label="Achievement title"
            className="sm:col-span-4 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs text-slate-900 dark:text-white"
          />
          <input
            type="text"
            value={awardIssuer}
            onChange={(e) => setAwardIssuer(e.target.value)}
            placeholder="Issuing Body / Event"
            aria-label="Achievement issuer"
            className="sm:col-span-3 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs text-slate-900 dark:text-white"
          />
          <input
            type="text"
            value={awardYear}
            onChange={(e) => setAwardYear(e.target.value)}
            placeholder="Year"
            aria-label="Achievement year"
            className="sm:col-span-1 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-2.5 py-2 text-xs tabular-nums text-slate-900 dark:text-white"
          />
          <input
            type="text"
            value={awardDesc}
            onChange={(e) => setAwardDesc(e.target.value)}
            placeholder="Short summary (optional)"
            aria-label="Achievement summary"
            className="sm:col-span-2 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs text-slate-900 dark:text-white"
          />
          <button
            type="submit"
            className="sm:col-span-2 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold bg-[#0B2545] text-white dark:bg-[#1D4ED8]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Award</span>
          </button>
        </form>
      </section>
    </div>
  );
}

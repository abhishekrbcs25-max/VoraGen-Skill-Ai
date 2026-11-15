import { useMemo, useState } from 'react';
import {
  Award,
  Bookmark,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  MapPin,
  XCircle,
} from 'lucide-react';
import { FLAGSHIP_COMPANIES } from '../data/companiesCatalog';
import {
  PLACEMENT_DRIVES_CATALOG,
  VIRTUAL_CAREER_FAIRS_CATALOG,
} from '../data/projectsCatalog';
import { evaluateDriveEligibility } from '../utils/platformEngines';
import type { UserProfile } from '../types';

interface ApplicationsDrivesViewProps {
  profile: UserProfile;
  onUpdateProfile: (next: UserProfile) => void;
  onRequireAuth: (reason: string) => boolean;
  onNavigateJobs: () => void;
}

type TabId = 'applications' | 'saved' | 'internships' | 'drives' | 'fairs';

export function ApplicationsDrivesView({
  profile,
  onUpdateProfile,
  onRequireAuth,
  onNavigateJobs,
}: ApplicationsDrivesViewProps) {
  const [tab, setTab] = useState<TabId>('applications');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const savedJobs = useMemo(
    () => FLAGSHIP_COMPANIES.filter((co) => (profile.savedJobIds || []).includes(co.id)),
    [profile.savedJobIds],
  );

  const registeredDrives = new Set(profile.registeredDriveIds || []);
  const registeredFairs = new Set(profile.registeredFairIds || []);

  const handleWithdrawApplication = (appId: string) => {
    if (!onRequireAuth('withdraw or update an application')) return;
    onUpdateProfile({
      ...profile,
      applications: profile.applications.map((a) =>
        a.id === appId ? { ...a, status: 'Withdrawn' } : a,
      ),
    });
    setStatusNotice('Application marked as Withdrawn.');
  };

  const handleToggleSaveJob = (companyId: string) => {
    if (!onRequireAuth('manage saved jobs')) return;
    const next = (profile.savedJobIds || []).filter((id) => id !== companyId);
    onUpdateProfile({ ...profile, savedJobIds: next });
  };

  const handleRegisterDrive = (driveId: string, companyName: string) => {
    if (!onRequireAuth('register for placement drives')) return;
    if (registeredDrives.has(driveId)) return;
    onUpdateProfile({
      ...profile,
      registeredDriveIds: [...(profile.registeredDriveIds || []), driveId],
    });
    setStatusNotice(`Registered for ${companyName} Placement Drive!`);
  };

  const handleRegisterFair = (fairId: string, title: string) => {
    if (!onRequireAuth('RSVP for Virtual Career Fairs')) return;
    if (registeredFairs.has(fairId)) return;
    onUpdateProfile({
      ...profile,
      registeredFairIds: [...(profile.registeredFairIds || []), fairId],
    });
    setStatusNotice(`Booth pass confirmed for ${title}.`);
  };

  const handleLogInternshipCompletion = () => {
    if (!onRequireAuth('claim an internship completion certificate')) return;
    onUpdateProfile({
      ...profile,
      certifications: [
        {
          id: `cert-int-${Date.now()}`,
          title: 'Verified Virtual Engineering Internship Certificate',
          issuer: 'Vora Generation Network',
          issuerLogoId: 'voragen',
          year: String(new Date().getFullYear()),
          credentialId: `VG-INT-${Date.now().toString().slice(-5)}`,
        },
        ...profile.certifications,
      ],
    });
    setStatusNotice('Internship completion certificate added to your Digital Skill Passport!');
  };

  const pipelineStats = useMemo(() => {
    const active = profile.applications.filter((a) => a.status !== 'Withdrawn' && a.status !== 'Rejected').length;
    const shortlisted = profile.applications.filter(
      (a) => a.status === 'Shortlisted' || a.status === 'Interview Ready' || a.status === 'Interview Scheduled',
    ).length;
    const offers = profile.applications.filter((a) => a.status === 'Offer Issued').length;
    return { active, shortlisted, offers };
  }, [profile.applications]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
            My Applications, Placement Drives & Virtual Career Fairs
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Track real-time hiring pipelines, manage saved opportunities, apply to internships, and join campus or virtual hiring fairs.
          </p>
        </div>

        <button
          type="button"
          onClick={onNavigateJobs}
          className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#0B2545] text-white dark:bg-[#1D4ED8] whitespace-nowrap"
        >
          Browse Global Jobs
        </button>
      </div>

      {/* Pipeline Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Active Applications</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums text-[#0B2545] dark:text-white">
            {pipelineStats.active}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Shortlisted / Interviewing</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
            {pipelineStats.shortlisted}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Placement Drives Registered</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums text-[#0B2545] dark:text-amber-400">
            {registeredDrives.size}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Virtual Career Fairs</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums text-[#0B2545] dark:text-white">
            {registeredFairs.size}
          </p>
        </div>
      </div>

      {statusNotice && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-900 dark:text-emerald-200"
        >
          {statusNotice}
        </div>
      )}

      {/* Sub-navigation tabs */}
      <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-[#F4F7FB] dark:bg-[#0A1628] border border-slate-200 dark:border-[#1E3A5F]/60 w-fit">
        {(
          [
            { id: 'applications', label: `Applications (${profile.applications.length})` },
            { id: 'saved', label: `Saved Jobs (${savedJobs.length})` },
            { id: 'internships', label: 'Internships Portal' },
            { id: 'drives', label: 'Campus & Walk-In Drives' },
            { id: 'fairs', label: 'Virtual Career Fairs' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              tab === item.id
                ? 'bg-white dark:bg-[#1D4ED8] text-[#0B2545] dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0B2545] dark:hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'applications' && (
        <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            <span>Application History & Pipeline Tracker</span>
          </h2>
          {profile.applications.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No submitted applications yet. Apply from Global Jobs to track stage updates here.
            </p>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-white/10">
              {profile.applications.map((app) => (
                <div key={app.id} className="py-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#0B2545] dark:text-white">
                      {app.companyName} — {app.roleTitle}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Applied {app.appliedAt} · Match {app.matchAtApply}% · Status:{' '}
                      <strong className="text-emerald-700 dark:text-amber-400">{app.status}</strong>
                      {app.resumeVersionTitle ? ` · Resume: ${app.resumeVersionTitle}` : ''}
                    </p>
                  </div>
                  {app.status !== 'Withdrawn' && (
                    <button
                      type="button"
                      onClick={() => handleWithdrawApplication(app.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-amber-700"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Withdraw</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'saved' && (
        <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
            <Bookmark className="w-5 h-5" />
            <span>Saved Jobs</span>
          </h2>
          {savedJobs.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Bookmark roles in Find Jobs & Fairs to compare salaries and readiness before applying.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedJobs.map((co) => (
                <div key={co.id} className="rounded-xl bg-[#F4F7FB] dark:bg-[#05070B] p-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#0B2545] dark:text-white">{co.companyName}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {co.roleTitle} · {co.city}, {co.country}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleSaveJob(co.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-[#1E3A5F]/70"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'internships' && (
        <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                <span>Internships & PPO Tracker</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Virtual, paid, unpaid & summer internships mapped to your verified skills ({(profile.internshipExperience || []).length} logged).
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogInternshipCompletion}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Award className="w-4 h-4" />
              <span>Claim Internship Certificate</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {[
              {
                title: 'Full Stack Product Internship (Paid · 6 Months)',
                stipend: 'INR 35,000 / mo · Remote',
                skills: 'React · TypeScript · SQL',
              },
              {
                title: 'AI & LLM Evaluation Virtual Cohort (Stipend · 3 Months)',
                stipend: 'INR 25,000 / mo · Virtual',
                skills: 'Python · LLM Agents',
              },
              {
                title: 'Open-Source Cloud Engineering Fellowship (Unpaid Credit)',
                stipend: 'Academic Credits + Verified Certificate · 8 Weeks',
                skills: 'Docker · Linux · CI/CD',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl bg-[#F4F7FB] dark:bg-[#05070B] p-4 space-y-2">
                <p className="font-bold text-[#0B2545] dark:text-white text-sm">{item.title}</p>
                <p className="text-emerald-700 dark:text-amber-400 font-medium">{item.stipend}</p>
                <p className="text-slate-500 dark:text-slate-400">{item.skills}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'drives' && (
        <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            <span>Campus Placement & Off-Campus Drives</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLACEMENT_DRIVES_CATALOG.map((drive) => {
              const elig = evaluateDriveEligibility(drive, profile);
              const registered = registeredDrives.has(drive.id);
              return (
                <div
                  key={drive.id}
                  className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-4 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold text-emerald-700 dark:text-amber-400">
                      {drive.driveType} · {drive.date}
                    </p>
                    <h3 className="font-display text-sm font-bold text-[#0B2545] dark:text-white">
                      {drive.companyName}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Roles: {drive.roles.join(', ')} · {drive.packageRange}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {drive.location}
                    </p>
                    <p
                      className={`text-[11px] font-medium ${
                        elig.eligible
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {elig.reason}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!elig.eligible}
                    onClick={() => handleRegisterDrive(drive.id, drive.companyName)}
                    className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors ${
                      registered
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#0B2545] text-white dark:bg-[#1D4ED8] disabled:opacity-50'
                    }`}
                  >
                    {registered ? 'Registered for Drive' : 'Apply / Register Drive'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {tab === 'fairs' && (
        <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            <span>Virtual Career Fairs & Hiring Summits</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {VIRTUAL_CAREER_FAIRS_CATALOG.map((fair) => {
              const joined = registeredFairs.has(fair.id);
              return (
                <div
                  key={fair.id}
                  className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-5 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-emerald-700 dark:text-amber-400">
                      {fair.status} · {fair.boothsCount} Recruiter Booths
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      {fair.date}
                    </span>
                  </div>
                  <h3 className="font-display text-base font-bold text-[#0B2545] dark:text-white">
                    {fair.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Exhibitors: {fair.participatingCompanies.join(' · ')} ({fair.focusRegion})
                  </p>
                  <button
                    type="button"
                    onClick={() => handleRegisterFair(fair.id, fair.title)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold ${
                      joined
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#0B2545] text-white dark:bg-[#1D4ED8]'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{joined ? 'Booth Pass Active' : 'Reserve Booth Pass'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

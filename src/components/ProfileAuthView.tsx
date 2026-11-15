import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Calendar,
  Check,
  Copy,
  ExternalLink,
  FolderGit2,
  LogIn,
  LogOut,
  Plus,
  Search,
  Target,
  Trash2,
} from 'lucide-react';
import { searchIssuers } from '../data/issuersCatalog';
import {
  evaluateCertificationExpiry,
  getAlertWorthyCertifications,
  sanitizeIsoDate,
} from '../utils/certExpiry';
import { sanitizeExternalUrl } from '../utils/validation';
import { IssuerLogo } from './IssuerLogo';
import { ProfileCompletionCard } from './profile/ProfileCompletionCard';
import { ProfileIdentityCard } from './profile/ProfileIdentityCard';
import { ProfileEducationSkillsSection } from './profile/ProfileEducationSkillsSection';
import { ProfileExperienceAwardsSection } from './profile/ProfileExperienceAwardsSection';
import { ProfilePreferencesResumeSection } from './profile/ProfilePreferencesResumeSection';
import { AccountSecuritySection } from './profile/AccountSecuritySection';
import type { CareerRole, SkillMatchBreakdown, UserProfile } from '../types';

interface ProfileAuthViewProps {
  profile: UserProfile;
  roles: CareerRole[];
  match: SkillMatchBreakdown;
  sessionToken?: string;
  onUpdateProfile: (next: UserProfile) => void;
  onProfilePatched?: (next: UserProfile) => void;
  onAccountDeleted?: () => void;
  onSessionRevoked?: () => void;
  onSignOut: () => void;
  onResetDemo: () => void;
  onVerifySkill: (skillName: string) => void;
  onOpenAuthModal: () => void;
}

export function ProfileAuthView({
  profile,
  roles,
  match,
  sessionToken = '',
  onUpdateProfile,
  onProfilePatched,
  onAccountDeleted,
  onSessionRevoked,
  onSignOut,
  onResetDemo,
  onVerifySkill,
  onOpenAuthModal,
}: ProfileAuthViewProps) {
  // Add certification
  const [certTitle, setCertTitle] = useState('');
  const [certIssuer, setCertIssuer] = useState('');
  const [certIssuerLogoId, setCertIssuerLogoId] = useState('');
  const [certCredentialUrl, setCertCredentialUrl] = useState('');
  const [issuerSearchInput, setIssuerSearchInput] = useState('');
  const [issuerAppliedQuery, setIssuerAppliedQuery] = useState('');
  const [certYear, setCertYear] = useState('2026');
  const [certExpiryDate, setCertExpiryDate] = useState('');
  const [editingCertId, setEditingCertId] = useState<string | null>(null);
  const [editingExpiryDate, setEditingExpiryDate] = useState('');

  const matchingIssuers = useMemo(
    () => searchIssuers(issuerAppliedQuery),
    [issuerAppliedQuery],
  );

  const alertWorthyCerts = useMemo(
    () => getAlertWorthyCertifications(profile.certifications),
    [profile.certifications],
  );

  // Add project
  const [projTitle, setProjTitle] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projSkills, setProjSkills] = useState('');
  const [projRepo, setProjRepo] = useState('');

  // Add goal
  const [goalInput, setGoalInput] = useState('');
  const [copiedReadme, setCopiedReadme] = useState(false);

  const currentRole = roles.find((r) => r.id === profile.targetCareerId) ?? roles[0];

  const handleAddCertification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!certTitle.trim() || !certIssuer.trim()) return;
    const safeUrl = sanitizeExternalUrl(certCredentialUrl);
    const safeExpiry = sanitizeIsoDate(certExpiryDate);
    onUpdateProfile({
      ...profile,
      certifications: [
        ...profile.certifications,
        {
          id: `cert-${Date.now()}`,
          title: certTitle.trim(),
          issuer: certIssuer.trim(),
          year: certYear.trim() || '2026',
          expiryDate: safeExpiry,
          credentialUrl: safeUrl || undefined,
          issuerLogoId: certIssuerLogoId || undefined,
        },
      ],
    });
    if (!profile.isSignedIn) return;
    setCertTitle('');
    setCertIssuer('');
    setCertIssuerLogoId('');
    setCertCredentialUrl('');
    setCertExpiryDate('');
  };

  const handleSaveEditedExpiry = (certId: string) => {
    const safeExpiry = sanitizeIsoDate(editingExpiryDate);
    onUpdateProfile({
      ...profile,
      certifications: profile.certifications.map((c) =>
        c.id === certId ? { ...c, expiryDate: safeExpiry } : c,
      ),
    });
    if (!profile.isSignedIn) return;
    setEditingCertId(null);
    setEditingExpiryDate('');
  };

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projTitle.trim() || !projDesc.trim()) return;
    onUpdateProfile({
      ...profile,
      projects: [
        ...profile.projects,
        {
          id: `proj-${Date.now()}`,
          title: projTitle.trim(),
          description: projDesc.trim(),
          skillsUsed: projSkills
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          repoUrl: sanitizeExternalUrl(projRepo) || undefined,
        },
      ],
    });
    if (!profile.isSignedIn) return;
    setProjTitle('');
    setProjDesc('');
    setProjSkills('');
    setProjRepo('');
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalInput.trim()) return;
    onUpdateProfile({
      ...profile,
      careerGoals: [...profile.careerGoals, goalInput.trim()],
    });
    if (!profile.isSignedIn) return;
    setGoalInput('');
  };

  const copyPortfolioMarkdown = async () => {
    const md = `# ${profile.name || 'Learner'} — Career Readiness Passport
Role: ${profile.role || 'student'} | Target Career: ${currentRole.title} (${match.overallReadinessPct}% Ready)
Skills: ${profile.skills.map((s) => `${s.name} (${s.level}%)`).join(', ')}
Certifications: ${profile.certifications.map((c) => `${c.title} - ${c.issuer} (${c.year})`).join('; ')}
Projects: ${profile.projects.map((p) => `${p.title}: ${p.description}`).join('; ')}`;
    try {
      await navigator.clipboard.writeText(md);
      setCopiedReadme(true);
      setTimeout(() => setCopiedReadme(false), 2500);
    } catch {
      // Fallback ignored in restricted clipboard contexts
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Header & Account Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0B2545] dark:text-white">
            Career Profile &amp; Account Security
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Manage your identity, academic credentials, technical &amp; soft skills, experience,
            uploaded resume, 2FA, and active devices.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={copyPortfolioMarkdown}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            {copiedReadme ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedReadme ? 'Copied GitHub Summary' : 'Export GitHub Summary'}</span>
          </button>

          {profile.isSignedIn && (
            <button
              type="button"
              onClick={onResetDemo}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              Clear Workspace
            </button>
          )}

          {profile.isSignedIn ? (
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#0F213E] dark:hover:bg-[#1E3A5F]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Register</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Profile Completion Indicator */}
      <ProfileCompletionCard profile={profile} />

      {/* 3. Profile Identity, Avatar, Contact, Links & Visibility */}
      <ProfileIdentityCard profile={profile} roles={roles} onUpdateProfile={onUpdateProfile} />

      {/* 4. Personal Career Goals */}
      <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#0B2545] dark:text-amber-400" />
            <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
              Personal Career Goals ({profile.careerGoals.length})
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Your AI Mentor &amp; Curriculum Agent align recommendations around these concrete
            milestones.
          </p>
        </div>

        {profile.careerGoals.length > 0 && (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {profile.careerGoals.map((goal, idx) => (
              <li
                key={`${goal}-${idx}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-200"
              >
                <span>{goal}</span>
                <button
                  type="button"
                  aria-label={`Remove goal ${goal}`}
                  onClick={() =>
                    onUpdateProfile({
                      ...profile,
                      careerGoals: profile.careerGoals.filter((_, i) => i !== idx),
                    })
                  }
                  className="text-slate-400 hover:text-[#0B2545] dark:hover:text-amber-400 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleAddGoal} className="flex gap-2">
          <input
            type="text"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            placeholder="Add a career goal (e.g., Land a Full Stack internship by May)"
            aria-label="New career goal"
            className="flex-1 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add Goal</span>
          </button>
        </form>
      </section>

      {/* 5. Education, Technical/Non-Technical/Soft Skills & Languages */}
      <ProfileEducationSkillsSection
        profile={profile}
        onUpdateProfile={onUpdateProfile}
        onVerifySkill={onVerifySkill}
      />

      {/* 6. Work Experience, Internships & Achievements */}
      <ProfileExperienceAwardsSection profile={profile} onUpdateProfile={onUpdateProfile} />

      {/* 7. Certifications (with Expiry Tracking) & Projects Portfolio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Certifications */}
        <section
          id="certifications-section"
          className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
                Certifications ({profile.certifications.length})
              </h2>
            </div>
            {alertWorthyCerts.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:text-amber-300">
                <AlertTriangle className="w-3 h-3" />
                <span>
                  {alertWorthyCerts.length} Expiry Alert
                  {alertWorthyCerts.length === 1 ? '' : 's'}
                </span>
              </span>
            )}
          </div>

          {alertWorthyCerts.length > 0 && (
            <div
              role="alert"
              data-testid="cert-expiry-alert-banner"
              className="rounded-xl border border-amber-500/45 bg-amber-50 dark:bg-amber-500/10 p-3.5 space-y-2"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-xs font-bold text-amber-950 dark:text-amber-200">
                    Certificate Expiration Alert (Within 30 Days)
                  </p>
                  <ul className="space-y-1.5">
                    {alertWorthyCerts.map(({ cert, evaluation }) => (
                      <li
                        key={`alert-${cert.id}`}
                        className="flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-100"
                      >
                        <span>
                          <strong>{cert.title}</strong> ({cert.issuer}) —{' '}
                          <span className="font-semibold">
                            {evaluation.label} ({cert.expiryDate})
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCertId(cert.id);
                            setEditingExpiryDate(cert.expiryDate || '');
                          }}
                          className="text-[11px] font-semibold underline text-[#0B2545] dark:text-amber-300 hover:opacity-80"
                        >
                          Renew / Update
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            {profile.certifications.map((cert) => {
              const safeUrl = sanitizeExternalUrl(cert.credentialUrl);
              const expiryEval = evaluateCertificationExpiry(cert);
              const isEditingThis = editingCertId === cert.id;
              return (
                <div
                  key={cert.id}
                  className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-3.5 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <IssuerLogo
                        issuerName={cert.issuer}
                        issuerLogoId={cert.issuerLogoId}
                        size="sm"
                      />
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {cert.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {cert.issuer} · {cert.year}
                        </p>
                        {cert.expiryDate && (
                          <div className="pt-0.5">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                                expiryEval.status === 'expired'
                                  ? 'border-rose-500/40 bg-rose-500/15 text-rose-800 dark:text-rose-300'
                                  : expiryEval.status === 'expiring-soon'
                                    ? 'border-amber-500/45 bg-amber-500/15 text-amber-900 dark:text-amber-300'
                                    : 'border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                              }`}
                            >
                              <Calendar className="w-3 h-3 shrink-0" />
                              <span>
                                {expiryEval.label}
                                {expiryEval.status === 'expiring-soon' ||
                                expiryEval.status === 'expired'
                                  ? ` · ${cert.expiryDate}`
                                  : ''}
                              </span>
                            </span>
                          </div>
                        )}
                        {safeUrl && (
                          <a
                            href={safeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-amber-400 hover:underline truncate max-w-full"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span>Verify Credential</span>
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        aria-label={`Edit expiry date for ${cert.title}`}
                        onClick={() => {
                          if (isEditingThis) {
                            setEditingCertId(null);
                            setEditingExpiryDate('');
                          } else {
                            setEditingCertId(cert.id);
                            setEditingExpiryDate(cert.expiryDate || '');
                          }
                        }}
                        className="px-2 py-1 rounded-md text-[11px] font-semibold border border-slate-300 dark:border-[#1E3A5F]/70 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-[#0A1628]"
                      >
                        {cert.expiryDate ? 'Edit Expiry' : 'Set Expiry'}
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete certification ${cert.title}`}
                        onClick={() =>
                          onUpdateProfile({
                            ...profile,
                            certifications: profile.certifications.filter((c) => c.id !== cert.id),
                          })
                        }
                        className="text-slate-400 hover:text-[#0B2545] dark:hover:text-amber-400 p-1 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {isEditingThis && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                      <label
                        htmlFor={`edit-expiry-${cert.id}`}
                        className="text-[11px] font-medium text-slate-600 dark:text-slate-300"
                      >
                        Expiry Date
                      </label>
                      <input
                        id={`edit-expiry-${cert.id}`}
                        type="date"
                        value={editingExpiryDate}
                        onChange={(e) => setEditingExpiryDate(e.target.value)}
                        aria-label={`Update expiry date for ${cert.title}`}
                        className="rounded-md border border-slate-300 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#0A1628] px-2.5 py-1 text-xs text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEditedExpiry(cert.id)}
                        className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-[#1D4ED8]"
                      >
                        Save Expiry
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCertId(null);
                          setEditingExpiryDate('');
                        }}
                        className="px-2 py-1 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <form
            onSubmit={handleAddCertification}
            className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-white/10"
          >
            <input
              type="text"
              value={certTitle}
              onChange={(e) => setCertTitle(e.target.value)}
              placeholder="Certification title (e.g., AWS Cloud Practitioner)"
              aria-label="Certification title"
              className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
            />

            <div className="rounded-lg border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-2.5 space-y-2">
              <div className="flex gap-1.5">
                <input
                  type="search"
                  value={issuerSearchInput}
                  onChange={(e) => {
                    setIssuerSearchInput(e.target.value);
                    if (!e.target.value.trim()) setIssuerAppliedQuery('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setIssuerAppliedQuery(issuerSearchInput);
                    }
                  }}
                  placeholder="Search issuer with company logo (AWS, Google, Microsoft, Meta, Coursera)..."
                  aria-label="Search certification issuer"
                  className="flex-1 rounded-md border border-slate-300 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#0A1628] px-2.5 py-1 text-xs text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setIssuerAppliedQuery(issuerSearchInput)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#0B2545] text-white dark:bg-[#1D4ED8]"
                >
                  <Search className="w-3 h-3" />
                  <span>Search</span>
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-28 overflow-y-auto">
                {matchingIssuers.slice(0, 12).map((iss) => {
                  const selected = certIssuerLogoId === iss.id || certIssuer === iss.name;
                  return (
                    <button
                      key={iss.id}
                      type="button"
                      onClick={() => {
                        setCertIssuer(iss.name);
                        setCertIssuerLogoId(iss.id);
                      }}
                      className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-[11px] font-medium transition-colors ${
                        selected
                          ? 'border-emerald-600 bg-emerald-50 dark:border-amber-400 dark:bg-[#0F213E] text-[#0B2545] dark:text-white'
                          : 'border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] text-slate-700 dark:text-slate-200 hover:border-[#0B2545]'
                      }`}
                    >
                      <IssuerLogo issuerName={iss.name} issuerLogoId={iss.id} size="sm" />
                      <span className="truncate">{iss.shortName}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={certIssuer}
                onChange={(e) => {
                  setCertIssuer(e.target.value);
                  setCertIssuerLogoId('');
                }}
                placeholder="Issuer (or pick logo above)"
                aria-label="Certification issuer"
                className="flex-1 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
              <input
                type="text"
                value={certYear}
                onChange={(e) => setCertYear(e.target.value)}
                placeholder="Year"
                aria-label="Certification year"
                className="w-24 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm tabular-nums text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-5">
                <label
                  htmlFor="cert-expiry-date"
                  className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1"
                >
                  Expiry Date (Optional)
                </label>
                <input
                  id="cert-expiry-date"
                  name="expiryDate"
                  type="date"
                  value={certExpiryDate}
                  onChange={(e) => setCertExpiryDate(e.target.value)}
                  aria-label="Certification expiry date"
                  className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div className="sm:col-span-7 flex flex-col justify-end">
                <label
                  htmlFor="cert-credential-url"
                  className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1"
                >
                  Credential Website URL (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    id="cert-credential-url"
                    type="url"
                    value={certCredentialUrl}
                    onChange={(e) => setCertCredentialUrl(e.target.value)}
                    placeholder="https://..."
                    aria-label="Certification credential website URL"
                    className="flex-1 min-w-0 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] whitespace-nowrap"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </form>
        </section>

        {/* Projects */}
        <section
          id="projects-section"
          className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4"
        >
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
              Projects Completed ({profile.projects.length})
            </h2>
          </div>

          <div className="space-y-2.5">
            {profile.projects.map((proj) => {
              const safeRepo = sanitizeExternalUrl(proj.repoUrl);
              return (
                <div
                  key={proj.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-3.5"
                >
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {proj.title}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{proj.description}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Stack: {proj.skillsUsed.join(' · ') || 'General'}
                    </p>
                    {safeRepo && (
                      <a
                        href={safeRepo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-amber-400 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>View Repository</span>
                      </a>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label={`Delete project ${proj.title}`}
                    onClick={() =>
                      onUpdateProfile({
                        ...profile,
                        projects: profile.projects.filter((p) => p.id !== proj.id),
                      })
                    }
                    className="text-slate-400 hover:text-[#0B2545] dark:hover:text-amber-400 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          <form
            onSubmit={handleAddProject}
            className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-white/10"
          >
            <input
              type="text"
              value={projTitle}
              onChange={(e) => setProjTitle(e.target.value)}
              placeholder="Project title (e.g., AI Habit Tracker)"
              aria-label="Project title"
              className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
            <input
              type="text"
              value={projDesc}
              onChange={(e) => setProjDesc(e.target.value)}
              placeholder="Short outcome description"
              aria-label="Project description"
              className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
            <input
              type="url"
              value={projRepo}
              onChange={(e) => setProjRepo(e.target.value)}
              placeholder="Repository or live URL (optional, https://...)"
              aria-label="Project repository URL"
              className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={projSkills}
                onChange={(e) => setProjSkills(e.target.value)}
                placeholder="Skills comma-separated (React, SQL)"
                aria-label="Project skills"
                className="flex-1 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] whitespace-nowrap"
              >
                Add Project
              </button>
            </div>
          </form>
        </section>
      </div>

      {/* 8. Career Interests, Preferred Roles, Compensation, Work Mode & Resume Upload */}
      <ProfilePreferencesResumeSection
        profile={profile}
        roles={roles}
        onUpdateProfile={onUpdateProfile}
      />

      {/* 9. Account Security, Email/Phone Verification, 2FA, Multi-Device Sessions & Deletion */}
      <AccountSecuritySection
        profile={profile}
        sessionToken={sessionToken}
        onProfilePatched={onProfilePatched ?? onUpdateProfile}
        onAccountDeleted={onAccountDeleted ?? onSignOut}
        onSessionRevoked={onSessionRevoked ?? onSignOut}
        onOpenAuthModal={onOpenAuthModal}
      />
    </div>
  );
}

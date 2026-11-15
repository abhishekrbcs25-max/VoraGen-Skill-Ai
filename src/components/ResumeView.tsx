import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileText,
  FolderGit2,
  GraduationCap,
  Plus,
  Printer,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react';
import { findIssuerByNameOrId, searchIssuers } from '../data/issuersCatalog';
import { sanitizeIsoDate } from '../utils/certExpiry';
import {
  RESUME_TEMPLATE_META,
  generateCoverLetterDraft,
  scoreResumeAtsAndGrammar,
} from '../utils/platformEngines';
import {
  buildResumeMarkdown,
  calculateResumeCompleteness,
  draftResumeSummary,
  sortEducationEntries,
} from '../utils/resumeHelpers';
import { sanitizeExternalUrl } from '../utils/validation';
import { IssuerLogo } from './IssuerLogo';
import type {
  CareerRole,
  CoverLetterItem,
  EducationEntry,
  ResumeTemplateId,
  ResumeVersion,
  UserProfile,
  UserSkill,
} from '../types';

interface ResumeViewProps {
  profile: UserProfile;
  targetRole: CareerRole;
  onUpdateProfile: (next: UserProfile) => void;
  onNotifyUpdate?: (title: string, detail: string) => void;
  onOpenAuthModal?: () => void;
}

export function ResumeView({
  profile,
  targetRole,
  onUpdateProfile,
  onNotifyUpdate,
  onOpenAuthModal,
}: ResumeViewProps) {
  // Draft contact & summary fields so signed-out visitors are never interrupted mid-keystroke
  const [draftName, setDraftName] = useState(profile.name);
  const [draftHeadline, setDraftHeadline] = useState(profile.headline);
  const [draftEmail, setDraftEmail] = useState(profile.email);
  const [draftPhone, setDraftPhone] = useState(profile.phone || '');
  const [draftLocation, setDraftLocation] = useState(profile.location || '');
  const [draftGithubUrl, setDraftGithubUrl] = useState(profile.githubUrl || '');
  const [draftSummary, setDraftSummary] = useState(profile.resumeSummary || '');
  const [contactSaved, setContactSaved] = useState(false);

  useEffect(() => {
    setDraftName(profile.name);
    setDraftHeadline(profile.headline);
    setDraftEmail(profile.email);
    setDraftPhone(profile.phone || '');
    setDraftLocation(profile.location || '');
    setDraftGithubUrl(profile.githubUrl || '');
    setDraftSummary(profile.resumeSummary || '');
  }, [
    profile.name,
    profile.headline,
    profile.email,
    profile.phone,
    profile.location,
    profile.githubUrl,
    profile.resumeSummary,
    profile.isSignedIn,
  ]);

  // Education form
  const [institution, setInstitution] = useState('');
  const [degree, setDegree] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [startYear, setStartYear] = useState('');
  const [endYear, setEndYear] = useState('');
  const [gpaOrScore, setGpaOrScore] = useState('');
  const [eduHighlights, setEduHighlights] = useState('');

  // Skill quick-add form
  const [skillName, setSkillName] = useState('');
  const [skillCategory, setSkillCategory] = useState<UserSkill['category']>('Frontend');
  const [skillLevel, setSkillLevel] = useState(75);

  // Project quick-add form
  const [projTitle, setProjTitle] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projSkills, setProjSkills] = useState('');
  const [projRepo, setProjRepo] = useState('');

  // Certification quick-add form
  const [certTitle, setCertTitle] = useState('');
  const [certIssuer, setCertIssuer] = useState('');
  const [certIssuerLogoId, setCertIssuerLogoId] = useState('');
  const [certYear, setCertYear] = useState('2026');
  const [certExpiryDate, setCertExpiryDate] = useState('');
  const [certCredentialId, setCertCredentialId] = useState('');
  const [certCredentialUrl, setCertCredentialUrl] = useState('');
  const [issuerSearchInput, setIssuerSearchInput] = useState('');
  const [issuerAppliedQuery, setIssuerAppliedQuery] = useState('');

  const matchingIssuers = useMemo(
    () => searchIssuers(issuerAppliedQuery),
    [issuerAppliedQuery],
  );

  const [copiedMd, setCopiedMd] = useState(false);

  // Resume Templates, Multiple Versions, ATS Optimizer & Cover Letter Generator state
  const activeTemplate: ResumeTemplateId = profile.resumeTemplate || 'classic-executive';
  const [versionTitle, setVersionTitle] = useState(`${targetRole.title} v1`);
  const [atsTargetJd, setAtsTargetJd] = useState(
    `Seeking ${targetRole.title} proficient in ${targetRole.requiredSkills.map((s) => s.name).join(', ')}.`,
  );
  const [clCompany, setClCompany] = useState('Google');
  const [clRole, setClRole] = useState(targetRole.title);
  const [clTone, setClTone] = useState<CoverLetterItem['tone']>('Impact-Driven');
  const [clDraft, setClDraft] = useState('');
  const [copiedCl, setCopiedCl] = useState(false);

  const previewProfile = useMemo<UserProfile>(
    () => ({
      ...profile,
      name: draftName,
      headline: draftHeadline,
      email: draftEmail,
      phone: draftPhone,
      location: draftLocation,
      githubUrl: draftGithubUrl,
      resumeSummary: draftSummary,
    }),
    [profile, draftName, draftHeadline, draftEmail, draftPhone, draftLocation, draftGithubUrl, draftSummary],
  );

  const educationHistory = useMemo(
    () => sortEducationEntries(profile.educationHistory || []),
    [profile.educationHistory],
  );

  const completeness = useMemo(() => calculateResumeCompleteness(previewProfile), [previewProfile]);

  const resumeMarkdown = useMemo(
    () => buildResumeMarkdown(previewProfile, targetRole.title),
    [previewProfile, targetRole.title],
  );

  const atsAnalysis = useMemo(
    () => scoreResumeAtsAndGrammar(previewProfile, atsTargetJd),
    [previewProfile, atsTargetJd],
  );

  const handleSelectTemplate = (tpl: ResumeTemplateId) => {
    onUpdateProfile({ ...previewProfile, resumeTemplate: tpl });
  };

  const handleSaveResumeVersion = (e: React.FormEvent) => {
    e.preventDefault();
    const title = versionTitle.trim() || `${targetRole.title} Snapshot`;
    const newVersion: ResumeVersion = {
      id: `rv-${Date.now()}`,
      title,
      template: activeTemplate,
      updatedAt: new Date().toISOString().split('T')[0],
      headline: previewProfile.headline,
      summary: previewProfile.resumeSummary || '',
      skillsSnapshot: previewProfile.skills.map((s) => s.name),
      atsScore: atsAnalysis.atsScorePct,
    };
    onUpdateProfile({
      ...previewProfile,
      resumeVersions: [newVersion, ...(profile.resumeVersions || [])],
    });
    if (profile.isSignedIn) {
      onNotifyUpdate?.('Resume Version Saved', `Saved "${title}" (${atsAnalysis.atsScorePct}% ATS fit).`);
    }
  };

  const handleLoadResumeVersion = (ver: ResumeVersion) => {
    setDraftHeadline(ver.headline);
    setDraftSummary(ver.summary);
    onUpdateProfile({
      ...previewProfile,
      resumeTemplate: ver.template,
      headline: ver.headline,
      resumeSummary: ver.summary,
    });
  };

  const handleGenerateCoverLetter = (e: React.FormEvent) => {
    e.preventDefault();
    const draft = generateCoverLetterDraft({
      candidateName: previewProfile.name || 'Candidate',
      companyName: clCompany,
      roleTitle: clRole,
      tone: clTone,
      topSkills: previewProfile.skills.map((s) => s.name),
      highlightProject: previewProfile.projects[0]?.title,
    });
    setClDraft(draft);
  };

  const handleSaveCoverLetter = () => {
    if (!clDraft.trim()) return;
    const item: CoverLetterItem = {
      id: `cl-${Date.now()}`,
      title: `${clCompany} · ${clRole}`,
      companyName: clCompany,
      roleTitle: clRole,
      tone: clTone,
      content: clDraft,
      createdAt: new Date().toISOString().split('T')[0],
    };
    onUpdateProfile({
      ...previewProfile,
      coverLetters: [item, ...(profile.coverLetters || [])],
    });
    if (profile.isSignedIn) {
      onNotifyUpdate?.('Cover Letter Saved', `Saved tailored cover letter for ${clCompany}.`);
    }
  };

  const updateDraftAndSync = (patch: Partial<UserProfile>) => {
    const merged: UserProfile = {
      ...previewProfile,
      ...patch,
    };
    if ('name' in patch) setDraftName(merged.name);
    if ('headline' in patch) setDraftHeadline(merged.headline);
    if ('email' in patch) setDraftEmail(merged.email);
    if ('phone' in patch) setDraftPhone(merged.phone || '');
    if ('location' in patch) setDraftLocation(merged.location || '');
    if ('githubUrl' in patch) setDraftGithubUrl(merged.githubUrl || '');
    if ('resumeSummary' in patch) setDraftSummary(merged.resumeSummary || '');
    if (profile.isSignedIn) {
      onUpdateProfile(merged);
    }
  };

  const handleSaveContactSummary = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(previewProfile);
    if (!profile.isSignedIn) return;
    setContactSaved(true);
    setTimeout(() => setContactSaved(false), 2000);
    onNotifyUpdate?.('Resume Contact Saved', 'Updated contact header and professional summary.');
  };

  const handleAddEducation = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInst = institution.trim();
    const cleanDegree = degree.trim();
    if (!cleanInst || !cleanDegree) return;

    const entry: EducationEntry = {
      id: `edu-${Date.now()}`,
      institution: cleanInst,
      degree: cleanDegree,
      fieldOfStudy: fieldOfStudy.trim(),
      startYear: startYear.trim() || '2022',
      endYear: endYear.trim() || '2026',
      gpaOrScore: gpaOrScore.trim() || undefined,
      highlights: eduHighlights.trim() || undefined,
    };

    const nextHistory = [entry, ...(profile.educationHistory || [])];
    const primaryEduLabel = `${entry.degree}${entry.fieldOfStudy ? ` · ${entry.fieldOfStudy}` : ''} — ${entry.institution}`;

    onUpdateProfile({
      ...profile,
      educationHistory: nextHistory,
      education: profile.education.trim() || primaryEduLabel,
    });
    if (!profile.isSignedIn) return;
    onNotifyUpdate?.(
      'Resume Education Added',
      `${entry.degree} at ${entry.institution} added to your Resume.`,
    );

    setInstitution('');
    setDegree('');
    setFieldOfStudy('');
    setStartYear('');
    setEndYear('');
    setGpaOrScore('');
    setEduHighlights('');
  };

  const handleRemoveEducation = (id: string) => {
    const nextHistory = (profile.educationHistory || []).filter((e) => e.id !== id);
    onUpdateProfile({
      ...profile,
      educationHistory: nextHistory,
    });
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = skillName.trim();
    if (!trimmed) return;
    const exists = profile.skills.some((s) => s.name.toLowerCase() === trimmed.toLowerCase());
    const updatedSkills = exists
      ? profile.skills.map((s) =>
          s.name.toLowerCase() === trimmed.toLowerCase()
            ? { ...s, level: skillLevel, category: skillCategory }
            : s,
        )
      : [
          ...profile.skills,
          { name: trimmed, level: skillLevel, category: skillCategory, verified: false },
        ];
    onUpdateProfile({ ...profile, skills: updatedSkills });
    if (!profile.isSignedIn) return;
    onNotifyUpdate?.('Resume Skill Updated', `${trimmed} (${skillLevel}%) added to Skills Gained.`);
    setSkillName('');
  };

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = projTitle.trim();
    const cleanDesc = projDesc.trim();
    if (!cleanTitle || !cleanDesc) return;

    onUpdateProfile({
      ...profile,
      projects: [
        {
          id: `proj-${Date.now()}`,
          title: cleanTitle,
          description: cleanDesc,
          skillsUsed: projSkills
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          repoUrl: projRepo.trim() || undefined,
        },
        ...profile.projects,
      ],
    });
    if (!profile.isSignedIn) return;
    onNotifyUpdate?.('Resume Project Added', `${cleanTitle} added to your Resume portfolio.`);
    setProjTitle('');
    setProjDesc('');
    setProjSkills('');
    setProjRepo('');
  };

  const handleAddCertification = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = certTitle.trim();
    const cleanIssuer = certIssuer.trim();
    if (!cleanTitle || !cleanIssuer) return;
    const safeUrl = sanitizeExternalUrl(certCredentialUrl);
    const safeExpiry = sanitizeIsoDate(certExpiryDate);
    const resolved = findIssuerByNameOrId(cleanIssuer, certIssuerLogoId);

    onUpdateProfile({
      ...profile,
      certifications: [
        {
          id: `cert-${Date.now()}`,
          title: cleanTitle,
          issuer: cleanIssuer,
          year: certYear.trim() || '2026',
          expiryDate: safeExpiry,
          credentialId: certCredentialId.trim() || undefined,
          credentialUrl: safeUrl || undefined,
          issuerLogoId: certIssuerLogoId || resolved?.id || undefined,
        },
        ...profile.certifications,
      ],
    });
    if (!profile.isSignedIn) return;
    onNotifyUpdate?.(
      'Resume Certification Added',
      `${cleanTitle} (${cleanIssuer}) added to Certifications Obtained.`,
    );
    setCertTitle('');
    setCertIssuer('');
    setCertIssuerLogoId('');
    setCertYear('2026');
    setCertExpiryDate('');
    setCertCredentialId('');
    setCertCredentialUrl('');
  };

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(resumeMarkdown);
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2500);
    } catch {
      // Clipboard blocked
    }
  };

  const handleDownloadMarkdown = () => {
    const slug = (profile.name.trim() || 'voragen-resume').toLowerCase().replace(/\s+/g, '-');
    const blob = new Blob([resumeMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${slug}-resume.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleAutoDraftSummary = () => {
    const summary = draftResumeSummary(previewProfile, targetRole.title);
    setDraftSummary(summary);
    onUpdateProfile({ ...previewProfile, resumeSummary: summary });
  };

  return (
    <div className="space-y-8">
      {/* Header & Export Toolbar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-[#1E3A5F]/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#0B2545] dark:text-amber-400">
            <FileText className="w-4 h-4" />
            <span>Resume Builder &amp; ATS CV Studio</span>
          </div>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#0B2545] dark:text-white">
            Create &amp; Export Your Resume
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Enter your educational background, skills gained, projects, and certifications obtained. Every edit saves directly to your private account.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopyMarkdown}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-[#1E3A5F]/70 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            {copiedMd ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedMd ? 'Copied Markdown' : 'Copy Markdown'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadMarkdown}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-[#1E3A5F]/70 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .md</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>

      {!profile.isSignedIn && (
        <div className="no-print rounded-2xl border border-amber-500/35 bg-amber-500/10 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-amber-950 dark:text-amber-200">
              Sign in required to save or update your resume
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-300/90">
              You can explore the Resume Builder freely. When you add educational background, skills, projects, or certifications, you will be prompted to sign in.
            </p>
          </div>
          {onOpenAuthModal && (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] whitespace-nowrap"
            >
              Sign In / Create Account
            </button>
          )}
        </div>
      )}

      {/* Completeness Bar */}
      <section className="no-print rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
            <span className="text-sm font-semibold text-[#0B2545] dark:text-white">
              Resume Completeness
            </span>
          </div>
          <span className="font-mono text-sm font-bold tabular-nums text-[#0B2545] dark:text-amber-400">
            {completeness.scorePct}% Ready
          </span>
        </div>

        <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#0B2545] via-emerald-600 to-amber-500 dark:from-[#1D4ED8] dark:via-emerald-500 dark:to-amber-400 transition-all duration-300"
            style={{ width: `${completeness.scorePct}%` }}
          />
        </div>

        <div className="flex flex-wrap gap-2 text-[11px]">
          {completeness.completedSections.map((sec) => (
            <span
              key={sec}
              className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 font-medium"
            >
              ✓ {sec}
            </span>
          ))}
          {completeness.missingSections.map((sec) => (
            <span
              key={sec}
              className="px-2.5 py-0.5 rounded-md bg-[#F4F7FB] dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#1E3A5F]/60 font-medium"
            >
              + Add {sec}
            </span>
          ))}
        </div>
      </section>

      {/* Template Switcher & Saved Resume Versions */}
      <section className="no-print rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-sm font-bold text-[#0B2545] dark:text-white">
              ATS Resume Templates &amp; Multiple Versions
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {RESUME_TEMPLATE_META[activeTemplate].description}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(RESUME_TEMPLATE_META) as ResumeTemplateId[]).map((tplId) => (
              <button
                key={tplId}
                type="button"
                onClick={() => handleSelectTemplate(tplId)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  activeTemplate === tplId
                    ? 'bg-[#0B2545] text-white dark:bg-[#1D4ED8]'
                    : 'bg-[#F4F7FB] dark:bg-[#05070B] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#1E3A5F]/60'
                }`}
              >
                {RESUME_TEMPLATE_META[tplId].label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSaveResumeVersion} className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
          <input
            type="text"
            value={versionTitle}
            onChange={(e) => setVersionTitle(e.target.value)}
            placeholder="Version name (e.g., Full Stack Google CV)"
            aria-label="Resume version title"
            className="flex-1 min-w-[200px] rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-1.5 text-xs text-slate-900 dark:text-white"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-[#1D4ED8] whitespace-nowrap"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Version</span>
          </button>
          {(profile.resumeVersions || []).map((ver) => (
            <button
              key={ver.id}
              type="button"
              onClick={() => handleLoadResumeVersion(ver)}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] text-[#0B2545] dark:text-amber-300"
            >
              Load: {ver.title} ({ver.atsScore}%)
            </button>
          ))}
        </form>
      </section>

      {/* Split Layout: Left Editor Forms | Right Live Formatted Sheet */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left: Structured Resume Input Forms */}
        <div className="no-print xl:col-span-6 space-y-6">
          {/* 1. Personal Details & Career Summary */}
          <form
            onSubmit={handleSaveContactSummary}
            className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-[#0B2545] dark:text-amber-400" />
                <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
                  1. Contact &amp; Professional Summary
                </h2>
              </div>
              <button
                type="button"
                onClick={handleAutoDraftSummary}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-300 hover:bg-amber-500/25 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Draft Summary</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="res-name" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  id="res-name"
                  type="text"
                  value={draftName}
                  onChange={(e) => updateDraftAndSync({ name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="res-headline" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Professional Headline
                </label>
                <input
                  id="res-headline"
                  type="text"
                  value={draftHeadline}
                  onChange={(e) => updateDraftAndSync({ headline: e.target.value })}
                  placeholder={`e.g., ${targetRole.title}`}
                  className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="res-email" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email
                </label>
                <input
                  id="res-email"
                  type="email"
                  value={draftEmail}
                  onChange={(e) => updateDraftAndSync({ email: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="res-phone" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  id="res-phone"
                  type="tel"
                  value={draftPhone}
                  onChange={(e) => updateDraftAndSync({ phone: e.target.value })}
                  placeholder="+1 555 010 2026"
                  className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="res-location" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  City / Location
                </label>
                <input
                  id="res-location"
                  type="text"
                  value={draftLocation}
                  onChange={(e) => updateDraftAndSync({ location: e.target.value })}
                  placeholder="Bengaluru, India · Remote"
                  className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="res-github" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  GitHub / Portfolio URL
                </label>
                <input
                  id="res-github"
                  type="text"
                  value={draftGithubUrl}
                  onChange={(e) => updateDraftAndSync({ githubUrl: e.target.value })}
                  placeholder="https://github.com/username"
                  className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label htmlFor="res-summary" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Professional Summary
              </label>
              <textarea
                id="res-summary"
                rows={3}
                value={draftSummary}
                onChange={(e) => updateDraftAndSync({ resumeSummary: e.target.value })}
                placeholder="Write a concise 2–3 sentence summary highlighting your education, verified skills, and project impact..."
                className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] transition-colors"
              >
                {contactSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                <span>
                  {contactSaved
                    ? 'Contact & Summary Saved'
                    : profile.isSignedIn
                      ? 'Save Contact & Summary'
                      : 'Save Contact & Summary (Requires Sign In)'}
                </span>
              </button>
            </div>
          </form>

          {/* 2. Educational Background */}
          <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-emerald-600 dark:text-amber-400" />
              <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
                2. Educational Background ({educationHistory.length})
              </h2>
            </div>

            {educationHistory.length > 0 && (
              <div className="space-y-2.5">
                {educationHistory.map((edu) => (
                  <div
                    key={edu.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-3.5"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {edu.degree}
                        {edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {edu.institution} · {edu.startYear} – {edu.endYear}
                        {edu.gpaOrScore ? ` · ${edu.gpaOrScore}` : ''}
                      </p>
                      {edu.highlights && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{edu.highlights}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove education ${edu.degree} at ${edu.institution}`}
                      onClick={() => handleRemoveEducation(edu.id)}
                      className="text-slate-400 hover:text-[#0B2545] dark:hover:text-amber-400 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddEducation} className="space-y-3 pt-2 border-t border-slate-200 dark:border-[#1E3A5F]/60">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="Institution / University *"
                  aria-label="Education institution"
                  required
                  className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                  placeholder="Degree (e.g., B.Tech, B.Sc, Diploma) *"
                  aria-label="Education degree"
                  required
                  className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <input
                  type="text"
                  value={fieldOfStudy}
                  onChange={(e) => setFieldOfStudy(e.target.value)}
                  placeholder="Field of Study (e.g., Computer Science)"
                  aria-label="Field of study"
                  className="sm:col-span-6 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  value={startYear}
                  onChange={(e) => setStartYear(e.target.value)}
                  placeholder="Start Year"
                  aria-label="Start year"
                  className="sm:col-span-2 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm tabular-nums text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  value={endYear}
                  onChange={(e) => setEndYear(e.target.value)}
                  placeholder="End Year"
                  aria-label="End year"
                  className="sm:col-span-2 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm tabular-nums text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  value={gpaOrScore}
                  onChange={(e) => setGpaOrScore(e.target.value)}
                  placeholder="GPA / %"
                  aria-label="GPA or score"
                  className="sm:col-span-2 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={eduHighlights}
                  onChange={(e) => setEduHighlights(e.target.value)}
                  placeholder="Coursework or academic honors (optional)"
                  aria-label="Education highlights"
                  className="flex-1 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Education</span>
                </button>
              </div>
            </form>
          </section>

          {/* 3. Skills Gained */}
          <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
              <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
                3. Skills Gained ({profile.skills.length})
              </h2>
            </div>

            {profile.skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <span
                    key={skill.name}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] text-xs font-medium text-slate-900 dark:text-white"
                  >
                    <span>
                      {skill.name} ({skill.level}%)
                      {skill.verified ? ' · Verified' : ''}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove resume skill ${skill.name}`}
                      onClick={() =>
                        onUpdateProfile({
                          ...profile,
                          skills: profile.skills.filter((s) => s.name !== skill.name),
                        })
                      }
                      className="text-slate-400 hover:text-[#0B2545] dark:hover:text-amber-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <form onSubmit={handleAddSkill} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-2 border-t border-slate-200 dark:border-[#1E3A5F]/60">
              <input
                type="text"
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
                placeholder="Skill gained (e.g., React, Python, SQL)"
                aria-label="Resume skill name"
                className="sm:col-span-5 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
              <select
                value={skillCategory}
                onChange={(e) => setSkillCategory(e.target.value as UserSkill['category'])}
                aria-label="Resume skill category"
                className="sm:col-span-3 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
              >
                <option value="Frontend">Frontend</option>
                <option value="Backend">Backend</option>
                <option value="Data & AI">Data &amp; AI</option>
                <option value="Cloud & DevOps">Cloud &amp; DevOps</option>
                <option value="Security">Security</option>
                <option value="Foundations">Foundations</option>
              </select>
              <input
                type="number"
                min={10}
                max={100}
                value={skillLevel}
                onChange={(e) => setSkillLevel(Number(e.target.value))}
                aria-label="Resume skill proficiency"
                className="sm:col-span-2 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm tabular-nums text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                className="sm:col-span-2 px-3 py-2 rounded-lg text-sm font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] whitespace-nowrap"
              >
                Add
              </button>
            </form>
          </section>

          {/* 4. Projects */}
          <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4">
            <div className="flex items-center gap-2">
              <FolderGit2 className="w-5 h-5 text-[#0B2545] dark:text-amber-400" />
              <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
                4. Projects ({profile.projects.length})
              </h2>
            </div>

            {profile.projects.length > 0 && (
              <div className="space-y-2.5">
                {profile.projects.map((proj) => (
                  <div
                    key={proj.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-3.5"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{proj.title}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{proj.description}</p>
                      {proj.skillsUsed.length > 0 && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Stack: {proj.skillsUsed.join(' · ')}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove resume project ${proj.title}`}
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
                ))}
              </div>
            )}

            <form onSubmit={handleAddProject} className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-[#1E3A5F]/60">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  value={projTitle}
                  onChange={(e) => setProjTitle(e.target.value)}
                  placeholder="Project title *"
                  aria-label="Resume project title"
                  required
                  className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  value={projRepo}
                  onChange={(e) => setProjRepo(e.target.value)}
                  placeholder="Repo / Live URL (optional)"
                  aria-label="Resume project URL"
                  className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <textarea
                rows={2}
                value={projDesc}
                onChange={(e) => setProjDesc(e.target.value)}
                placeholder="Describe what you built and the measurable impact *"
                aria-label="Resume project description"
                required
                className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={projSkills}
                  onChange={(e) => setProjSkills(e.target.value)}
                  placeholder="Tech stack comma-separated (React, Node.js, PostgreSQL)"
                  aria-label="Resume project tech stack"
                  className="flex-1 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Project</span>
                </button>
              </div>
            </form>
          </section>

          {/* 5. Certifications Obtained */}
          <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
                5. Certifications Obtained ({profile.certifications.length})
              </h2>
            </div>

            {profile.certifications.length > 0 && (
              <div className="space-y-2.5">
                {profile.certifications.map((cert) => {
                  const safeUrl = sanitizeExternalUrl(cert.credentialUrl);
                  return (
                    <div
                      key={cert.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-3.5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <IssuerLogo
                          issuerName={cert.issuer}
                          issuerLogoId={cert.issuerLogoId}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {cert.title}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {cert.issuer} · {cert.year}
                            {cert.expiryDate ? ` · Expires: ${cert.expiryDate}` : ''}
                            {cert.credentialId ? ` · ID: ${cert.credentialId}` : ''}
                          </p>
                          {safeUrl && (
                            <a
                              href={safeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-amber-400 hover:underline truncate max-w-full"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span>{safeUrl}</span>
                            </a>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove resume certification ${cert.title}`}
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
                  );
                })}
              </div>
            )}

            <form onSubmit={handleAddCertification} className="space-y-3 pt-2 border-t border-slate-200 dark:border-[#1E3A5F]/60">
              <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#0B2545] dark:text-white">
                    Select Issuer with Original Logo ({matchingIssuers.length} verified issuers)
                  </span>
                </div>
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
                    placeholder="Search issuing organization (Google, AWS, Microsoft, Meta, NVIDIA, Coursera)..."
                    aria-label="Search resume certification issuer"
                    className="flex-1 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#0A1628] px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setIssuerAppliedQuery(issuerSearchInput)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8]"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Search</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-32 overflow-y-auto">
                  {matchingIssuers.map((iss) => {
                    const selected = certIssuerLogoId === iss.id || certIssuer === iss.name;
                    return (
                      <button
                        key={iss.id}
                        type="button"
                        onClick={() => {
                          setCertIssuer(iss.name);
                          setCertIssuerLogoId(iss.id);
                          if (!certCredentialUrl.trim()) {
                            setCertCredentialUrl(iss.verifyBaseUrl);
                          }
                        }}
                        className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs font-medium transition-colors ${
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  value={certTitle}
                  onChange={(e) => setCertTitle(e.target.value)}
                  placeholder="Certification name *"
                  aria-label="Resume certification title"
                  required
                  className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  value={certIssuer}
                  onChange={(e) => {
                    setCertIssuer(e.target.value);
                    setCertIssuerLogoId('');
                  }}
                  placeholder="Issuing organization *"
                  aria-label="Resume certification issuer"
                  required
                  className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <input
                  type="text"
                  value={certYear}
                  onChange={(e) => setCertYear(e.target.value)}
                  placeholder="Year"
                  aria-label="Resume certification year"
                  className="sm:col-span-2 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm tabular-nums text-slate-900 dark:text-white"
                />
                <input
                  type="date"
                  value={certExpiryDate}
                  onChange={(e) => setCertExpiryDate(e.target.value)}
                  aria-label="Resume certification expiry date"
                  className="sm:col-span-3 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  value={certCredentialId}
                  onChange={(e) => setCertCredentialId(e.target.value)}
                  placeholder="Credential ID (optional)"
                  aria-label="Resume certification credential ID"
                  className="sm:col-span-3 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
                <input
                  type="url"
                  value={certCredentialUrl}
                  onChange={(e) => setCertCredentialUrl(e.target.value)}
                  placeholder="Credential Website URL (https://...)"
                  aria-label="Resume certification credential URL"
                  className="sm:col-span-4 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Certification</span>
                </button>
              </div>
            </form>
          </section>

          {/* 6. ATS Score, Grammar Optimizer & LinkedIn Profile Tips */}
          <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
                6. ATS Optimizer, Grammar &amp; LinkedIn Tips
              </h2>
              <span className="font-mono text-sm font-bold tabular-nums text-emerald-700 dark:text-amber-400">
                ATS Fit: {atsAnalysis.atsScorePct}%
              </span>
            </div>

            <textarea
              rows={2}
              value={atsTargetJd}
              onChange={(e) => setAtsTargetJd(e.target.value)}
              aria-label="Target job description for ATS optimization"
              placeholder="Paste target job description keywords..."
              className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs text-slate-900 dark:text-white"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-3 space-y-1">
                <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Matched Keywords ({atsAnalysis.matchedKeywords.length})
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                  {atsAnalysis.matchedKeywords.join(' · ') || 'Add skills/projects above to boost score'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-3 space-y-1">
                <p className="font-semibold text-amber-700 dark:text-amber-400">
                  Missing Keywords ({atsAnalysis.missingKeywords.length})
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                  {atsAnalysis.missingKeywords.join(' · ') || 'Full JD keyword match!'}
                </p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <p className="font-semibold text-[#0B2545] dark:text-white">Grammar &amp; Impact Suggestions</p>
              {atsAnalysis.grammarSuggestions.map((g) => (
                <p key={g} className="text-slate-600 dark:text-slate-300">· {g}</p>
              ))}
              <p className="font-semibold text-[#0B2545] dark:text-white pt-1">LinkedIn Optimization</p>
              {atsAnalysis.linkedinTips.map((tip) => (
                <p key={tip} className="text-slate-600 dark:text-slate-300">· {tip}</p>
              ))}
            </div>
          </section>

          {/* 7. AI Cover Letter Generator */}
          <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
              7. AI Cover Letter Generator ({(profile.coverLetters || []).length} saved)
            </h2>
            <form onSubmit={handleGenerateCoverLetter} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <input
                type="text"
                value={clCompany}
                onChange={(e) => setClCompany(e.target.value)}
                placeholder="Company Name"
                aria-label="Cover letter company name"
                className="sm:col-span-4 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
              <input
                type="text"
                value={clRole}
                onChange={(e) => setClRole(e.target.value)}
                placeholder="Target Role"
                aria-label="Cover letter target role"
                className="sm:col-span-4 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
              <select
                value={clTone}
                onChange={(e) => setClTone(e.target.value as CoverLetterItem['tone'])}
                aria-label="Cover letter tone"
                className="sm:col-span-4 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs text-slate-900 dark:text-white"
              >
                <option value="Impact-Driven">Impact-Driven</option>
                <option value="Formal">Formal</option>
                <option value="Fresher Enthusiasm">Fresher Enthusiasm</option>
              </select>
              <div className="sm:col-span-12 flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8]"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Tailored Cover Letter</span>
                </button>
                {clDraft && (
                  <>
                    <button
                      type="button"
                      onClick={handleSaveCoverLetter}
                      className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800"
                    >
                      Save Letter
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(clDraft).catch(() => {});
                        setCopiedCl(true);
                        setTimeout(() => setCopiedCl(false), 2000);
                      }}
                      className="px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-[#1E3A5F]/70 text-slate-700 dark:text-slate-200"
                    >
                      {copiedCl ? 'Copied!' : 'Copy Text'}
                    </button>
                  </>
                )}
              </div>
            </form>

            {clDraft && (
              <textarea
                rows={7}
                value={clDraft}
                onChange={(e) => setClDraft(e.target.value)}
                aria-label="Generated cover letter text"
                className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] p-3 text-xs text-slate-900 dark:text-white leading-relaxed"
              />
            )}
          </section>
        </div>

        {/* Right: Live Formatted ATS Resume Paper Sheet */}
        <div className="xl:col-span-6 xl:sticky xl:top-20">
          <div className="no-print mb-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Live ATS Resume Preview · {RESUME_TEMPLATE_META[activeTemplate].label}</span>
            <span>Updates in real time</span>
          </div>

          <article
            id="voragen-resume-sheet"
            aria-label="Formatted resume preview"
            className={`rounded-xl border bg-white text-slate-900 shadow-lg space-y-6 ${
              activeTemplate === 'academic-compact' ? 'p-5 sm:p-6' : 'p-7 sm:p-9'
            } ${
              activeTemplate === 'modern-technical'
                ? 'border-emerald-600/40'
                : 'border-slate-200'
            }`}
          >
            {/* Resume Header */}
            <header
              className={`border-b-2 pb-4 space-y-1.5 ${
                activeTemplate === 'modern-technical'
                  ? 'border-emerald-700'
                  : 'border-[#0B2545]'
              }`}
            >
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0B2545]">
                {previewProfile.name.trim() || 'Your Full Name'}
              </h2>
              <p className="text-sm font-semibold text-emerald-700">
                {previewProfile.headline.trim() || targetRole.title}
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600 pt-1">
                {previewProfile.email && <span>{previewProfile.email}</span>}
                {previewProfile.phone && <span>· {previewProfile.phone}</span>}
                {previewProfile.location && <span>· {previewProfile.location}</span>}
                {sanitizeExternalUrl(previewProfile.githubUrl) && (
                  <a
                    href={sanitizeExternalUrl(previewProfile.githubUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-slate-800 font-medium hover:underline"
                  >
                    · {sanitizeExternalUrl(previewProfile.githubUrl)}
                    <ExternalLink className="w-3 h-3 no-print" />
                  </a>
                )}
              </div>
            </header>

            {/* Summary */}
            {previewProfile.resumeSummary?.trim() && (
              <section className="space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
                  Professional Summary
                </h3>
                <p className="text-xs sm:text-[13px] text-slate-700 leading-relaxed">
                  {previewProfile.resumeSummary.trim()}
                </p>
              </section>
            )}

            {/* Educational Background */}
            <section className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
                Educational Background
              </h3>
              {educationHistory.length > 0 ? (
                <div className="space-y-2.5">
                  {educationHistory.map((edu) => (
                    <div key={edu.id} className="space-y-0.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-bold text-slate-950">
                          {edu.degree}
                          {edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''}
                        </p>
                        <span className="text-xs font-mono text-slate-600 shrink-0">
                          {edu.startYear} – {edu.endYear}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-700">
                        {edu.institution}
                        {edu.gpaOrScore ? ` · ${edu.gpaOrScore}` : ''}
                      </p>
                      {edu.highlights && (
                        <p className="text-xs text-slate-600 leading-relaxed">{edu.highlights}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : profile.education.trim() ? (
                <p className="text-xs font-medium text-slate-700">{profile.education.trim()}</p>
              ) : (
                <p className="text-xs italic text-slate-400">
                  Add your university, degree, field of study, and years on the left.
                </p>
              )}
            </section>

            {/* Skills Gained */}
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
                Skills Gained
              </h3>
              {profile.skills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.map((skill) => (
                    <span
                      key={skill.name}
                      className="px-2.5 py-1 rounded border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800"
                    >
                      {skill.name} ({skill.level}%{skill.verified ? ' · Verified' : ''})
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs italic text-slate-400">
                  Add technical and domain skills gained to highlight your strengths.
                </p>
              )}
            </section>

            {/* Projects */}
            <section className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
                Projects
              </h3>
              {profile.projects.length > 0 ? (
                <div className="space-y-3">
                  {profile.projects.map((proj) => (
                    <div key={proj.id} className="space-y-0.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-bold text-slate-950">{proj.title}</p>
                        {sanitizeExternalUrl(proj.repoUrl) && (
                          <a
                            href={sanitizeExternalUrl(proj.repoUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-mono text-slate-500 hover:underline truncate max-w-[200px]"
                          >
                            {sanitizeExternalUrl(proj.repoUrl)}
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">{proj.description}</p>
                      {proj.skillsUsed.length > 0 && (
                        <p className="text-[11px] text-slate-500 font-medium">
                          Technologies: {proj.skillsUsed.join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs italic text-slate-400">
                  Add projects you built, including tech stack and outcomes.
                </p>
              )}
            </section>

            {/* Certifications Obtained */}
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
                Certifications Obtained
              </h3>
              {profile.certifications.length > 0 ? (
                <ul className="space-y-2">
                  {profile.certifications.map((cert) => {
                    const safeUrl = sanitizeExternalUrl(cert.credentialUrl);
                    return (
                      <li key={cert.id} className="flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <IssuerLogo
                            issuerName={cert.issuer}
                            issuerLogoId={cert.issuerLogoId}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <span>
                              <strong className="text-slate-950">{cert.title}</strong> —{' '}
                              <span className="text-slate-700">{cert.issuer}</span>
                              {cert.expiryDate ? (
                                <span className="text-slate-500"> · Exp: {cert.expiryDate}</span>
                              ) : null}
                              {cert.credentialId ? (
                                <span className="text-slate-500"> · ID: {cert.credentialId}</span>
                              ) : null}
                            </span>
                            {safeUrl && (
                              <a
                                href={safeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-2 inline-flex items-center gap-1 text-[11px] font-medium text-[#0B2545] underline"
                              >
                                <span>Verify Credential</span>
                                <ExternalLink className="w-2.5 h-2.5 no-print" />
                              </a>
                            )}
                          </div>
                        </div>
                        <span className="font-mono text-slate-600 shrink-0">{cert.year}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-xs italic text-slate-400">
                  Add industry certifications, bootcamps, or verified credentials obtained.
                </p>
              )}
            </section>
          </article>
        </div>
      </div>
    </div>
  );
}

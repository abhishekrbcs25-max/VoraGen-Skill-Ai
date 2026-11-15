import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Briefcase,
  Check,
  Download,
  FileText,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { searchCareerRoles } from '../../data/careerRolesCatalog';
import { sanitizeResumeFile } from '../../utils/validation';
import type {
  CareerRole,
  EmploymentPreference,
  UserProfile,
  WorkModePreference,
} from '../../types';

interface ProfilePreferencesResumeSectionProps {
  profile: UserProfile;
  roles: CareerRole[];
  onUpdateProfile: (next: UserProfile) => void;
}

const WORK_MODES: WorkModePreference[] = ['Remote', 'Hybrid', 'On-Site', 'Flexible'];
const EMPLOYMENT_OPTIONS: EmploymentPreference[] = [
  'Full-Time',
  'Internship',
  'Part-Time',
  'Contract',
  'Freelance',
];
const AVAILABILITY_PRESETS = [
  'Immediate',
  '15 Days Notice',
  '30 Days Notice',
  '60 Days Notice',
  '90+ Days Notice',
  'Available Part-Time / Campus',
];

export function ProfilePreferencesResumeSection({
  profile,
  roles,
  onUpdateProfile,
}: ProfilePreferencesResumeSectionProps) {
  const [interestInput, setInterestInput] = useState('');
  const [roleSearchInput, setRoleSearchInput] = useState('');
  const [customRoleInput, setCustomRoleInput] = useState('');

  const [expectedSalary, setExpectedSalary] = useState(profile.expectedSalary || '');
  const [workMode, setWorkMode] = useState<WorkModePreference | ''>(
    profile.workModePreference || '',
  );
  const [availability, setAvailability] = useState(profile.availabilityNoticePeriod || '');
  const [empPrefs, setEmpPrefs] = useState<EmploymentPreference[]>(
    profile.employmentPreferences || [],
  );
  const [prefsSaved, setPrefsSaved] = useState(false);

  const [resumeUploadError, setResumeUploadError] = useState('');
  const resumeInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setExpectedSalary(profile.expectedSalary || '');
    setWorkMode(profile.workModePreference || '');
    setAvailability(profile.availabilityNoticePeriod || '');
    setEmpPrefs(profile.employmentPreferences || []);
  }, [
    profile.expectedSalary,
    profile.workModePreference,
    profile.availabilityNoticePeriod,
    profile.employmentPreferences,
    profile.isSignedIn,
  ]);

  const roleSuggestions = useMemo(() => {
    if (!roleSearchInput.trim()) return roles.slice(0, 8);
    return searchCareerRoles(roles, roleSearchInput).slice(0, 8);
  }, [roles, roleSearchInput]);

  const handleAddInterest = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = interestInput.trim();
    if (!clean) return;
    const current = profile.careerInterests || [];
    if (current.some((x) => x.toLowerCase() === clean.toLowerCase())) return;
    onUpdateProfile({
      ...profile,
      careerInterests: [...current, clean],
    });
    if (!profile.isSignedIn) return;
    setInterestInput('');
  };

  const addPreferredRole = (roleTitle: string) => {
    const clean = roleTitle.trim();
    if (!clean) return;
    const current = profile.preferredJobRoles || [];
    if (current.some((r) => r.toLowerCase() === clean.toLowerCase())) return;
    onUpdateProfile({
      ...profile,
      preferredJobRoles: [...current, clean],
    });
    if (!profile.isSignedIn) return;
    setCustomRoleInput('');
  };

  const toggleEmploymentPref = (pref: EmploymentPreference) => {
    const exists = empPrefs.includes(pref);
    const next = exists ? empPrefs.filter((p) => p !== pref) : [...empPrefs, pref];
    setEmpPrefs(next);
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      ...profile,
      expectedSalary: expectedSalary.trim(),
      workModePreference: workMode || undefined,
      availabilityNoticePeriod: availability.trim(),
      employmentPreferences: empPrefs,
    });
    if (!profile.isSignedIn) return;
    setPrefsSaved(true);
    setTimeout(() => setPrefsSaved(false), 2000);
  };

  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResumeUploadError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const extMimeMap: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
    };
    const lowerName = file.name.toLowerCase();
    const inferredMime =
      file.type ||
      Object.entries(extMimeMap).find(([ext]) => lowerName.endsWith(ext))?.[1] ||
      '';

    if (file.size > 2_000_000) {
      setResumeUploadError('Resume file must be 2 MB or smaller.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      const sanitized = sanitizeResumeFile({
        fileName: file.name,
        mimeType: inferredMime,
        sizeBytes: file.size,
        uploadedAt: new Date().toISOString().split('T')[0],
        dataUrl,
      });
      if (!sanitized) {
        setResumeUploadError('Unsupported resume file. Please upload PDF, DOC, DOCX, TXT, or MD.');
        return;
      }
      onUpdateProfile({ ...profile, uploadedResume: sanitized });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div id="links-resume-section" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Uploaded Resume Document */}
      <section className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#0B2545] dark:text-amber-400" />
          <div>
            <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
              Resume Document Upload
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Upload your PDF, DOC, DOCX, TXT, or Markdown resume (max 2 MB).
            </p>
          </div>
        </div>

        <input
          ref={resumeInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
          onChange={handleResumeUpload}
          aria-label="Upload resume file"
          className="hidden"
        />

        {profile.uploadedResume ? (
          <div className="rounded-xl border border-emerald-500/35 bg-emerald-50/70 dark:bg-emerald-500/10 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#0B2545] dark:text-white truncate">
                  {profile.uploadedResume.fileName}
                </p>
                <p className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
                  {Math.max(1, Math.round(profile.uploadedResume.sizeBytes / 1024))} KB · Uploaded{' '}
                  {profile.uploadedResume.uploadedAt}
                </p>
              </div>
              <button
                type="button"
                aria-label="Remove uploaded resume"
                onClick={() => onUpdateProfile({ ...profile, uploadedResume: undefined })}
                className="text-slate-500 hover:text-rose-600 p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.uploadedResume.dataUrl && (
                <a
                  href={profile.uploadedResume.dataUrl}
                  download={profile.uploadedResume.fileName}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0B2545] text-white dark:bg-[#1D4ED8]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Copy</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => resumeInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#05070B] text-slate-700 dark:text-slate-200"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Replace File</span>
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => resumeInputRef.current?.click()}
            className="w-full rounded-xl border-2 border-dashed border-slate-300 dark:border-[#1E3A5F] bg-[#F4F7FB] dark:bg-[#05070B] p-6 text-center space-y-2 hover:border-[#0B2545] dark:hover:border-amber-400 transition-colors"
          >
            <Upload className="w-6 h-6 mx-auto text-[#0B2545] dark:text-amber-400" />
            <p className="text-xs font-semibold text-[#0B2545] dark:text-white">
              Click to Upload Resume File
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Supports PDF, DOC, DOCX, TXT, or MD
            </p>
          </button>
        )}

        {resumeUploadError && (
          <p className="text-xs font-medium text-rose-600 dark:text-amber-300">
            {resumeUploadError}
          </p>
        )}
      </section>

      {/* Career Interests, Preferred Job Roles, Compensation & Availability */}
      <section
        id="preferences-section"
        className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-5"
      >
        <div className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
          <div>
            <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
              Career Interests &amp; Job Preferences
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Preferred roles, salary expectations, work mode, employment type, and notice period.
            </p>
          </div>
        </div>

        {/* Career Interests */}
        <div className="space-y-2">
          <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            Career Interests ({(profile.careerInterests || []).length})
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(profile.careerInterests || []).map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200"
              >
                <span>{item}</span>
                <button
                  type="button"
                  aria-label={`Remove career interest ${item}`}
                  onClick={() =>
                    onUpdateProfile({
                      ...profile,
                      careerInterests: (profile.careerInterests || []).filter((i) => i !== item),
                    })
                  }
                  className="text-slate-400 hover:text-rose-500"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <form onSubmit={handleAddInterest} className="flex gap-2">
            <input
              type="text"
              value={interestInput}
              onChange={(e) => setInterestInput(e.target.value)}
              placeholder="Add career interest (e.g., Distributed Systems, FinTech, GenAI)"
              aria-label="Add career interest"
              className="flex-1 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-1.5 text-xs text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0B2545] text-white dark:bg-[#1D4ED8]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </form>
        </div>

        {/* Preferred Job Roles */}
        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/10">
          <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            Preferred Job Roles ({(profile.preferredJobRoles || []).length})
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(profile.preferredJobRoles || []).map((roleTitle) => (
              <span
                key={roleTitle}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-500/35 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-900 dark:text-emerald-200"
              >
                <span>{roleTitle}</span>
                <button
                  type="button"
                  aria-label={`Remove preferred job role ${roleTitle}`}
                  onClick={() =>
                    onUpdateProfile({
                      ...profile,
                      preferredJobRoles: (profile.preferredJobRoles || []).filter(
                        (r) => r !== roleTitle,
                      ),
                    })
                  }
                  className="text-emerald-700 dark:text-emerald-300 hover:text-rose-500"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="search"
                value={roleSearchInput}
                onChange={(e) => setRoleSearchInput(e.target.value)}
                placeholder="Filter 200+ roles to add..."
                aria-label="Search preferred job roles"
                className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] pl-8 pr-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={customRoleInput}
                onChange={(e) => setCustomRoleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addPreferredRole(customRoleInput);
                  }
                }}
                placeholder="Or enter custom role..."
                aria-label="Custom preferred job role"
                className="flex-1 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => addPreferredRole(customRoleInput)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 text-white dark:bg-[#1D4ED8]"
              >
                Add
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {roleSuggestions.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => addPreferredRole(r.title)}
                className="text-[11px] px-2 py-0.5 rounded border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] text-slate-700 dark:text-slate-300 hover:border-[#0B2545] dark:hover:border-amber-400"
              >
                + {r.title}
              </button>
            ))}
          </div>
        </div>

        {/* Compensation, Work Mode, Employment Type & Availability */}
        <form
          onSubmit={handleSavePreferences}
          className="space-y-4 pt-3 border-t border-slate-200 dark:border-white/10"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="pref-expected-salary"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Expected Salary
              </label>
              <input
                id="pref-expected-salary"
                type="text"
                value={expectedSalary}
                onChange={(e) => setExpectedSalary(e.target.value)}
                placeholder="e.g., $95,000 / yr or ₹12 LPA"
                className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="pref-work-mode"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Work Mode Preference
              </label>
              <select
                id="pref-work-mode"
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value as WorkModePreference | '')}
                className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs text-slate-900 dark:text-white"
              >
                <option value="">Select work mode...</option>
                {WORK_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="pref-availability"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Availability / Notice Period
              </label>
              <input
                id="pref-availability"
                list="voragen-availability-presets"
                type="text"
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                placeholder="Immediate / 30 Days"
                className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
              <datalist id="voragen-availability-presets">
                {AVAILABILITY_PRESETS.map((opt) => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Employment Preferences
            </span>
            <div className="flex flex-wrap gap-2">
              {EMPLOYMENT_OPTIONS.map((opt) => {
                const selected = empPrefs.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleEmploymentPref(opt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      selected
                        ? 'border-[#0B2545] bg-[#0B2545] text-white dark:border-amber-400 dark:bg-[#1D4ED8]'
                        : 'border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8]"
            >
              {prefsSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              <span>{prefsSaved ? 'Preferences Saved' : 'Save Work & Salary Preferences'}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  FileText,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { rankCandidatesForJob } from '../utils/platformEngines';
import type {
  ApplicationStatus,
  EmployerApplicantItem,
  EmployerPostedJob,
  UserProfile,
} from '../types';

interface EmployerPortalViewProps {
  profile: UserProfile;
  sessionToken?: string;
  onRequireAuth: (reason: string) => boolean;
}

export function EmployerPortalView({
  profile,
  sessionToken,
  onRequireAuth,
}: EmployerPortalViewProps) {
  const [companyName, setCompanyName] = useState('CloudScale Technologies');
  const [industry, setIndustry] = useState('Cloud & Enterprise SaaS');
  const [website, setWebsite] = useState('https://cloudscale.example.com');
  const [headquarters, setHeadquarters] = useState('Bengaluru, India');
  const [verificationStatus, setVerificationStatus] = useState('Verified Partner');

  const [jobs, setJobs] = useState<EmployerPostedJob[]>([]);
  const [applicants, setApplicants] = useState<EmployerApplicantItem[]>([]);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [interviewSlotDraft, setInterviewSlotDraft] = useState('Friday · 15:00 IST (Video)');
  const [offerSalaryDraft, setOfferSalaryDraft] = useState('INR 12.5 LPA');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // New job form
  const [roleTitle, setRoleTitle] = useState('');
  const [empType, setEmpType] = useState<EmployerPostedJob['employmentType']>('Full-Time');
  const [workMode, setWorkMode] = useState<EmployerPostedJob['workMode']>('Hybrid');
  const [location, setLocation] = useState('Bengaluru, India');
  const [salaryRange, setSalaryRange] = useState('INR 8 – 14 LPA');
  const [skillsText, setSkillsText] = useState('React, TypeScript, Node.js, SQL');
  const [vacancies, setVacancies] = useState(3);
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetch('/api/employer/workspace', {
      headers: sessionToken ? { 'x-voragen-token': sessionToken } : {},
    })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          d: {
            companyProfile?: {
              companyName: string;
              industry: string;
              website: string;
              headquarters: string;
              verificationStatus: string;
            };
            jobs?: EmployerPostedJob[];
            applicants?: EmployerApplicantItem[];
          } | null,
        ) => {
          if (d?.companyProfile) {
            setCompanyName(d.companyProfile.companyName);
            setIndustry(d.companyProfile.industry);
            setWebsite(d.companyProfile.website);
            setHeadquarters(d.companyProfile.headquarters);
            setVerificationStatus(d.companyProfile.verificationStatus);
          }
          if (d?.jobs) setJobs(d.jobs);
          if (d?.applicants) {
            setApplicants(d.applicants);
            setSelectedCandidateId(d.applicants[0]?.id || null);
          }
        },
      )
      .catch(() => {});
  }, [sessionToken]);

  const rankedCandidates = useMemo(() => {
    const reqSkills = jobs[0]?.requiredSkills || ['React', 'TypeScript', 'Node.js', 'SQL'];
    const ranked = rankCandidatesForJob(applicants, reqSkills);
    const q = candidateSearch.trim().toLowerCase();
    return q
      ? ranked.filter((c) =>
          `${c.candidateName} ${c.jobTitle} ${c.skills.join(' ')}`.toLowerCase().includes(q),
        )
      : ranked;
  }, [applicants, jobs, candidateSearch]);

  const activeCandidate =
    rankedCandidates.find((c) => c.id === selectedCandidateId) || rankedCandidates[0] || null;

  const handleSaveCompany = async (requestVerification = false) => {
    if (!onRequireAuth('update company profile & verification')) return;
    try {
      const res = await fetch('/api/employer/company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'x-voragen-token': sessionToken } : {}),
        },
        body: JSON.stringify({
          companyName,
          industry,
          website,
          headquarters,
          requestVerification,
        }),
      });
      const data = (await res.json()) as {
        companyProfile?: { verificationStatus: string };
        error?: string;
      };
      if (res.ok && data.companyProfile) {
        setVerificationStatus(data.companyProfile.verificationStatus);
        setStatusNotice(
          requestVerification
            ? 'Company verification request submitted to VoraGen Admin!'
            : 'Company profile saved cleanly.',
        );
      } else {
        setStatusNotice(data.error || 'Could not update company profile.');
      }
    } catch {
      setStatusNotice('Network unavailable.');
    }
  };

  const handlePublishJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onRequireAuth('publish a job or internship listing')) return;
    if (!roleTitle.trim()) return;
    try {
      const res = await fetch('/api/employer/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'x-voragen-token': sessionToken } : {}),
        },
        body: JSON.stringify({
          companyName,
          roleTitle,
          employmentType: empType,
          workMode,
          location,
          salaryRange,
          requiredSkills: skillsText.split(',').map((s) => s.trim()).filter(Boolean),
          vacancies,
          description: description || `Hiring ${roleTitle} at ${companyName}.`,
        }),
      });
      const data = (await res.json()) as { job?: EmployerPostedJob; error?: string };
      if (res.ok && data.job) {
        setJobs((prev) => [data.job!, ...prev]);
        setRoleTitle('');
        setDescription('');
        setStatusNotice(`Published "${data.job.roleTitle}" (${data.job.status}).`);
      } else {
        setStatusNotice(data.error || 'Failed to publish job.');
      }
    } catch {
      setStatusNotice('Failed to reach hiring backend.');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!onRequireAuth('remove a job posting')) return;
    try {
      const res = await fetch(`/api/employer/jobs/${jobId}`, {
        method: 'DELETE',
        headers: sessionToken ? { 'x-voragen-token': sessionToken } : {},
      });
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => j.id !== jobId));
        setStatusNotice('Job listing deleted.');
      }
    } catch {
      // Ignore
    }
  };

  const handleUpdateCandidateStatus = async (
    candidateId: string,
    status: ApplicationStatus,
    extra?: { interviewSlot?: string; offerLetterText?: string },
  ) => {
    if (!onRequireAuth('update applicant hiring stages')) return;
    try {
      const res = await fetch(`/api/employer/applicants/${candidateId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'x-voragen-token': sessionToken } : {}),
        },
        body: JSON.stringify({ status, ...extra }),
      });
      const data = (await res.json()) as { applicant?: EmployerApplicantItem };
      if (res.ok && data.applicant) {
        setApplicants((prev) => prev.map((a) => (a.id === candidateId ? data.applicant! : a)));
        setStatusNotice(`Updated ${data.applicant.candidateName} -> ${status}.`);
      }
    } catch {
      setStatusNotice('Could not update applicant status.');
    }
  };

  const shortlistedCount = applicants.filter((a) => a.status === 'Shortlisted' || a.status === 'Interview Scheduled').length;
  const offersCount = applicants.filter((a) => a.status === 'Offer Issued').length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
            Employer & Recruiter Hiring Portal
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Verify your company, post jobs & internships, AI-rank candidates, schedule interviews, and issue offer letters.
          </p>
        </div>

        <div className="text-xs font-semibold text-emerald-700 dark:text-amber-400 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4" />
          <span>
            {companyName} · {verificationStatus} ({profile.role || 'recruiter'})
          </span>
        </div>
      </div>

      {/* Recruitment Analytics KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Open Postings</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums text-[#0B2545] dark:text-white">
            {jobs.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Applicants</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums text-[#0B2545] dark:text-white">
            {applicants.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Shortlisted / Interviews</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
            {shortlistedCount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Offers Issued · Avg Time-to-Hire</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-400">
            {offersCount} · 9d
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

      {/* Company Verification + Job Posting Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            <span>Company Profile & Verification</span>
          </h2>
          <div className="space-y-2.5 text-xs">
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Company Name"
              className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-slate-900 dark:text-white"
            />
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="Industry"
              className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-slate-900 dark:text-white"
            />
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="Official Website"
              className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-slate-900 dark:text-white"
            />
            <input
              type="text"
              value={headquarters}
              onChange={(e) => setHeadquarters(e.target.value)}
              placeholder="Headquarters City & Country"
              className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-slate-900 dark:text-white"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleSaveCompany(false)}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#0B2545] text-white dark:bg-[#1D4ED8]"
            >
              Save Company Profile
            </button>
            <button
              type="button"
              onClick={() => handleSaveCompany(true)}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold border border-emerald-500/50 text-emerald-700 dark:text-emerald-300"
            >
              Request Verification Badge
            </button>
          </div>

          {/* Manage Posted Jobs */}
          <div className="pt-4 border-t border-slate-200 dark:border-white/10 space-y-2.5">
            <h3 className="text-xs font-semibold text-[#0B2545] dark:text-white">
              Active Company Listings ({jobs.length})
            </h3>
            {jobs.map((job) => (
              <div
                key={job.id}
                className="rounded-lg bg-[#F4F7FB] dark:bg-[#05070B] p-3 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-bold text-[#0B2545] dark:text-white truncate">{job.roleTitle}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {job.employmentType} · {job.workMode} · {job.status} · {job.vacancies} openings
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteJob(job.id)}
                  aria-label={`Delete ${job.roleTitle}`}
                  className="p-1.5 text-slate-400 hover:text-amber-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-emerald-600 dark:text-amber-400" />
            <span>Post New Job or Internship</span>
          </h2>
          <form onSubmit={handlePublishJob} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="Job / Internship Title (e.g. Junior Backend Engineer)"
                className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-slate-900 dark:text-white"
              />
              <select
                aria-label="Employment Type"
                value={empType}
                onChange={(e) => setEmpType(e.target.value as EmployerPostedJob['employmentType'])}
                className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-slate-900 dark:text-white"
              >
                <option value="Full-Time">Full-Time</option>
                <option value="Internship">Internship</option>
                <option value="Part-Time">Part-Time</option>
                <option value="Freelance">Freelance</option>
                <option value="Government">Government</option>
              </select>
              <select
                aria-label="Work Mode"
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value as EmployerPostedJob['workMode'])}
                className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-slate-900 dark:text-white"
              >
                <option value="Hybrid">Hybrid</option>
                <option value="Remote">Remote</option>
                <option value="On-Site">On-Site</option>
              </select>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City & Country"
                className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-slate-900 dark:text-white"
              />
              <input
                type="text"
                value={salaryRange}
                onChange={(e) => setSalaryRange(e.target.value)}
                placeholder="Salary / Stipend Range"
                className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-slate-900 dark:text-white"
              />
              <input
                type="number"
                min={1}
                value={vacancies}
                onChange={(e) => setVacancies(Number(e.target.value))}
                placeholder="Vacancies"
                className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>
            <input
              type="text"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              placeholder="Required Skills (comma-separated)"
              className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-slate-900 dark:text-white"
            />
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Role responsibilities, qualifications, benefits, and hiring stages..."
              className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4" />
              <span>Publish Job Posting</span>
            </button>
          </form>
        </section>
      </div>

      {/* AI Candidate Ranking & Applicant Pipeline */}
      <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
              AI Candidate Ranking & Applicant Evaluation
            </h2>
          </div>

          <input
            type="text"
            value={candidateSearch}
            onChange={(e) => setCandidateSearch(e.target.value)}
            placeholder="Filter applicants by name or skill..."
            className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-1.5 text-xs text-slate-900 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 space-y-2.5">
            {rankedCandidates.map((cand, idx) => (
              <button
                key={cand.id}
                type="button"
                onClick={() => setSelectedCandidateId(cand.id)}
                className={`w-full text-left rounded-xl border p-3.5 transition-colors ${
                  activeCandidate?.id === cand.id
                    ? 'border-[#0B2545] dark:border-amber-400 bg-[#F4F7FB] dark:bg-[#0F213E]'
                    : 'border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#05070B]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-[#0B2545] dark:text-white">
                    #{idx + 1} · {cand.candidateName}
                  </span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-amber-400 tabular-nums">
                    AI Fit {cand.aiRankScore}%
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {cand.jobTitle} · Status: <strong>{cand.status}</strong>
                </p>
                <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300">{cand.rankReason}</p>
              </button>
            ))}
          </div>

          {activeCandidate && (
            <div className="lg:col-span-7 rounded-xl bg-[#F4F7FB] dark:bg-[#05070B] border border-slate-200 dark:border-[#1E3A5F]/60 p-5 space-y-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-base font-bold text-[#0B2545] dark:text-white">
                    {activeCandidate.candidateName} ({activeCandidate.candidateEmail})
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400">
                    {activeCandidate.education} · CGPA {activeCandidate.cgpa} · Applied {activeCandidate.appliedAt}
                  </p>
                </div>
                <span className="font-mono font-bold text-emerald-700 dark:text-amber-400 tabular-nums">
                  {activeCandidate.status}
                </span>
              </div>

              <div className="space-y-1">
                <p className="font-semibold text-[#0B2545] dark:text-white flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Resume Summary & Skill Comparison</span>
                </p>
                <p className="text-slate-600 dark:text-slate-300">{activeCandidate.resumeSummary}</p>
                <p className="text-emerald-700 dark:text-amber-300">
                  Verified Stack: {activeCandidate.skills.join(' · ')}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-white/10">
                <div>
                  <label htmlFor="emp-int-slot" className="block font-semibold mb-1">
                    Interview Slot
                  </label>
                  <input
                    id="emp-int-slot"
                    type="text"
                    value={interviewSlotDraft}
                    onChange={(e) => setInterviewSlotDraft(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#0A1628] px-3 py-1.5"
                  />
                </div>
                <div>
                  <label htmlFor="emp-offer-comp" className="block font-semibold mb-1">
                    Offer Package
                  </label>
                  <input
                    id="emp-offer-comp"
                    type="text"
                    value={offerSalaryDraft}
                    onChange={(e) => setOfferSalaryDraft(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#0A1628] px-3 py-1.5"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateCandidateStatus(activeCandidate.id, 'Shortlisted')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold bg-[#0B2545] text-white dark:bg-[#1D4ED8]"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Shortlist</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateCandidateStatus(activeCandidate.id, 'Interview Scheduled', {
                      interviewSlot: interviewSlotDraft,
                    })
                  }
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold bg-emerald-600 text-white"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Schedule Interview</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateCandidateStatus(activeCandidate.id, 'Offer Issued', {
                      offerLetterText: `Official Offer from ${companyName} for ${activeCandidate.jobTitle} at ${offerSalaryDraft}.`,
                    })
                  }
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold border border-amber-500/60 text-amber-800 dark:text-amber-300"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Issue Offer Letter</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateCandidateStatus(activeCandidate.id, 'Rejected')}
                  className="px-3 py-1.5 rounded-lg font-semibold border border-slate-300 dark:border-[#1E3A5F]/70 text-slate-600 dark:text-slate-300"
                >
                  Reject
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

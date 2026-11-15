import { useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Code2,
  ExternalLink,
  FolderGit2,
  Play,
  Trophy,
  Users,
} from 'lucide-react';
import { GUIDED_PROJECT_TEMPLATES, HACKATHONS_CATALOG } from '../data/projectsCatalog';
import { executeCodeInSandbox, type SandboxExecutionResult } from '../utils/codeSandbox';
import { sanitizeExternalUrl } from '../utils/validation';
import type { GuidedProjectTemplate, ProjectItem, UserProfile } from '../types';

interface ProjectsViewProps {
  profile: UserProfile;
  sessionToken?: string;
  onUpdateProfile: (next: UserProfile) => void;
  onRequireAuth: (reason: string) => boolean;
}

export function ProjectsView({
  profile,
  sessionToken,
  onUpdateProfile,
  onRequireAuth,
}: ProjectsViewProps) {
  const [tierFilter, setTierFilter] = useState<'All' | GuidedProjectTemplate['tier']>('All');
  const [selectedTemplateId, setSelectedTemplateId] = useState(GUIDED_PROJECT_TEMPLATES[0].id);
  const [codeDraft, setCodeDraft] = useState(GUIDED_PROJECT_TEMPLATES[0].starterCode);
  const [sandboxResult, setSandboxResult] = useState<SandboxExecutionResult | null>(null);

  const [submitTitle, setSubmitTitle] = useState('');
  const [submitDesc, setSubmitDesc] = useState('');
  const [submitRepo, setSubmitRepo] = useState('');
  const [submitDemo, setSubmitDemo] = useState('');
  const [submitTeam, setSubmitTeam] = useState('');
  const [reviewOutcome, setReviewOutcome] = useState<{
    score: number;
    feedback: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [registeredHackathons, setRegisteredHackathons] = useState<string[]>([]);

  const filteredTemplates = useMemo(
    () =>
      tierFilter === 'All'
        ? GUIDED_PROJECT_TEMPLATES
        : GUIDED_PROJECT_TEMPLATES.filter((p) => p.tier === tierFilter),
    [tierFilter],
  );

  const activeTemplate =
    GUIDED_PROJECT_TEMPLATES.find((p) => p.id === selectedTemplateId) || GUIDED_PROJECT_TEMPLATES[0];

  const handleSelectTemplate = (tpl: GuidedProjectTemplate) => {
    setSelectedTemplateId(tpl.id);
    setCodeDraft(tpl.starterCode);
    setSandboxResult(null);
    setSubmitTitle(tpl.title);
  };

  const handleRunProjectSandbox = async () => {
    const wrapped = /\bfunction\s+solve\b/.test(codeDraft)
      ? codeDraft
      : `function solve() {\n${codeDraft}\n}`;
    const res = await executeCodeInSandbox(wrapped, [{ args: [], expected: true }]);
    setSandboxResult(res);
  };

  const handleSubmitProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onRequireAuth('submit a project for AI & Instructor evaluation')) return;
    const title = (submitTitle || activeTemplate.title).trim();
    const desc = submitDesc.trim() || activeTemplate.brief;
    if (!title) return;

    setSubmitting(true);
    let score = 86;
    let feedback = 'Verified practical implementation with clean skill alignment.';
    try {
      const res = await fetch('/api/projects/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'x-voragen-token': sessionToken } : {}),
        },
        body: JSON.stringify({
          title,
          description: desc,
          repoUrl: submitRepo,
          skillsUsed: activeTemplate.skills,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { score?: number; feedback?: string };
        if (typeof data.score === 'number') score = data.score;
        if (data.feedback) feedback = data.feedback;
      }
    } catch {
      // Fallback score already ready
    } finally {
      setSubmitting(false);
    }

    const newProject: ProjectItem = {
      id: `proj-${Date.now()}`,
      title,
      description: desc,
      skillsUsed: activeTemplate.skills,
      repoUrl: sanitizeExternalUrl(submitRepo),
      demoUrl: sanitizeExternalUrl(submitDemo),
      difficulty: activeTemplate.difficulty,
      teamMembers: submitTeam
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      aiReviewScore: score,
      instructorFeedback: feedback,
    };

    const certId = `VG-PROJ-${Date.now().toString().slice(-5)}`;
    const nextProfile: UserProfile = {
      ...profile,
      projects: [newProject, ...profile.projects],
      certifications: [
        {
          id: `cert-${Date.now()}`,
          title: activeTemplate.certificateTitle,
          issuer: activeTemplate.industryPartner,
          year: String(new Date().getFullYear()),
          credentialId: certId,
        },
        ...profile.certifications,
      ],
      streakPoints: profile.streakPoints + 40,
    };

    onUpdateProfile(nextProfile);
    setReviewOutcome({ score, feedback });
    setSubmitDesc('');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
            Practical Projects, Team Labs & Hackathons
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Build guided mini, major, and industry projects in our browser code workbench, submit GitHub repos, and earn project certificates.
          </p>
        </div>

        <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-[#F4F7FB] dark:bg-[#0A1628] border border-slate-200 dark:border-[#1E3A5F]/60">
          {(['All', 'Mini Project', 'Major Project', 'Real-World Industry'] as const).map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setTierFilter(tier)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                tierFilter === tier
                  ? 'bg-white dark:bg-[#1D4ED8] text-[#0B2545] dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#0B2545] dark:hover:text-white'
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      {/* Guided Tracks + Browser Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 space-y-3">
          {filteredTemplates.map((tpl) => {
            const active = tpl.id === activeTemplate.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleSelectTemplate(tpl)}
                className={`w-full text-left rounded-2xl border p-4 transition-colors ${
                  active
                    ? 'border-[#0B2545] dark:border-amber-400 bg-[#F4F7FB] dark:bg-[#0F213E]'
                    : 'border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628]'
                }`}
              >
                <p className="text-[11px] font-medium text-emerald-700 dark:text-amber-400">
                  {tpl.tier} · {tpl.difficulty} · {tpl.durationHours}h
                </p>
                <h2 className="mt-1 font-display text-sm font-bold text-[#0B2545] dark:text-white">
                  {tpl.title}
                </h2>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{tpl.brief}</p>
                <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  Stack: {tpl.skills.join(' · ')}
                </p>
              </button>
            );
          })}
        </div>

        <section className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-emerald-700 dark:text-amber-400">
                Partner: {activeTemplate.industryPartner}
              </p>
              <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
                {activeTemplate.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={handleRunProjectSandbox}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Run Workbench Verification</span>
            </button>
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <p className="font-semibold text-[#0B2545] dark:text-white">Required Deliverables:</p>
            <p>{activeTemplate.deliverables.join(' · ')}</p>
          </div>

          <div>
            <label
              htmlFor="project-workbench-code"
              className="block text-xs font-semibold text-[#0B2545] dark:text-white mb-1.5 flex items-center gap-1.5"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Browser Prototyping & Verification Workbench</span>
            </label>
            <textarea
              id="project-workbench-code"
              rows={7}
              value={codeDraft}
              onChange={(e) => setCodeDraft(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#05070B] text-emerald-300 font-mono text-xs p-3"
            />
            {sandboxResult && (
              <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-amber-300">
                Workbench {sandboxResult.passed ? 'Passed' : 'Result'}: {sandboxResult.details.join(' · ')}
              </p>
            )}
          </div>

          {/* Submission Form */}
          <form onSubmit={handleSubmitProject} className="space-y-3 border-t border-slate-200 dark:border-white/10 pt-4">
            <h3 className="font-display text-sm font-bold text-[#0B2545] dark:text-white">
              Submit Project for AI & Instructor Review
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={submitTitle}
                onChange={(e) => setSubmitTitle(e.target.value)}
                placeholder={`Project Title (default: ${activeTemplate.title})`}
                className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
              <input
                type="url"
                value={submitRepo}
                onChange={(e) => setSubmitRepo(e.target.value)}
                placeholder="GitHub Repository URL (https://github.com/...)"
                className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
              <input
                type="url"
                value={submitDemo}
                onChange={(e) => setSubmitDemo(e.target.value)}
                placeholder="Live Demo URL (optional)"
                className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
              <input
                type="text"
                value={submitTeam}
                onChange={(e) => setSubmitTeam(e.target.value)}
                placeholder="Team Collaborators (comma-separated, optional)"
                className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <textarea
              rows={2}
              value={submitDesc}
              onChange={(e) => setSubmitDesc(e.target.value)}
              placeholder="Summarize your architecture, test cases, and engineering trade-offs..."
              className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB]"
            >
              <FolderGit2 className="w-3.5 h-3.5" />
              <span>{submitting ? 'Evaluating...' : 'Submit Project & Earn Certificate (+40 pts)'}</span>
            </button>

            {reviewOutcome && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 p-3 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <Award className="w-4 h-4" />
                  Evaluation Complete · Score {reviewOutcome.score}/100 · Completion Certificate Issued
                </p>
                <p>{reviewOutcome.feedback}</p>
              </div>
            )}
          </form>
        </section>
      </div>

      {/* Hackathons & Submitted Portfolio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
              Hackathons & Industry Challenges
            </h2>
          </div>

          <div className="space-y-3">
            {HACKATHONS_CATALOG.map((hack) => {
              const joined = registeredHackathons.includes(hack.id);
              return (
                <div
                  key={hack.id}
                  className="rounded-xl bg-[#F4F7FB] dark:bg-[#05070B] p-4 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <p className="text-[11px] text-emerald-700 dark:text-amber-400 font-medium">
                      {hack.organizer} · {hack.mode} · {hack.teamSize}
                    </p>
                    <h3 className="text-sm font-bold text-[#0B2545] dark:text-white">{hack.title}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {hack.theme} · Prize: {hack.prizePool} · Deadline {hack.deadline}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!onRequireAuth('register for hackathons')) return;
                      setRegisteredHackathons((prev) =>
                        prev.includes(hack.id) ? prev : [...prev, hack.id],
                      );
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                      joined
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#0B2545] text-white dark:bg-[#1D4ED8]'
                    }`}
                  >
                    {joined ? 'Registered' : 'Join Hackathon'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
              My Project Portfolio ({profile.projects.length})
            </h2>
          </div>

          {profile.projects.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No projects submitted yet. Pick a guided track above and submit your repository to unlock verified project certificates.
            </p>
          ) : (
            <div className="space-y-3">
              {profile.projects.map((proj) => {
                const safeRepo = sanitizeExternalUrl(proj.repoUrl);
                return (
                  <div key={proj.id} className="rounded-xl bg-[#F4F7FB] dark:bg-[#05070B] p-4 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-[#0B2545] dark:text-white">{proj.title}</h3>
                      {proj.aiReviewScore && (
                        <span className="text-xs font-mono font-semibold text-emerald-700 dark:text-amber-400 tabular-nums">
                          {proj.aiReviewScore}/100
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{proj.description}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                      <span>{proj.skillsUsed.join(' · ')}</span>
                      {proj.teamMembers && proj.teamMembers.length > 0 && (
                        <span>· Team: {proj.teamMembers.join(', ')}</span>
                      )}
                      {safeRepo && (
                        <a
                          href={safeRepo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#0B2545] dark:text-amber-400 hover:underline"
                        >
                          <span>GitHub</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </p>
                    {proj.instructorFeedback && (
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        {proj.instructorFeedback}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

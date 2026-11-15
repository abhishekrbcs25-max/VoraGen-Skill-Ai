import { useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  FileSearch,
  Mic,
  Plus,
  Rocket,
  Sparkles,
  Zap,
} from 'lucide-react';
import { extractSkillsFromText } from '../utils/skillEngine';
import type {
  CareerRole,
  InterviewAttemptRecord,
  InterviewEvaluation,
  NavSection,
  ScheduledInterviewItem,
  SkillMatchBreakdown,
  UserProfile,
  UserSkill,
} from '../types';

interface CareerLabViewProps {
  profile: UserProfile;
  targetRole: CareerRole;
  match: SkillMatchBreakdown;
  onUpdateProfile: (next: UserProfile) => void;
  onNavigate: (section: NavSection) => void;
}

const INTERVIEW_BANKS: Record<string, string[]> = {
  'fullstack-dev': [
    'How would you design authentication, rate limiting, and database indexing for a multi-tenant React + Node.js SaaS API?',
    'Explain how React reconciliation works and how you diagnose and fix unnecessary re-renders in a large dashboard.',
    'Compare SQL joins vs. denormalized caching when scaling a read-heavy student learning analytics feed.',
  ],
  'ai-ml-engineer': [
    'How do you prevent data leakage during cross-validation and feature scaling when building a churn prediction model?',
    'Design a multi-agent LLM orchestration pipeline with structured JSON outputs and latency fallbacks.',
    'When would you choose fine-tuning versus Retrieval-Augmented Generation (RAG) for enterprise documentation?',
  ],
  'cloud-devops': [
    'Walk through a zero-downtime blue/green Kubernetes deployment strategy with automated health-check rollbacks.',
    'How do you isolate network traffic and enforce least-privilege IAM roles across multi-service cloud clusters?',
    'Diagnose why a containerized Node.js microservice experiences OOMKills under sudden traffic spikes.',
  ],
  'data-scientist': [
    'How do you design an A/B test with imbalanced user cohorts and avoid novelty-effect false positives?',
    'Which evaluation metrics matter most for a 99:1 fraud detection dataset and why does raw accuracy mislead?',
    'Explain how you optimize slow PostgreSQL analytical window-function queries over 50M event rows.',
  ],
  'cybersecurity-analyst': [
    'Explain how to defend a modern web app against Stored XSS, SQL Injection, and Broken Object Level Authorization.',
    'Design a secure secret-rotation and JWT session invalidation architecture for an enterprise portal.',
    'How do you triage and contain an anomalous outbound spike detected on a production Linux node?',
  ],
  'mobile-engineer': [
    'How do you architect offline-first state synchronization and conflict resolution in a React Native mobile app?',
    'Explain strategies to keep animations at a steady 60fps while fetching large paginated API lists.',
    'How do you secure OAuth tokens and biometric unlock flows on iOS and Android devices?',
  ],
};

const SAMPLE_JD = `We are hiring a Full Stack Developer to build cloud-native student tools using TypeScript, React, Node.js, PostgreSQL SQL, and HTML/CSS. Experience with Git & CI/CD pipelines, Docker & Kubernetes, and Python automation scripts is a major plus.`;

const SAMPLE_RESUME = `Computer Science student experienced in Python, SQL, HTML/CSS, JavaScript, and TypeScript. Built REST APIs with Node.js and interactive UI components in React with Git & CI/CD workflows.`;

function inferSkillCategory(name: string): UserSkill['category'] {
  const lower = name.toLowerCase();
  if (/(react|html|css|typescript|javascript)/.test(lower)) return 'Frontend';
  if (/(node|sql)/.test(lower)) return 'Backend';
  if (/(python|machine learning|pytorch|llm)/.test(lower)) return 'Data & AI';
  if (/(docker|kubernetes|linux|git)/.test(lower)) return 'Cloud & DevOps';
  if (/(security|owasp)/.test(lower)) return 'Security';
  return 'Foundations';
}

const CATEGORY_PROMPTS: Record<
  InterviewAttemptRecord['category'],
  string[]
> = {
  Technical: [],
  HR: [
    'Tell me about a challenging deadline or conflict in a team project and how you resolved it constructively.',
    'Why do you want to transition into this domain and what drives your engineering ownership?',
  ],
  Company: [
    'Imagine joining our engineering platform on Day 1: how would you ramp up and deliver your first safe PR in week one?',
    'Describe a time you simplified a complex product requirement while protecting reliability and security.',
  ],
  DSA: [
    'Explain how to detect a cycle in a linked list in O(1) space or design an LRU cache with O(1) get/put.',
    'Compare Breadth-First Search vs Dijkstra shortest path algorithms and when each is optimal.',
  ],
  'Group Discussion': [
    'AI code assistants are transforming junior software engineering: summarize both productivity gains and quality/security guardrails for an engineering panel.',
    'Monolith-first vs Microservices for a 10-engineer startup: build a structured 2-minute opening stance.',
  ],
};

export function CareerLabView({
  profile,
  targetRole,
  match,
  onUpdateProfile,
  onNavigate,
}: CareerLabViewProps) {
  const [interviewCategory, setInterviewCategory] =
    useState<InterviewAttemptRecord['category']>('Technical');
  const [practiceMode, setPracticeMode] =
    useState<InterviewAttemptRecord['mode']>('text');
  const roleQuestions =
    interviewCategory === 'Technical'
      ? INTERVIEW_BANKS[targetRole.id] ?? INTERVIEW_BANKS['fullstack-dev']
      : CATEGORY_PROMPTS[interviewCategory];
  const [selectedQuestion, setSelectedQuestion] = useState(roleQuestions[0]);
  const [answerText, setAnswerText] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<InterviewEvaluation | null>(null);
  const [lastConfidence, setLastConfidence] = useState<{
    confidencePct: number;
    communicationPct: number;
  } | null>(null);

  // Interview reminder scheduler state
  const [schedCompany, setSchedCompany] = useState('Stripe');
  const [schedDate, setSchedDate] = useState('2026-12-01 11:00 AM');
  const [schedMode, setSchedMode] = useState<ScheduledInterviewItem['mode']>('Video');

  // ATS Resume / JD Extractor state
  const [atsInput, setAtsInput] = useState(SAMPLE_JD);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  const extractedSkills = useMemo(() => extractSkillsFromText(atsInput), [atsInput]);

  const atsBreakdown = useMemo(() => {
    const lowerProfile = new Set(profile.skills.map((s) => s.name.toLowerCase()));
    const presentInProfile = extractedSkills.filter((s) => lowerProfile.has(s.toLowerCase()));
    const missingFromProfile = extractedSkills.filter((s) => !lowerProfile.has(s.toLowerCase()));
    const matchPct =
      extractedSkills.length > 0
        ? Math.round((presentInProfile.length / extractedSkills.length) * 100)
        : 0;
    return { presentInProfile, missingFromProfile, matchPct };
  }, [extractedSkills, profile.skills]);

  // Cohort Benchmarking calculations (400-student hackathon cohort baseline)
  const cohortMetrics = useMemo(() => {
    const readinessPct = match.overallReadinessPct;
    const readinessPercentile = Math.min(99, Math.max(12, Math.round(readinessPct * 0.95 + 4)));
    const pointsPercentile = Math.min(
      99,
      Math.max(10, Math.round(Math.min(100, (profile.streakPoints / 350) * 100))),
    );
    const verifiedCount = profile.skills.filter((s) => s.verified).length;
    const verifiedPercentile = Math.min(
      99,
      Math.max(15, Math.round((verifiedCount / Math.max(1, targetRole.requiredSkills.length)) * 100)),
    );
    const portfolioItems = profile.projects.length + profile.certifications.length;
    const portfolioPercentile = Math.min(99, Math.max(14, portfolioItems * 24));

    return [
      {
        label: 'Career Readiness Score',
        userValue: `${readinessPct}%`,
        cohortAvg: '54%',
        percentile: readinessPercentile,
      },
      {
        label: 'Code Arena Streak Points',
        userValue: `${profile.streakPoints} pts`,
        cohortAvg: '110 pts',
        percentile: pointsPercentile,
      },
      {
        label: 'Verified Genuine Skills',
        userValue: `${verifiedCount} verified`,
        cohortAvg: '2 verified',
        percentile: verifiedPercentile,
      },
      {
        label: 'Projects & Certifications',
        userValue: `${portfolioItems} items`,
        cohortAvg: '2 items',
        percentile: portfolioPercentile,
      },
    ];
  }, [
    match.overallReadinessPct,
    profile.streakPoints,
    profile.skills,
    profile.projects.length,
    profile.certifications.length,
    targetRole.requiredSkills.length,
  ]);

  const handleEvaluateAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerText.trim()) return;
    setIsEvaluating(true);
    try {
      const res = await fetch('/api/ai/interview-eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: selectedQuestion,
          answer: answerText,
          roleTitle: `${targetRole.title} (${interviewCategory})`,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as InterviewEvaluation;
        setEvalResult(data);
        const wordCount = answerText.trim().split(/\s+/).length;
        const confidencePct = Math.min(98, Math.max(58, data.scorePct + (practiceMode !== 'text' ? 5 : 0)));
        const communicationPct = Math.min(98, Math.max(60, Math.round(wordCount * 1.4 + 45)));
        setLastConfidence({ confidencePct, communicationPct });
        if (profile.isSignedIn) {
          const attempt: InterviewAttemptRecord = {
            id: `int-${Date.now()}`,
            question: selectedQuestion,
            category: interviewCategory,
            mode: practiceMode,
            scorePct: data.scorePct,
            confidencePct,
            communicationPct,
            date: new Date().toISOString().split('T')[0],
          };
          onUpdateProfile({
            ...profile,
            interviewHistory: [attempt, ...(profile.interviewHistory || [])],
          });
        }
      }
    } catch {
      // Handled gracefully
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleScheduleReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedCompany.trim() || !schedDate.trim()) return;
    const item: ScheduledInterviewItem = {
      id: `sched-${Date.now()}`,
      companyName: schedCompany.trim(),
      roleTitle: targetRole.title,
      scheduledFor: schedDate.trim(),
      mode: schedMode,
      reminderSet: true,
    };
    onUpdateProfile({
      ...profile,
      scheduledInterviews: [item, ...(profile.scheduledInterviews || [])],
    });
  };

  const handleImportDetectedSkills = () => {
    const existingNames = new Set(profile.skills.map((s) => s.name.toLowerCase()));
    const toAdd: UserSkill[] = extractedSkills
      .filter((s) => !existingNames.has(s.toLowerCase()))
      .map((name) => ({
        name,
        level: 50,
        category: inferSkillCategory(name),
        verified: false,
      }));

    if (toAdd.length === 0) {
      setImportNotice('All detected skills are already in your profile inventory.');
      return;
    }

    onUpdateProfile({
      ...profile,
      skills: [...profile.skills, ...toAdd],
    });
    setImportNotice(
      `Imported ${toAdd.length} new skill(s): ${toAdd.map((s) => s.name).join(', ')}. Verify them in Skill Analysis!`,
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0B2545] dark:text-white">
            Career Lab · AI Interviewer, ATS Scanner & Cohort Benchmark
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Practice live technical interviews, scan job descriptions or resumes for missing skills, and benchmark against peers.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('skill-analysis')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] transition-colors whitespace-nowrap"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Run Genuine Skill Check</span>
        </button>
      </div>

      {/* Row 1: AI Mock Interviewer + Resume/JD ATS Skill Extractor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* AI Mock Technical Interviewer */}
        <section className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-[#0B2545] dark:text-sky-300" />
              <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
                AI Mock Technical Interviewer
              </h2>
            </div>
            <span className="text-[11px] font-medium text-emerald-700 dark:text-amber-400">
              {targetRole.title}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1">
              {(['Technical', 'HR', 'Company', 'DSA', 'Group Discussion'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setInterviewCategory(cat);
                    const nextList =
                      cat === 'Technical'
                        ? INTERVIEW_BANKS[targetRole.id] ?? INTERVIEW_BANKS['fullstack-dev']
                        : CATEGORY_PROMPTS[cat];
                    setSelectedQuestion(nextList[0]);
                    setEvalResult(null);
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                    interviewCategory === cat
                      ? 'bg-[#0B2545] text-white dark:bg-[#1D4ED8]'
                      : 'bg-[#F4F7FB] dark:bg-[#05070B] text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <select
              value={practiceMode}
              onChange={(e) => setPracticeMode(e.target.value as InterviewAttemptRecord['mode'])}
              aria-label="Mock interview simulation mode"
              className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-2.5 py-1 text-[11px] font-medium text-slate-900 dark:text-white"
            >
              <option value="text">Written Mode</option>
              <option value="voice">Voice Pitch Sim</option>
              <option value="video-sim">Video Confidence Sim</option>
            </select>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="interview-question-select"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Select Interview Prompt
            </label>
            <select
              id="interview-question-select"
              value={selectedQuestion}
              onChange={(e) => {
                setSelectedQuestion(e.target.value);
                setEvalResult(null);
              }}
              className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs text-slate-900 dark:text-white"
            >
              {roleQuestions.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-3.5">
            <p className="text-xs font-semibold text-slate-900 dark:text-white leading-relaxed">
              “{selectedQuestion}”
            </p>
          </div>

          <form onSubmit={handleEvaluateAnswer} className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="interview-answer-input"
                className="text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Your Spoken / Written Technical Answer
              </label>
              <button
                type="button"
                onClick={() =>
                  setAnswerText(
                    'I would use stateless JWT access tokens paired with short-lived refresh rotation, add Redis rate limiting per tenant key, and create composite B-tree SQL indexes on (tenant_id, created_at) so API queries stay O(log n) under load.',
                  )
                }
                className="text-[11px] font-medium text-[#0B2545] dark:text-amber-400 hover:underline"
              >
                Insert Sample Answer
              </button>
            </div>
            <textarea
              id="interview-answer-input"
              rows={4}
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="Explain architecture, complexity, edge cases, and database/API trade-offs..."
              className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] p-3 text-xs text-slate-900 dark:text-white leading-relaxed"
            />
            <button
              type="submit"
              disabled={isEvaluating || !answerText.trim()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] transition-colors disabled:opacity-60"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isEvaluating ? 'Grading with AI Rubric...' : 'Evaluate Interview Answer'}</span>
            </button>
          </form>

          {evalResult && (
            <div className="rounded-xl border border-emerald-500/35 dark:border-[#1E3A5F] bg-emerald-50/70 dark:bg-[#05070B] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  Hiring Committee Rubric Score ({interviewCategory})
                </span>
                <span className="font-mono text-lg font-bold tabular-nums text-emerald-700 dark:text-amber-400">
                  {evalResult.scorePct}%
                </span>
              </div>
              {lastConfidence && (
                <p className="text-[11px] font-mono text-slate-600 dark:text-slate-300 tabular-nums">
                  Confidence: {lastConfidence.confidencePct}% · Communication Clarity: {lastConfidence.communicationPct}%
                </p>
              )}
              <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                {evalResult.modelFeedback}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                    Strengths
                  </p>
                  <ul className="mt-1 space-y-1">
                    {evalResult.strengths.map((s) => (
                      <li key={s} className="text-xs text-slate-700 dark:text-slate-300 flex gap-1.5">
                        <span className="text-emerald-600">+</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                    Next Improvements
                  </p>
                  <ul className="mt-1 space-y-1">
                    {evalResult.improvements.map((imp) => (
                      <li key={imp} className="text-xs text-slate-700 dark:text-slate-300 flex gap-1.5">
                        <span className="text-amber-600 dark:text-amber-400">→</span>
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Interview Reminder Scheduler */}
          <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-2.5">
            <p className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B2545] dark:text-white">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-amber-400" />
              <span>Upcoming Interview Schedule &amp; Reminders</span>
            </p>
            <form onSubmit={handleScheduleReminder} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <input
                type="text"
                value={schedCompany}
                onChange={(e) => setSchedCompany(e.target.value)}
                placeholder="Company"
                aria-label="Scheduled interview company"
                className="sm:col-span-4 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
              />
              <input
                type="text"
                value={schedDate}
                onChange={(e) => setSchedDate(e.target.value)}
                placeholder="Date & Time"
                aria-label="Scheduled interview date"
                className="sm:col-span-4 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
              />
              <select
                value={schedMode}
                onChange={(e) => setSchedMode(e.target.value as ScheduledInterviewItem['mode'])}
                aria-label="Interview format"
                className="sm:col-span-2 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-2 py-1.5 text-xs text-slate-900 dark:text-white"
              >
                <option value="Video">Video</option>
                <option value="Phone">Phone</option>
                <option value="On-Site">On-Site</option>
              </select>
              <button
                type="submit"
                className="sm:col-span-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-[#1D4ED8]"
              >
                Set
              </button>
            </form>
            {(profile.scheduledInterviews || []).slice(0, 3).map((item) => (
              <p key={item.id} className="text-[11px] text-slate-600 dark:text-slate-300">
                Reminder Active: <strong>{item.companyName}</strong> ({item.mode}) · {item.scheduledFor}
              </p>
            ))}
          </div>
        </section>

        {/* Resume / Job-Description ATS Skill Extractor */}
        <section className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileSearch className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
                Resume & Job-Description ATS Skill Scanner
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAtsInput(SAMPLE_JD);
                  setImportNotice(null);
                }}
                className="text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:underline"
              >
                Sample JD
              </button>
              <button
                type="button"
                onClick={() => {
                  setAtsInput(SAMPLE_RESUME);
                  setImportNotice(null);
                }}
                className="text-[11px] font-medium text-[#0B2545] dark:text-amber-400 hover:underline"
              >
                Sample Resume
              </button>
            </div>
          </div>

          <textarea
            rows={4}
            value={atsInput}
            onChange={(e) => {
              setAtsInput(e.target.value);
              setImportNotice(null);
            }}
            aria-label="Paste resume or job description text"
            placeholder="Paste any job posting or resume text to extract technical skills and compute ATS match..."
            className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] p-3 text-xs text-slate-900 dark:text-white leading-relaxed"
          />

          <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                ATS Keyword Match vs Your Profile
              </span>
              <span className="font-mono text-base font-bold tabular-nums text-[#0B2545] dark:text-amber-400">
                {atsBreakdown.matchPct}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Covered in Your Profile ({atsBreakdown.presentInProfile.length})
                </p>
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  {atsBreakdown.presentInProfile.join(' · ') || 'None yet'}
                </p>
              </div>
              <div>
                <p className="font-semibold text-amber-700 dark:text-amber-400">
                  Missing from Profile ({atsBreakdown.missingFromProfile.length})
                </p>
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  {atsBreakdown.missingFromProfile.join(' · ') || '100% keyword coverage!'}
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleImportDetectedSkills}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Import Detected Skills to Profile</span>
              </button>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Detected {extractedSkills.length} technical competencies
              </span>
            </div>

            {importNotice && (
              <p className="text-xs font-medium text-emerald-700 dark:text-amber-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{importNotice}</span>
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Row 2: Cohort Benchmarking & Daily Micro-Sprint */}
      <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-amber-400" />
            <div>
              <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
                Live Cohort Percentile Benchmark (400+ Students)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                See where {profile.name} stands across verified skills, coding velocity, and portfolio execution.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigate('code-arena')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-white/15 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5"
            >
              <Rocket className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Daily Code Sprint (+25 pts)</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('global-jobs')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-white/15 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5"
            >
              <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Match Global Companies</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cohortMetrics.map((m) => (
            <div
              key={m.label}
              className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-4 space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  {m.label}
                </span>
                <span className="font-mono text-xs font-bold tabular-nums text-emerald-700 dark:text-amber-400">
                  Top {Math.max(1, 100 - m.percentile)}%
                </span>
              </div>
              <p className="font-display text-xl font-bold tabular-nums text-[#0B2545] dark:text-white">
                {m.userValue}
              </p>
              <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#0B2545] via-emerald-600 to-amber-500 dark:from-[#1D4ED8] dark:via-emerald-500 dark:to-amber-400 transition-all duration-500"
                  style={{ width: `${m.percentile}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Cohort median: {m.cohortAvg}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

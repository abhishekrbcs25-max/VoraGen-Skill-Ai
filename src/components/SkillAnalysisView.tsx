import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Code2,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  APTITUDE_CATEGORIES,
  APTITUDE_QUESTION_BANK,
  CAREER_INTEREST_RECOMMENDATIONS,
} from '../data/aptitudeCatalog';
import {
  ASSESSMENT_QUESTION_BANKS,
  getAssessmentQuestionsForSkill,
} from '../data/assessmentBank';
import { executeCodeInSandbox, type SandboxExecutionResult } from '../utils/codeSandbox';
import { buildAptitudePerformanceReport } from '../utils/platformEngines';
import {
  evaluateSkillAuthenticity,
  gradeInteractiveAssessment,
} from '../utils/skillEngine';
import type {
  AptitudeAttemptRecord,
  AptitudeCategory,
  AssessmentQuestion,
  CareerRole,
  Difficulty,
  MultiAgentReport,
  SkillAuthenticityResult,
  SkillMatchBreakdown,
  UserProfile,
} from '../types';

interface SkillAnalysisViewProps {
  profile: UserProfile;
  targetRole: CareerRole;
  match: SkillMatchBreakdown;
  agentReport: MultiAgentReport | null;
  isSyncingAI: boolean;
  onRunMultiAgentSync: (reason?: string) => void;
  onSubmitAssessment: (skillName: string, scorePct: number) => void;
  onVerifySkillAuthenticity: (result: SkillAuthenticityResult) => void;
  onRecordAptitudeAttempt?: (attempt: AptitudeAttemptRecord) => void;
  onSelectCareerGoal?: (roleId: string) => void;
  onOpenCoursesHub?: () => void;
  initialSkill?: string;
  initialMode?: 'diagnostic' | 'authenticity' | 'aptitude';
}

export function SkillAnalysisView({
  profile,
  targetRole,
  match,
  agentReport,
  isSyncingAI,
  onRunMultiAgentSync,
  onSubmitAssessment,
  onVerifySkillAuthenticity,
  onRecordAptitudeAttempt,
  onSelectCareerGoal,
  onOpenCoursesHub,
  initialSkill,
  initialMode,
}: SkillAnalysisViewProps) {
  const quizSkills = useMemo(() => {
    const bankKeys = Object.keys(ASSESSMENT_QUESTION_BANKS);
    const roleSkillNames = targetRole.requiredSkills.map((r) => r.name);
    const merged = [...bankKeys];
    for (const rName of roleSkillNames) {
      if (!merged.some((k) => k.toLowerCase() === rName.toLowerCase())) {
        merged.push(rName);
      }
    }
    if (initialSkill && !merged.some((k) => k.toLowerCase() === initialSkill.toLowerCase())) {
      merged.unshift(initialSkill);
    }
    return merged;
  }, [targetRole.requiredSkills, initialSkill]);

  const [testMode, setTestMode] = useState<'diagnostic' | 'authenticity' | 'aptitude'>(
    initialMode || 'diagnostic',
  );
  const [selectedSkill, setSelectedSkill] = useState<string>(
    initialSkill || quizSkills[0],
  );
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [codeDrafts, setCodeDrafts] = useState<Record<string, string>>({});
  const [codeResults, setCodeResults] = useState<Record<string, SandboxExecutionResult>>({});
  const [codingPassMap, setCodingPassMap] = useState<Record<string, boolean>>({});
  const [runningCodeId, setRunningCodeId] = useState<string | null>(null);
  const [lastOutcome, setLastOutcome] = useState<{
    skill: string;
    score: number;
    remedial: boolean;
    summaryText: string;
  } | null>(null);
  const [authenticityResult, setAuthenticityResult] = useState<SkillAuthenticityResult | null>(
    null,
  );

  // Aptitude & Timed Exam state
  const [aptitudeCategory, setAptitudeCategory] = useState<AptitudeCategory>('Technical Aptitude');
  const [aptitudeDifficulty, setAptitudeDifficulty] = useState<'All' | Difficulty>('All');
  const [aptitudeAnswers, setAptitudeAnswers] = useState<Record<string, number>>({});
  const [timedMode, setTimedMode] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(600);
  const [aptitudeReport, setAptitudeReport] = useState<ReturnType<
    typeof buildAptitudePerformanceReport
  > | null>(null);

  useEffect(() => {
    if (!timedMode || testMode !== 'aptitude' || aptitudeReport) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [timedMode, testMode, aptitudeReport]);

  useEffect(() => {
    if (initialSkill) {
      setSelectedSkill(initialSkill);
      setAnswers({});
      setCodeDrafts({});
      setCodeResults({});
      setCodingPassMap({});
      setAuthenticityResult(null);
      setLastOutcome(null);
    }
    if (initialMode) {
      setTestMode(initialMode);
    }
  }, [initialSkill, initialMode]);

  const questions = useMemo(
    () => getAssessmentQuestionsForSkill(selectedSkill, targetRole),
    [selectedSkill, targetRole],
  );

  const aptitudeQuestions = useMemo(() => {
    const bank = APTITUDE_QUESTION_BANK[aptitudeCategory] || [];
    return aptitudeDifficulty === 'All'
      ? bank
      : bank.filter((q) => q.difficulty === aptitudeDifficulty);
  }, [aptitudeCategory, aptitudeDifficulty]);

  const handleGradeAptitudeExam = (e: React.FormEvent) => {
    e.preventDefault();
    const chosenDiff: Difficulty = aptitudeDifficulty === 'All' ? 'Medium' : aptitudeDifficulty;
    const report = buildAptitudePerformanceReport({
      category: aptitudeCategory,
      difficulty: chosenDiff,
      questions: aptitudeQuestions,
      answers: aptitudeAnswers,
      elapsedSec: timedMode ? 600 - secondsLeft : undefined,
    });
    setAptitudeReport(report);
    onRecordAptitudeAttempt?.({
      id: `apt-${Date.now()}`,
      category: aptitudeCategory,
      difficulty: chosenDiff,
      timedSeconds: timedMode ? 600 - secondsLeft : undefined,
      scorePct: report.scorePct,
      date: new Date().toISOString().split('T')[0],
      strengths: report.strengths,
      weaknesses: report.weaknesses,
    });
  };
  const mcqCount = useMemo(
    () => questions.filter((q) => q.kind !== 'coding').length,
    [questions],
  );
  const codingCount = useMemo(
    () => questions.filter((q) => q.kind === 'coding').length,
    [questions],
  );

  const attemptedCount = useMemo(() => {
    let count = 0;
    for (const q of questions) {
      if (q.kind === 'coding') {
        if (codingPassMap[q.id] || Boolean(codeResults[q.id])) count += 1;
      } else if (answers[q.id] !== undefined) {
        count += 1;
      }
    }
    return count;
  }, [questions, answers, codingPassMap, codeResults]);

  const profileClaimedSkill = profile.skills.find(
    (s) => s.name.toLowerCase() === selectedSkill.toLowerCase(),
  );
  const claimedLevel = profileClaimedSkill ? profileClaimedSkill.level : 65;

  const handleRunCodingTest = async (q: AssessmentQuestion) => {
    const code = codeDrafts[q.id] ?? q.starterCode ?? '';
    setRunningCodeId(q.id);
    try {
      const res = await executeCodeInSandbox(code, q.testCases || []);
      setCodeResults((prev) => ({ ...prev, [q.id]: res }));
      setCodingPassMap((prev) => ({ ...prev, [q.id]: res.passed }));
    } finally {
      setRunningCodeId(null);
    }
  };

  const handleGradeQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (questions.length === 0) return;

    // Auto-run any drafted coding problems that haven't been executed after last edit
    const nextPassMap = { ...codingPassMap };
    const nextResults = { ...codeResults };
    for (const q of questions) {
      if (q.kind === 'coding' && codeDrafts[q.id] !== undefined && !nextResults[q.id]) {
        const res = await executeCodeInSandbox(codeDrafts[q.id], q.testCases || []);
        nextResults[q.id] = res;
        nextPassMap[q.id] = res.passed;
      }
    }
    setCodeResults(nextResults);
    setCodingPassMap(nextPassMap);

    const graded = gradeInteractiveAssessment(questions, answers, nextPassMap);

    if (testMode === 'authenticity') {
      const result = evaluateSkillAuthenticity(
        selectedSkill,
        claimedLevel,
        graded.correctCount,
        graded.totalQuestions,
      );
      setAuthenticityResult(result);
      setLastOutcome(null);
      onVerifySkillAuthenticity(result);
      return;
    }

    setAuthenticityResult(null);
    setLastOutcome({
      skill: selectedSkill,
      score: graded.scorePct,
      remedial: graded.scorePct < 60,
      summaryText: `${graded.mcqCorrect}/${graded.mcqTotal} MCQs correct · ${graded.codingPassed}/${graded.codingTotal} Coding Problems passed`,
    });
    onSubmitAssessment(selectedSkill, graded.scorePct);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
            Skill Analysis, Authenticity Check & Multi-Agent Diagnostics
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Pass 20-question skill exams (MCQs + live coding problems) to verify skills from 0% readiness and sync 4 AI agents.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onRunMultiAgentSync('Manual Skill Analysis Refresh')}
          disabled={isSyncingAI}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] transition-colors disabled:opacity-60 whitespace-nowrap"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAI ? 'animate-spin' : ''}`} />
          <span>{isSyncingAI ? 'Collaborating...' : 'Collaborate AI Agents'}</span>
        </button>
      </div>

      {/* Strengths, Weaknesses & Missing Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-5">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            Verified Strengths
          </p>
          <p className="mt-2 font-display text-2xl font-bold tabular-nums text-[#0B2545] dark:text-white">
            {match.strongSkillNames.length}
          </p>
          <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
            {match.strongSkillNames.join(' · ') || 'Complete an assessment (>= 60%) to verify strengths.'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-5">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
            Needs Reinforcement (&lt;60%)
          </p>
          <p className="mt-2 font-display text-2xl font-bold tabular-nums text-[#0B2545] dark:text-white">
            {match.weakSkillNames.length + profile.remedialSkills.length}
          </p>
          <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
            {Array.from(new Set([...match.weakSkillNames, ...profile.remedialSkills])).join(' · ') ||
              'No critical weak foundations flagged.'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-5">
          <p className="text-xs font-semibold text-[#0B2545] dark:text-sky-300">
            Missing for {targetRole.title}
          </p>
          <p className="mt-2 font-display text-2xl font-bold tabular-nums text-[#0B2545] dark:text-white">
            {match.missingSkillNames.length}
          </p>
          <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
            {match.missingSkillNames.join(' · ') || 'All role skills covered!'}
          </p>
        </div>
      </div>

      {/* Diagnostic Assessment Quiz + Multi-Agent War Room */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Interactive Quiz & Genuine Skill Authenticity Test */}
        <section className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-5">
          {/* Segmented Mode Switcher */}
          <div
            role="tablist"
            aria-label="Skill evaluation mode"
            className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#F4F7FB] dark:bg-[#05070B]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={testMode === 'diagnostic'}
              onClick={() => {
                setTestMode('diagnostic');
                setAuthenticityResult(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                testMode === 'diagnostic'
                  ? 'bg-white dark:bg-[#1D4ED8] text-[#0B2545] dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-[#0B2545] dark:hover:text-white'
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Diagnostic Assessment</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={testMode === 'authenticity'}
              onClick={() => {
                setTestMode('authenticity');
                setLastOutcome(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                testMode === 'authenticity'
                  ? 'bg-white dark:bg-[#1D4ED8] text-[#0B2545] dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-[#0B2545] dark:hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Genuine Skill Check</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={testMode === 'aptitude'}
              onClick={() => {
                setTestMode('aptitude');
                setAuthenticityResult(null);
                setLastOutcome(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                testMode === 'aptitude'
                  ? 'bg-white dark:bg-[#1D4ED8] text-[#0B2545] dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-[#0B2545] dark:hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Aptitude &amp; Career Exams</span>
            </button>
          </div>

          {testMode === 'aptitude' ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
                    {aptitudeCategory} Exam &amp; Career Discovery
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Aptitude, logical, quantitative, communication &amp; interest diagnostics with skill gap breakdown.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-pressed={timedMode}
                    onClick={() => {
                      setTimedMode((prev) => !prev);
                      setSecondsLeft(600);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                      timedMode
                        ? 'bg-amber-500 text-slate-950 border-amber-500'
                        : 'bg-[#F4F7FB] dark:bg-[#05070B] text-slate-700 dark:text-slate-200 border-slate-300 dark:border-[#1E3A5F]/70'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {timedMode
                        ? `Timed: ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`
                        : 'Enable 10m Timer'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {APTITUDE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setAptitudeCategory(cat);
                      setAptitudeAnswers({});
                      setAptitudeReport(null);
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      aptitudeCategory === cat
                        ? 'bg-[#0B2545] text-white dark:bg-[#1D4ED8]'
                        : 'bg-[#F4F7FB] dark:bg-[#05070B] text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-500 dark:text-slate-400">Difficulty:</span>
                {(['All', 'Easy', 'Medium', 'Hard'] as const).map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setAptitudeDifficulty(diff)}
                    className={`px-2.5 py-1 rounded border text-xs font-medium ${
                      aptitudeDifficulty === diff
                        ? 'border-[#0B2545] bg-[#0B2545] text-white dark:border-[#1D4ED8] dark:bg-[#1D4ED8]'
                        : 'border-slate-300 dark:border-[#1E3A5F]/60 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>

              <form onSubmit={handleGradeAptitudeExam} className="space-y-3">
                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  {aptitudeQuestions.map((q, idx) => (
                    <div
                      key={q.id}
                      role="radiogroup"
                      aria-label={q.question}
                      className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{q.subTopic}</span>
                        <span className="font-mono">{q.difficulty}</span>
                      </div>
                      <p className="text-sm font-semibold text-[#0B2545] dark:text-white leading-snug">
                        {idx + 1}. {q.question}
                      </p>
                      <div className="space-y-1">
                        {q.options.map((opt, optIdx) => (
                          <label
                            key={opt}
                            className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-white dark:hover:bg-[#0F213E] cursor-pointer text-xs text-slate-700 dark:text-slate-200"
                          >
                            <input
                              type="radio"
                              name={q.id}
                              checked={aptitudeAnswers[q.id] === optIdx}
                              onChange={() =>
                                setAptitudeAnswers((prev) => ({ ...prev, [q.id]: optIdx }))
                              }
                              className="mt-0.5 accent-[#0B2545] dark:accent-[#1D4ED8]"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200 dark:border-white/10">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] transition-colors"
                  >
                    Evaluate {aptitudeCategory} ({aptitudeQuestions.length} Qs)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAptitudeAnswers({});
                      setAptitudeReport(null);
                      setSecondsLeft(600);
                    }}
                    className="px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-[#1E3A5F]/70 text-slate-700 dark:text-slate-200"
                  >
                    Retake Exam
                  </button>
                </div>
              </form>

              {aptitudeReport && (
                <div className="rounded-xl border border-emerald-400/50 bg-emerald-50/70 dark:bg-[#05070B] p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-[#0B2545] dark:text-white">
                      Detailed Performance Report · {aptitudeCategory}
                    </span>
                    <span className="font-mono text-base font-bold tabular-nums text-emerald-700 dark:text-amber-400">
                      {aptitudeReport.scorePct}% ({aptitudeReport.correctCount}/{aptitudeReport.totalQuestions})
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                        Skill Strengths
                      </p>
                      <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                        {aptitudeReport.strengths.join(' · ') || 'Complete more items to highlight strengths'}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-amber-700 dark:text-amber-400">
                        Weaknesses &amp; Focus Gaps
                      </p>
                      <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                        {aptitudeReport.weaknesses.join(' · ') || 'No weak areas flagged!'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-white/10">
                    <p className="font-semibold text-[#0B2545] dark:text-white">
                      Recommended Job Roles &amp; Courses
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">
                      Roles: {aptitudeReport.recommendedRoles.join(' · ')}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {aptitudeReport.recommendedCourses.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => onOpenCoursesHub?.()}
                          className="px-2.5 py-1 rounded-md border border-slate-300 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] text-xs font-medium text-[#0B2545] dark:text-amber-300 hover:underline"
                        >
                          {c.title}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Interest-Based Career Recommendations */}
              <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-4 space-y-2.5">
                <p className="text-xs font-bold text-[#0B2545] dark:text-white">
                  Interest-Based Career Recommendations
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {CAREER_INTEREST_RECOMMENDATIONS.map((track) => (
                    <div
                      key={track.id}
                      className="rounded-lg border border-slate-200 dark:border-[#1E3A5F]/50 bg-white dark:bg-[#0A1628] p-3 space-y-1"
                    >
                      <p className="text-xs font-semibold text-[#0B2545] dark:text-white">
                        {track.recommendedRoleTitle}
                      </p>
                      <p className="text-[11px] text-emerald-700 dark:text-amber-400">
                        Interest: {track.interest}
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        {track.summary}
                      </p>
                      {onSelectCareerGoal && (
                        <button
                          type="button"
                          onClick={() => onSelectCareerGoal(track.recommendedRoleId)}
                          className="mt-1 text-[11px] font-semibold text-[#0B2545] dark:text-sky-300 hover:underline"
                        >
                          Set as Target Role →
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {(profile.aptitudeHistory || []).length > 0 && (
                <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-4 space-y-2 text-xs">
                  <p className="font-bold text-[#0B2545] dark:text-white">
                    Assessment History ({profile.aptitudeHistory?.length})
                  </p>
                  <div className="space-y-1.5">
                    {(profile.aptitudeHistory || []).slice(0, 5).map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-2">
                        <span className="text-slate-700 dark:text-slate-300">
                          {item.category} · {item.difficulty} · {item.date}
                        </span>
                        <span className="font-mono font-bold tabular-nums text-emerald-700 dark:text-amber-400">
                          {item.scorePct}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
                    {testMode === 'authenticity'
                      ? 'Genuine Skill Authenticity Exam'
                      : 'Interactive Skill Assessment'}
                  </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {questions.length} Questions ({mcqCount} MCQs + {codingCount} Live Coding Problems) · Pass &ge; 60% to unlock readiness progress.
              </p>
            </div>
            <span className="font-mono text-xs font-semibold tabular-nums px-2.5 py-1 rounded-md bg-[#F4F7FB] dark:bg-[#05070B] border border-slate-200 dark:border-[#1E3A5F]/60 text-[#0B2545] dark:text-amber-400">
              {attemptedCount}/{questions.length} Attempted
            </span>
          </div>

          <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#0B2545] via-emerald-600 to-amber-500 dark:from-[#1D4ED8] dark:via-emerald-500 dark:to-amber-400 transition-all duration-300"
              style={{
                width: `${questions.length > 0 ? Math.round((attemptedCount / questions.length) * 100) : 0}%`,
              }}
            />
          </div>

          <div role="group" aria-label="Select skill topic" className="flex flex-wrap gap-1.5">
            {quizSkills.map((sk) => (
              <button
                key={sk}
                type="button"
                aria-pressed={selectedSkill === sk}
                onClick={() => {
                  setSelectedSkill(sk);
                  setAnswers({});
                  setCodeDrafts({});
                  setCodeResults({});
                  setCodingPassMap({});
                  setLastOutcome(null);
                  setAuthenticityResult(null);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  selectedSkill === sk
                    ? 'bg-[#0B2545] text-white dark:bg-[#1D4ED8]'
                    : 'bg-[#F4F7FB] dark:bg-[#05070B] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#0F213E]'
                }`}
              >
                {sk}
              </button>
            ))}
          </div>

          {testMode === 'authenticity' && (
            <div className="rounded-xl border border-amber-500/35 bg-amber-50/70 dark:bg-amber-500/10 p-3.5 flex items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-semibold text-[#0B2545] dark:text-white">
                  Claimed {selectedSkill} Level: {claimedLevel}%
                </span>
                <p className="text-slate-600 dark:text-slate-300">
                  Status: {profileClaimedSkill?.verified ? 'Verified Genuine' : 'Unverified Claim — Exam Required'}
                </p>
              </div>
              <ShieldCheck
                className={`w-5 h-5 shrink-0 ${
                  profileClaimedSkill?.verified
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              />
            </div>
          )}

          <form onSubmit={handleGradeQuiz} className="space-y-4">
            <div className="space-y-4 max-h-[760px] overflow-y-auto pr-1">
              {questions.map((q, qIdx) => {
                if (q.kind === 'coding') {
                  const draftCode = codeDrafts[q.id] ?? q.starterCode ?? '';
                  const sandboxRes = codeResults[q.id];
                  const isRunning = runningCodeId === q.id;
                  return (
                    <div
                      key={q.id}
                      className="rounded-xl border border-[#0B2545]/25 dark:border-[#1D4ED8]/45 bg-[#F4F7FB] dark:bg-[#05070B] p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-amber-400">
                          <Code2 className="w-3.5 h-3.5" />
                          <span>Coding Problem · Q{qIdx + 1}</span>
                        </span>
                        {sandboxRes && (
                          <span
                            className={`text-[11px] font-mono font-bold ${
                              sandboxRes.passed
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            {sandboxRes.passed ? 'ALL TESTS PASSED' : 'TESTS FAILED'}
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-semibold text-[#0B2545] dark:text-white leading-snug">
                        {qIdx + 1}. {q.question}
                      </p>

                      {q.examples && q.examples.length > 0 && (
                        <div className="rounded-lg bg-white dark:bg-[#0A1628] border border-slate-200 dark:border-[#1E3A5F]/60 px-3 py-2 text-[11px] font-mono text-slate-600 dark:text-slate-300 space-y-0.5">
                          {q.examples.map((ex, i) => (
                            <p key={i}>
                              Input: {ex.input} &rarr; Expected: {ex.output}
                            </p>
                          ))}
                        </div>
                      )}

                      <textarea
                        rows={6}
                        value={draftCode}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCodeDrafts((prev) => ({ ...prev, [q.id]: val }));
                          setCodeResults((prev) => {
                            const next = { ...prev };
                            delete next[q.id];
                            return next;
                          });
                          setCodingPassMap((prev) => ({ ...prev, [q.id]: false }));
                        }}
                        aria-label={`Code editor for question ${qIdx + 1}`}
                        spellCheck={false}
                        className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#05070B] text-emerald-300 font-mono text-xs p-3 leading-relaxed"
                      />

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={isRunning}
                          onClick={() => handleRunCodingTest(q)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] disabled:opacity-60"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>{isRunning ? 'Executing...' : 'Run Sandbox Tests'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCodeDrafts((prev) => ({ ...prev, [q.id]: q.starterCode ?? '' }));
                            setCodeResults((prev) => {
                              const next = { ...prev };
                              delete next[q.id];
                              return next;
                            });
                            setCodingPassMap((prev) => ({ ...prev, [q.id]: false }));
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-[#1E3A5F]/70 text-slate-600 dark:text-slate-300"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset</span>
                        </button>
                      </div>

                      {sandboxRes && (
                        <div
                          className={`rounded-lg border p-2.5 text-[11px] font-mono space-y-0.5 ${
                            sandboxRes.passed
                              ? 'border-emerald-400/50 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                              : 'border-amber-400/50 bg-amber-50 dark:bg-amber-500/10 text-amber-950 dark:text-amber-200'
                          }`}
                        >
                          {sandboxRes.details.map((line, i) => (
                            <p key={i}>{line}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div
                    key={q.id}
                    role="radiogroup"
                    aria-label={q.question}
                    className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-4 space-y-2.5"
                  >
                    <p className="text-sm font-semibold text-[#0B2545] dark:text-white leading-snug">
                      {qIdx + 1}. {q.question}
                    </p>
                    <div className="space-y-1.5">
                      {q.options.map((opt, optIdx) => (
                        <label
                          key={opt}
                          className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-white dark:hover:bg-[#0F213E] cursor-pointer text-xs text-slate-700 dark:text-slate-200"
                        >
                          <input
                            type="radio"
                            name={q.id}
                            checked={answers[q.id] === optIdx}
                            onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: optIdx }))}
                            className="mt-0.5 accent-[#0B2545] dark:accent-[#1D4ED8]"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200 dark:border-white/10">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] transition-colors"
              >
                {testMode === 'authenticity'
                  ? `Verify ${selectedSkill} Authenticity`
                  : `Submit & Evaluate ${selectedSkill} (${questions.length} Qs)`}
              </button>

              {testMode === 'diagnostic' ? (
                <button
                  type="button"
                  onClick={() => {
                    setAuthenticityResult(null);
                    setLastOutcome({
                      skill: selectedSkill,
                      score: 33,
                      remedial: true,
                      summaryText: 'Simulated diagnostic below 60% threshold.',
                    });
                    onSubmitAssessment(selectedSkill, 33);
                  }}
                  className="px-3.5 py-2.5 rounded-lg text-xs font-semibold border border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-500/10 transition-colors"
                >
                  Simulate Low Score (33%)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const simResult = evaluateSkillAuthenticity(
                      selectedSkill,
                      Math.max(85, claimedLevel),
                      2,
                      questions.length,
                    );
                    setAuthenticityResult(simResult);
                    onVerifySkillAuthenticity(simResult);
                  }}
                  className="px-3.5 py-2.5 rounded-lg text-xs font-semibold border border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-500/10 transition-colors"
                >
                  Test Overclaimed Scenario (2/{questions.length})
                </button>
              )}
            </div>
          </form>

          {authenticityResult && (
            <div
              className={`rounded-xl border p-4 text-xs space-y-1.5 ${
                authenticityResult.isGenuine
                  ? 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                  : 'border-amber-400 dark:border-amber-500/45 bg-amber-50 dark:bg-amber-500/10 text-amber-950 dark:text-amber-200'
              }`}
            >
              <div className="flex items-center justify-between gap-2 font-semibold">
                <span className="flex items-center gap-1.5">
                  {authenticityResult.isGenuine ? (
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>
                    {authenticityResult.skillName}: {authenticityResult.verdict}
                  </span>
                </span>
                <span className="font-mono tabular-nums">
                  Claimed {authenticityResult.claimedLevel}% · Actual {authenticityResult.actualScorePct}%
                </span>
              </div>
              <p className="leading-relaxed">{authenticityResult.summary}</p>
            </div>
          )}

          {lastOutcome && (
            <div
              className={`rounded-xl border p-4 text-xs space-y-1 ${
                lastOutcome.remedial
                  ? 'border-amber-400 dark:border-amber-500/45 bg-amber-50 dark:bg-amber-500/10 text-amber-950 dark:text-amber-200'
                  : 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {lastOutcome.remedial ? (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                )}
                <span>
                  {lastOutcome.skill} Assessment Score: {lastOutcome.score}% ({lastOutcome.summaryText})
                </span>
              </div>
              <p>
                {lastOutcome.remedial
                  ? 'Score fell below 60%. AI Curriculum Architect recalibrated your Learning Recommendations with remedial foundations.'
                  : 'Exam passed! Skill verified and readiness meter unlocked above 0%.'}
              </p>
            </div>
          )}
            </>
          )}
        </section>

        {/* Multi-Agent Collaboration War Room */}
        <section className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
                Multi-Agent AI Collaboration Log
              </h2>
            </div>
            {agentReport && (
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                Engine: {agentReport.source}
              </span>
            )}
          </div>

          {isSyncingAI ? (
            <div className="space-y-3 py-4">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                Coordinating Skill Profiler, Market Matcher, Curriculum Architect & Career Mentor...
              </p>
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-20 rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-slate-100 dark:bg-[#05070B] animate-pulse"
                />
              ))}
            </div>
          ) : agentReport ? (
            <div className="space-y-4">
              {agentReport.recalibrationNotice && (
                <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <span>{agentReport.recalibrationNotice}</span>
                </div>
              )}

              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                {agentReport.executiveSummary}
              </p>

              <div className="space-y-3">
                {agentReport.steps.map((step, idx) => (
                  <div
                    key={step.agentName}
                    className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#0B2545] dark:text-white">
                        0{idx + 1}. {step.agentName}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {step.agentRole}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {step.summary}
                    </p>
                    <ul className="space-y-1 pt-1">
                      {step.actionItems.map((item) => (
                        <li
                          key={item}
                          className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-1.5"
                        >
                          <span className="text-emerald-600 dark:text-amber-400 font-bold">·</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Click <strong>Collaborate AI Agents</strong> above to run a live 4-agent diagnostic synthesis.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

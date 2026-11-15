import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { DIAGNOSTIC_QUIZZES } from '../data/careerData';
import { evaluateSkillAuthenticity } from '../utils/skillEngine';
import type {
  CareerRole,
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
  initialSkill?: string;
  initialMode?: 'diagnostic' | 'authenticity';
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
  initialSkill,
  initialMode,
}: SkillAnalysisViewProps) {
  const quizSkills = Object.keys(DIAGNOSTIC_QUIZZES);
  const [testMode, setTestMode] = useState<'diagnostic' | 'authenticity'>(
    initialMode || 'diagnostic',
  );
  const [selectedSkill, setSelectedSkill] = useState<string>(
    initialSkill && DIAGNOSTIC_QUIZZES[initialSkill] ? initialSkill : quizSkills[0],
  );
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [lastOutcome, setLastOutcome] = useState<{
    skill: string;
    score: number;
    remedial: boolean;
  } | null>(null);
  const [authenticityResult, setAuthenticityResult] = useState<SkillAuthenticityResult | null>(
    null,
  );

  useEffect(() => {
    if (initialSkill && DIAGNOSTIC_QUIZZES[initialSkill]) {
      setSelectedSkill(initialSkill);
      setAnswers({});
      setAuthenticityResult(null);
      setLastOutcome(null);
    }
    if (initialMode) {
      setTestMode(initialMode);
    }
  }, [initialSkill, initialMode]);

  const questions = DIAGNOSTIC_QUIZZES[selectedSkill] ?? [];
  const profileClaimedSkill = profile.skills.find(
    (s) => s.name.toLowerCase() === selectedSkill.toLowerCase(),
  );
  const claimedLevel = profileClaimedSkill ? profileClaimedSkill.level : 65;

  const handleGradeQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (questions.length === 0) return;
    let correct = 0;
    for (const q of questions) {
      if (answers[q.id] === q.correctIndex) correct++;
    }

    if (testMode === 'authenticity') {
      const result = evaluateSkillAuthenticity(
        selectedSkill,
        claimedLevel,
        correct,
        questions.length,
      );
      setAuthenticityResult(result);
      setLastOutcome(null);
      onVerifySkillAuthenticity(result);
      return;
    }

    const scorePct = Math.round((correct / questions.length) * 100);
    setAuthenticityResult(null);
    setLastOutcome({
      skill: selectedSkill,
      score: scorePct,
      remedial: scorePct < 60,
    });
    onSubmitAssessment(selectedSkill, scorePct);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
            Skill Analysis, Authenticity Check & Multi-Agent Diagnostics
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Identify strengths, verify whether claimed skills are genuine, take diagnostic quizzes, and watch 4 AI agents collaborate.
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
            {match.strongSkillNames.join(' · ') || 'Complete an assessment to verify strengths.'}
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
        <section className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-5">
          {/* Segmented Mode Switcher */}
          <div
            role="tablist"
            aria-label="Skill evaluation mode"
            className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#F4F7FB] dark:bg-[#05070B]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={testMode === 'diagnostic'}
              onClick={() => {
                setTestMode('diagnostic');
                setAuthenticityResult(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
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
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                testMode === 'authenticity'
                  ? 'bg-white dark:bg-[#1D4ED8] text-[#0B2545] dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-[#0B2545] dark:hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Genuine Skill Check</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
                {testMode === 'authenticity'
                  ? 'Genuine Skill Authenticity Test'
                  : 'Interactive Skill Assessment'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {testMode === 'authenticity'
                  ? `Audits whether your claimed ${selectedSkill} proficiency (${claimedLevel}%) is genuine or overclaimed.`
                  : 'Scoring below 60% automatically triggers our AI Curriculum Architect to inject remedial modules.'}
              </p>
            </div>
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
                  Status: {profileClaimedSkill?.verified ? 'Verified Genuine' : 'Unverified Claim — Test Required'}
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
            {questions.map((q, qIdx) => (
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
            ))}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] transition-colors"
              >
                {testMode === 'authenticity'
                  ? `Verify ${selectedSkill} Authenticity`
                  : `Submit & Evaluate ${selectedSkill}`}
              </button>

              {testMode === 'diagnostic' ? (
                <button
                  type="button"
                  onClick={() => {
                    setAuthenticityResult(null);
                    setLastOutcome({ skill: selectedSkill, score: 33, remedial: true });
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
                      1,
                      questions.length,
                    );
                    setAuthenticityResult(simResult);
                    onVerifySkillAuthenticity(simResult);
                  }}
                  className="px-3.5 py-2.5 rounded-lg text-xs font-semibold border border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-500/10 transition-colors"
                >
                  Test Overclaimed Scenario (1/3)
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
                  {lastOutcome.skill} Assessment Score: {lastOutcome.score}%
                </span>
              </div>
              <p>
                {lastOutcome.remedial
                  ? 'Score fell below 60%. AI Curriculum Architect recalibrated your Learning Recommendations with remedial foundations.'
                  : 'Great performance! Skill verified and readiness meter updated.'}
              </p>
            </div>
          )}
        </section>

        {/* Multi-Agent Collaboration War Room */}
        <section className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-5">
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

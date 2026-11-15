import { useEffect, useMemo, useState } from 'react';
import { Award, CheckCircle2, Code2, Flame, Play, Search } from 'lucide-react';
import {
  FLAGSHIP_CODING_CHALLENGES,
  TOTAL_CODING_PROBLEMS,
  getChallengeByIndex,
  queryCodingCatalog,
} from '../data/codingCatalog';
import { executeCodeInSandbox } from '../utils/codeSandbox';
import type { CodingChallenge, Difficulty, UserProfile } from '../types';

interface CodeArenaViewProps {
  profile: UserProfile;
  onSolveChallenge: (challengeId: string, difficulty: Difficulty) => void;
  initialChallengeId?: string;
}

export function CodeArenaView({
  profile,
  onSolveChallenge,
  initialChallengeId,
}: CodeArenaViewProps) {
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<'All' | Difficulty>('All');
  const [page, setPage] = useState(1);
  const [selectedChallenge, setSelectedChallenge] = useState<CodingChallenge>(() =>
    getChallengeByIndex(1),
  );
  const [code, setCode] = useState(selectedChallenge.starterCode);
  const [runOutput, setRunOutput] = useState<{
    passed: boolean;
    details: string[];
  } | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const catalogResult = useMemo(
    () => queryCodingCatalog({ search, difficulty, page, pageSize: 12 }),
    [search, difficulty, page],
  );

  const selectProblem = (ch: CodingChallenge) => {
    setSelectedChallenge(ch);
    setCode(ch.starterCode);
    setRunOutput(null);
    setShowHint(false);
  };

  useEffect(() => {
    if (!initialChallengeId) return;
    const flagship = FLAGSHIP_CODING_CHALLENGES.find((c) => c.id === initialChallengeId);
    if (flagship) {
      selectProblem(flagship);
      return;
    }
    const numMatch = initialChallengeId.replace('code-', '');
    if (/^\d+$/.test(numMatch)) {
      selectProblem(getChallengeByIndex(parseInt(numMatch, 10)));
    }
  }, [initialChallengeId]);

  const handleRunTests = async () => {
    setIsRunning(true);
    try {
      const result = await executeCodeInSandbox(code, selectedChallenge.testCases, 1500);
      if (result.passed) {
        onSolveChallenge(selectedChallenge.id, selectedChallenge.difficulty);
      }
      setRunOutput({ passed: result.passed, details: result.details });
    } finally {
      setIsRunning(false);
    }
  };

  const isSolved = profile.solvedChallengeIds.includes(selectedChallenge.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
            Code Arena ({TOTAL_CODING_PROBLEMS.toLocaleString()}+ Programs)
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Build daily coding streaks: Easy (+10 pts) · Medium (+25 pts) · Hard (+50 pts).
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 font-semibold tabular-nums">
            <Flame className="w-4 h-4" />
            <span>{profile.streakDays}-Day Streak</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600/10 dark:bg-[#0A1628] border border-emerald-600/25 dark:border-[#1E3A5F]/70 text-emerald-800 dark:text-emerald-300 font-mono font-bold tabular-nums">
            <Award className="w-4 h-4" />
            <span>{profile.streakPoints} pts</span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by topic, title, or #number (e.g., #14500)"
            aria-label="Search coding challenges"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#0A1628] text-sm text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F4F7FB] dark:bg-[#0A1628] border border-slate-200 dark:border-[#1E3A5F]/60">
          {(['All', 'Easy', 'Medium', 'Hard'] as const).map((diff) => (
            <button
              key={diff}
              type="button"
              onClick={() => {
                setDifficulty(diff);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                difficulty === diff
                  ? 'bg-white dark:bg-[#1D4ED8] text-[#0B2545] dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#0B2545] dark:hover:text-white'
              }`}
            >
              {diff}
            </button>
          ))}
        </div>
      </div>

      {/* Split Workspace: Problem List + Interactive Runner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Problem List */}
        <section className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Showing {catalogResult.totalMatches.toLocaleString()} indexed challenges</span>
            <span className="font-mono tabular-nums">Page {page}</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-[520px] overflow-y-auto">
            {catalogResult.items.map((ch) => {
              const active = ch.id === selectedChallenge.id;
              const solved = profile.solvedChallengeIds.includes(ch.id);
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => selectProblem(ch)}
                  className={`w-full text-left px-4 py-3 transition-colors flex items-center justify-between gap-3 ${
                    active
                      ? 'bg-[#F4F7FB] dark:bg-[#0F213E]'
                      : 'hover:bg-slate-50 dark:hover:bg-[#0F213E]/60'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-400 tabular-nums">
                        #{ch.indexNumber}
                      </span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {ch.title}
                      </span>
                      {solved && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-amber-400 shrink-0" />
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {ch.topic} · +{ch.points} pts
                    </p>
                  </div>

                  <span
                    className={`text-xs font-semibold shrink-0 ${
                      ch.difficulty === 'Easy'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : ch.difficulty === 'Medium'
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-[#0B2545] dark:text-sky-300'
                    }`}
                  >
                    {ch.difficulty}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="px-4 py-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded border border-slate-300 dark:border-[#1E3A5F]/70 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded border border-slate-300 dark:border-[#1E3A5F]/70"
            >
              Next 12
            </button>
          </div>
        </section>

        {/* Interactive Code Editor & Test Runner */}
        <section className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                #{selectedChallenge.indexNumber} · {selectedChallenge.topic} ·{' '}
                {selectedChallenge.difficulty} (+{selectedChallenge.points} pts)
              </p>
              <h2 className="mt-1 font-display text-xl font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
                <Code2 className="w-5 h-5 text-[#0B2545] dark:text-amber-400" />
                <span>{selectedChallenge.title}</span>
              </h2>
            </div>

            {isSolved && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-amber-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Solved</span>
              </span>
            )}
          </div>

          <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
            {selectedChallenge.prompt}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            {selectedChallenge.examples.map((ex, idx) => (
              <div
                key={idx}
                className="rounded-lg bg-[#F4F7FB] dark:bg-[#05070B] border border-slate-200 dark:border-[#1E3A5F]/60 p-2.5"
              >
                <p className="text-slate-500 dark:text-slate-400">Input: {ex.input}</p>
                <p className="text-slate-900 dark:text-white font-semibold mt-0.5">
                  Output: {ex.output}
                </p>
              </div>
            ))}
          </div>

          <div>
            <label htmlFor="code-editor" className="sr-only">
              JavaScript Solution Editor
            </label>
            <textarea
              id="code-editor"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={9}
              spellCheck={false}
              className="w-full rounded-xl border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#05070B] text-slate-100 font-mono text-xs p-4 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0B2545] dark:focus:ring-[#1D4ED8]"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setShowHint((h) => !h)}
              className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:underline"
            >
              {showHint ? 'Hide Hint' : 'Show Solution Hint'}
            </button>

            <button
              type="button"
              disabled={isRunning}
              onClick={handleRunTests}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] transition-colors disabled:opacity-60"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isRunning ? 'Running in Sandbox...' : 'Run & Submit Solution'}</span>
            </button>
          </div>

          {showHint && (
            <p className="text-xs rounded-lg bg-amber-500/10 border border-amber-500/25 p-3 text-amber-900 dark:text-amber-200">
              Hint: {selectedChallenge.solutionHint}
            </p>
          )}

          {runOutput && (
            <div
              className={`rounded-xl border p-3.5 text-xs font-mono space-y-1 ${
                runOutput.passed
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                  : 'border-amber-500/45 bg-amber-500/10 text-amber-950 dark:text-amber-200'
              }`}
            >
              <p className="font-bold">
                {runOutput.passed
                  ? `All Tests Passed! (+${isSolved ? 0 : selectedChallenge.points} streak points)`
                  : 'Some Test Cases Failed'}
              </p>
              {runOutput.details.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

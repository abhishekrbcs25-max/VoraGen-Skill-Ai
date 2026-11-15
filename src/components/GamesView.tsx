import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Bug,
  CheckCircle2,
  Eye,
  Gamepad2,
  Grid3X3,
  Rocket,
  RotateCcw,
  Route,
  Search,
  ShieldAlert,
  Type,
  Undo2,
} from 'lucide-react';
import {
  CODE_BUG_LEVELS,
  SPOT_ARCHITECTURE_DIFFS,
  SUDOKU_9X9_PUZZLES,
  WORD_CONNECT_ROUNDS,
  WORD_SEARCH_12X12,
  ZIP_LEVELS,
  canStepZipPath,
  getSudokuConflicts,
  getZipPlayableCount,
  isSudokuComplete,
  isZipPathSolved,
  validateWordSearchSelection,
} from '../game/puzzles';

interface GamesViewProps {
  gamesWon: number;
  onWinGame: () => void;
  onLaunch3DGame?: () => void;
  initialGame?: string;
}

type GameId = 'word-connect' | 'sudoku' | 'zip' | 'word-find' | 'spot-diff' | 'code-bug';

function isValidGameId(value?: string): value is GameId {
  return (
    value === 'word-connect' ||
    value === 'sudoku' ||
    value === 'zip' ||
    value === 'word-find' ||
    value === 'spot-diff' ||
    value === 'code-bug'
  );
}

export function GamesView({ gamesWon, onWinGame, onLaunch3DGame, initialGame }: GamesViewProps) {
  const [activeGame, setActiveGame] = useState<GameId>(() =>
    isValidGameId(initialGame) ? initialGame : 'zip',
  );

  useEffect(() => {
    if (isValidGameId(initialGame)) {
      setActiveGame(initialGame);
    }
  }, [initialGame]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0B2545] dark:text-white">
            VoraGen Games — Cognitive & 3D Skill Arcade
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Advanced algorithmic challenges: 6×6 &amp; 7×7 Zip Path with barriers, full 9×9 Logic Sudoku, 12×12 multi-directional Word Search, and 3D Skill Defender.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-xs font-semibold text-amber-800 dark:text-amber-300 tabular-nums">
          <Award className="w-4 h-4" />
          <span>{gamesWon} Games Completed</span>
        </div>
      </div>

      {/* Featured Three.js 3D Arena Card */}
      {onLaunch3DGame && (
        <div className="rounded-2xl border border-amber-500/35 bg-gradient-to-r from-[#05070B] via-[#0A1628] to-[#0F213E] text-white p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-amber-400">
              <Rocket className="w-3.5 h-3.5" />
              <span>THREE.JS WEBGL 3D ARENA · +50 STREAK POINTS</span>
            </div>
            <h2 className="font-display text-lg font-bold text-white">
              Skill Defender 3D — Vanguard Mission
            </h2>
            <p className="text-xs text-slate-300">
              Pilot your 3D Vanguard craft in full-viewport WebGL, collect React/TypeScript/SQL Mastery Cores, and clear 3 waves of bug drones.
            </p>
          </div>
          <button
            type="button"
            onClick={onLaunch3DGame}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display text-xs font-bold whitespace-nowrap transition-colors"
          >
            <Rocket className="w-4 h-4" />
            <span>Launch 3D Arena</span>
          </button>
        </div>
      )}

      {/* Game Selector Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1.5 rounded-xl bg-[#F4F7FB] dark:bg-[#05070B] border border-slate-200 dark:border-[#1E3A5F]/60">
        {(
          [
            { id: 'zip', label: 'Zip Path (6×6 / 7×7)', Icon: Route },
            { id: 'sudoku', label: 'Logic Sudoku (9×9)', Icon: Grid3X3 },
            { id: 'word-find', label: 'Word Finding (12×12)', Icon: Search },
            { id: 'word-connect', label: 'Word Connect (8-Letter)', Icon: Type },
            { id: 'spot-diff', label: 'Spot Difference (6 Flaws)', Icon: Eye },
            { id: 'code-bug', label: 'Code Error Finder', Icon: Bug },
          ] as const
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveGame(id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              activeGame === id
                ? 'bg-white dark:bg-[#1D4ED8] text-[#0B2545] dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0B2545] dark:hover:text-white'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6">
        {activeGame === 'zip' && <ZipPathGame onWin={onWinGame} />}
        {activeGame === 'sudoku' && <SudokuGame onWin={onWinGame} />}
        {activeGame === 'word-find' && <WordFindingGame onWin={onWinGame} />}
        {activeGame === 'word-connect' && <WordConnectGame onWin={onWinGame} />}
        {activeGame === 'spot-diff' && <SpotDifferenceGame onWin={onWinGame} />}
        {activeGame === 'code-bug' && <CodeBugFinderGame onWin={onWinGame} />}
      </div>
    </div>
  );
}

/* 1. Advanced Zip Path (6x6, 6x6 Firewall Maze, 7x7 Kernel Labyrinth — 100% open space cover) */
function ZipPathGame({ onWin }: { onWin: () => void }) {
  const [levelIdx, setLevelIdx] = useState(0);
  const level = ZIP_LEVELS[levelIdx];
  const [path, setPath] = useState<string[]>([level.startKey]);
  const [won, setWon] = useState(false);
  const [hint, setHint] = useState<string>(level.subtitle);

  const playableTotal = getZipPlayableCount(level);

  const selectLevel = (idx: number) => {
    const nextLvl = ZIP_LEVELS[idx];
    setLevelIdx(idx);
    setPath([nextLvl.startKey]);
    setWon(false);
    setHint(nextLvl.subtitle);
  };

  const handleCellClick = (key: string) => {
    if (won) return;
    const last = path[path.length - 1];
    if (key === last && path.length > 1) {
      setPath((p) => p.slice(0, -1));
      setHint('Stepped back one space.');
      return;
    }
    const check = canStepZipPath(path, key, level);
    if (!check.allowed) {
      setHint(check.reason || 'Invalid move.');
      return;
    }
    const nextPath = [...path, key];
    setPath(nextPath);
    setHint(`${nextPath.length}/${playableTotal} open spaces covered.`);

    if (isZipPathSolved(nextPath, level)) {
      setWon(true);
      setHint(`Circuit solved across all ${playableTotal} open spaces! +15 Streak Points awarded.`);
      onWin();
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
            Zip Path — Sequential Circuit &amp; Full-Grid Coverage
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{hint}</p>
        </div>

        <span className="font-mono text-xs font-bold tabular-nums px-3 py-1.5 rounded-lg bg-[#F4F7FB] dark:bg-[#05070B] border border-slate-200 dark:border-[#1E3A5F]/60 text-emerald-700 dark:text-amber-400">
          Spaces: {path.length}/{playableTotal}
        </span>
      </div>

      {/* Level Switcher */}
      <div className="flex flex-wrap gap-2">
        {ZIP_LEVELS.map((lvl, i) => (
          <button
            key={lvl.id}
            type="button"
            onClick={() => selectLevel(i)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              levelIdx === i
                ? 'bg-[#0B2545] text-white border-[#0B2545] dark:bg-[#1D4ED8] dark:border-[#1D4ED8]'
                : 'bg-[#F4F7FB] dark:bg-[#05070B] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1E3A5F]/60'
            }`}
          >
            {lvl.title}
          </button>
        ))}
      </div>

      <div
        className="grid gap-1.5 max-w-[420px]"
        style={{ gridTemplateColumns: `repeat(${level.cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: level.rows }, (_, r) =>
          Array.from({ length: level.cols }, (__, c) => {
            const key = `${r},${c}`;
            const blocked = level.blocked.includes(key);
            const stepIdx = path.indexOf(key);
            const isHead = stepIdx === path.length - 1;
            const wp = level.waypoints[key];

            if (blocked) {
              return (
                <div
                  key={key}
                  aria-label={`Firewall wall at row ${r + 1} column ${c + 1}`}
                  className="h-12 sm:h-13 rounded-lg bg-slate-900 dark:bg-black border border-slate-700 flex items-center justify-center text-slate-500"
                >
                  <ShieldAlert className="w-4 h-4" />
                </div>
              );
            }

            return (
              <button
                key={key}
                type="button"
                onClick={() => handleCellClick(key)}
                aria-label={`Row ${r + 1} Column ${c + 1}${wp ? ` Node ${wp}` : ''}`}
                className={`h-12 sm:h-13 rounded-lg font-mono text-xs font-bold border transition-colors relative flex flex-col items-center justify-center ${
                  isHead
                    ? 'bg-emerald-600 text-white border-emerald-500 ring-2 ring-amber-400'
                    : stepIdx >= 0
                      ? 'bg-[#0B2545] text-white border-[#0B2545] dark:bg-[#1D4ED8] dark:border-[#1D4ED8]'
                      : wp
                        ? 'bg-amber-50 dark:bg-[#0F213E] text-[#0B2545] dark:text-amber-300 border-amber-500/60'
                        : 'bg-[#F4F7FB] dark:bg-[#05070B] text-slate-600 dark:text-slate-300 border-slate-300 dark:border-[#1E3A5F]/70 hover:border-[#0B2545]'
                }`}
              >
                {wp ? (
                  <span className="text-sm font-extrabold">{wp}</span>
                ) : stepIdx >= 0 ? (
                  <span className="text-[11px]">#{stepIdx + 1}</span>
                ) : (
                  <span className="text-slate-400">·</span>
                )}
              </button>
            );
          }),
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={path.length <= 1 || won}
          onClick={() => {
            setPath((p) => (p.length > 1 ? p.slice(0, -1) : p));
            setHint('Stepped back 1 cell.');
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-[#1E3A5F]/70 disabled:opacity-40"
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span>Undo Step</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setPath([level.startKey]);
            setWon(false);
            setHint(level.subtitle);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-[#1E3A5F]/70"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Circuit</span>
        </button>
      </div>
    </div>
  );
}

/* 2. Full 9x9 Logic Sudoku */
function SudokuGame({ onWin }: { onWin: () => void }) {
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const puzzle = SUDOKU_9X9_PUZZLES[puzzleIdx];
  const [grid, setGrid] = useState<number[][]>(() => puzzle.initial.map((r) => [...r]));
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [status, setStatus] = useState(
    'Select any empty cell and enter 1–9 so every row, column, and 3×3 subgrid contains 1–9.',
  );
  const [won, setWon] = useState(false);

  const conflicts = useMemo(() => getSudokuConflicts(grid), [grid]);

  const switchDifficulty = (idx: number) => {
    const nextP = SUDOKU_9X9_PUZZLES[idx];
    setPuzzleIdx(idx);
    setGrid(nextP.initial.map((r) => [...r]));
    setSelectedCell(null);
    setWon(false);
    setStatus(`Loaded ${nextP.difficulty} 9×9 board.`);
  };

  const setCellDigit = (digit: number) => {
    if (!selectedCell || won) return;
    const [r, c] = selectedCell;
    if (puzzle.initial[r][c] !== 0) return;
    setGrid((prev) =>
      prev.map((row, ri) => row.map((val, ci) => (ri === r && ci === c ? digit : val))),
    );
  };

  const verifyBoard = () => {
    if (conflicts.size > 0) {
      setStatus(`Found ${conflicts.size} conflicting cells highlighted in red.`);
      return;
    }
    if (isSudokuComplete(grid, puzzle.solution)) {
      setWon(true);
      setStatus('9×9 Sudoku Solved! +15 Streak Points awarded.');
      onWin();
    } else {
      setStatus('Board still has empty or mismatched cells — keep refining.');
    }
  };

  return (
    <div
      className="space-y-5"
      onKeyDown={(e) => {
        if (e.key >= '1' && e.key <= '9') {
          setCellDigit(Number(e.key));
        } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
          setCellDigit(0);
        }
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
            9×9 Logic Sudoku ({puzzle.difficulty})
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{status}</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {SUDOKU_9X9_PUZZLES.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => switchDifficulty(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                puzzleIdx === idx
                  ? 'bg-[#0B2545] text-white border-[#0B2545] dark:bg-[#1D4ED8] dark:border-[#1D4ED8]'
                  : 'bg-[#F4F7FB] dark:bg-[#05070B] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1E3A5F]/60'
              }`}
            >
              {p.difficulty}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div
          role="grid"
          aria-label="9 by 9 Sudoku board"
          className="grid grid-cols-9 border-2 border-[#0B2545] dark:border-amber-400 rounded-lg overflow-hidden max-w-[396px] w-full"
        >
          {grid.map((row, r) =>
            row.map((val, c) => {
              const fixed = puzzle.initial[r][c] !== 0;
              const isSelected = selectedCell?.[0] === r && selectedCell?.[1] === c;
              const hasConflict = conflicts.has(`${r},${c}`);
              const borderClasses = `${c === 2 || c === 5 ? 'border-r-2 border-r-[#0B2545] dark:border-r-amber-400/70' : 'border-r border-r-slate-300 dark:border-r-[#1E3A5F]/50'} ${
                r === 2 || r === 5
                  ? 'border-b-2 border-b-[#0B2545] dark:border-b-amber-400/70'
                  : 'border-b border-b-slate-300 dark:border-b-[#1E3A5F]/50'
              }`;

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => setSelectedCell([r, c])}
                  aria-label={`Sudoku Row ${r + 1} Col ${c + 1} value ${val || 'empty'}`}
                  className={`aspect-square flex items-center justify-center font-mono text-sm sm:text-base font-bold transition-colors ${borderClasses} ${
                    hasConflict
                      ? 'bg-red-500/20 text-red-700 dark:text-red-300'
                      : isSelected
                        ? 'bg-amber-200 dark:bg-[#1D4ED8] text-slate-950 dark:text-white'
                        : fixed
                          ? 'bg-slate-200/80 dark:bg-[#0F213E] text-[#0B2545] dark:text-amber-300'
                          : 'bg-white dark:bg-[#05070B] text-emerald-700 dark:text-emerald-400 hover:bg-slate-50 dark:hover:bg-[#0A1628]'
                  }`}
                >
                  {val === 0 ? '' : val}
                </button>
              );
            }),
          )}
        </div>

        {/* Digit Keypad & Actions */}
        <div className="space-y-4 w-full max-w-[240px]">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {selectedCell
              ? `Editing Row ${selectedCell[0] + 1}, Col ${selectedCell[1] + 1}`
              : 'Click a cell, then tap 1–9 (or type on keyboard)'}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setCellDigit(num)}
                className="h-10 rounded-lg font-mono text-sm font-bold border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] text-[#0B2545] dark:text-white hover:border-[#0B2545] dark:hover:border-amber-400"
              >
                {num}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setCellDigit(0)}
              className="w-full py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-[#1E3A5F]/70"
            >
              Clear Cell
            </button>
            <button
              type="button"
              onClick={verifyBoard}
              className="w-full py-2 rounded-lg text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB]"
            >
              Verify 9×9 Sudoku
            </button>
            <button
              type="button"
              onClick={() => switchDifficulty(puzzleIdx)}
              className="w-full py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-[#1E3A5F]/70"
            >
              Reset Grid
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* 3. 12x12 Multi-Directional Word Finding */
function WordFindingGame({ onWin }: { onWin: () => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [found, setFound] = useState<string[]>([]);
  const [lockedCells, setLockedCells] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState(
    'Select adjacent letters in a straight horizontal, vertical, or diagonal line.',
  );

  const toggleCell = (r: number, c: number) => {
    const key = `${r},${c}`;
    const next = selected.includes(key)
      ? selected.filter((k) => k !== key)
      : [...selected, key];

    const check = validateWordSearchSelection(
      WORD_SEARCH_12X12.board,
      next,
      WORD_SEARCH_12X12.targetWords,
    );

    if (check.reason) {
      setFeedback(check.reason);
      return;
    }

    if (check.validWord && !found.includes(check.validWord)) {
      const updated = [...found, check.validWord];
      setFound(updated);
      setLockedCells((prev) => {
        const merged = { ...prev };
        for (const k of next) merged[k] = true;
        return merged;
      });
      setSelected([]);
      setFeedback(`Found "${check.validWord}"!`);
      if (updated.length === 6) {
        onWin();
        setFeedback(`Goal Cleared (6 words found)! Keep hunting all ${WORD_SEARCH_12X12.targetWords.length} terms.`);
      }
      return;
    }

    setSelected(next);
    setFeedback(
      next
        .map((k) => {
          const [rr, cc] = k.split(',').map(Number);
          return WORD_SEARCH_12X12.board[rr][cc];
        })
        .join('') || 'Select straight horizontal, vertical, or diagonal words.',
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
            {WORD_SEARCH_12X12.title}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300">{feedback}</p>
        </div>
        <span className="font-mono text-xs font-bold text-emerald-700 dark:text-amber-400">
          {found.length}/{WORD_SEARCH_12X12.targetWords.length} Found (Goal: 6)
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="grid grid-cols-12 gap-1 max-w-[480px] w-full">
          {WORD_SEARCH_12X12.board.map((row, r) =>
            row.map((ch, c) => {
              const key = `${r},${c}`;
              const active = selected.includes(key);
              const locked = Boolean(lockedCells[key]);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleCell(r, c)}
                  aria-label={`Word grid row ${r + 1} column ${c + 1} letter ${ch}`}
                  className={`aspect-square rounded font-mono font-bold text-xs sm:text-sm border transition-colors ${
                    active
                      ? 'bg-amber-400 text-slate-950 border-amber-500'
                      : locked
                        ? 'bg-emerald-600/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/50'
                        : 'bg-[#F4F7FB] dark:bg-[#05070B] text-slate-900 dark:text-white border-slate-200 dark:border-[#1E3A5F]/60 hover:border-[#0B2545]'
                  }`}
                >
                  {ch}
                </button>
              );
            }),
          )}
        </div>

        <div className="flex-1 space-y-3">
          <p className="text-xs font-semibold text-[#0B2545] dark:text-white">
            Target Engineering Lexicon ({WORD_SEARCH_12X12.targetWords.length} Terms):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {WORD_SEARCH_12X12.targetWords.map((w) => {
              const isDone = found.includes(w);
              return (
                <span
                  key={w}
                  className={`px-2 py-1 rounded text-[11px] font-mono font-semibold border ${
                    isDone
                      ? 'bg-emerald-600 text-white border-emerald-600 line-through'
                      : 'bg-[#F4F7FB] dark:bg-[#05070B] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1E3A5F]/60'
                  }`}
                >
                  {w}
                </span>
              );
            })}
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setSelected([]);
                setFeedback('Selection cleared.');
              }}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-white/15"
            >
              Clear Selection
            </button>
            <button
              type="button"
              onClick={() => {
                setSelected([]);
                setFound([]);
                setLockedCells({});
                setFeedback('Board reset.');
              }}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold border border-amber-500/40 text-amber-800 dark:text-amber-300"
            >
              Reset Board
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* 4. Upgraded 8-Letter Word Connect (Find 6 words across 2 rounds) */
function WordConnectGame({ onWin }: { onWin: () => void }) {
  const [roundIdx, setRoundIdx] = useState(0);
  const round = WORD_CONNECT_ROUNDS[roundIdx];
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [feedback, setFeedback] = useState('Combine letters to discover 6 engineering & logic words.');

  const currentWord = selectedIndices.map((i) => round.letters[i]).join('');

  const switchRound = (idx: number) => {
    setRoundIdx(idx);
    setSelectedIndices([]);
    setFoundWords([]);
    setFeedback('Combine letters to discover 6 engineering & logic words.');
  };

  const submitWord = () => {
    if (round.validWords.includes(currentWord) && !foundWords.includes(currentWord)) {
      const next = [...foundWords, currentWord];
      setFoundWords(next);
      setFeedback(`Found "${currentWord}"!`);
      if (next.length === round.requiredCount) {
        onWin();
        setFeedback('Round Cleared! +15 Streak Points awarded.');
      }
    } else if (foundWords.includes(currentWord)) {
      setFeedback(`Already discovered "${currentWord}".`);
    } else {
      setFeedback(`"${currentWord || '...'}" is not in this round’s valid word list.`);
    }
    setSelectedIndices([]);
  };

  return (
    <div className="space-y-5 max-w-xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-emerald-700 dark:text-amber-400" />
            {round.title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{feedback}</p>
        </div>
        <span className="font-mono text-xs font-bold tabular-nums text-emerald-700 dark:text-amber-400">
          {foundWords.length}/{round.requiredCount} Found
        </span>
      </div>

      <div className="flex gap-2">
        {WORD_CONNECT_ROUNDS.map((r, i) => (
          <button
            key={r.id}
            type="button"
            onClick={() => switchRound(i)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              roundIdx === i
                ? 'bg-[#0B2545] text-white border-[#0B2545] dark:bg-[#1D4ED8]'
                : 'bg-[#F4F7FB] dark:bg-[#05070B] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1E3A5F]/60'
            }`}
          >
            {r.title}
          </button>
        ))}
      </div>

      <div className="h-12 rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] flex items-center justify-center font-mono text-xl font-bold tracking-widest text-[#0B2545] dark:text-white">
        {currentWord || '—'}
      </div>

      <div className="flex flex-wrap justify-center gap-2.5">
        {round.letters.map((ch, idx) => {
          const picked = selectedIndices.includes(idx);
          return (
            <button
              key={`${ch}-${idx}`}
              type="button"
              onClick={() =>
                setSelectedIndices((prev) =>
                  prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx],
                )
              }
              className={`w-11 h-11 rounded-xl font-display text-base font-bold transition-colors border ${
                picked
                  ? 'bg-[#0B2545] text-white border-[#0B2545] dark:bg-[#1D4ED8] dark:border-[#1D4ED8]'
                  : 'bg-[#F4F7FB] dark:bg-[#05070B] text-slate-900 dark:text-white border-slate-300 dark:border-[#1E3A5F]/70'
              }`}
            >
              {ch}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setSelectedIndices((prev) => prev.slice(0, -1))}
          className="px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-[#1E3A5F]/70"
        >
          Backspace
        </button>
        <button
          type="button"
          onClick={() => setSelectedIndices([])}
          className="px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-[#1E3A5F]/70"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={submitWord}
          className="px-5 py-2 rounded-lg text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB]"
        >
          Check Word
        </button>
      </div>

      {foundWords.length > 0 && (
        <p className="text-center text-xs font-mono text-emerald-700 dark:text-amber-400">
          Discovered: {foundWords.join(' · ')}
        </p>
      )}
    </div>
  );
}

/* 5. Spot the Difference (6 Architecture Flaws) */
function SpotDifferenceGame({ onWin }: { onWin: () => void }) {
  const [foundIds, setFoundIds] = useState<string[]>([]);

  const clickDiff = (id: string) => {
    if (foundIds.includes(id)) return;
    const next = [...foundIds, id];
    setFoundIds(next);
    if (next.length === SPOT_ARCHITECTURE_DIFFS.length) onWin();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
            Spot the Difference — 6-Component Architecture Audit
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Identify all {SPOT_ARCHITECTURE_DIFFS.length} missing resilience &amp; security components on Diagram B.
          </p>
        </div>
        <span className="font-mono text-xs font-bold text-emerald-700 dark:text-amber-400">
          {foundIds.length}/{SPOT_ARCHITECTURE_DIFFS.length} Spotted
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#05070B] p-4 text-white">
          <p className="text-xs font-mono text-emerald-400 mb-2">Diagram A (Production Hardened)</p>
          <svg viewBox="0 0 310 135" className="w-full h-40">
            <rect x="10" y="45" width="42" height="36" rx="6" fill="#0F213E" stroke="#38BDF8" />
            <text x="31" y="67" textAnchor="middle" fill="#FFF" fontSize="9">Client</text>
            <circle cx="52" cy="26" r="10" fill="#EF4444" />
            <text x="52" y="29" textAnchor="middle" fill="#FFF" fontSize="7">WAF</text>
            <circle cx="112" cy="48" r="10" fill="#16A34A" />
            <text x="112" y="51" textAnchor="middle" fill="#FFF" fontSize="7">JWT</text>
            <rect x="86" y="88" width="52" height="20" rx="4" fill="#F59E0B" />
            <text x="112" y="101" textAnchor="middle" fill="#05070B" fontSize="7" fontWeight="700">RateLimit</text>
            <rect x="128" y="45" width="44" height="36" rx="6" fill="#0F213E" stroke="#38BDF8" />
            <text x="150" y="67" textAnchor="middle" fill="#FFF" fontSize="9">API</text>
            <rect x="162" y="16" width="44" height="20" rx="4" fill="#6366F1" />
            <text x="184" y="29" textAnchor="middle" fill="#FFF" fontSize="7">DLQ</text>
            <rect x="162" y="94" width="44" height="20" rx="4" fill="#D97706" />
            <text x="184" y="107" textAnchor="middle" fill="#FFF" fontSize="7">Redis</text>
            <rect x="218" y="45" width="48" height="36" rx="6" fill="#0F213E" stroke="#38BDF8" />
            <text x="242" y="67" textAnchor="middle" fill="#FFF" fontSize="9">Primary</text>
            <circle cx="264" cy="48" r="10" fill="#F59E0B" />
            <text x="264" y="51" textAnchor="middle" fill="#05070B" fontSize="7" fontWeight="700">Rep</text>
          </svg>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#05070B] p-4 text-white">
          <p className="text-xs font-mono text-amber-400 mb-2">Diagram B (Click All 6 Missing Zones)</p>
          <svg viewBox="0 0 310 135" className="w-full h-40">
            <rect x="10" y="45" width="42" height="36" rx="6" fill="#0F213E" stroke="#38BDF8" />
            <text x="31" y="67" textAnchor="middle" fill="#FFF" fontSize="9">Client</text>
            <rect x="128" y="45" width="44" height="36" rx="6" fill="#0F213E" stroke="#38BDF8" />
            <text x="150" y="67" textAnchor="middle" fill="#FFF" fontSize="9">API</text>
            <rect x="218" y="45" width="48" height="36" rx="6" fill="#0F213E" stroke="#38BDF8" />
            <text x="242" y="67" textAnchor="middle" fill="#FFF" fontSize="9">Primary</text>

            {SPOT_ARCHITECTURE_DIFFS.map((d) => {
              const spotted = foundIds.includes(d.id);
              return (
                <g
                  key={d.id}
                  onClick={() => clickDiff(d.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      clickDiff(d.id);
                    }
                  }}
                  className="cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label={d.label}
                >
                  <circle
                    cx={d.x}
                    cy={d.y}
                    r="14"
                    fill={spotted ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.06)'}
                    stroke={spotted ? '#22C55E' : '#94A3B8'}
                    strokeDasharray={spotted ? undefined : '3 3'}
                  />
                  <text x={d.x} y={d.y + 3} textAnchor="middle" fill="#FFF" fontSize="9">
                    {spotted ? '✓' : '?'}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {foundIds.length > 0 && (
        <div className="flex flex-wrap gap-3 text-xs text-emerald-700 dark:text-amber-400">
          {foundIds.map((id) => {
            const d = SPOT_ARCHITECTURE_DIFFS.find((item) => item.id === id);
            return (
              <span key={id} className="inline-flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {d?.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* 6. Multi-Challenge Code Error Finder */
function CodeBugFinderGame({ onWin }: { onWin: () => void }) {
  const [challengeIdx, setChallengeIdx] = useState(0);
  const challenge = CODE_BUG_LEVELS[challengeIdx];
  const [pickedLine, setPickedLine] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);

  const selectChallenge = (idx: number) => {
    setChallengeIdx(idx);
    setPickedLine(null);
    setSolved(false);
  };

  const handleSelectLine = (idx: number) => {
    setPickedLine(idx);
    if (idx === challenge.buggyLineIndex) {
      setSolved(true);
      onWin();
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
          Code Error Finder — Multi-Level Bug Hunt
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Inspect the {challenge.language} snippet and click the exact line with a critical production bug.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CODE_BUG_LEVELS.map((lvl, idx) => (
          <button
            key={lvl.id}
            type="button"
            onClick={() => selectChallenge(idx)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              challengeIdx === idx
                ? 'bg-[#0B2545] text-white border-[#0B2545] dark:bg-[#1D4ED8]'
                : 'bg-[#F4F7FB] dark:bg-[#05070B] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1E3A5F]/60'
            }`}
          >
            {lvl.title}
          </button>
        ))}
      </div>

      <div className="rounded-xl overflow-hidden border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#05070B] font-mono text-xs">
        {challenge.lines.map((line, idx) => {
          const isSelected = pickedLine === idx;
          const isCorrect = idx === challenge.buggyLineIndex && isSelected;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectLine(idx)}
              className={`w-full text-left px-4 py-2 flex items-center gap-4 transition-colors ${
                isCorrect
                  ? 'bg-emerald-600/25 text-emerald-300'
                  : isSelected
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'text-slate-200 hover:bg-white/5'
              }`}
            >
              <span className="text-slate-500 w-4 select-none tabular-nums">{idx + 1}</span>
              <span className="whitespace-pre">{line}</span>
            </button>
          );
        })}
      </div>

      {pickedLine !== null && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p
            className={`text-xs font-medium ${
              solved ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
            }`}
          >
            {solved
              ? `Correct! ${challenge.explanation} +15 Streak Points!`
              : 'Not that line — trace state mutations, equality operators, and loop bounds closely.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setPickedLine(null);
              setSolved(false);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-white/15"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}

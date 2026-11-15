import { useEffect, useState } from 'react';
import { Award, Bug, CheckCircle2, Eye, Gamepad2, Grid3X3, Rocket, Route, Search, Type } from 'lucide-react';

interface GamesViewProps {
  gamesWon: number;
  onWinGame: () => void;
  onLaunch3DGame?: () => void;
  initialGame?: string;
}

type GameId = 'word-connect' | 'sudoku' | 'zip' | 'word-find' | 'spot-diff' | 'code-bug';

export function GamesView({ gamesWon, onWinGame, onLaunch3DGame, initialGame }: GamesViewProps) {
  const [activeGame, setActiveGame] = useState<GameId>('word-connect');

  useEffect(() => {
    if (
      initialGame === 'word-connect' ||
      initialGame === 'sudoku' ||
      initialGame === 'zip' ||
      initialGame === 'word-find' ||
      initialGame === 'spot-diff' ||
      initialGame === 'code-bug'
    ) {
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
            Train pattern recognition, algorithmic thinking, and debugging precision across 6 interactive puzzles plus 3D Skill Defender.
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
            { id: 'word-connect', label: 'Word Connect', Icon: Type },
            { id: 'sudoku', label: 'Logic Sudoku', Icon: Grid3X3 },
            { id: 'zip', label: 'Zip Path', Icon: Route },
            { id: 'word-find', label: 'Word Finding', Icon: Search },
            { id: 'spot-diff', label: 'Spot Difference', Icon: Eye },
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
        {activeGame === 'word-connect' && <WordConnectGame onWin={onWinGame} />}
        {activeGame === 'sudoku' && <SudokuGame onWin={onWinGame} />}
        {activeGame === 'zip' && <ZipPathGame onWin={onWinGame} />}
        {activeGame === 'word-find' && <WordFindingGame onWin={onWinGame} />}
        {activeGame === 'spot-diff' && <SpotDifferenceGame onWin={onWinGame} />}
        {activeGame === 'code-bug' && <CodeBugFinderGame onWin={onWinGame} />}
      </div>
    </div>
  );
}

/* 1. Word Connect */
function WordConnectGame({ onWin }: { onWin: () => void }) {
  const letters = ['R', 'E', 'A', 'C', 'T', 'S'];
  const targets = ['REACT', 'TRACE', 'CRATE', 'RATE', 'STAR'];
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [feedback, setFeedback] = useState('Tap letters to form tech & logic words.');

  const currentWord = selectedIndices.map((i) => letters[i]).join('');

  const submitWord = () => {
    if (targets.includes(currentWord) && !foundWords.includes(currentWord)) {
      const next = [...foundWords, currentWord];
      setFoundWords(next);
      setFeedback(`Found "${currentWord}"!`);
      if (next.length === 3) {
        onWin();
        setFeedback('Round Cleared! +15 Streak Points awarded.');
      }
    } else if (foundWords.includes(currentWord)) {
      setFeedback(`Already found "${currentWord}".`);
    } else {
      setFeedback(`"${currentWord || '...'}" is not in target list. Try REACT, TRACE, or STAR.`);
    }
    setSelectedIndices([]);
  };

  return (
    <div className="space-y-5 max-w-xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-emerald-700 dark:text-amber-400" />
            Word Connect (Find 3 Words)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{feedback}</p>
        </div>
        <span className="font-mono text-xs font-bold tabular-nums text-emerald-700 dark:text-amber-400">
          {foundWords.length}/3 Found
        </span>
      </div>

      <div className="h-12 rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] flex items-center justify-center font-mono text-xl font-bold tracking-widest text-[#0B2545] dark:text-white">
        {currentWord || '—'}
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {letters.map((ch, idx) => {
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
              className={`w-12 h-12 rounded-xl font-display text-lg font-bold transition-colors border ${
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
          onClick={() => setSelectedIndices([])}
          className="px-4 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-[#1E3A5F]/70"
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
        {foundWords.length >= 3 && (
          <button
            type="button"
            onClick={() => {
              setSelectedIndices([]);
              setFoundWords([]);
              setFeedback('Tap letters to form tech & logic words.');
            }}
            className="px-4 py-2 rounded-lg text-xs font-semibold border border-amber-500/40 text-amber-800 dark:text-amber-300"
          >
            Play Again
          </button>
        )}
      </div>

      {foundWords.length > 0 && (
        <p className="text-center text-xs font-mono text-emerald-700 dark:text-amber-400">
          Discovered: {foundWords.join(' · ')}
        </p>
      )}
    </div>
  );
}

/* 2. Logic Sudoku (4x4 fast puzzle) */
function SudokuGame({ onWin }: { onWin: () => void }) {
  const initialGrid = [
    [1, 0, 0, 4],
    [0, 4, 1, 0],
    [0, 1, 4, 0],
    [4, 0, 0, 1],
  ];
  const solution = [
    [1, 2, 3, 4],
    [3, 4, 1, 2],
    [2, 1, 4, 3],
    [4, 3, 2, 1],
  ];

  const [grid, setGrid] = useState<number[][]>(() => initialGrid.map((r) => [...r]));
  const [status, setStatus] = useState('Fill every row, column, and 2×2 box with digits 1–4.');
  const [won, setWon] = useState(false);

  const cycleCell = (r: number, c: number) => {
    if (initialGrid[r][c] !== 0 || won) return;
    setGrid((prev) =>
      prev.map((row, ri) =>
        row.map((val, ci) => (ri === r && ci === c ? (val % 4) + 1 : val)),
      ),
    );
  };

  const verify = () => {
    const ok = grid.every((row, r) => row.every((val, c) => val === solution[r][c]));
    if (ok) {
      setWon(true);
      setStatus('Sudoku Solved! +15 Streak Points awarded.');
      onWin();
    } else {
      setStatus('Not quite right yet — verify each row and 2×2 quadrant has 1, 2, 3, 4.');
    }
  };

  return (
    <div className="space-y-4 max-w-md">
      <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
        Logic Sudoku (4×4 Sprint)
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400">{status}</p>

      <div className="grid grid-cols-4 gap-2 max-w-[260px]">
        {grid.map((row, r) =>
          row.map((val, c) => {
            const fixed = initialGrid[r][c] !== 0;
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={() => cycleCell(r, c)}
                aria-label={`Row ${r + 1} Col ${c + 1} value ${val || 'empty'}`}
                className={`h-14 rounded-lg font-mono text-lg font-bold border transition-colors ${
                  fixed
                    ? 'bg-slate-200 dark:bg-[#0F213E] text-slate-900 dark:text-amber-400 border-slate-300 dark:border-[#1E3A5F]/70 cursor-default'
                    : 'bg-white dark:bg-[#05070B] text-[#0B2545] dark:text-emerald-400 border-slate-300 dark:border-[#1E3A5F]/70 hover:border-[#0B2545]'
                }`}
              >
                {val === 0 ? '' : val}
              </button>
            );
          }),
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setGrid(initialGrid.map((r) => [...r]));
            setWon(false);
          }}
          className="px-4 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-[#1E3A5F]/70"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={verify}
          className="px-5 py-2 rounded-lg text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB]"
        >
          Verify Sudoku
        </button>
      </div>
    </div>
  );
}

/* 3. Zip Path (Hamiltonian 1 -> 2 -> 3 -> 4 grid traversal) */
function ZipPathGame({ onWin }: { onWin: () => void }) {
  // 3x3 grid; waypoints at (0,0)=1, (0,2)=2, (2,2)=3, (2,0)=4
  const waypoints: Record<string, number> = {
    '0,0': 1,
    '0,2': 2,
    '2,2': 3,
    '2,0': 4,
  };
  const [path, setPath] = useState<string[]>(['0,0']);
  const [won, setWon] = useState(false);

  const isAdjacent = (a: string, b: string) => {
    const [r1, c1] = a.split(',').map(Number);
    const [r2, c2] = b.split(',').map(Number);
    return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
  };

  const handleCellClick = (key: string) => {
    if (won) return;
    const last = path[path.length - 1];
    if (key === last && path.length > 1) {
      setPath((p) => p.slice(0, -1));
      return;
    }
    if (path.includes(key) || !isAdjacent(last, key)) return;
    const nextPath = [...path, key];
    setPath(nextPath);

    if (nextPath.length === 9 && key === '2,0') {
      // Check waypoint order 1 -> 2 -> 3 -> 4
      const i1 = nextPath.indexOf('0,0');
      const i2 = nextPath.indexOf('0,2');
      const i3 = nextPath.indexOf('2,2');
      const i4 = nextPath.indexOf('2,0');
      if (i1 < i2 && i2 < i3 && i3 < i4) {
        setWon(true);
        onWin();
      }
    }
  };

  return (
    <div className="space-y-4 max-w-md">
      <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
        Zip Path (Connect 1 → 2 → 3 → 4 Visiting All 9 Cells)
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {won
          ? 'Zip Path Complete! +15 Streak Points awarded.'
          : `Cells visited: ${path.length}/9. Click adjacent cells in sequence.`}
      </p>

      <div className="grid grid-cols-3 gap-2 max-w-[240px]">
        {[0, 1, 2].map((r) =>
          [0, 1, 2].map((c) => {
            const key = `${r},${c}`;
            const stepIdx = path.indexOf(key);
            const wp = waypoints[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleCellClick(key)}
                className={`h-16 rounded-xl font-mono text-sm font-bold border transition-colors ${
                  stepIdx >= 0
                    ? 'bg-[#0B2545] text-white border-[#0B2545] dark:bg-[#1D4ED8] dark:border-[#1D4ED8]'
                    : 'bg-[#F4F7FB] dark:bg-[#05070B] text-slate-700 dark:text-slate-200 border-slate-300 dark:border-[#1E3A5F]/70'
                }`}
              >
                {wp ? `Node ${wp}` : stepIdx >= 0 ? `#${stepIdx + 1}` : '·'}
              </button>
            );
          }),
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          setPath(['0,0']);
          setWon(false);
        }}
        className="px-4 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-[#1E3A5F]/70"
      >
        Reset Path
      </button>
    </div>
  );
}

/* 4. Word Finding (Word Search) */
function WordFindingGame({ onWin }: { onWin: () => void }) {
  const board = [
    ['S', 'Q', 'L', 'X', 'A'],
    ['T', 'R', 'E', 'A', 'P'],
    ['A', 'G', 'I', 'T', 'I'],
    ['C', 'D', 'O', 'M', 'Z'],
    ['K', 'N', 'O', 'D', 'E'],
  ];
  const validWords = ['SQL', 'GIT', 'DOM', 'NODE', 'API'];
  const [selected, setSelected] = useState<string[]>([]);
  const [found, setFound] = useState<string[]>([]);

  const toggleCell = (r: number, c: number) => {
    const key = `${r},${c}`;
    const next = selected.includes(key)
      ? selected.filter((k) => k !== key)
      : [...selected, key];
    setSelected(next);
    const word = next
      .map((k) => {
        const [rr, cc] = k.split(',').map(Number);
        return board[rr][cc];
      })
      .join('');

    if (validWords.includes(word) && !found.includes(word)) {
      const updated = [...found, word];
      setFound(updated);
      setSelected([]);
      if (updated.length === 3) onWin();
    }
  };

  return (
    <div className="space-y-4 max-w-md">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
          Word Finding (Find 3 Tech Terms)
        </h2>
        <span className="font-mono text-xs font-bold text-emerald-700 dark:text-amber-400">
          {found.length}/3
        </span>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Tap letters in order to spell: SQL, GIT, DOM, NODE, or API.
      </p>

      <div className="grid grid-cols-5 gap-1.5 max-w-[270px]">
        {board.map((row, r) =>
          row.map((ch, c) => {
            const key = `${r},${c}`;
            const active = selected.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleCell(r, c)}
                className={`h-12 rounded-lg font-mono font-bold text-sm border ${
                  active
                    ? 'bg-amber-500 text-slate-950 border-amber-500'
                    : 'bg-[#F4F7FB] dark:bg-[#05070B] text-slate-900 dark:text-white border-slate-200 dark:border-[#1E3A5F]/60'
                }`}
              >
                {ch}
              </button>
            );
          }),
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setSelected([])}
          className="px-4 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-white/15"
        >
          Clear Selection
        </button>
        {found.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setSelected([]);
              setFound([]);
            }}
            className="px-4 py-2 rounded-lg text-xs font-semibold border border-amber-500/40 text-amber-800 dark:text-amber-300"
          >
            Reset Board
          </button>
        )}
      </div>

      {found.length > 0 && (
        <p className="text-xs font-mono text-emerald-700 dark:text-amber-400">
          Found: {found.join(' · ')} {found.length >= 3 ? '(Victory! +15 pts)' : ''}
        </p>
      )}
    </div>
  );
}

/* 5. Spot the Difference (Interactive Architecture Blueprint Spotter) */
function SpotDifferenceGame({ onWin }: { onWin: () => void }) {
  const differences = [
    { id: 'auth', label: 'Missing JWT Auth Shield', x: 78, y: 42 },
    { id: 'cache', label: 'Missing Redis Cache Layer', x: 170, y: 92 },
    { id: 'replica', label: 'Missing DB Read Replica', x: 248, y: 46 },
  ];
  const [foundIds, setFoundIds] = useState<string[]>([]);

  const clickDiff = (id: string) => {
    if (foundIds.includes(id)) return;
    const next = [...foundIds, id];
    setFoundIds(next);
    if (next.length === differences.length) onWin();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
            Spot the Difference — System Architecture Audit
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Click the 3 missing components on Diagram B compared to Production Diagram A.
          </p>
        </div>
        <span className="font-mono text-xs font-bold text-emerald-700 dark:text-amber-400">
          {foundIds.length}/3 Spotted
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#05070B] p-4 text-white">
          <p className="text-xs font-mono text-emerald-400 mb-2">Diagram A (Production Complete)</p>
          <svg viewBox="0 0 300 130" className="w-full h-36">
            <rect x="12" y="45" width="48" height="36" rx="6" fill="#0F213E" stroke="#38BDF8" />
            <text x="36" y="67" textAnchor="middle" fill="#FFF" fontSize="10">Client</text>
            <circle cx="78" cy="42" r="10" fill="#16A34A" />
            <text x="78" y="45" textAnchor="middle" fill="#FFF" fontSize="8">JWT</text>
            <rect x="108" y="45" width="52" height="36" rx="6" fill="#0F213E" stroke="#38BDF8" />
            <text x="134" y="67" textAnchor="middle" fill="#FFF" fontSize="10">API</text>
            <rect x="148" y="92" width="44" height="22" rx="4" fill="#D97706" />
            <text x="170" y="106" textAnchor="middle" fill="#FFF" fontSize="8">Redis</text>
            <rect x="200" y="45" width="56" height="36" rx="6" fill="#0F213E" stroke="#38BDF8" />
            <text x="228" y="67" textAnchor="middle" fill="#FFF" fontSize="10">Primary</text>
            <circle cx="248" cy="46" r="10" fill="#F59E0B" />
            <text x="248" y="49" textAnchor="middle" fill="#05070B" fontSize="7" fontWeight="700">Rep</text>
          </svg>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#05070B] p-4 text-white">
          <p className="text-xs font-mono text-amber-400 mb-2">Diagram B (Click Missing Zones)</p>
          <svg viewBox="0 0 300 130" className="w-full h-36">
            <rect x="12" y="45" width="48" height="36" rx="6" fill="#0F213E" stroke="#38BDF8" />
            <text x="36" y="67" textAnchor="middle" fill="#FFF" fontSize="10">Client</text>
            <rect x="108" y="45" width="52" height="36" rx="6" fill="#0F213E" stroke="#38BDF8" />
            <text x="134" y="67" textAnchor="middle" fill="#FFF" fontSize="10">API</text>
            <rect x="200" y="45" width="56" height="36" rx="6" fill="#0F213E" stroke="#38BDF8" />
            <text x="228" y="67" textAnchor="middle" fill="#FFF" fontSize="10">Primary</text>

            {differences.map((d) => {
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
                    r="16"
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
            const d = differences.find((item) => item.id === id);
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

/* 6. Small Code Error Finder */
function CodeBugFinderGame({ onWin }: { onWin: () => void }) {
  const lines = [
    'async function fetchUserProfile(userId) {',
    '  const res = await fetch(`/api/users/${userId}`);',
    '  if (res.status = 200) {',
    '    return await res.json();',
    '  }',
    '  throw new Error("Failed to load user");',
    '}',
  ];
  const buggyLineIndex = 2;
  const [pickedLine, setPickedLine] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);

  const handleSelectLine = (idx: number) => {
    setPickedLine(idx);
    if (idx === buggyLineIndex) {
      setSolved(true);
      onWin();
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
        Code Error Finder — Spot the Subtle Bug
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Click the exact line containing a critical JavaScript bug.
      </p>

      <div className="rounded-xl overflow-hidden border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#05070B] font-mono text-xs">
        {lines.map((line, idx) => {
          const isSelected = pickedLine === idx;
          const isCorrect = idx === buggyLineIndex && isSelected;
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
              ? 'Correct! Line 3 uses assignment `=` instead of equality `===` (`if (res.status === 200)` or `if (res.ok)`). +15 Streak Points!'
              : 'Look closer at Line 3 — check comparison vs assignment operators.'}
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

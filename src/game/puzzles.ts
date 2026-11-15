/* Pure decoupled puzzle definitions and validators for VoraGen Games */

/* -------------------------------------------------------------------------- */
/* 1. Zip Path (Larger Grids, Barriers, Sequential Nodes, 100% Space Cover)   */
/* -------------------------------------------------------------------------- */

export interface ZipLevel {
  id: string;
  title: string;
  subtitle: string;
  rows: number;
  cols: number;
  /** Row,Col coordinates that are permanent obstacles (walls) */
  blocked: string[];
  /** Numbered waypoints mapped by "r,c" -> sequential node number (1..N) */
  waypoints: Record<string, number>;
  startKey: string;
  endNodeNumber: number;
}

/**
 * Every Zip level is constructed by tracing a true Hamiltonian path through all playable cells
 * and placing sequential numbered nodes along that verified path.
 *
 * Level 1 (6x6 = 36 playable cells):
 * Serpentine path starting at (0,0)=1:
 * Row 0: (0,0)->(0,5)=2
 * Row 1: (1,5)->(1,0)
 * Row 2: (2,0)->(2,2)=3->(2,5)
 * Row 3: (3,5)->(3,3)=4->(3,0)
 * Row 4: (4,0)->(4,4)=5->(4,5)
 * Row 5: (5,5)->(5,0)=6
 */
export const ZIP_LEVELS: ZipLevel[] = [
  {
    id: 'zip-l1',
    title: 'Level 1 · 6×6 Full-Grid Circuit',
    subtitle: 'Connect 1 → 2 → 3 → 4 → 5 → 6 sequentially while covering all 36 spaces.',
    rows: 6,
    cols: 6,
    blocked: [],
    startKey: '0,0',
    endNodeNumber: 6,
    waypoints: {
      '0,0': 1,
      '0,5': 2,
      '2,2': 3,
      '3,3': 4,
      '4,4': 5,
      '5,0': 6,
    },
  },
  {
    id: 'zip-l2',
    title: 'Level 2 · 6×6 Firewall Maze',
    subtitle: 'Navigate around 4 firewall blocks connecting 1 → 2 → 3 → 4 → 5 → 6 across all 32 open spaces.',
    rows: 6,
    cols: 6,
    /*
     * Verified connected Hamiltonian tour across 32 cells (obstacles at (0,3), (2,1), (3,4), (5,2)):
     * (0,0)=1 -> (1,0) -> (2,0) -> (3,0) -> (4,0) -> (5,0) -> (5,1)=2 -> (4,1) -> (3,1) -> (3,2)
     * -> (4,2) -> (4,3) -> (5,3) -> (5,4) -> (5,5)=3 -> (4,5) -> (4,4) -> (3,5)? Wait (4,4) not adj to (3,5)!
     * Let's verify exact step-by-step path carefully:
     * 1: (0,0)->(0,1)->(0,2)->(1,2)->(1,1)->(1,0)->(2,0)->(3,0)->(4,0)->(5,0)->(5,1)->(4,1)->(3,1)->(3,2)->(4,2)->(4,3)->(5,3)->(5,4)->(5,5)->(4,5)->(4,4)->(3,3)X wait (4,4) to (3,3) is diagonal!
     * Let's write an exact orthogonal tour and block the unused 4 cells cleanly:
     * Tour of 32 cells (avoiding (0,5), (1,5), (5,0), (5,1)):
     * Start (0,0)=1 -> (1,0) -> (2,0) -> (3,0) -> (4,0) -> (4,1) -> (3,1) -> (2,1) -> (1,1) -> (0,1)
     * -> (0,2)=2 -> (1,2) -> (2,2) -> (3,2) -> (4,2) -> (5,2)=3 -> (5,3) -> (4,3) -> (3,3) -> (2,3)
     * -> (1,3) -> (0,3)=4 -> (0,4) -> (1,4) -> (2,4) -> (3,4) -> (4,4) -> (5,4) -> (5,5)=5 -> (4,5) -> (3,5) -> (2,5)=6!
     * Check every step! All orthogonal (+/-1 in row or col), 32 unique cells, remaining 4 cells are (0,5),(1,5),(5,0),(5,1) — wait let's put obstacles INSIDE the grid so it feels like a true maze!
     * Better internal-obstacle tour (32 cells, 4 internal obstacles at (1,1), (1,4), (4,1), (4,4)):
     * Wait let's check parity for a 6x6 with 4 internal obstacles:
     * (1,1): white (1+1=2 even), (1,4): black (1+4=5 odd), (4,1): black (4+1=5 odd), (4,4): white (4+4=8 even). Balanced (2 even, 2 odd)!
     * Trace exact orthogonal 32-cell tour:
     * (0,0)=1 -> (0,1) -> (0,2) -> (1,2) -> (1,3) -> (0,3) -> (0,4) -> (0,5)=2
     * -> (1,5) -> (2,5) -> (2,4) -> (2,3) -> (2,2) -> (2,1) -> (2,0)=3
     * -> (1,0) -> X stuck! Can't escape (1,0) if (1,1) blocked and (0,0),(2,0) visited.
     * Easy fix: visit (1,0) BEFORE (2,0)!
     * Trace from (0,0):
     * (0,0)=1 -> (1,0) -> (2,0) -> (3,0) -> (4,0) -> (5,0)=2 -> (5,1) -> (5,2) -> (4,2) -> (4,3) -> (5,3) -> (5,4) -> (5,5)=3
     * -> (4,5) -> (3,5) -> (2,5) -> (1,5) -> (0,5)=4 -> (0,4) -> (0,3) -> (0,2) -> (0,1) -> X dead end at (0,1)!
     * Let's trace cleanly with 4 interior blocks at (1,2), (2,4), (3,1), (4,3):
     * Parity check: (1,2)=3 odd, (2,4)=6 even, (3,1)=4 even, (4,3)=7 odd -> 2 odd, 2 even!
     * Trace:
     * (0,0)=1 -> (0,1) -> (1,1) -> (2,1) -> (2,0) -> (1,0) -> wait (1,0) needs exit to (0,0) or (2,0) or (1,1).
     * Instead of starting in corner, let's place blocks at (1,4), (2,1), (3,4), (4,1):
     * (1,4)=5 odd, (2,1)=3 odd, (3,4)=7 odd, (4,1)=5 odd — NOT balanced (4 odd)!
     * Must have 2 odd + 2 even obstacles! Let's use (1,1)[E], (1,4)[O], (4,1)[O], (4,4)[E], start at (1,0)[O] -> wait:
     * 32 cells remaining: 16 Even, 16 Odd. Start on Even, end on Odd!
     * Let's trace exact verified tour on 6x6 with blocks (1,1), (1,4), (4,1), (4,4):
     * Start at (1,0)=1 -> (0,0) -> (0,1) -> (0,2) -> (1,2) -> (1,3) -> (0,3) -> (0,4) -> (0,5)=2
     * -> (1,5) -> (2,5) -> (2,4) -> (2,3) -> (2,2) -> (2,1) -> (2,0)=3
     * -> (3,0) -> (4,0) -> (5,0) -> (5,1) -> (5,2)=4 -> (4,2) -> (3,2) -> (3,1) -> X wait (3,1) isolated!
     * Wait from (3,0)->(3,1)->(3,2)->(4,2)->(5,2)->(5,1)->(5,0)->(4,0) ends at (4,0), needs connection to (3,3)? No!
     * Reverse the bottom-left loop:
     * From (2,0)=3 -> (3,0) -> (4,0) -> (5,0) -> (5,1) -> (5,2) -> (4,2) -> (3,2) -> (3,1) -> wait (3,1) is adj to (3,0),(3,2)! Wait if (3,0) already used then (3,1) is dead end.
     * Instead: (2,0)->(2,1)X wait: from (2,2)->(2,1)->(2,0)->(3,0)->(3,1)->(3,2)->(4,2)->(5,2)->(5,1)->(5,0)->(4,0) -> no! (4,0) can't reach right half!
     * Look how easy it is when (3,0)->(4,0)->(5,0)->(5,1)->(5,2)->(5,3)->(5,4)->(5,5):
     * Let's trace a verified 32-cell tour with 4 internal obstacles at (1,1), (2,3), (3,2), (4,4) (parities: E, O, O, E — 2E, 2O!):
     * 1: (0,0) [E]
     * 2: (1,0) -> (2,0) -> (3,0) -> (4,0) -> (5,0) -> (5,1) -> (4,1) -> (3,1) -> (2,1) -> (2,2)
     * -> (1,2) -> (0,2) -> (0,1) -> wait (0,1) is dead end if (0,0) visited!
     * Start at (0,1)!
     * Check (0,1)[O] -> (0,0)[E] -> (1,0) -> (2,0) -> (3,0) -> (4,0) -> (5,0) -> (5,1) -> (4,1) -> (3,1) -> (2,1) -> (2,2) -> (1,2) -> (0,2) -> (0,3) -> (1,3) -> (1,4) -> (0,4) -> (0,5) -> (1,5) -> (2,5) -> (2,4) -> (3,4) -> (3,3) -> (4,3) -> (4,2) -> (5,2) -> (5,3) -> (5,4) -> (5,5) -> (4,5) -> (3,5)!
     * WAIT A SECOND! COUNT THAT!
     * Let's verify every single coordinate in that list of 32:
     * Obstacles: (1,1), (2,3), (3,2), (4,4) — 4 obstacles!
     * Step 01: (0,1)
     * Step 02: (0,0) [adj col -1]
     * Step 03: (1,0) [adj row +1]
     * Step 04: (2,0) [adj row +1]
     * Step 05: (3,0) [adj row +1]
     * Step 06: (4,0) [adj row +1]
     * Step 07: (5,0) [adj row +1]
     * Step 08: (5,1) [adj col +1]
     * Step 09: (4,1) [adj row -1]
     * Step 10: (3,1) [adj row -1]
     * Step 11: (2,1) [adj row -1]
     * Step 12: (2,2) [adj col +1]
     * Step 13: (1,2) [adj row -1]
     * Step 14: (0,2) [adj row -1]
     * Step 15: (0,3) [adj col +1]
     * Step 16: (1,3) [adj row +1]
     * Step 17: (1,4) [adj col +1]
     * Step 18: (0,4) [adj row -1]
     * Step 19: (0,5) [adj col +1]
     * Step 20: (1,5) [adj row +1]
     * Step 21: (2,5) [adj row +1]
     * Step 22: (2,4) [adj col -1]
     * Step 23: (3,4) [adj row +1]
     * Step 24: (3,3) [adj col -1]
     * Step 25: (4,3) [adj row +1]
     * Step 26: (4,2) [adj col -1]
     * Step 27: (5,2) [adj row +1]
     * Step 28: (5,3) [adj col +1]
     * Step 29: (5,4) [adj col +1]
     * Step 30: (5,5) [adj col +1]
     * Step 31: (4,5) [adj row -1]
     * Step 32: (3,5) [adj row -1]
     * Total = 32 unique valid non-obstacle cells! Plus 4 obstacles = 36 cells! 100% mathematically verified!
     */
    blocked: ['1,1', '2,3', '3,2', '4,4'],
    startKey: '0,1',
    endNodeNumber: 6,
    waypoints: {
      '0,1': 1,
      '5,0': 2,
      '0,2': 3,
      '2,5': 4,
      '5,2': 5,
      '3,5': 6,
    },
  },
  {
    id: 'zip-l3',
    title: 'Level 3 · 7×7 Kernel Labyrinth',
    subtitle: 'Master puzzle: traverse all 44 playable cells hitting 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 in exact order.',
    rows: 7,
    cols: 7,
    /*
     * 7x7 (49 cells) with 5 blocked cells: (1,1), (1,5), (3,3), (5,1), (5,5) -> 44 playable cells!
     * Wait check parity of 7x7: 25 Even (corners are even), 24 Odd.
     * Blocked parities: (1,1)=E, (1,5)=E, (3,3)=E, (5,1)=E, (5,5)=E -> 5 Even blocked!
     * Remaining: 20 Even, 24 Odd -> Wait 24-20 = 4! You cannot have a Hamiltonian path when |Even - Odd| > 1!
     * Thank goodness we checked parity! Let's choose 5 obstacles with 3 Even and 2 Odd, OR 3 Odd and 2 Even!
     * Let's block 3 Even + 2 Odd -> Remaining = 22 Even, 22 Odd (difference = 0)!
     * Take obstacles: (1,1)[E], (1,4)[O], (3,3)[E], (4,1)[O], (5,5)[E] -> 3 Even, 2 Odd -> Remaining 22E, 22O!
     * Trace a concrete 44-cell tour on 7x7 with obstacles (1,1), (1,4), (3,3), (4,1), (5,5):
     * Start at (0,0)[E] -> (1,0) -> (2,0) -> (3,0) -> (4,0) -> (5,0) -> (6,0) -> (6,1) -> (6,2) -> (5,2) -> (5,1) -> (5,1)? No (5,1) is free! Wait (4,1) is blocked, so (5,1) IS free, only neighbor (5,0) used & (5,2) & (6,1)! Wait if (6,1)->(5,1)->(5,2) skips (6,2), or (6,0)->(6,1)->(5,1)->(5,2)->(6,2)->(6,3)->...
     * Let's trace all 44 step by step and double check every neighbor:
     * 01 (0,0) -> 02 (1,0) -> 03 (2,0) -> 04 (3,0) -> 05 (4,0) -> 06 (5,0) -> 07 (6,0)
     * -> 08 (6,1) -> 09 (5,1) -> 10 (5,2) -> 11 (6,2) -> 12 (6,3) -> 13 (5,3) -> 14 (5,4)
     * -> 15 (6,4) -> 16 (6,5) -> 17 (6,6) -> 18 (5,6) -> 19 (4,6) -> 20 (4,5) -> 21 (4,4)
     * -> 22 (4,3) -> 23 (4,2) -> 24 (3,2) -> 25 (3,1) -> 26 (2,1) -> 27 (2,2) -> 28 (1,2)
     * -> 29 (0,2) -> 30 (0,1) -> wait (0,1) dead end because (0,0) used and (1,1) blocked!
     * Fix: Start at (0,1)!
     * Re-verify from (0,1):
     * 01 (0,1) -> 02 (0,0) -> 03 (1,0) -> 04 (2,0) -> 05 (3,0) -> 06 (4,0) -> 07 (5,0) -> 08 (6,0)
     * -> 09 (6,1) -> 10 (5,1) -> 11 (5,2) -> 12 (6,2) -> 13 (6,3) -> 14 (5,3) -> 15 (5,4)
     * -> 16 (6,4) -> 17 (6,5) -> 18 (6,6) -> 19 (5,6) -> 20 (4,6) -> 21 (4,5) -> 22 (4,4)
     * -> 23 (4,3) -> 24 (4,2) -> 25 (3,2) -> 26 (3,1) -> 27 (2,1) -> 28 (2,2) -> 29 (1,2)
     * -> 30 (0,2) -> 31 (0,3) -> 32 (1,3) -> 33 (2,3) -> 34 (2,4) -> 35 (2,5) -> 36 (3,5)
     * -> 37 (3,4) -> wait from (3,4) can go to (3,5)? No already used. Let's inspect top-right unused cells:
     * After 31 (0,3): remaining unused are (0,4),(0,5),(0,6),(1,3),(1,5),(1,6),(2,3),(2,4),(2,5),(2,6),(3,4),(3,5),(3,6) -> 13 cells!
     * Wait 31 + 13 = 44! Let's trace those 13 cells from (0,3) cleanly:
     * 32 (0,4) -> 33 (0,5) -> 34 (0,6) -> 35 (1,6) -> 36 (1,5) -> 37 (2,5) -> 38 (2,6) -> 39 (3,6) -> 40 (3,5) -> 41 (3,4) -> 42 (2,4) -> 43 (2,3) -> 44 (1,3)!
     * Check every step 30..44:
     * (0,2)->(0,3)->(0,4)->(0,5)->(0,6)->(1,6)->(1,5)->(2,5)->(2,6)->(3,6)->(3,5)->(3,4)->(2,4)->(2,3)->(1,3).
     * Check neighbors:
     * (0,2)-(0,3): col+1
     * (0,3)-(0,4): col+1
     * (0,4)-(0,5): col+1
     * (0,5)-(0,6): col+1
     * (0,6)-(1,6): row+1
     * (1,6)-(1,5): col-1
     * (1,5)-(2,5): row+1
     * (2,5)-(2,6): col+1
     * (2,6)-(3,6): row+1
     * (3,6)-(3,5): col-1
     * (3,5)-(3,4): col-1
     * (3,4)-(2,4): row-1
     * (2,4)-(2,3): col-1
     * (2,3)-(1,3): row-1
     * All 44 cells visited! Zero blocked cells touched ((1,1), (1,4), (3,3), (4,1), (5,5))!
     */
    blocked: ['1,1', '1,4', '3,3', '4,1', '5,5'],
    startKey: '0,1',
    endNodeNumber: 8,
    waypoints: {
      '0,1': 1,
      '6,0': 2,
      '6,6': 3,
      '4,2': 4,
      '2,1': 5,
      '0,5': 6,
      '3,6': 7,
      '1,3': 8,
    },
  },
];

export function isAdjacentCell(a: string, b: string): boolean {
  const [r1, c1] = a.split(',').map(Number);
  const [r2, c2] = b.split(',').map(Number);
  return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
}

export function getZipPlayableCount(level: ZipLevel): number {
  return level.rows * level.cols - level.blocked.length;
}

export function canStepZipPath(path: string[], nextKey: string, level: ZipLevel): {
  allowed: boolean;
  reason?: string;
} {
  if (level.blocked.includes(nextKey)) {
    return { allowed: false, reason: 'Blocked firewall cell cannot be entered.' };
  }
  if (path.includes(nextKey)) {
    return { allowed: false, reason: 'Each cell can only be visited once.' };
  }
  const last = path[path.length - 1];
  if (!isAdjacentCell(last, nextKey)) {
    return { allowed: false, reason: 'Move must be orthogonally adjacent (up, down, left, right).' };
  }

  // Enforce monotonic numbered waypoint progression:
  // Cannot step onto Node K unless Nodes 1..K-1 have already been visited!
  const targetWp = level.waypoints[nextKey];
  if (targetWp !== undefined) {
    let highestVisitedWp = 0;
    for (const k of path) {
      const wp = level.waypoints[k];
      if (wp && wp > highestVisitedWp) highestVisitedWp = wp;
    }
    if (targetWp !== highestVisitedWp + 1) {
      return {
        allowed: false,
        reason: `Must connect Node ${highestVisitedWp + 1} before reaching Node ${targetWp}.`,
      };
    }
    if (targetWp === level.endNodeNumber && path.length + 1 < getZipPlayableCount(level)) {
      return {
        allowed: false,
        reason: `Visit all ${getZipPlayableCount(level)} open spaces before finishing at Node ${level.endNodeNumber}.`,
      };
    }
  }

  return { allowed: true };
}

export function isZipPathSolved(path: string[], level: ZipLevel): boolean {
  const playable = getZipPlayableCount(level);
  if (path.length !== playable) return false;
  if (new Set(path).size !== playable) return false;
  for (let i = 0; i < path.length; i++) {
    if (level.blocked.includes(path[i])) return false;
    if (i > 0 && !isAdjacentCell(path[i - 1], path[i])) return false;
  }
  // Check exact waypoint ordering 1 < 2 < ... < endNodeNumber
  const wpPositions: Array<{ node: number; idx: number }> = [];
  for (const [cellKey, nodeNum] of Object.entries(level.waypoints)) {
    const idx = path.indexOf(cellKey);
    if (idx === -1) return false;
    wpPositions.push({ node: nodeNum, idx });
  }
  wpPositions.sort((a, b) => a.node - b.node);
  for (let i = 1; i < wpPositions.length; i++) {
    if (wpPositions[i].idx <= wpPositions[i - 1].idx) return false;
  }
  const lastWp = wpPositions[wpPositions.length - 1];
  return lastWp?.idx === playable - 1;
}

/* -------------------------------------------------------------------------- */
/* 2. Full 9x9 Logic Sudoku                                                   */
/* -------------------------------------------------------------------------- */

export interface Sudoku9x9Puzzle {
  id: string;
  label: string;
  difficulty: 'Challenging' | 'Hard' | 'Expert';
  initial: number[][];
  solution: number[][];
}

export const SUDOKU_9X9_PUZZLES: Sudoku9x9Puzzle[] = [
  {
    id: 'sud-challenging',
    label: '9×9 Classic Grid',
    difficulty: 'Challenging',
    initial: [
      [5, 3, 0, 0, 7, 0, 0, 0, 0],
      [6, 0, 0, 1, 9, 5, 0, 0, 0],
      [0, 9, 8, 0, 0, 0, 0, 6, 0],
      [8, 0, 0, 0, 6, 0, 0, 0, 3],
      [4, 0, 0, 8, 0, 3, 0, 0, 1],
      [7, 0, 0, 0, 2, 0, 0, 0, 6],
      [0, 6, 0, 0, 0, 0, 2, 8, 0],
      [0, 0, 0, 4, 1, 9, 0, 0, 5],
      [0, 0, 0, 0, 8, 0, 0, 7, 9],
    ],
    solution: [
      [5, 3, 4, 6, 7, 8, 9, 1, 2],
      [6, 7, 2, 1, 9, 5, 3, 4, 8],
      [1, 9, 8, 3, 4, 2, 5, 6, 7],
      [8, 5, 9, 7, 6, 1, 4, 2, 3],
      [4, 2, 6, 8, 5, 3, 7, 9, 1],
      [7, 1, 3, 9, 2, 4, 8, 5, 6],
      [9, 6, 1, 5, 3, 7, 2, 8, 4],
      [2, 8, 7, 4, 1, 9, 6, 3, 5],
      [3, 4, 5, 2, 8, 6, 1, 7, 9],
    ],
  },
  {
    id: 'sud-hard',
    label: '9×9 Hard Logic',
    difficulty: 'Hard',
    initial: [
      [0, 0, 0, 2, 6, 0, 7, 0, 1],
      [6, 8, 0, 0, 7, 0, 0, 9, 0],
      [1, 9, 0, 0, 0, 4, 5, 0, 0],
      [8, 2, 0, 1, 0, 0, 0, 4, 0],
      [0, 0, 4, 6, 0, 2, 9, 0, 0],
      [0, 5, 0, 0, 0, 3, 0, 2, 8],
      [0, 0, 9, 3, 0, 0, 0, 7, 4],
      [0, 4, 0, 0, 5, 0, 0, 3, 6],
      [7, 0, 3, 0, 1, 8, 0, 0, 0],
    ],
    solution: [
      [4, 3, 5, 2, 6, 9, 7, 8, 1],
      [6, 8, 2, 5, 7, 1, 4, 9, 3],
      [1, 9, 7, 8, 3, 4, 5, 6, 2],
      [8, 2, 6, 1, 9, 5, 3, 4, 7],
      [3, 7, 4, 6, 8, 2, 9, 1, 5],
      [9, 5, 1, 7, 4, 3, 6, 2, 8],
      [5, 1, 9, 3, 2, 6, 8, 7, 4],
      [2, 4, 8, 9, 5, 7, 1, 3, 6],
      [7, 6, 3, 4, 1, 8, 2, 5, 9],
    ],
  },
  {
    id: 'sud-expert',
    label: '9×9 Master Matrix',
    difficulty: 'Expert',
    initial: [
      [0, 2, 0, 6, 0, 8, 0, 0, 0],
      [5, 8, 0, 0, 0, 9, 7, 0, 0],
      [0, 0, 0, 0, 4, 0, 0, 0, 0],
      [3, 7, 0, 0, 0, 0, 5, 0, 0],
      [6, 0, 0, 0, 0, 0, 0, 0, 4],
      [0, 0, 8, 0, 0, 0, 0, 1, 3],
      [0, 0, 0, 0, 2, 0, 0, 0, 0],
      [0, 0, 9, 8, 0, 0, 0, 3, 6],
      [0, 0, 0, 3, 0, 6, 0, 9, 0],
    ],
    solution: [
      [1, 2, 3, 6, 7, 8, 9, 4, 5],
      [5, 8, 4, 2, 3, 9, 7, 6, 1],
      [9, 6, 7, 1, 4, 5, 3, 2, 8],
      [3, 7, 2, 4, 6, 1, 5, 8, 9],
      [6, 9, 1, 5, 8, 3, 2, 7, 4],
      [4, 5, 8, 7, 9, 2, 6, 1, 3],
      [8, 3, 6, 9, 2, 4, 1, 5, 7],
      [2, 1, 9, 8, 5, 7, 4, 3, 6],
      [7, 4, 5, 3, 1, 6, 8, 9, 2],
    ],
  },
];

export function getSudokuConflicts(grid: number[][]): Set<string> {
  const conflicts = new Set<string>();
  const size = grid.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const val = grid[r][c];
      if (!val) continue;
      // Check row and col
      for (let i = 0; i < size; i++) {
        if (i !== c && grid[r][i] === val) {
          conflicts.add(`${r},${c}`);
          conflicts.add(`${r},${i}`);
        }
        if (i !== r && grid[i][c] === val) {
          conflicts.add(`${r},${c}`);
          conflicts.add(`${i},${c}`);
        }
      }
      // Check 3x3 box
      const br = Math.floor(r / 3) * 3;
      const bc = Math.floor(c / 3) * 3;
      for (let rr = br; rr < br + 3; rr++) {
        for (let cc = bc; cc < bc + 3; cc++) {
          if ((rr !== r || cc !== c) && grid[rr][cc] === val) {
            conflicts.add(`${r},${c}`);
            conflicts.add(`${rr},${cc}`);
          }
        }
      }
    }
  }
  return conflicts;
}

export function isSudokuComplete(grid: number[][], solution: number[][]): boolean {
  if (grid.length !== 9 || solution.length !== 9) return false;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] !== solution[r][c]) return false;
    }
  }
  return true;
}

/* -------------------------------------------------------------------------- */
/* 3. 12x12 Multi-Directional Word Finding (Horizontal, Vertical, Diagonal)   */
/* -------------------------------------------------------------------------- */

export interface WordSearchLevel {
  id: string;
  title: string;
  board: string[][];
  targetWords: string[];
}

export const WORD_SEARCH_12X12: WordSearchLevel = {
  id: 'ws-12x12-systems',
  title: '12×12 Systems & Cloud Matrix (Multi-Directional)',
  board: [
    ['K', 'U', 'B', 'E', 'R', 'N', 'E', 'T', 'E', 'S', 'Q', 'L'],
    ['A', 'L', 'G', 'O', 'R', 'I', 'T', 'H', 'M', 'A', 'P', 'N'],
    ['F', 'P', 'Y', 'T', 'H', 'O', 'N', 'X', 'E', 'T', 'I', 'E'],
    ['K', 'R', 'E', 'D', 'I', 'S', 'C', 'N', 'R', 'G', 'P', 'U'],
    ['A', 'O', 'T', 'O', 'K', 'E', 'N', 'E', 'A', 'R', 'E', 'R'],
    ['S', 'M', 'A', 'R', 'T', 'D', 'C', 'A', 'C', 'A', 'L', 'A'],
    ['Y', 'I', 'P', 'C', 'A', 'C', 'H', 'E', 'T', 'P', 'I', 'L'],
    ['N', 'S', 'O', 'C', 'K', 'E', 'T', 'O', 'N', 'H', 'N', 'G'],
    ['C', 'E', 'N', 'C', 'R', 'Y', 'P', 'T', 'O', 'O', 'E', 'L'],
    ['D', 'O', 'C', 'K', 'E', 'R', 'W', 'A', 'S', 'M', 'D', 'A'],
    ['L', 'A', 'T', 'E', 'N', 'C', 'Y', 'Z', 'U', 'L', 'B', 'E'],
    ['T', 'Y', 'P', 'E', 'S', 'C', 'R', 'I', 'P', 'T', 'V', 'H'],
  ],
  targetWords: [
    'KUBERNETES',
    'TYPESCRIPT',
    'ALGORITHM',
    'PIPELINE',
    'PROMISE',
    'ENCRYPT',
    'LATENCY',
    'NEURAL',
    'PYTHON',
    'DOCKER',
    'SOCKET',
    'KAFKA',
    'ASYNC',
    'CACHE',
    'GRAPH',
    'REDIS',
    'NODE',
    'SQL',
  ],
};

/**
 * Validates that selected cells in the 12x12 matrix form a contiguous straight line
 * (horizontal, vertical, or diagonal in either forward or reverse direction)
 * and spell one of the target words.
 */
export function validateWordSearchSelection(
  board: string[][],
  selectedKeys: string[],
  targetWords: string[],
): { validWord: string | null; reason?: string } {
  if (selectedKeys.length < 3) return { validWord: null };
  const coords = selectedKeys.map((k) => k.split(',').map(Number) as [number, number]);
  const [r0, c0] = coords[0];
  const [r1, c1] = coords[1];
  const dr = Math.sign(r1 - r0);
  const dc = Math.sign(c1 - c0);

  if (dr === 0 && dc === 0) return { validWord: null };
  if (Math.abs(r1 - r0) > 1 || Math.abs(c1 - c0) > 1) {
    return { validWord: null, reason: 'Letters must be adjacent along a straight row, column, or diagonal.' };
  }

  for (let i = 1; i < coords.length; i++) {
    const [pr, pc] = coords[i - 1];
    const [cr, cc] = coords[i];
    if (cr - pr !== dr || cc - pc !== dc) {
      return { validWord: null, reason: 'Keep selections along one straight horizontal, vertical, or diagonal line.' };
    }
  }

  const word = coords.map(([r, c]) => board[r]?.[c] ?? '').join('');
  if (targetWords.includes(word)) return { validWord: word };
  return { validWord: null };
}

/* -------------------------------------------------------------------------- */
/* 4. Harder Word Connect, Spot Difference & Code Bug Challenges              */
/* -------------------------------------------------------------------------- */

export interface WordConnectRound {
  id: string;
  title: string;
  letters: string[];
  validWords: string[];
  requiredCount: number;
}

export const WORD_CONNECT_ROUNDS: WordConnectRound[] = [
  {
    id: 'wc-1',
    title: 'Round 1 · Architecture Anagrams (Find 6)',
    letters: ['S', 'T', 'R', 'E', 'A', 'M', 'I', 'N'],
    validWords: ['STREAM', 'MASTER', 'REMAINS', 'RETAIN', 'TRAIN', 'SMART', 'STEAM', 'STAIR', 'STARE', 'INERT', 'MINER', 'NAMES', 'TERMS', 'TEAMS', 'MEANS', 'RATES', 'TAMER'],
    requiredCount: 6,
  },
  {
    id: 'wc-2',
    title: 'Round 2 · Runtime Lexicon (Find 6)',
    letters: ['C', 'L', 'O', 'S', 'U', 'R', 'E', 'D'],
    validWords: ['CLOSURE', 'CLOSER', 'SOURCE', 'COURSE', 'CLOUD', 'SCORE', 'CODES', 'CORES', 'CORDS', 'ROLES', 'OLDER', 'RULES', 'CURSE', 'DOUSE'],
    requiredCount: 6,
  },
];

export interface ArchitectureDifference {
  id: string;
  label: string;
  detail: string;
  x: number;
  y: number;
}

export const SPOT_ARCHITECTURE_DIFFS: ArchitectureDifference[] = [
  { id: 'waf', label: 'Missing WAF Firewall', detail: 'Edge Web Application Firewall filtering malicious payloads', x: 52, y: 26 },
  { id: 'auth', label: 'Missing JWT Auth Gateway', detail: 'Token verification before microservice routing', x: 112, y: 48 },
  { id: 'ratelimit', label: 'Missing Rate Limiter', detail: 'Token-bucket protection against burst abuse', x: 112, y: 98 },
  { id: 'cache', label: 'Missing Redis Cluster Cache', detail: 'Sub-millisecond read cache reducing DB load', x: 184, y: 104 },
  { id: 'queue', label: 'Missing Dead-Letter Queue', detail: 'Async retry queue for failed background jobs', x: 184, y: 26 },
  { id: 'replica', label: 'Missing Standby Read Replica', detail: 'Multi-AZ failover replica for zero-downtime reads', x: 264, y: 48 },
];

export interface CodeBugLevel {
  id: string;
  title: string;
  language: string;
  lines: string[];
  buggyLineIndex: number;
  explanation: string;
}

export const CODE_BUG_LEVELS: CodeBugLevel[] = [
  {
    id: 'bug-1',
    title: 'Challenge 1 · Race Condition & Assignment Bug',
    language: 'JavaScript',
    lines: [
      'async function syncUserToken(userId, cache) {',
      '  const res = await fetch(`/api/users/${userId}`);',
      '  if (res.status = 200) {',
      '    const payload = await res.json();',
      '    cache.set(userId, payload.token);',
      '    return payload;',
      '  }',
      '  throw new Error("Unauthorized");',
      '}',
    ],
    buggyLineIndex: 2,
    explanation: 'Line 3 assigns `res.status = 200` (truthy) instead of comparing `res.status === 200`, allowing error responses to overwrite cached tokens.',
  },
  {
    id: 'bug-2',
    title: 'Challenge 2 · React Stale State & Mutation Bug',
    language: 'TypeScript',
    lines: [
      'function addValidatedSkill(skills: string[], next: string) {',
      '  const cleaned = next.trim();',
      '  if (!cleaned) return skills;',
      '  skills.push(cleaned);',
      '  return skills;',
      '}',
    ],
    buggyLineIndex: 3,
    explanation: 'Line 4 mutates the input array in place (`skills.push`), returning the exact same reference so React state updates fail to trigger a re-render (`return [...skills, cleaned]`).',
  },
  {
    id: 'bug-3',
    title: 'Challenge 3 · Async Loop Closure & Off-by-One',
    language: 'JavaScript',
    lines: [
      'function sumWindow(nums, windowSize) {',
      '  let maxSum = -Infinity;',
      '  for (let i = 0; i <= nums.length - windowSize; i++) {',
      '    let total = 0;',
      '    for (let j = i; j <= i + windowSize; j++) {',
      '      total += nums[j];',
      '    }',
      '    maxSum = Math.max(maxSum, total);',
      '  }',
      '  return maxSum;',
      '}',
    ],
    buggyLineIndex: 4,
    explanation: 'Line 5 uses `<= i + windowSize`, reading `windowSize + 1` elements and indexing out-of-bounds (`undefined` -> `NaN`) on the final window (`j < i + windowSize`).',
  },
];

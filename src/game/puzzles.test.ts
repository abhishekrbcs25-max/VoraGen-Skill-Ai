import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ZIP_LEVELS,
  SUDOKU_9X9_PUZZLES,
  WORD_SEARCH_12X12,
  WORD_CONNECT_ROUNDS,
  SPOT_ARCHITECTURE_DIFFS,
  CODE_BUG_LEVELS,
  canStepZipPath,
  getZipPlayableCount,
  isZipPathSolved,
  getSudokuConflicts,
  isSudokuComplete,
  validateWordSearchSelection,
} from './puzzles';

const ZIP_L1_TOUR = [
  '0,0', '0,1', '0,2', '0,3', '0,4', '0,5',
  '1,5', '1,4', '1,3', '1,2', '1,1', '1,0',
  '2,0', '2,1', '2,2', '2,3', '2,4', '2,5',
  '3,5', '3,4', '3,3', '3,2', '3,1', '3,0',
  '4,0', '4,1', '4,2', '4,3', '4,4', '4,5',
  '5,5', '5,4', '5,3', '5,2', '5,1', '5,0',
];

const ZIP_L2_TOUR = [
  '0,1', '0,0', '1,0', '2,0', '3,0', '4,0', '5,0', '5,1',
  '4,1', '3,1', '2,1', '2,2', '1,2', '0,2', '0,3', '1,3',
  '1,4', '0,4', '0,5', '1,5', '2,5', '2,4', '3,4', '3,3',
  '4,3', '4,2', '5,2', '5,3', '5,4', '5,5', '4,5', '3,5',
];

const ZIP_L3_TOUR = [
  '0,1', '0,0', '1,0', '2,0', '3,0', '4,0', '5,0', '6,0',
  '6,1', '5,1', '5,2', '6,2', '6,3', '5,3', '5,4', '6,4',
  '6,5', '6,6', '5,6', '4,6', '4,5', '4,4', '4,3', '4,2',
  '3,2', '3,1', '2,1', '2,2', '1,2', '0,2', '0,3', '0,4',
  '0,5', '0,6', '1,6', '1,5', '2,5', '2,6', '3,6', '3,5',
  '3,4', '2,4', '2,3', '1,3',
];

test('ZIP_LEVELS verified Hamiltonian tours solve all 3 levels covering 100% of open cells', () => {
  const tours = [ZIP_L1_TOUR, ZIP_L2_TOUR, ZIP_L3_TOUR];
  ZIP_LEVELS.forEach((level, idx) => {
    const tour = tours[idx];
    assert.equal(tour.length, getZipPlayableCount(level));
    assert.equal(isZipPathSolved(tour, level), true, `Level ${level.id} tour must solve cleanly`);

    // Verify incremental stepping works along the entire verified tour
    for (let i = 1; i < tour.length; i++) {
      const check = canStepZipPath(tour.slice(0, i), tour[i], level);
      assert.equal(check.allowed, true, `Step ${i} (${tour[i]}) rejected on ${level.id}: ${check.reason}`);
    }
  });
});

test('canStepZipPath blocks firewall walls, non-adjacent jumps, out-of-order nodes, and early exit', () => {
  const l2 = ZIP_LEVELS[1];
  // Firewall wall cell (1,1) blocked from (0,1)
  assert.equal(canStepZipPath(['0,1'], '1,1', l2).allowed, false);

  // Diagonal / non-adjacent jump blocked
  assert.equal(canStepZipPath(['0,1'], '1,2', l2).allowed, false);

  // Out-of-order waypoint: stepping from (0,1) [Node 1] -> ... directly onto Node 3 (0,2) before Node 2
  assert.equal(canStepZipPath(['0,1'], '0,2', l2).allowed, false);

  // Early finish: reaching endNode (3,5) with fewer than 32 open cells visited
  const almostThere = ['0,1', '0,2', '0,3', '0,4', '0,5', '1,5', '2,5']; // Missing Node 2 and <32 cells
  assert.equal(canStepZipPath(almostThere, '3,5', l2).allowed, false);

  // Visit Node 1->5 in order along valid prefix but missing cells before Node 6 (3,5)
  const shortEnd = ZIP_L2_TOUR.slice(0, 29); // stops at 5,4 (after Node 5 at 5,2)
  assert.equal(canStepZipPath([...shortEnd, '4,5'], '3,5', l2).allowed, false);
});

test('SUDOKU_9X9_PUZZLES maintain valid 9x9 dimensions, conflict detection, and solutions', () => {
  assert.equal(SUDOKU_9X9_PUZZLES.length, 3);
  for (const puzzle of SUDOKU_9X9_PUZZLES) {
    assert.equal(puzzle.initial.length, 9);
    assert.equal(puzzle.solution.length, 9);
    assert.equal(getSudokuConflicts(puzzle.solution).size, 0);
    assert.equal(isSudokuComplete(puzzle.solution, puzzle.solution), true);
    assert.equal(isSudokuComplete(puzzle.initial, puzzle.solution), false);
  }

  // Conflict detection flags duplicate digits in row, column, or 3x3 box
  const dirty = SUDOKU_9X9_PUZZLES[0].initial.map((r) => [...r]);
  dirty[0][2] = 5; // Duplicates 5 in row 0 and top-left 3x3 box
  const conflicts = getSudokuConflicts(dirty);
  assert.equal(conflicts.has('0,0'), true);
  assert.equal(conflicts.has('0,2'), true);
});

function findWordLineInBoard(board: string[][], word: string): string[] | null {
  const rows = board.length;
  const cols = board[0].length;
  const dirs = [
    [0, 1], [0, -1], [1, 0], [-1, 0],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
  ];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      for (const [dr, dc] of dirs) {
        const coords: string[] = [];
        let ok = true;
        for (let k = 0; k < word.length; k++) {
          const nr = r + dr * k;
          const nc = c + dc * k;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || board[nr][nc] !== word[k]) {
            ok = false;
            break;
          }
          coords.push(`${nr},${nc}`);
        }
        if (ok) return coords;
      }
    }
  }
  return null;
}

test('WORD_SEARCH_12X12 places all 18 multi-directional terms on straight lines and rejects bent paths', () => {
  assert.equal(WORD_SEARCH_12X12.board.length, 12);
  assert.equal(WORD_SEARCH_12X12.targetWords.length, 18);

  for (const word of WORD_SEARCH_12X12.targetWords) {
    const path = findWordLineInBoard(WORD_SEARCH_12X12.board, word);
    assert.ok(path, `Expected straight 8-directional path in 12x12 board for "${word}"`);
    const validation = validateWordSearchSelection(WORD_SEARCH_12X12.board, path, WORD_SEARCH_12X12.targetWords);
    assert.equal(validation.validWord, word);
  }

  // Diagonal NODE & Vertical NEURAL explicitly verified
  const nodePath = findWordLineInBoard(WORD_SEARCH_12X12.board, 'NODE');
  assert.ok(nodePath);
  const neuralPath = findWordLineInBoard(WORD_SEARCH_12X12.board, 'NEURAL');
  assert.ok(neuralPath);

  // Bent / L-shaped selection rejected cleanly
  const bent = validateWordSearchSelection(
    WORD_SEARCH_12X12.board,
    ['0,0', '0,1', '1,1'],
    WORD_SEARCH_12X12.targetWords,
  );
  assert.equal(bent.validWord, null);
  assert.ok(bent.reason);
});

test('WORD_CONNECT_ROUNDS, SPOT_ARCHITECTURE_DIFFS, and CODE_BUG_LEVELS validate integrity', () => {
  for (const round of WORD_CONNECT_ROUNDS) {
    assert.equal(round.letters.length, 8);
    assert.ok(round.validWords.length >= round.requiredCount);
    for (const word of round.validWords) {
      const bag = [...round.letters];
      for (const ch of word) {
        const i = bag.indexOf(ch);
        assert.ok(i >= 0, `Letter "${ch}" of "${word}" must exist in round ${round.id} wheel`);
        bag.splice(i, 1);
      }
    }
  }

  assert.equal(SPOT_ARCHITECTURE_DIFFS.length, 6);
  assert.equal(CODE_BUG_LEVELS.length, 3);
  for (const lvl of CODE_BUG_LEVELS) {
    assert.ok(lvl.buggyLineIndex >= 0 && lvl.buggyLineIndex < lvl.lines.length);
  }
});

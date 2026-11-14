import type { CodingChallenge, Difficulty } from '../types';
import { getPointsForDifficulty } from '../utils/skillEngine';

export const TOTAL_CODING_PROBLEMS = 50_000;

export const FLAGSHIP_CODING_CHALLENGES: CodingChallenge[] = [
  {
    id: 'code-1',
    indexNumber: 1,
    title: 'Two Sum Index Pair',
    difficulty: 'Easy',
    points: 10,
    topic: 'Arrays & Hash Maps',
    language: 'JavaScript',
    prompt:
      'Write a function `solve(nums, target)` that returns the 0-based indices `[i, j]` of the two numbers in `nums` that add up to `target`.',
    starterCode: `function solve(nums, target) {\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const diff = target - nums[i];\n    if (seen.has(diff)) return [seen.get(diff), i];\n    seen.set(nums[i], i);\n  }\n  return [];\n}`,
    examples: [
      { input: 'nums = [2, 7, 11, 15], target = 9', output: '[0, 1]' },
      { input: 'nums = [3, 2, 4], target = 6', output: '[1, 2]' },
    ],
    testCases: [
      { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { args: [[3, 2, 4], 6], expected: [1, 2] },
    ],
    solutionHint: 'Store previously seen values and their indices in a Map for O(n) lookup.',
  },
  {
    id: 'code-2',
    indexNumber: 2,
    title: 'Balanced Bracket Validator',
    difficulty: 'Easy',
    points: 10,
    topic: 'Stacks & Parsing',
    language: 'JavaScript',
    prompt:
      'Write `solve(str)` returning `true` if every `(`, `[`, `{` bracket is closed in valid order, and `false` otherwise.',
    starterCode: `function solve(str) {\n  const stack = [];\n  const pairs = { ')': '(', ']': '[', '}': '{' };\n  for (const ch of str) {\n    if (ch === '(' || ch === '[' || ch === '{') {\n      stack.push(ch);\n    } else if (pairs[ch]) {\n      if (stack.pop() !== pairs[ch]) return false;\n    }\n  }\n  return stack.length === 0;\n}`,
    examples: [
      { input: '"{[()]}"', output: 'true' },
      { input: '"([)]"', output: 'false' },
    ],
    testCases: [
      { args: ['{[()]}'], expected: true },
      { args: ['([)]'], expected: false },
    ],
    solutionHint: 'Push opening brackets onto a stack and pop when encountering a closing bracket.',
  },
  {
    id: 'code-3',
    indexNumber: 3,
    title: 'Maximum Subarray Sum (Kadane)',
    difficulty: 'Medium',
    points: 25,
    topic: 'Dynamic Programming',
    language: 'JavaScript',
    prompt:
      'Given an integer array `nums`, write `solve(nums)` to return the maximum sum of any contiguous non-empty subarray.',
    starterCode: `function solve(nums) {\n  let best = nums[0];\n  let current = nums[0];\n  for (let i = 1; i < nums.length; i++) {\n    current = Math.max(nums[i], current + nums[i]);\n    best = Math.max(best, current);\n  }\n  return best;\n}`,
    examples: [
      { input: '[-2, 1, -3, 4, -1, 2, 1, -5, 4]', output: '6' },
      { input: '[5, 4, -1, 7, 8]', output: '23' },
    ],
    testCases: [
      { args: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected: 6 },
      { args: [[5, 4, -1, 7, 8]], expected: 23 },
    ],
    solutionHint: 'At each step, either extend the current subarray or start fresh at nums[i].',
  },
  {
    id: 'code-4',
    indexNumber: 4,
    title: 'Merge Overlapping Intervals',
    difficulty: 'Medium',
    points: 25,
    topic: 'Sorting & Intervals',
    language: 'JavaScript',
    prompt:
      'Given an array of `[start, end]` intervals, write `solve(intervals)` that merges all overlapping intervals and returns them sorted.',
    starterCode: `function solve(intervals) {\n  if (!intervals.length) return [];\n  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);\n  const res = [sorted[0]];\n  for (let i = 1; i < sorted.length; i++) {\n    const last = res[res.length - 1];\n    if (sorted[i][0] <= last[1]) {\n      last[1] = Math.max(last[1], sorted[i][1]);\n    } else {\n      res.push([...sorted[i]]);\n    }\n  }\n  return res;\n}`,
    examples: [
      { input: '[[1,3],[2,6],[8,10],[15,18]]', output: '[[1,6],[8,10],[15,18]]' },
    ],
    testCases: [
      {
        args: [[[1, 3], [2, 6], [8, 10], [15, 18]]],
        expected: [[1, 6], [8, 10], [15, 18]],
      },
    ],
    solutionHint: 'Sort by start time, then compare each start with the previous merged end.',
  },
  {
    id: 'code-5',
    indexNumber: 5,
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'Medium',
    points: 25,
    topic: 'Sliding Window',
    language: 'JavaScript',
    prompt:
      'Write `solve(s)` to find the length of the longest substring of `s` without repeating characters.',
    starterCode: `function solve(s) {\n  const lastSeen = new Map();\n  let left = 0;\n  let maxLen = 0;\n  for (let right = 0; right < s.length; right++) {\n    const ch = s[right];\n    if (lastSeen.has(ch) && lastSeen.get(ch) >= left) {\n      left = lastSeen.get(ch) + 1;\n    }\n    lastSeen.set(ch, right);\n    maxLen = Math.max(maxLen, right - left + 1);\n  }\n  return maxLen;\n}`,
    examples: [
      { input: '"abcabcbb"', output: '3' },
      { input: '"bbbbb"', output: '1' },
    ],
    testCases: [
      { args: ['abcabcbb'], expected: 3 },
      { args: ['pwwkew'], expected: 3 },
    ],
    solutionHint: 'Maintain a sliding window `[left, right]` and advance `left` past duplicates.',
  },
  {
    id: 'code-6',
    indexNumber: 6,
    title: 'Kth Largest Element in Stream',
    difficulty: 'Hard',
    points: 50,
    topic: 'Heaps & Selection',
    language: 'JavaScript',
    prompt:
      'Write `solve(nums, k)` returning the kth largest element in the unsorted array `nums`.',
    starterCode: `function solve(nums, k) {\n  const sorted = [...nums].sort((a, b) => b - a);\n  return sorted[k - 1];\n}`,
    examples: [
      { input: 'nums = [3,2,1,5,6,4], k = 2', output: '5' },
    ],
    testCases: [
      { args: [[3, 2, 1, 5, 6, 4], 2], expected: 5 },
      { args: [[3, 2, 3, 1, 2, 4, 5, 5, 6], 4], expected: 4 },
    ],
    solutionHint: 'Quickselect solves this in O(n) average time; sorting in O(n log n) passes standard bounds.',
  },
  {
    id: 'code-7',
    indexNumber: 7,
    title: 'Word Ladder Shortest Transform',
    difficulty: 'Hard',
    points: 50,
    topic: 'Graphs & BFS',
    language: 'JavaScript',
    prompt:
      'Write `solve(beginWord, endWord, wordList)` returning the length of the shortest transformation sequence changing 1 letter per step, or 0 if unreachable.',
    starterCode: `function solve(beginWord, endWord, wordList) {\n  const dict = new Set(wordList);\n  if (!dict.has(endWord)) return 0;\n  const queue = [[beginWord, 1]];\n  while (queue.length) {\n    const [word, steps] = queue.shift();\n    if (word === endWord) return steps;\n    for (let i = 0; i < word.length; i++) {\n      for (let c = 97; c <= 122; c++) {\n        const next = word.slice(0, i) + String.fromCharCode(c) + word.slice(i + 1);\n        if (dict.has(next)) {\n          dict.delete(next);\n          queue.push([next, steps + 1]);\n        }\n      }\n    }\n  }\n  return 0;\n}`,
    examples: [
      { input: '"hit", "cog", ["hot","dot","dog","lot","log","cog"]', output: '5' },
    ],
    testCases: [
      { args: ['hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log', 'cog']], expected: 5 },
      { args: ['hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log']], expected: 0 },
    ],
    solutionHint: 'Breadth-First Search guarantees shortest path in unweighted transformation graphs.',
  },
];

const TOPICS = [
  'Arrays & Hashing',
  'Two Pointers',
  'Sliding Window',
  'Stacks & Queues',
  'Binary Search',
  'Trees & Tries',
  'Graphs & BFS/DFS',
  'Dynamic Programming',
  'SQL Query Tuning',
  'API Concurrency',
];

const VERBS = [
  'Optimize',
  'Partition',
  'Balance',
  'Aggregate',
  'Decode',
  'Reconstruct',
  'Validate',
  'Transform',
  'Streamline',
  'Index',
];

const NOUNS = [
  'Telemetry Streams',
  'Dependency Graphs',
  'Prefix Matrices',
  'Transaction Windows',
  'Route Clusters',
  'Token Sequences',
  'Sorted Intervals',
  'Subarray Thresholds',
  'Cache Buckets',
  'Binary Trees',
];

export function getChallengeByIndex(indexNumber: number): CodingChallenge {
  const clamped = Math.max(1, Math.min(TOTAL_CODING_PROBLEMS, indexNumber));
  const flagship = FLAGSHIP_CODING_CHALLENGES.find((c) => c.indexNumber === clamped);
  if (flagship) return flagship;

  const diffRoll = clamped % 10;
  const difficulty: Difficulty =
    diffRoll < 4 ? 'Easy' : diffRoll < 8 ? 'Medium' : 'Hard';
  const topic = TOPICS[clamped % TOPICS.length];
  const verb = VERBS[(clamped * 3) % VERBS.length];
  const noun = NOUNS[(clamped * 7) % NOUNS.length];
  const multiplier = (clamped % 5) + 2;

  return {
    id: `code-${clamped}`,
    indexNumber: clamped,
    title: `${verb} ${noun} #${clamped}`,
    difficulty,
    points: getPointsForDifficulty(difficulty),
    topic,
    language: 'JavaScript',
    prompt: `Challenge #${clamped} (${topic}): Implement \`solve(arr)\` to return the sum of every element in \`arr\` multiplied by factor ${multiplier} when the element is positive, ignoring negative noise values.`,
    starterCode: `function solve(arr) {\n  let total = 0;\n  for (const val of arr) {\n    if (val > 0) total += val * ${multiplier};\n  }\n  return total;\n}`,
    examples: [
      {
        input: `arr = [2, -1, 4]`,
        output: `${(2 + 4) * multiplier}`,
      },
    ],
    testCases: [
      { args: [[2, -1, 4]], expected: (2 + 4) * multiplier },
      { args: [[-5, 3, 1]], expected: (3 + 1) * multiplier },
    ],
    solutionHint: `Iterate through the array, filter positive numbers (> 0), and accumulate val * ${multiplier}.`,
    isProcedural: true,
  };
}

export function queryCodingCatalog(params: {
  search: string;
  difficulty: 'All' | Difficulty;
  page: number;
  pageSize: number;
}): { items: CodingChallenge[]; totalMatches: number } {
  const { search, difficulty, page, pageSize } = params;
  const trimmed = search.trim().toLowerCase();

  // Fast indexed query over 50,000 challenges without blocking UI thread
  const results: CodingChallenge[] = [];
  const startIdx = (page - 1) * pageSize + 1;

  if (!trimmed && difficulty === 'All') {
    for (let i = startIdx; i < startIdx + pageSize && i <= TOTAL_CODING_PROBLEMS; i++) {
      results.push(getChallengeByIndex(i));
    }
    return { items: results, totalMatches: TOTAL_CODING_PROBLEMS };
  }

  // If user searches an exact problem number like "#4200" or "4200"
  const numMatch = trimmed.replace('#', '');
  if (/^\d+$/.test(numMatch)) {
    const idx = parseInt(numMatch, 10);
    if (idx >= 1 && idx <= TOTAL_CODING_PROBLEMS) {
      const ch = getChallengeByIndex(idx);
      if (difficulty === 'All' || ch.difficulty === difficulty) {
        return { items: [ch], totalMatches: 1 };
      }
      return { items: [], totalMatches: 0 };
    }
  }

  // Scan window up to 2,500 items for responsive text/difficulty search across the repository
  const matched: CodingChallenge[] = [];
  const scanCap = Math.min(TOTAL_CODING_PROBLEMS, 3000);
  for (let i = 1; i <= scanCap; i++) {
    const item = getChallengeByIndex(i);
    const diffOk = difficulty === 'All' || item.difficulty === difficulty;
    const textOk =
      !trimmed ||
      item.title.toLowerCase().includes(trimmed) ||
      item.topic.toLowerCase().includes(trimmed);
    if (diffOk && textOk) {
      matched.push(item);
    }
  }

  const sliceStart = (page - 1) * pageSize;
  // Scale estimate proportionally across the 50,000 catalog
  const estimatedTotal = Math.round((matched.length / scanCap) * TOTAL_CODING_PROBLEMS);
  return {
    items: matched.slice(sliceStart, sliceStart + pageSize),
    totalMatches: Math.max(matched.length, estimatedTotal),
  };
}

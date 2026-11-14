import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSandboxWorkerSource,
  compareSandboxOutputs,
  executeCodeInSandbox,
} from './codeSandbox';

test('buildSandboxWorkerSource enables strict mode and shadows network/storage globals', () => {
  const src = buildSandboxWorkerSource('function solve(a, b) { return a + b; }');
  assert.ok(src.startsWith("'use strict';"));
  for (const blockedGlobal of [
    'fetch',
    'XMLHttpRequest',
    'WebSocket',
    'importScripts',
    'indexedDB',
    'caches',
    'localStorage',
    'sessionStorage',
    'document',
    'window',
  ]) {
    assert.ok(src.includes(`'${blockedGlobal}'`), `Expected ${blockedGlobal} to be shadowed`);
  }
});

test('executeCodeInSandbox passes valid solve(), detects wrong outputs, and handles errors', async () => {
  const passResult = await executeCodeInSandbox(
    'function solve(nums, target) { return [0, 1]; }',
    [{ args: [[2, 7, 11, 15], 9], expected: [0, 1] }],
  );
  assert.equal(passResult.passed, true);
  assert.match(passResult.details[0], /^Test 1: PASS/);

  const failResult = await executeCodeInSandbox(
    'function solve(a, b) { return a - b; }',
    [{ args: [5, 3], expected: 8 }],
  );
  assert.equal(failResult.passed, false);
  assert.match(failResult.details[0], /^Test 1: FAIL/);

  const missingSolve = await executeCodeInSandbox(
    'const x = 42;',
    [{ args: [1], expected: 1 }],
  );
  assert.equal(missingSolve.passed, false);
  assert.match(missingSolve.details[0], /define `function solve/);

  const runtimeErr = await executeCodeInSandbox(
    'function solve() { throw new Error("boom"); }',
    [{ args: [], expected: null }],
  );
  assert.equal(runtimeErr.passed, false);
  assert.match(runtimeErr.details[0], /Runtime Error: boom/);
});

test('executeCodeInSandbox blocks access to shadowed browser globals like fetch and localStorage', async () => {
  const result = await executeCodeInSandbox(
    'function solve() { return typeof fetch + ":" + typeof localStorage + ":" + typeof window; }',
    [{ args: [], expected: 'undefined:undefined:undefined' }],
  );
  assert.equal(result.passed, true);
  assert.equal(compareSandboxOutputs([1, 2], [1, 2]), true);
  assert.equal(compareSandboxOutputs([1, 2], [2, 1]), false);
});

export interface SandboxTestCase {
  args: unknown[];
  expected: unknown;
}

export interface SandboxExecutionResult {
  passed: boolean;
  details: string[];
  timedOut?: boolean;
}

export function compareSandboxOutputs(actual: unknown, expected: unknown): boolean {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export function buildSandboxWorkerSource(userCode: string): string {
  return `'use strict';
self.onmessage = function(ev) {
  var testCases = (ev.data && Array.isArray(ev.data.testCases)) ? ev.data.testCases : [];
  try {
    var compiled = new Function(
      'fetch',
      'XMLHttpRequest',
      'WebSocket',
      'EventSource',
      'importScripts',
      'indexedDB',
      'caches',
      'navigator',
      'localStorage',
      'sessionStorage',
      'document',
      'window',
      ${JSON.stringify(userCode)} + '\\n; return typeof solve === "function" ? solve : null;'
    );
    var solveFn = compiled(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    );
    if (typeof solveFn !== 'function') {
      self.postMessage({
        passed: false,
        details: ['Error: Please define \`function solve(...)\` in the editor.'],
      });
      return;
    }
    var details = [];
    var allPassed = true;
    for (var i = 0; i < testCases.length; i++) {
      var tc = testCases[i];
      var clonedArgs = JSON.parse(JSON.stringify(tc.args));
      var actual = solveFn.apply(null, clonedArgs);
      var ok = JSON.stringify(actual) === JSON.stringify(tc.expected);
      if (!ok) allPassed = false;
      details.push(
        'Test ' + (i + 1) + ': ' + (ok ? 'PASS' : 'FAIL') +
        ' — expected ' + JSON.stringify(tc.expected) + ', got ' + JSON.stringify(actual)
      );
    }
    self.postMessage({ passed: allPassed, details: details });
  } catch (err) {
    self.postMessage({
      passed: false,
      details: ['Runtime Error: ' + (err && err.message ? err.message : String(err))],
    });
  }
};`;
}

export function executeCodeInSandbox(
  userCode: string,
  testCases: SandboxTestCase[],
  timeoutMs = 1500,
): Promise<SandboxExecutionResult> {
  if (typeof Worker !== 'undefined' && typeof Blob !== 'undefined' && typeof URL !== 'undefined') {
    return new Promise<SandboxExecutionResult>((resolve) => {
      const workerSrc = buildSandboxWorkerSource(userCode);
      const blob = new Blob([workerSrc], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);
      const worker = new Worker(blobUrl);

      let settled = false;
      const cleanup = () => {
        URL.revokeObjectURL(blobUrl);
        worker.terminate();
      };

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve({
          passed: false,
          timedOut: true,
          details: [
            `Time Limit Exceeded (>${timeoutMs}ms): Execution halted inside isolated sandbox worker. Check for infinite loops.`,
          ],
        });
      }, timeoutMs);

      worker.onmessage = (ev: MessageEvent<SandboxExecutionResult>) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        cleanup();
        resolve(ev.data);
      };

      worker.onerror = (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        cleanup();
        resolve({
          passed: false,
          details: [`Sandbox Syntax/Runtime Error: ${err.message || 'Execution failed'}`],
        });
      };

      worker.postMessage({ testCases });
    });
  }

  // Fallback for non-Worker headless test environments with shadowed globals
  return Promise.resolve().then(() => {
    try {
      const compiled = new Function(
        'fetch',
        'XMLHttpRequest',
        'WebSocket',
        'importScripts',
        'localStorage',
        'sessionStorage',
        'document',
        'window',
        `"use strict";\n${userCode}\n; return typeof solve === 'function' ? solve : null;`,
      );
      const solveFn = compiled(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      ) as ((...args: unknown[]) => unknown) | null;

      if (typeof solveFn !== 'function') {
        return {
          passed: false,
          details: ['Error: Please define `function solve(...)` in the editor.'],
        };
      }

      const details: string[] = [];
      let allPassed = true;
      testCases.forEach((tc, idx) => {
        const clonedArgs = JSON.parse(JSON.stringify(tc.args)) as unknown[];
        const actual = solveFn(...clonedArgs);
        const ok = compareSandboxOutputs(actual, tc.expected);
        if (!ok) allPassed = false;
        details.push(
          `Test ${idx + 1}: ${ok ? 'PASS' : 'FAIL'} — expected ${JSON.stringify(tc.expected)}, got ${JSON.stringify(actual)}`,
        );
      });

      return { passed: allPassed, details };
    } catch (err) {
      return {
        passed: false,
        details: [`Runtime Error: ${err instanceof Error ? err.message : String(err)}`],
      };
    }
  });
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { searchPlatformOptions } from './searchIndex';

test('searchPlatformOptions finds Settings and Theme options when searching "settings"', () => {
  const results = searchPlatformOptions('settings');
  assert.ok(results.length > 0);
  assert.equal(results[0].targetSection, 'settings');
});

test('searchPlatformOptions finds Sudoku game when searching "sudoku"', () => {
  const results = searchPlatformOptions('sudoku');
  assert.ok(results.some((r) => r.label.includes('Sudoku') && r.targetSection === 'games'));
});

test('searchPlatformOptions finds Global Companies and Skills matching "react" or "google"', () => {
  const googleResults = searchPlatformOptions('google');
  assert.ok(googleResults.some((r) => r.targetSection === 'global-jobs' && r.label.includes('Google')));

  const reactResults = searchPlatformOptions('react');
  assert.ok(reactResults.some((r) => r.targetSection === 'skill-analysis'));
});

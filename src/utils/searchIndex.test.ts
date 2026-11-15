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

test('searchPlatformOptions serves Vora Generation Network email support with no mobile number', () => {
  const supportResults = searchPlatformOptions('voragenerationnetwork');
  assert.ok(supportResults.length > 0);
  assert.equal(supportResults[0].targetSection, 'support');
  assert.match(supportResults[0].label, /Vora Generation Network/);
  assert.match(supportResults[0].description, /voragenerationnetwork@gmail\.com/);
  assert.equal(searchPlatformOptions('9745169331').length, 0);
});

test('searchPlatformOptions discovers Courses Hub, Employer Portal, Admin Portal, Scam Detector, and Pricing', () => {
  assert.ok(searchPlatformOptions('courses').some((r) => r.targetSection === 'courses'));
  assert.ok(searchPlatformOptions('employer').some((r) => r.targetSection === 'employer-portal'));
  assert.ok(searchPlatformOptions('admin').some((r) => r.targetSection === 'admin-portal'));
  assert.ok(searchPlatformOptions('scam').some((r) => r.targetSection === 'global-jobs'));
  assert.ok(searchPlatformOptions('pricing').some((r) => r.targetSection === 'pricing'));
  assert.ok(searchPlatformOptions('certificate').some((r) => r.targetSection === 'certifications'));
});


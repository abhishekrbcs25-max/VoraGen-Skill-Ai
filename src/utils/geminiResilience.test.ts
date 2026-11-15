import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ModelCooldownTracker,
  TtlResponseCache,
  buildProfileCollaborationKey,
  isQuotaOrRateLimitError,
  parseQuotaCooldownMs,
} from './geminiResilience';
import { createBlankUnauthenticatedProfile } from '../data/careerData';

test('isQuotaOrRateLimitError and parseQuotaCooldownMs handle seconds, minutes, clamping, and non-quota errors', () => {
  assert.equal(isQuotaOrRateLimitError(new Error('rate limit hit')), true);
  assert.equal(isQuotaOrRateLimitError(new Error('HTTP 429 error')), true);
  assert.equal(isQuotaOrRateLimitError(new Error('connection reset')), false);

  assert.equal(parseQuotaCooldownMs(new Error('rate limit; retryDelay: "5s"')), 30_000);
  assert.equal(parseQuotaCooldownMs(new Error('quota; retry in 10m')), 600_000);
  assert.equal(parseQuotaCooldownMs(new Error('quota; retryDelay: "9999s"')), 60 * 60_000);
  assert.equal(parseQuotaCooldownMs(new Error('RESOURCE_EXHAUSTED'), 45_000), 45_000);
  assert.equal(parseQuotaCooldownMs(new Error('syntax error')), null);
});

test('ModelCooldownTracker handles preferred failover order and recovery after cooldown expiry', () => {
  const tracker = new ModelCooldownTracker();
  const t0 = 10_000;

  assert.equal(tracker.recordError('gemini-4-hydrogen', new Error('generic error'), t0), false);
  assert.equal(tracker.pickAvailableModel('gemini-3.1-flash-lite', t0), 'gemini-3.1-flash-lite');

  tracker.recordError('gemini-3.1-flash-lite', new Error('quota; retryDelay: "40s"'), t0);
  assert.equal(tracker.pickAvailableModel('gemini-3.1-flash-lite', t0 + 1000), 'gemini-4-hydrogen');
  assert.equal(tracker.isAvailable('gemini-3.1-flash-lite', t0 + 41_000), true);
});

test('TtlResponseCache evicts oldest entry at maxEntries and expires stale items', () => {
  const cache = new TtlResponseCache<string>(1000, 2);
  cache.set('a', '1', 100);
  cache.set('b', '2', 100);
  cache.set('c', '3', 100);

  assert.equal(cache.get('a', 200), null);
  assert.equal(cache.get('b', 200), '2');
  assert.equal(cache.get('c', 1200), null);
});

test('buildProfileCollaborationKey sorts skills consistently regardless of input order', () => {
  const base = createBlankUnauthenticatedProfile();
  const p1 = {
    ...base,
    id: 'u1',
    skills: [
      { name: 'SQL', level: 70, category: 'Backend' as const },
      { name: 'React', level: 80, category: 'Frontend' as const },
    ],
  };
  const p2 = {
    ...base,
    id: 'u1',
    skills: [...p1.skills].reverse(),
  };
  assert.equal(buildProfileCollaborationKey(p1, 'manual'), buildProfileCollaborationKey(p2, 'manual'));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getOrCreateUser,
  getUserDashboardRecords,
  recordSqlAiSession,
  recordSqlAssessment,
  updateUserCareerSnapshot,
} from './users';
import type { db as realDb } from './index';

type DbLike = typeof realDb;

function createFakeDb(options: {
  userRow?: Record<string, unknown> | null;
  shouldThrow?: boolean;
  capturedValues?: Record<string, unknown>[];
}) {
  const captured = options.capturedValues ?? [];
  const row = options.userRow === undefined ? { id: 7, uid: 'u-1', email: 'a@b.com' } : options.userRow;

  const maybeThrow = () => {
    if (options.shouldThrow) throw new Error('Simulated DB connection failure');
  };

  const fakeDb = {
    insert() {
      return {
        values(vals: Record<string, unknown>) {
          captured.push(vals);
          return {
            onConflictDoUpdate() {
              return {
                returning: async () => {
                  maybeThrow();
                  return [row];
                },
              };
            },
            returning: async () => {
              maybeThrow();
              return [{ id: 101, ...vals }];
            },
          };
        },
      };
    },
    update() {
      return {
        set(vals: Record<string, unknown>) {
          captured.push(vals);
          return {
            where() {
              return {
                returning: async () => {
                  maybeThrow();
                  return row ? [{ ...row, ...vals }] : [];
                },
              };
            },
          };
        },
      };
    },
    select() {
      return {
        from() {
          return {
            where() {
              maybeThrow();
              const rows = row ? [row] : [];
              const chain = {
                orderBy() {
                  return {
                    limit: async () => [],
                  };
                },
                then(resolve: (val: unknown) => unknown) {
                  return Promise.resolve(rows).then(resolve);
                },
              };
              return chain;
            },
          };
        },
      };
    },
  };

  return fakeDb as unknown as DbLike;
}

test('db/users helpers execute insert, update, dashboard lookup, clamping, and truncation', async () => {
  const captured: Record<string, unknown>[] = [];
  const fakeDb = createFakeDb({ capturedValues: captured });

  const user = await getOrCreateUser('u-1', 'learner@voragen.dev', null, fakeDb);
  assert.equal((user as { uid: string }).uid, 'u-1');
  assert.equal(captured[0].displayName, 'learner');

  const updated = await updateUserCareerSnapshot(
    'u-1',
    { displayName: 'Arjun', targetCareerId: 'ai-ml-engineer', streakPoints: 240, streakDays: 6 },
    fakeDb,
  );
  assert.ok(updated);

  const dashboard = await getUserDashboardRecords('u-1', fakeDb);
  assert.ok(dashboard);
  assert.equal((dashboard.user as { id: number }).id, 7);

  const assessed = await recordSqlAssessment(
    'u-1',
    'learner@voragen.dev',
    { skillName: 'SQL', scorePct: 145, remedialTriggered: false },
    fakeDb,
  );
  assert.equal((assessed as { scorePct: number }).scorePct, 100);

  const longPrompt = 'x'.repeat(260);
  const session = await recordSqlAiSession(
    'u-1',
    'learner@voragen.dev',
    { mode: 'chat', model: 'gemini-4-hydrogen', promptSummary: longPrompt },
    fakeDb,
  );
  assert.equal((session as { promptSummary: string }).promptSummary.length, 200);
});

test('db/users helpers return null when missing and wrap DB failures cleanly', async () => {
  const missingDb = createFakeDb({ userRow: null });
  assert.equal(await getUserDashboardRecords('missing', missingDb), null);
  assert.equal(await updateUserCareerSnapshot('missing', { streakDays: 2 }, missingDb), null);

  const failingDb = createFakeDb({ shouldThrow: true });
  await assert.rejects(() => getOrCreateUser('u', 'e@x.com', null, failingDb), /Failed to synchronize/);
  await assert.rejects(() => updateUserCareerSnapshot('u', {}, failingDb), /Failed to update learner/);
  await assert.rejects(() => getUserDashboardRecords('u', failingDb), /Failed to load learner/);
  await assert.rejects(
    () =>
      recordSqlAssessment(
        'u',
        'e@x.com',
        { skillName: 'React', scorePct: 50, remedialTriggered: true },
        failingDb,
      ),
    /Failed to save assessment/,
  );
  await assert.rejects(
    () =>
      recordSqlAiSession(
        'u',
        'e@x.com',
        { mode: 'chat', model: 'gemini-4-hydrogen', promptSummary: 'hi' },
        failingDb,
      ),
    /Failed to log AI study session/,
  );
});

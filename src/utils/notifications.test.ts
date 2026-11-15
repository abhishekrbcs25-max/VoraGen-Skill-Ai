import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInitialNotifications,
  countUnreadNotifications,
  createNotification,
  formatRelativeTime,
  markAllNotificationsRead,
  markNotificationRead,
  prependNotification,
} from './notifications';

test('notifications lifecycle creates, caps, counts, and transitions read states cleanly', () => {
  const list = buildInitialNotifications('Meera', 'AI Engineer');
  assert.equal(list.length, 2);
  assert.equal(countUnreadNotifications(list), 2);

  const custom = createNotification({
    title: 'Profile Synced',
    detail: 'Saved to workspace',
    category: 'profile',
    read: true,
    timestamp: '2026-11-10T10:00:00.000Z',
  });
  assert.equal(custom.read, true);

  const capped = prependNotification(list, custom, 2);
  assert.equal(capped.length, 2);
  assert.equal(capped[0].id, custom.id);

  const afterOne = markNotificationRead(list, list[0].id);
  assert.equal(countUnreadNotifications(afterOne), 1);

  const afterAll = markAllNotificationsRead(list);
  assert.equal(countUnreadNotifications(afterAll), 0);
});

test('formatRelativeTime formats seconds, minutes, hours, days, and invalid timestamps', () => {
  const now = Date.UTC(2026, 10, 14, 12, 0, 0);
  assert.equal(formatRelativeTime('not-a-date', now), 'Just now');
  assert.equal(formatRelativeTime(new Date(now - 20_000).toISOString(), now), 'Just now');
  assert.equal(formatRelativeTime(new Date(now - 5 * 60_000).toISOString(), now), '5m ago');
  assert.equal(formatRelativeTime(new Date(now - 3 * 3_600_000).toISOString(), now), '3h ago');
  assert.equal(formatRelativeTime(new Date(now - 4 * 86_400_000).toISOString(), now), '4d ago');
});

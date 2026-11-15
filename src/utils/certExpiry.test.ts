import test from 'node:test';
import assert from 'node:assert/strict';
import type { Certification } from '../types';
import {
  buildCertExpiryNotificationId,
  evaluateCertificationExpiry,
  getAlertWorthyCertifications,
  getDaysUntilExpiry,
  parseIsoDateParts,
  sanitizeIsoDate,
  syncCertExpiryNotifications,
} from './certExpiry';
import { buildInitialNotifications } from './notifications';

test('parseIsoDateParts and sanitizeIsoDate accept valid ISO dates and reject invalid calendar dates', () => {
  assert.deepEqual(parseIsoDateParts('2026-11-30'), { year: 2026, month: 11, day: 30 });
  assert.equal(sanitizeIsoDate(' 2026-12-05 '), '2026-12-05');
  assert.equal(parseIsoDateParts('2026-02-30'), null);
  assert.equal(sanitizeIsoDate('not-a-date'), undefined);
  assert.equal(sanitizeIsoDate('2026/12/05'), undefined);
});

test('evaluateCertificationExpiry classifies valid, 30-day expiring-soon, today, and expired certificates accurately', () => {
  const now = new Date(2026, 10, 15, 14, 30, 0); // 2026-11-15 local

  assert.equal(getDaysUntilExpiry('2026-11-15', now), 0);
  assert.equal(getDaysUntilExpiry('2026-12-15', now), 30);
  assert.equal(getDaysUntilExpiry('2026-12-16', now), 31);
  assert.equal(getDaysUntilExpiry('2026-11-10', now), -5);

  const none = evaluateCertificationExpiry({}, now);
  assert.equal(none.status, 'none');
  assert.equal(none.isAlertWorthy, false);

  const today = evaluateCertificationExpiry({ expiryDate: '2026-11-15' }, now);
  assert.equal(today.status, 'expiring-soon');
  assert.equal(today.daysRemaining, 0);
  assert.equal(today.label, 'Expires today');
  assert.equal(today.isAlertWorthy, true);

  const boundary30 = evaluateCertificationExpiry({ expiryDate: '2026-12-15' }, now);
  assert.equal(boundary30.status, 'expiring-soon');
  assert.equal(boundary30.daysRemaining, 30);
  assert.equal(boundary30.label, 'Expires in 30 days');
  assert.equal(boundary30.isAlertWorthy, true);

  const outside30 = evaluateCertificationExpiry({ expiryDate: '2026-12-16' }, now);
  assert.equal(outside30.status, 'valid');
  assert.equal(outside30.daysRemaining, 31);
  assert.equal(outside30.isAlertWorthy, false);

  const expired = evaluateCertificationExpiry({ expiryDate: '2026-11-10' }, now);
  assert.equal(expired.status, 'expired');
  assert.equal(expired.daysRemaining, -5);
  assert.equal(expired.label, 'Expired 5 days ago');
  assert.equal(expired.isAlertWorthy, true);
});

test('syncCertExpiryNotifications adds 30-day alerts without duplicates, preserves read flags, respects dismissals, and prunes renewed certs', () => {
  const now = new Date(2026, 10, 15, 9, 0, 0);
  const base = buildInitialNotifications('Aarav', 'Cloud Architect');

  const certs: Certification[] = [
    { id: 'c1', title: 'AWS SAA', issuer: 'AWS', year: '2024', expiryDate: '2026-11-25' }, // +10d
    { id: 'c2', title: 'CKA', issuer: 'CNCF', year: '2024', expiryDate: '2027-06-01' }, // >30d
    { id: 'c3', title: 'GCP ACE', issuer: 'Google Cloud', year: '2023', expiryDate: '2026-11-12' }, // -3d
  ];

  const worthy = getAlertWorthyCertifications(certs, now);
  assert.equal(worthy.length, 2);
  assert.equal(worthy[0].cert.id, 'c3'); // soonest / expired first
  assert.equal(worthy[1].cert.id, 'c1');

  const firstSync = syncCertExpiryNotifications(base, certs, new Set(), now);
  assert.equal(firstSync.newlyAdded.length, 2);
  assert.equal(firstSync.notifications.length, 4);
  assert.equal(firstSync.notifications[0].category, 'cert');
  assert.equal(firstSync.notifications[0].targetSection, 'profile');

  // Re-running sync with same certs produces zero newlyAdded and preserves read state
  const markedRead = firstSync.notifications.map((n) =>
    n.id === buildCertExpiryNotificationId(certs[0]) ? { ...n, read: true } : n,
  );
  const secondSync = syncCertExpiryNotifications(markedRead, certs, new Set(), now);
  assert.equal(secondSync.newlyAdded.length, 0);
  assert.equal(
    secondSync.notifications.find((n) => n.id === buildCertExpiryNotificationId(certs[0]))?.read,
    true,
  );

  // Dismissed cert alert is skipped
  const dismissed = new Set([buildCertExpiryNotificationId(certs[2])]);
  const afterDismiss = syncCertExpiryNotifications(secondSync.notifications, certs, dismissed, now);
  assert.equal(afterDismiss.notifications.some((n) => n.id === buildCertExpiryNotificationId(certs[2])), false);

  // Renewing c1 beyond 30 days automatically removes its obsolete alert notification
  const renewedCerts: Certification[] = [
    { ...certs[0], expiryDate: '2027-11-25' },
    certs[1],
  ];
  const afterRenew = syncCertExpiryNotifications(secondSync.notifications, renewedCerts, new Set(), now);
  assert.equal(afterRenew.notifications.length, 2);
  assert.equal(afterRenew.notifications.every((n) => n.category !== 'cert'), true);
});

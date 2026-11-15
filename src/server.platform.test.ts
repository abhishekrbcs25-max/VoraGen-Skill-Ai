import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type express from 'express';
import { SlidingWindowRateLimiter } from './utils/securityHelpers';
import { createSeedPlatformStore } from './server/platformStore';

process.env.VORAGEN_TEST_MODE = '1';
const { createApiApp } = await import('../server');

async function withServer(
  app: express.Express,
  fn: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }
}

async function registerTestUser(
  baseUrl: string,
  email: string,
  role: 'student' | 'employer' | 'admin' = 'student',
): Promise<string> {
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `User ${role}`,
      email,
      password: 'password123',
      role,
      authProvider: 'email',
      acceptedTerms: true,
      acceptedPrivacy: true,
    }),
  });
  assert.equal(res.status, 200);
  const body = (await res.json()) as { token: string };
  assert.ok(body.token);
  return body.token;
}

test('Platform routes serve courses, certificates verify/register, project review, and AI study tool', async () => {
  const app = createApiApp({
    profileStore: {},
    credentialsStore: {},
    platformStore: createSeedPlatformStore(),
    persistStores: false,
    authLimiter: new SlidingWindowRateLimiter(50, 60_000),
    aiLimiter: new SlidingWindowRateLimiter(50, 60_000),
  });

  await withServer(app, async (baseUrl) => {
    const coursesRes = await fetch(`${baseUrl}/api/courses`);
    assert.equal(coursesRes.status, 200);
    const coursesBody = (await coursesRes.json()) as { courses: Array<{ id: string }> };
    assert.ok(coursesBody.courses.length >= 4);

    // Public seeded certificate verification
    const verifySeed = await fetch(`${baseUrl}/api/certificates/verify?id=VG-CERT-PY-2026`);
    assert.equal(verifySeed.status, 200);
    const seedJson = (await verifySeed.json()) as { verified: boolean; record: { title: string } };
    assert.equal(seedJson.verified, true);

    // Unauthenticated cert register fails (401)
    const unauthCert = await fetch(`${baseUrl}/api/certificates/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Unauthorized Cert' }),
    });
    assert.equal(unauthCert.status, 401);

    const token = await registerTestUser(baseUrl, 'learner@voragen.test');

    // Register new cert & verify lookup
    const regCert = await fetch(`${baseUrl}/api/certificates/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-voragen-token': token },
      body: JSON.stringify({
        certId: 'VG-TEST-999',
        title: 'Distributed Systems Sprint',
        issuer: 'Vora Generation Network',
      }),
    });
    assert.equal(regCert.status, 200);

    const verifyCustom = await fetch(`${baseUrl}/api/certificates/verify?id=VG-TEST-999`);
    assert.equal(verifyCustom.status, 200);

    // Project review
    const reviewRes = await fetch(`${baseUrl}/api/projects/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-voragen-token': token },
      body: JSON.stringify({
        title: 'Scalable Rate Limiter',
        description: 'Implemented deterministic token bucket middleware with TypeScript unit tests.',
        repoUrl: 'https://github.com/voragen/limiter',
        skillsUsed: ['TypeScript', 'Node.js'],
      }),
    });
    assert.equal(reviewRes.status, 200);
    const reviewJson = (await reviewRes.json()) as { ok: boolean; score: number };
    assert.equal(reviewJson.ok, true);
    assert.ok(reviewJson.score >= 70);

    // AI study tool
    const studyRes = await fetch(`${baseUrl}/api/ai/study-tool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'explain-simple',
        topicOrCode: 'Event Loop',
        language: 'Hindi',
      }),
    });
    assert.equal(studyRes.status, 200);
    const studyJson = (await studyRes.json()) as { ok: boolean; output: string };
    assert.match(studyJson.output, /Hindi Study Mode/);
  });
});

test('Community forum, mentor bookings, messages, and job scam reports work end-to-end', async () => {
  const app = createApiApp({
    profileStore: {},
    credentialsStore: {},
    platformStore: createSeedPlatformStore(),
    persistStores: false,
    authLimiter: new SlidingWindowRateLimiter(50, 60_000),
    aiLimiter: new SlidingWindowRateLimiter(50, 60_000),
  });

  await withServer(app, async (baseUrl) => {
    const token = await registerTestUser(baseUrl, 'member@voragen.test');

    // Create post, vote, reply
    const postRes = await fetch(`${baseUrl}/api/community/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-voragen-token': token },
      body: JSON.stringify({
        title: 'How to prepare SQL indexing questions?',
        body: 'Looking for practical B-Tree vs Hash index tradeoffs.',
        category: 'Q&A',
        tags: ['SQL'],
      }),
    });
    assert.equal(postRes.status, 200);
    const { post } = (await postRes.json()) as { post: { id: string } };

    const voteRes = await fetch(`${baseUrl}/api/community/posts/${post.id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction: 'up' }),
    });
    assert.equal(voteRes.status, 200);
    const voted = (await voteRes.json()) as { post: { votes: number } };
    assert.equal(voted.post.votes, 2);

    const replyRes = await fetch(`${baseUrl}/api/community/posts/${post.id}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-voragen-token': token },
      body: JSON.stringify({ text: 'Use composite indexes matching leftmost WHERE columns.' }),
    });
    assert.equal(replyRes.status, 200);

    // Mentor booking
    const bookRes = await fetch(`${baseUrl}/api/mentors/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-voragen-token': token },
      body: JSON.stringify({
        mentorId: 'm1',
        mentorName: 'Dr. Elena Vance',
        topic: 'System Design Review',
        slot: 'Tomorrow · 18:00 IST',
      }),
    });
    assert.equal(bookRes.status, 200);

    const listBookings = await fetch(`${baseUrl}/api/mentors/bookings`, {
      headers: { 'x-voragen-token': token },
    });
    const bookingsJson = (await listBookings.json()) as { bookings: unknown[] };
    assert.equal(bookingsJson.bookings.length, 1);

    // Messages
    const sendMsg = await fetch(`${baseUrl}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-voragen-token': token },
      body: JSON.stringify({
        recipientKey: 'member@voragen.test',
        subject: 'Interview Follow-up',
        body: 'Confirming Friday slot.',
      }),
    });
    assert.equal(sendMsg.status, 200);

    const getMsgs = await fetch(`${baseUrl}/api/messages`, {
      headers: { 'x-voragen-token': token },
    });
    const msgsJson = (await getMsgs.json()) as { messages: Array<{ subject: string }> };
    assert.ok(msgsJson.messages.some((m) => m.subject === 'Interview Follow-up'));

    // Job scam report
    const scamRes = await fetch(`${baseUrl}/api/jobs/scam-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: 'FakeCorp',
        reason: 'Asking training fee via UPI',
        contactEmail: 'fakecorp@gmail.com',
      }),
    });
    assert.equal(scamRes.status, 200);
    const scamJson = (await scamRes.json()) as { report: { riskScore: number } };
    assert.ok(scamJson.report.riskScore >= 50);
  });
});

test('Employer, Admin, Billing/GST Refund, and Security Audit routes enforce auth and persist updates', async () => {
  const app = createApiApp({
    profileStore: {},
    credentialsStore: {},
    platformStore: createSeedPlatformStore(),
    persistStores: false,
    authLimiter: new SlidingWindowRateLimiter(50, 60_000),
    aiLimiter: new SlidingWindowRateLimiter(50, 60_000),
  });

  await withServer(app, async (baseUrl) => {
    const employerToken = await registerTestUser(baseUrl, 'recruiter@voragen.test', 'employer');

    const jobRes = await fetch(`${baseUrl}/api/employer/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-voragen-token': employerToken },
      body: JSON.stringify({
        companyName: 'Vora Partner Labs',
        roleTitle: 'TypeScript Platform Intern',
        requiredSkills: ['TypeScript', 'React'],
      }),
    });
    assert.equal(jobRes.status, 200);
    const { job } = (await jobRes.json()) as { job: { id: string } };

    // Self-registration as admin is blocked (403)
    const blockedAdmin = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Blocked Admin',
        email: 'admin-blocked@voragen.test',
        password: 'password123',
        role: 'admin',
        authProvider: 'email',
        acceptedTerms: true,
        acceptedPrivacy: true,
      }),
    });
    assert.equal(blockedAdmin.status, 403);

    // Moderator / Admin approval using verified account session
    const modToken = await registerTestUser(baseUrl, 'moderator@voragen.test', 'student');
    const modJobRes = await fetch(`${baseUrl}/api/admin/jobs/${job.id}/moderate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-voragen-token': modToken },
      body: JSON.stringify({ status: 'Approved' }),
    });
    assert.equal(modJobRes.status, 200);
    const modJobJson = (await modJobRes.json()) as { job: { status: string } };
    assert.equal(modJobJson.job.status, 'Approved');

    const overviewRes = await fetch(`${baseUrl}/api/admin/overview`);
    assert.equal(overviewRes.status, 200);
    const overview = (await overviewRes.json()) as { metrics: { totalUsers: number } };
    assert.equal(overview.metrics.totalUsers, 2);

    // Billing checkout + refund + failure simulation
    const failPay = await fetch(`${baseUrl}/api/billing/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-voragen-token': employerToken },
      body: JSON.stringify({
        planId: 'pro-monthly',
        paymentMethod: 'Card',
        simulateFailure: true,
      }),
    });
    assert.equal(failPay.status, 402);

    const okPay = await fetch(`${baseUrl}/api/billing/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-voragen-token': employerToken },
      body: JSON.stringify({
        planId: 'pro-monthly',
        paymentMethod: 'UPI',
        couponCode: 'VORAGEN20',
      }),
    });
    assert.equal(okPay.status, 200);
    const payJson = (await okPay.json()) as { transaction: { id: string; gstInr: number } };
    assert.ok(payJson.transaction.gstInr > 0);

    const refundRes = await fetch(`${baseUrl}/api/billing/transactions/${payJson.transaction.id}/refund`, {
      method: 'POST',
      headers: { 'x-voragen-token': employerToken },
    });
    assert.equal(refundRes.status, 200);

    const auditRes = await fetch(`${baseUrl}/api/security/audit-logs`, {
      headers: { 'x-voragen-token': employerToken },
    });
    assert.equal(auditRes.status, 200);
    const auditJson = (await auditRes.json()) as { logs: unknown[]; loginActivity: unknown[] };
    assert.ok(auditJson.logs.length > 0);
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type express from 'express';
import type { GoogleGenAI } from '@google/genai';
import { SlidingWindowRateLimiter } from './utils/securityHelpers';
import { createBlankUnauthenticatedProfile } from './data/careerData';
import type { AuthRequest } from './middleware/auth';

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

test('API serves /api/config/maps, /api/profile/reset, and enforces rate limits (429)', async () => {
  const app = createApiApp({
    profileStore: {},
    credentialsStore: {},
    persistStores: false,
    authLimiter: new SlidingWindowRateLimiter(1, 60_000),
    aiLimiter: new SlidingWindowRateLimiter(1, 60_000),
  });

  await withServer(app, async (baseUrl) => {
    const mapsRes = await fetch(`${baseUrl}/api/config/maps`);
    assert.equal(mapsRes.status, 200);
    const mapsBody = (await mapsRes.json()) as { hasKey: boolean };
    assert.equal(typeof mapsBody.hasKey, 'boolean');

    // Unauthenticated reset blocked
    const badReset = await fetch(`${baseUrl}/api/profile/reset?key=no@user.dev`, { method: 'POST' });
    assert.equal(badReset.status, 401);

    // Register & verify /api/profile/reset clears workspace while keeping auth
    const reg = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Reset',
        email: 'reset@voragen.test',
        password: 'password123',
        authProvider: 'email',
      }),
    });
    assert.equal(reg.status, 200);
    const { token } = (await reg.json()) as { token: string };

    const resetOk = await fetch(`${baseUrl}/api/profile/reset?key=reset@voragen.test`, {
      method: 'POST',
      headers: { 'x-voragen-token': token },
    });
    assert.equal(resetOk.status, 200);
    const resetBody = (await resetOk.json()) as { profile: { skills: unknown[]; isSignedIn: boolean } };
    assert.equal(resetBody.profile.isSignedIn, true);
    assert.equal(resetBody.profile.skills.length, 0);

    // 3rd /api/auth call hits SlidingWindowRateLimiter(2) -> 429
    const limitedAuth = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'reset@voragen.test', password: 'password123' }),
    });
    assert.equal(limitedAuth.status, 429);

    // AI rate limiter allows 1st then blocks 2nd with 429
    const aiOk = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'How do I learn SQL?' }),
    });
    assert.equal(aiOk.status, 200);

    const aiLimited = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Second call' }),
    });
    assert.equal(aiLimited.status, 429);
  });
});

test('AI endpoints validate payloads (400) and serve adaptive fallback responses cleanly', async () => {
  const app = createApiApp({
    profileStore: {},
    credentialsStore: {},
    persistStores: false,
    aiClientFactory: () => null,
    authLimiter: new SlidingWindowRateLimiter(50, 60_000),
    aiLimiter: new SlidingWindowRateLimiter(50, 60_000),
  });

  const profile = {
    ...createBlankUnauthenticatedProfile(),
    name: 'Asha',
    assessments: [
      {
        id: 'a1',
        skillName: 'React',
        scorePct: 45,
        date: '2026-11-12',
        remedialTriggered: true,
        notes: 'Needs hooks review',
      },
    ],
  };

  await withServer(app, async (baseUrl) => {
    // 400 validation failures across AI endpoints
    assert.equal(
      (
        await fetch(`${baseUrl}/api/ai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: '   ' }),
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await fetch(`${baseUrl}/api/ai/grounded-search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: '' }),
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await fetch(`${baseUrl}/api/ai/transcribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await fetch(`${baseUrl}/api/ai/interview-eval`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: 'Why React?' }),
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await fetch(`${baseUrl}/api/ai/collaborate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await fetch(`${baseUrl}/api/ai/mentor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mentorId: 'elena', message: 'Help' }),
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await fetch(`${baseUrl}/api/ai/video-lesson`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: '' }),
        })
      ).status,
      400,
    );

    // 200 adaptive fallback paths
    const grounded = await fetch(`${baseUrl}/api/ai/grounded-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'React jobs', useSearch: true, useMaps: true, cityHint: 'Bengaluru' }),
    });
    assert.equal(grounded.status, 200);
    const groundedData = (await grounded.json()) as { sources: Array<{ sourceType: string }> };
    assert.ok(groundedData.sources.some((s) => s.sourceType === 'maps'));
    assert.ok(groundedData.sources.some((s) => s.sourceType === 'search'));

    const transcribe = await fetch(`${baseUrl}/api/ai/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64: 'AAAA', mimeType: 'audio/webm' }),
    });
    assert.equal(transcribe.status, 200);

    const evalRes = await fetch(`${baseUrl}/api/ai/interview-eval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'Explain caching',
        answer: 'We use an in-memory cache with TTL, database index tuning, async queue retries, and O(1) lookup keys.',
        roleTitle: 'Full Stack Developer',
      }),
    });
    assert.equal(evalRes.status, 200);
    const evalBody = (await evalRes.json()) as { scorePct: number };
    assert.ok(evalBody.scorePct >= 60 && evalBody.scorePct <= 100);

    const collab = await fetch(`${baseUrl}/api/ai/collaborate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, triggerReason: 'Low score check' }),
    });
    assert.equal(collab.status, 200);
    const collabBody = (await collab.json()) as { steps: unknown[]; recalibrationNotice?: string };
    assert.equal(collabBody.steps.length, 4);
    assert.match(collabBody.recalibrationNotice || '', /Adaptive Trigger/);

    const mentorRes = await fetch(`${baseUrl}/api/ai/mentor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mentorId: 'aria', message: 'What next?', profile }),
    });
    assert.equal(mentorRes.status, 200);
    const mentorBody = (await mentorRes.json()) as { mentorName: string };
    assert.equal(mentorBody.mentorName, 'Prof. Aria Kapoor');

    const vidRes = await fetch(`${baseUrl}/api/ai/video-lesson`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: 'TypeScript', mentorId: 'elena', targetRoleTitle: 'Full Stack Developer' }),
    });
    assert.equal(vidRes.status, 200);
    const vidBody = (await vidRes.json()) as { scenes: unknown[]; totalDurationSec: number };
    assert.equal(vidBody.scenes.length, 4);
    assert.equal(vidBody.totalDurationSec, 72);
  });
});

test('AI endpoints integrate cleanly with Gemini SDK responses and handle SQL routes', async () => {
  const fakeAi = {
    interactions: {
      create: async () => ({
        id: 'inter-1',
        steps: [
          { type: 'thought', summary: [{ type: 'text', text: 'Reasoned carefully' }] },
          { type: 'model_output', content: [{ type: 'text', text: 'Use parameterized SQL queries.' }] },
          {
            type: 'google_search_result',
            result: [{ title: 'OWASP SQLi', url: 'https://owasp.org' }],
          },
        ],
      }),
    },
    models: {
      generateContent: async () => ({
        text: JSON.stringify({
          scorePct: 88,
          strengths: ['Mentioned parameterized queries'],
          improvements: ['Discuss connection pooling'],
          modelFeedback: 'Great security-minded answer.',
          executiveSummary: 'All 4 agents aligned.',
          steps: [
            { agentName: 'A1', agentRole: 'R1', summary: 'S1', actionItems: ['Do 1'] },
            { agentName: 'A2', agentRole: 'R2', summary: 'S2', actionItems: ['Do 2'] },
            { agentName: 'A3', agentRole: 'R3', summary: 'S3', actionItems: ['Do 3'] },
          ],
          scenes: [
            { sceneNumber: 1, title: 'S1', narration: 'N1', visualDiagramTitle: 'V1', codeSnippet: 'C1', keyTakeaway: 'K1', durationSec: 20 },
            { sceneNumber: 2, title: 'S2', narration: 'N2', visualDiagramTitle: 'V2', codeSnippet: 'C2', keyTakeaway: 'K2', durationSec: 20 },
            { sceneNumber: 3, title: 'S3', narration: 'N3', visualDiagramTitle: 'V3', codeSnippet: 'C3', keyTakeaway: 'K3', durationSec: 20 },
          ],
        }),
      }),
    },
  } as unknown as GoogleGenAI;

  const mockAuth: express.RequestHandler = (req, _res, next) => {
    (req as AuthRequest).user = {
      uid: 'uid-sql-1',
      email: 'sql@voragen.test',
      name: 'SQL Tester',
    } as unknown as NonNullable<AuthRequest['user']>;
    next();
  };

  const app = createApiApp({
    profileStore: {},
    credentialsStore: {},
    persistStores: false,
    aiClientFactory: () => fakeAi,
    requireAuthMiddleware: mockAuth,
    authLimiter: new SlidingWindowRateLimiter(50, 60_000),
    aiLimiter: new SlidingWindowRateLimiter(50, 60_000),
    sqlHandlers: {
      getOrCreateUser: async (uid, email) => ({ id: 1, uid, email }) as never,
      updateUserCareerSnapshot: async (uid) => ({ id: 1, uid, streakDays: 5 }) as never,
      getUserDashboardRecords: async () =>
        ({ user: { id: 1 }, assessments: [], checkpoints: [], sessions: [] }) as never,
      recordSqlAssessment: async (_uid, _email, input) => ({ id: 9, ...input }) as never,
      recordSqlAiSession: async (_uid, _email, input) => ({ id: 11, ...input }) as never,
    },
  });

  await withServer(app, async (baseUrl) => {
    const chatRes = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Prevent SQL injection?', model: 'gemini-4-hydrogen' }),
    });
    assert.equal(chatRes.status, 200);
    const chatBody = (await chatRes.json()) as { source: string; reply: string };
    assert.equal(chatBody.source, 'gemini-interactions');
    assert.match(chatBody.reply, /parameterized SQL/);

    const groundedRes = await fetch(`${baseUrl}/api/ai/grounded-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'OWASP top 10' }),
    });
    assert.equal(groundedRes.status, 200);
    const groundedBody = (await groundedRes.json()) as { source: string; sources: Array<{ url: string }> };
    assert.equal(groundedBody.source, 'gemini-grounded');
    assert.equal(groundedBody.sources[0].url, 'https://owasp.org');

    const transcribeRes = await fetch(`${baseUrl}/api/ai/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64: 'AAAA', mimeType: 'audio/webm' }),
    });
    assert.equal(transcribeRes.status, 200);
    const transcribeBody = (await transcribeRes.json()) as { source: string; transcript: string };
    assert.equal(transcribeBody.source, 'gemini-transcribe');
    assert.match(transcribeBody.transcript, /parameterized SQL/);

    const evalRes = await fetch(`${baseUrl}/api/ai/interview-eval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'How do you prevent SQL injection?',
        answer: 'Use parameterized prepared statements.',
        roleTitle: 'Backend Engineer',
      }),
    });
    assert.equal(evalRes.status, 200);
    const evalBody = (await evalRes.json()) as { scorePct: number; strengths: string[] };
    assert.equal(evalBody.scorePct, 88);
    assert.equal(evalBody.strengths[0], 'Mentioned parameterized queries');

    const profile = {
      ...createBlankUnauthenticatedProfile(),
      name: 'SQL Learner',
      skills: [{ name: 'SQL', level: 70, category: 'Backend', verified: true }],
    };

    const collabRes = await fetch(`${baseUrl}/api/ai/collaborate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, triggerReason: 'Manual sync' }),
    });
    assert.equal(collabRes.status, 200);
    const collabBody = (await collabRes.json()) as { source: string; steps: unknown[] };
    assert.equal(collabBody.source, 'gemini-4-hydrogen');
    assert.equal(collabBody.steps.length, 3);

    // Second identical collaborate request hits TTL response cache
    const collabCached = await fetch(`${baseUrl}/api/ai/collaborate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, triggerReason: 'Manual sync' }),
    });
    assert.equal(collabCached.status, 200);

    // Mentor endpoint via Gemini generateContent (note fakeAi returns JSON string which is still non-empty response.text)
    const mentorRes = await fetch(`${baseUrl}/api/ai/mentor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mentorId: 'elena',
        message: 'Check my SQL mastery',
        profile,
        history: [{ role: 'user', text: 'Hi Elena' }],
      }),
    });
    assert.equal(mentorRes.status, 200);
    const mentorBody = (await mentorRes.json()) as { source: string; mentorName: string };
    assert.equal(mentorBody.source, 'gemini-4-hydrogen');

    const videoRes = await fetch(`${baseUrl}/api/ai/video-lesson`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: 'PostgreSQL Indexes', mentorId: 'marcus', targetRoleTitle: 'Backend Engineer' }),
    });
    assert.equal(videoRes.status, 200);
    const videoBody = (await videoRes.json()) as { scenes: unknown[]; totalDurationSec: number };
    assert.equal(videoBody.scenes.length, 3);
    assert.equal(videoBody.totalDurationSec, 60);

    const sqlGet = await fetch(`${baseUrl}/api/sql/profile`);
    assert.equal(sqlGet.status, 200);

    const sqlPut = await fetch(`${baseUrl}/api/sql/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ streakDays: 5 }),
    });
    assert.equal(sqlPut.status, 200);

    const badSqlAssess = await fetch(`${baseUrl}/api/sql/assessments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skillName: 'SQL' }),
    });
    assert.equal(badSqlAssess.status, 400);

    const goodSqlAssess = await fetch(`${baseUrl}/api/sql/assessments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skillName: 'SQL', scorePct: 92 }),
    });
    assert.equal(goodSqlAssess.status, 200);

    const sqlSession = await fetch(`${baseUrl}/api/sql/ai-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'mentor', promptSummary: 'Reviewed SQL joins' }),
    });
    assert.equal(sqlSession.status, 200);
  });
});

test('API enforces auth errors, sanitizes /api/profile updates, and handles Gemini 403/429 & SQL 500 errors', async () => {
  const err403 = Object.assign(new Error('PERMISSION_DENIED: Invalid API key'), { status: 403 });
  const failingAi = {
    interactions: {
      create: async () => {
        throw err403;
      },
    },
    models: {
      generateContent: async () => {
        throw Object.assign(new Error('RESOURCE_EXHAUSTED 429 retryDelay 5s'), { status: 429 });
      },
    },
  } as unknown as GoogleGenAI;

  const mockAuth: express.RequestHandler = (req, _res, next) => {
    (req as AuthRequest).user = {
      uid: 'uid-err-1',
      email: 'err@voragen.test',
    } as unknown as NonNullable<AuthRequest['user']>;
    next();
  };

  const app = createApiApp({
    profileStore: {},
    credentialsStore: {},
    persistStores: false,
    aiClientFactory: () => failingAi,
    requireAuthMiddleware: mockAuth,
    authLimiter: new SlidingWindowRateLimiter(50, 60_000),
    aiLimiter: new SlidingWindowRateLimiter(50, 60_000),
    sqlHandlers: {
      getOrCreateUser: async () => {
        throw new Error('DB down');
      },
      updateUserCareerSnapshot: async () => {
        throw new Error('DB down');
      },
      getUserDashboardRecords: async () => {
        throw new Error('DB down');
      },
      recordSqlAssessment: async () => {
        throw new Error('DB down');
      },
      recordSqlAiSession: async () => {
        throw new Error('DB down');
      },
    },
  });

  await withServer(app, async (baseUrl) => {
    const health = await fetch(`${baseUrl}/api/health`);
    assert.equal(health.status, 200);

    // Auth validation checks
    assert.equal(
      (
        await fetch(`${baseUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'not-an-email', password: 'password123' }),
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await fetch(`${baseUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'user@voragen.test', password: '123' }),
        })
      ).status,
      400,
    );

    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Riya', email: 'riya@voragen.test', password: 'password123' }),
    });
    assert.equal(regRes.status, 200);
    const { token, profile } = (await regRes.json()) as { token: string; profile: { name: string } };

    // Duplicate email -> 409
    assert.equal(
      (
        await fetch(`${baseUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Riya', email: 'riya@voragen.test', password: 'password123' }),
        })
      ).status,
      409,
    );

    // Wrong password -> 401; missing user -> 404
    assert.equal(
      (
        await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'riya@voragen.test', password: 'wrong-password' }),
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'ghost@voragen.test', password: 'password123' }),
        })
      ).status,
      404,
    );

    // GET & PUT /api/profile protection + sanitization
    assert.equal((await fetch(`${baseUrl}/api/profile?key=riya@voragen.test`)).status, 401);
    assert.equal(
      (
        await fetch(`${baseUrl}/api/profile?key=riya@voragen.test`, {
          headers: { 'x-voragen-token': token },
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await fetch(`${baseUrl}/api/profile?key=riya@voragen.test`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-voragen-token': token },
          body: JSON.stringify({}),
        })
      ).status,
      400,
    );
    const putOk = await fetch(`${baseUrl}/api/profile?key=riya@voragen.test`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-voragen-token': token },
      body: JSON.stringify({ ...profile, githubUrl: 'javascript:alert(1)' }),
    });
    assert.equal(putOk.status, 200);
    const putBody = (await putOk.json()) as { profile: { githubUrl?: string } };
    assert.equal(putBody.profile.githubUrl, '');

    // Gemini 403 -> needsPaidKey on interactions routes
    for (const [path, payload] of [
      ['/api/ai/chat', { message: 'Hello' }],
      ['/api/ai/grounded-search', { query: 'TypeScript jobs' }],
      ['/api/ai/transcribe', { audioBase64: 'AAAA' }],
    ] as const) {
      const r = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      assert.equal(r.status, 403);
      const b = (await r.json()) as { needsPaidKey: boolean };
      assert.equal(b.needsPaidKey, true);
    }

    // Gemini 429 on collaborate triggers clean fallback to adaptive-engine
    const collabFallback = await fetch(`${baseUrl}/api/ai/collaborate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, triggerReason: 'Quota test' }),
    });
    assert.equal(collabFallback.status, 200);
    const collabBody = (await collabFallback.json()) as { source: string };
    assert.equal(collabBody.source, 'adaptive-engine');

    // SQL 500 error propagation
    assert.equal((await fetch(`${baseUrl}/api/sql/profile`)).status, 500);
    assert.equal(
      (
        await fetch(`${baseUrl}/api/sql/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ streakDays: 1 }),
        })
      ).status,
      500,
    );
    assert.equal(
      (
        await fetch(`${baseUrl}/api/sql/assessments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skillName: 'SQL', scorePct: 80 }),
        })
      ).status,
      500,
    );
    assert.equal(
      (
        await fetch(`${baseUrl}/api/sql/ai-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'chat' }),
        })
      ).status,
      500,
    );
  });
});


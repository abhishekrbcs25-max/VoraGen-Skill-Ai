import test from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { createRequireAuth, type AuthRequest } from './auth';

function createMockRes() {
  const state: { statusCode: number; body: unknown } = { statusCode: 200, body: null };
  const res = {
    status(code: number) {
      state.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      state.body = payload;
      return res;
    },
  } as unknown as Response;
  return { res, state };
}

test('createRequireAuth rejects missing or malformed Authorization headers with 401', async () => {
  const middleware = createRequireAuth(async () => {
    throw new Error('should not be called');
  });

  const missingReq = { headers: {} } as unknown as AuthRequest;
  const { res: res1, state: s1 } = createMockRes();
  let nextCalled = false;
  await middleware(missingReq, res1, () => {
    nextCalled = true;
  });
  assert.equal(s1.statusCode, 401);
  assert.equal(nextCalled, false);

  const badSchemeReq = { headers: { authorization: 'Basic abc123' } } as unknown as AuthRequest;
  const { res: res2, state: s2 } = createMockRes();
  await middleware(badSchemeReq, res2, () => {
    nextCalled = true;
  });
  assert.equal(s2.statusCode, 401);
  assert.equal(nextCalled, false);
});

test('createRequireAuth returns 401 when token verification fails and calls next() on valid token', async () => {
  const rejecting = createRequireAuth(async () => {
    throw new Error('expired token');
  });
  const reqFail = { headers: { authorization: 'Bearer bad-token' } } as unknown as Request;
  const { res: resFail, state: stateFail } = createMockRes();
  let nextFail = false;
  await rejecting(reqFail as AuthRequest, resFail, () => {
    nextFail = true;
  });
  assert.equal(stateFail.statusCode, 401);
  assert.equal(nextFail, false);

  const fakeDecoded = { uid: 'uid-42', email: 'learner@voragen.dev' } as DecodedIdToken;
  const accepting = createRequireAuth(async (token) => {
    assert.equal(token, 'valid-jwt');
    return fakeDecoded;
  });
  const reqOk = { headers: { authorization: 'Bearer valid-jwt' } } as unknown as AuthRequest;
  const { res: resOk } = createMockRes();
  let nextOk = false;
  await accepting(reqOk, resOk, () => {
    nextOk = true;
  });
  assert.equal(nextOk, true);
  assert.equal(reqOk.user?.uid, 'uid-42');
});

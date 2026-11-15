import 'dotenv/config';
import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, type WebSocket } from 'ws';
import { GoogleGenAI, Modality, ThinkingLevel, Type } from '@google/genai';
import {
  CAREER_ROLES,
  LEARNING_CATALOG,
  MENTOR_STAFF,
  createFreshUserProfile,
} from './src/data/careerData';
import { calculateSkillMatch, generateAdaptiveRoadmap } from './src/utils/skillEngine';
import {
  combineInteractionText,
  extractGroundingSources,
  normalizeThinkingLevel,
  type ChatModelId,
  type InteractionStepLike,
  type ThinkingPreset,
} from './src/utils/aiHelpers.ts';
import {
  buildProfileCollaborationKey,
  ModelCooldownTracker,
  TtlResponseCache,
  type GeminiTextModel,
} from './src/utils/geminiResilience.ts';
import {
  generateOtpCode,
  hashOtpCode,
  hashPassword,
  isValidEmailFormat,
  isValidPhoneNumber,
  maskTargetContact,
  normalizePhoneNumber,
  parseDeviceLabel,
  signSessionToken,
  SlidingWindowRateLimiter,
  verifyOtpCode,
  verifyPassword,
  verifySessionToken,
} from './src/utils/securityHelpers.ts';
import { sanitizeTextField, sanitizeUserProfile } from './src/utils/validation.ts';
import { adminAuth } from './src/lib/firebase-admin.ts';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import {
  getOrCreateUser,
  getUserDashboardRecords,
  recordSqlAiSession,
  recordSqlAssessment,
  updateUserCareerSnapshot,
} from './src/db/users.ts';
import {
  createSeedPlatformStore,
  loadPlatformStore,
  savePlatformStore,
  type PlatformStoreData,
} from './src/server/platformStore.ts';
import { registerPlatformRoutes } from './src/server/platformRoutes.ts';
import type {
  AIVideoLesson,
  AccountRole,
  DeviceSessionInfo,
  InterviewEvaluation,
  MultiAgentReport,
  UserProfile,
} from './src/types';

function resolveServerPort(): number {
  const portFlagIdx = process.argv.indexOf('--port');
  if (portFlagIdx !== -1 && process.argv[portFlagIdx + 1]) {
    const cliPort = Number(process.argv[portFlagIdx + 1]);
    if (Number.isFinite(cliPort) && cliPort > 0) return cliPort;
  }
  return Number(process.env.PORT || 3000);
}

const PORT = resolveServerPort();
const DATA_DIR = path.resolve(process.cwd(), '.pathforge-data');
const PROFILE_FILE = path.join(DATA_DIR, 'profiles.json');
const CREDENTIALS_FILE = path.join(DATA_DIR, 'credentials.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

export interface ServerSessionRecord extends DeviceSessionInfo {
  revokedAt?: string;
}

export type OtpPurpose = 'phone-auth' | 'email-verify' | 'password-reset' | '2fa';

export interface OtpChallengeRecord {
  id: string;
  target: string;
  channel: 'email' | 'phone';
  purpose: OtpPurpose;
  hash: string;
  salt: string;
  expiresAt: number;
  attempts: number;
  verifiedForReset?: boolean;
  userKey?: string;
}

function ensureDataStore(): Record<string, UserProfile> {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(PROFILE_FILE)) {
      const initial: Record<string, UserProfile> = {};
      fs.writeFileSync(PROFILE_FILE, JSON.stringify(initial, null, 2));
      return initial;
    }
    const raw = fs.readFileSync(PROFILE_FILE, 'utf-8');
    return JSON.parse(raw) as Record<string, UserProfile>;
  } catch {
    return {};
  }
}

function saveDataStore(store: Record<string, UserProfile>): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(PROFILE_FILE, JSON.stringify(store, null, 2));
  } catch {
    // Non-fatal in read-only sandboxes
  }
}

function ensureCredentialsStore(): Record<string, string> {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(CREDENTIALS_FILE)) {
      fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify({}, null, 2));
      return {};
    }
    return JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf-8')) as Record<string, string>;
  } catch {
    return {};
  }
}

function saveCredentialsStore(store: Record<string, string>): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(store, null, 2));
  } catch {
    // Non-fatal in read-only sandboxes
  }
}

function ensureSessionsStore(): Record<string, ServerSessionRecord> {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(SESSIONS_FILE)) {
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify({}, null, 2));
      return {};
    }
    return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8')) as Record<string, ServerSessionRecord>;
  } catch {
    return {};
  }
}

function saveSessionsStore(store: Record<string, ServerSessionRecord>): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(store, null, 2));
  } catch {
    // Non-fatal in read-only sandboxes
  }
}

const modelCooldowns = new ModelCooldownTracker();
const collaborateCache = new TtlResponseCache<MultiAgentReport>(10 * 60_000, 40);
const authLimiter = new SlidingWindowRateLimiter(30, 60_000);
const aiLimiter = new SlidingWindowRateLimiter(60, 60_000);

function getThinkingForModel(model: GeminiTextModel): ThinkingLevel {
  return model === 'gemini-3.1-flash-lite' ? ThinkingLevel.MINIMAL : ThinkingLevel.LOW;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function formatGeminiError(err: unknown): { status: number; message: string; needsPaidKey: boolean } {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (lower.includes('resource_exhausted') || lower.includes('quota') || lower.includes('429')) {
    return {
      status: 429,
      message: 'API quota reached on the active key. Please retry shortly or configure a billing-enabled Gemini API key in AI Studio Settings > Secrets.',
      needsPaidKey: true,
    };
  }
  if (lower.includes('permission_denied') || lower.includes('403') || lower.includes('not enabled')) {
    return {
      status: 403,
      message: 'This model tier requires a billing-enabled Gemini API key in AI Studio Settings > Secrets.',
      needsPaidKey: true,
    };
  }
  return {
    status: 500,
    message: msg || 'AI service error',
    needsPaidKey: false,
  };
}

async function withTimeout<T>(promise: Promise<T>, ms = 8500): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('AI request timeout')), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export interface CreateApiAppOptions {
  profileStore?: Record<string, UserProfile>;
  credentialsStore?: Record<string, string>;
  sessionsStore?: Record<string, ServerSessionRecord>;
  platformStore?: PlatformStoreData;
  otpStore?: Record<string, OtpChallengeRecord>;
  persistStores?: boolean;
  verifyIdTokenFn?: (idToken: string) => Promise<{ email?: string; email_verified?: boolean }>;
  requireAuthMiddleware?: express.RequestHandler;
  authLimiter?: SlidingWindowRateLimiter;
  aiLimiter?: SlidingWindowRateLimiter;
  aiClientFactory?: () => GoogleGenAI | null;
  sqlHandlers?: {
    getOrCreateUser: typeof getOrCreateUser;
    updateUserCareerSnapshot: typeof updateUserCareerSnapshot;
    getUserDashboardRecords: typeof getUserDashboardRecords;
    recordSqlAssessment: typeof recordSqlAssessment;
    recordSqlAiSession: typeof recordSqlAiSession;
  };
}

export function createApiApp(options: CreateApiAppOptions = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '12mb' }));

  // Standard HTTP security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), geolocation=(self)');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader(
      'Content-Security-Policy',
      "object-src 'none'; base-uri 'self'; frame-ancestors 'self'",
    );
    next();
  });

  const activeAuthLimiter = options.authLimiter ?? authLimiter;
  const activeAiLimiter = options.aiLimiter ?? aiLimiter;

  // Rate limit auth and AI endpoints against abuse
  app.use('/api/auth', (req, res, next) => {
    const ip = req.ip || 'unknown';
    if (!activeAuthLimiter.allow(ip)) {
      res.status(429).json({ error: 'Too many authentication attempts. Please wait a minute.' });
      return;
    }
    next();
  });

  app.use('/api/ai', (req, res, next) => {
    const ip = req.ip || 'unknown';
    if (!activeAiLimiter.allow(ip)) {
      res.status(429).json({ error: 'AI rate limit reached. Please retry in a moment.' });
      return;
    }
    next();
  });

  const shouldPersist = options.persistStores !== false;
  const profileStore = options.profileStore ?? ensureDataStore();
  const credentialsStore = options.credentialsStore ?? ensureCredentialsStore();
  const sessionsStore =
    options.sessionsStore ?? (shouldPersist ? ensureSessionsStore() : {});
  const platformStore =
    options.platformStore ?? (shouldPersist ? loadPlatformStore() : createSeedPlatformStore());
  const otpStore = options.otpStore ?? {};
  const verifyIdTokenFn =
    options.verifyIdTokenFn ?? ((token: string) => adminAuth.verifyIdToken(token));
  const authMiddleware = options.requireAuthMiddleware ?? requireAuth;
  const resolveAiClient = options.aiClientFactory ?? getGeminiClient;
  const sql = options.sqlHandlers ?? {
    getOrCreateUser,
    updateUserCareerSnapshot,
    getUserDashboardRecords,
    recordSqlAssessment,
    recordSqlAiSession,
  };

  const persistProfileStore = () => {
    if (shouldPersist) saveDataStore(profileStore);
  };
  const persistCredentialsStore = () => {
    if (shouldPersist) saveCredentialsStore(credentialsStore);
  };
  const persistSessionsStore = () => {
    if (shouldPersist) saveSessionsStore(sessionsStore);
  };
  const persistPlatformStore = () => {
    if (shouldPersist) savePlatformStore(platformStore);
  };

  const SELF_REGISTER_ROLES: AccountRole[] = [
    'student',
    'working-professional',
    'job-seeker',
    'employer',
  ];

  const shouldExposeSandboxOtp = () =>
    !process.env.TWILIO_ACCOUNT_SID && !process.env.SMTP_HOST;

  function createDeviceSession(
    userKey: string,
    role: AccountRole,
    req: express.Request,
  ): { token: string; session: ServerSessionRecord } {
    const normalizedKey = userKey.toLowerCase();
    const sessionId = crypto.randomUUID();
    const { deviceLabel, browser, os } = parseDeviceLabel(
      typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : '',
    );
    const nowIso = new Date().toISOString();
    const session: ServerSessionRecord = {
      sessionId,
      userKey: normalizedKey,
      deviceLabel,
      browser,
      os,
      ip: req.ip || '127.0.0.1',
      createdAt: nowIso,
      lastActiveAt: nowIso,
    };
    sessionsStore[sessionId] = session;
    persistSessionsStore();
    const token = signSessionToken(
      normalizedKey,
      7 * 24 * 60 * 60_000,
      Date.now(),
      undefined,
      { jti: sessionId, role },
    );
    return { token, session };
  }

  function revokeAllUserSessions(userKey: string, exceptSessionId?: string): number {
    const normalizedKey = userKey.toLowerCase();
    const nowIso = new Date().toISOString();
    let revokedCount = 0;
    for (const sess of Object.values(sessionsStore)) {
      if (sess.userKey === normalizedKey && !sess.revokedAt && sess.sessionId !== exceptSessionId) {
        sess.revokedAt = nowIso;
        revokedCount += 1;
      }
    }
    if (revokedCount > 0) persistSessionsStore();
    return revokedCount;
  }

  function createOtpChallenge(params: {
    target: string;
    channel: 'email' | 'phone';
    purpose: OtpPurpose;
    userKey?: string;
  }): { challengeId: string; code: string; maskedTarget: string; expiresInSec: number } {
    const code = generateOtpCode();
    const salt = crypto.randomBytes(16).toString('hex');
    const challengeId = crypto.randomUUID();
    otpStore[challengeId] = {
      id: challengeId,
      target: params.target,
      channel: params.channel,
      purpose: params.purpose,
      hash: hashOtpCode(code, salt),
      salt,
      expiresAt: Date.now() + 10 * 60_000,
      attempts: 0,
      userKey: params.userKey,
    };
    return {
      challengeId,
      code,
      maskedTarget: maskTargetContact(params.target, params.channel),
      expiresInSec: 600,
    };
  }

  function verifyProfileAccess(
    req: express.Request,
    key: string,
  ): { valid: boolean; sub?: string; jti?: string; role?: string } {
    if (!key || key === 'default') return { valid: false };
    const headerToken = typeof req.headers['x-voragen-token'] === 'string'
      ? req.headers['x-voragen-token']
      : '';
    const verified = verifySessionToken(headerToken, key);
    if (!verified.valid) return { valid: false };
    if (verified.jti) {
      const sess = sessionsStore[verified.jti];
      if (!sess || sess.revokedAt || sess.userKey !== key.toLowerCase()) {
        return { valid: false };
      }
      sess.lastActiveAt = new Date().toISOString();
    }
    return verified;
  }

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'VoraGen Skill AI Platform' });
  });

  // Safe Google Maps key check (returns runtime env key if Vite compile-time var wasn't set)
  app.get('/api/config/maps', (_req, res) => {
    const rawKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
    const apiKey = rawKey && rawKey !== 'MY_GOOGLE_MAPS_API_KEY' ? rawKey : '';
    res.json({ hasKey: Boolean(apiKey), apiKey });
  });

  // Get active authenticated learner profile (requires valid signed session token)
  app.get('/api/profile', (req, res) => {
    const key = typeof req.query.key === 'string' ? req.query.key.trim().toLowerCase() : '';
    if (!verifyProfileAccess(req, key).valid) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!profileStore[key]) {
      res.status(404).json({ error: 'Profile workspace not initialized', profileNotFound: true });
      return;
    }
    res.json(profileStore[key]);
  });

  // Persist learner profile updates (authenticated users only + sanitized + immutable authProvider & role)
  app.put('/api/profile', (req, res) => {
    const key = typeof req.query.key === 'string' ? req.query.key.trim().toLowerCase() : '';
    if (!verifyProfileAccess(req, key).valid) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const body = req.body as UserProfile;
    if (!body || typeof body.name !== 'string') {
      res.status(400).json({ error: 'Invalid profile payload' });
      return;
    }
    const existing = profileStore[key];
    const nextPhoneNormalized = normalizePhoneNumber(body.phone || '');
    const existingPhoneNormalized = normalizePhoneNumber(existing?.phone || '');
    const phoneChanged =
      Boolean(existing) && nextPhoneNormalized !== existingPhoneNormalized;

    // Prevent privilege escalation to admin via profile PUT
    const safeRole: AccountRole =
      existing?.role ||
      (body.role && body.role !== 'admin' ? body.role : 'student');

    const sanitized = sanitizeUserProfile({
      ...body,
      email: key,
      isSignedIn: true,
      authProvider: existing?.authProvider || body.authProvider || 'email',
      role: safeRole,
      emailVerified: existing ? Boolean(existing.emailVerified) : Boolean(body.emailVerified),
      phoneVerified: existing
        ? phoneChanged
          ? false
          : Boolean(existing.phoneVerified)
        : Boolean(body.phoneVerified),
      acceptedTermsAt: existing?.acceptedTermsAt || body.acceptedTermsAt,
      acceptedPrivacyAt: existing?.acceptedPrivacyAt || body.acceptedPrivacyAt,
    });
    profileStore[key] = sanitized;
    persistProfileStore();
    res.json({ ok: true, profile: sanitized });
  });

  // Permanently delete authenticated user account, credentials, and sessions
  app.delete('/api/profile', (req, res) => {
    const key = typeof req.query.key === 'string' ? req.query.key.trim().toLowerCase() : '';
    if (!verifyProfileAccess(req, key).valid) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const body = (req.body || {}) as { confirmEmail?: string };
    if (
      !body.confirmEmail ||
      (body.confirmEmail.trim().toLowerCase() !== key &&
        body.confirmEmail.trim().toUpperCase() !== 'DELETE')
    ) {
      res.status(400).json({ error: 'Please enter your account email or DELETE to confirm account deletion.' });
      return;
    }

    delete profileStore[key];
    delete credentialsStore[key];
    for (const [sid, sess] of Object.entries(sessionsStore)) {
      if (sess.userKey === key) {
        delete sessionsStore[sid];
      }
    }
    for (const [cid, ch] of Object.entries(otpStore)) {
      if (ch.userKey === key || ch.target.toLowerCase() === key) {
        delete otpStore[cid];
      }
    }
    persistProfileStore();
    persistCredentialsStore();
    persistSessionsStore();
    res.json({ ok: true, deleted: true });
  });

  // Clear signed-in user workspace back to a clean empty profile
  app.post('/api/profile/reset', (req, res) => {
    const key = typeof req.query.key === 'string' ? req.query.key.trim().toLowerCase() : '';
    if (!verifyProfileAccess(req, key).valid) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const existing = profileStore[key];
    const fresh = {
      ...createFreshUserProfile({
        name: existing?.name || 'Learner',
        email: key,
        authProvider: existing?.authProvider || 'email',
        role: existing?.role || 'student',
        phone: existing?.phone,
        emailVerified: existing?.emailVerified,
        phoneVerified: existing?.phoneVerified,
        acceptedTermsAt: existing?.acceptedTermsAt,
        acceptedPrivacyAt: existing?.acceptedPrivacyAt,
      }),
      needsOnboarding: false,
    };
    profileStore[key] = fresh;
    persistProfileStore();
    res.json({ ok: true, profile: fresh });
  });

  // Check whether an admin account exists on this workspace
  app.get('/api/auth/admin-status', (_req, res) => {
    const hasAdmin = Object.values(profileStore).some((p) => p.role === 'admin');
    res.json({ hasAdmin });
  });

  // One-time bootstrap for initial workspace Admin (locks permanently once an admin exists)
  app.post('/api/auth/admin-bootstrap', (req, res) => {
    const hasAdmin = Object.values(profileStore).some((p) => p.role === 'admin');
    if (hasAdmin) {
      res.status(403).json({
        error: 'An administrator account already exists. Please use Admin Login.',
      });
      return;
    }
    const { name, email, password, acceptedTerms, acceptedPrivacy } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      acceptedTerms?: boolean;
      acceptedPrivacy?: boolean;
    };
    if (!acceptedTerms || !acceptedPrivacy) {
      res.status(400).json({ error: 'You must accept Terms & Conditions and Privacy Policy.' });
      return;
    }
    const cleanEmail = sanitizeTextField(email || '', 160).toLowerCase();
    if (!cleanEmail || !isValidEmailFormat(cleanEmail)) {
      res.status(400).json({ error: 'A valid admin email address is required.' });
      return;
    }
    if (!password || password.length < 8) {
      res.status(400).json({ error: 'Admin password must be at least 8 characters.' });
      return;
    }
    if (profileStore[cleanEmail]) {
      res.status(409).json({ error: 'This email is already registered as a standard user.' });
      return;
    }

    const nowIso = new Date().toISOString();
    credentialsStore[cleanEmail] = hashPassword(password);
    persistCredentialsStore();
    const adminProfile: UserProfile = {
      ...createFreshUserProfile({
        name: sanitizeTextField(name || '', 80) || 'Workspace Admin',
        email: cleanEmail,
        authProvider: 'email',
        role: 'admin',
        emailVerified: true,
        acceptedTermsAt: nowIso,
        acceptedPrivacyAt: nowIso,
      }),
      needsOnboarding: false,
    };
    profileStore[cleanEmail] = adminProfile;
    persistProfileStore();
    const { token } = createDeviceSession(cleanEmail, 'admin', req);
    res.json({ ok: true, key: cleanEmail, token, profile: adminProfile });
  });

  // Register a brand-new user with salted scrypt password hashing, role selection & legal acceptance
  app.post('/api/auth/register', async (req, res) => {
    const {
      name,
      email,
      password,
      authProvider,
      idToken,
      role,
      phone,
      acceptedTerms,
      acceptedPrivacy,
    } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      authProvider?: UserProfile['authProvider'];
      idToken?: string;
      role?: AccountRole;
      phone?: string;
      acceptedTerms?: boolean;
      acceptedPrivacy?: boolean;
    };
    if (!acceptedTerms || !acceptedPrivacy) {
      res.status(400).json({
        error: 'Please accept the Terms & Conditions and Privacy Policy to create an account.',
      });
      return;
    }
    if (role === 'admin') {
      res.status(403).json({
        error: 'Admin accounts cannot be self-registered. Use Admin Portal.',
      });
      return;
    }
    const resolvedRole: AccountRole =
      role && SELF_REGISTER_ROLES.includes(role) ? role : 'student';

    const cleanEmail = sanitizeTextField(email || '', 160).toLowerCase();
    if (!cleanEmail || !isValidEmailFormat(cleanEmail)) {
      res.status(400).json({ error: 'A valid email address (e.g., name@domain.com) is required.' });
      return;
    }
    const provider: UserProfile['authProvider'] =
      authProvider === 'google' || authProvider === 'microsoft' ? authProvider : 'email';
    if (provider === 'email' && (!password || password.length < 6)) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }
    let googleEmailVerified = false;
    if (provider === 'google' && idToken) {
      try {
        const decoded = await verifyIdTokenFn(idToken);
        if (decoded.email?.toLowerCase() !== cleanEmail || !decoded.email_verified) {
          res.status(403).json({ error: 'Google ID token email verification mismatch.' });
          return;
        }
        googleEmailVerified = true;
      } catch {
        res.status(401).json({ error: 'Invalid Google sign-in token.' });
        return;
      }
    }
    if (profileStore[cleanEmail]) {
      res.status(409).json({ error: 'An account with this email already exists. Please Sign In instead.' });
      return;
    }

    const cleanName = sanitizeTextField(name || '', 80) || cleanEmail.split('@')[0];
    if (provider === 'email' && password) {
      credentialsStore[cleanEmail] = hashPassword(password);
      persistCredentialsStore();
    }

    const cleanPhone = phone && isValidPhoneNumber(phone) ? normalizePhoneNumber(phone) : '';
    const nowIso = new Date().toISOString();
    const freshProfile = createFreshUserProfile({
      name: cleanName,
      email: cleanEmail,
      authProvider: provider,
      role: resolvedRole,
      phone: cleanPhone,
      emailVerified: googleEmailVerified,
      phoneVerified: false,
      acceptedTermsAt: nowIso,
      acceptedPrivacyAt: nowIso,
    });
    profileStore[cleanEmail] = freshProfile;
    persistProfileStore();
    const { token } = createDeviceSession(cleanEmail, resolvedRole, req);
    res.json({ ok: true, key: cleanEmail, token, profile: freshProfile });
  });

  // Log in existing user with strict password, OAuth proof, Admin portal enforcement, and 2FA challenge
  app.post('/api/auth/login', async (req, res) => {
    const { email, name, password, authProvider, idToken, portalMode } = req.body as {
      email?: string;
      name?: string;
      password?: string;
      authProvider?: UserProfile['authProvider'];
      idToken?: string;
      portalMode?: 'standard' | 'admin';
    };
    const cleanEmail = sanitizeTextField(email || '', 160).toLowerCase();
    if (!cleanEmail || !isValidEmailFormat(cleanEmail)) {
      res.status(400).json({ error: 'A valid email address (e.g., name@domain.com) is required.' });
      return;
    }
    const provider: UserProfile['authProvider'] =
      authProvider === 'google' || authProvider === 'microsoft' ? authProvider : 'email';

    if (provider === 'email') {
      const storedHash = credentialsStore[cleanEmail];
      if (!profileStore[cleanEmail]) {
        res.status(404).json({ error: 'No account found for this email. Switch to Create Account to register.' });
        return;
      }
      if (portalMode === 'admin' && profileStore[cleanEmail].role !== 'admin') {
        res.status(403).json({ error: 'Access denied: this account does not have Administrator privileges.' });
        return;
      }
      if (storedHash && (!password || !verifyPassword(password, storedHash))) {
        res.status(401).json({ error: 'Incorrect email or password.' });
        return;
      }
      if (!storedHash && profileStore[cleanEmail].authProvider !== 'email') {
        res.status(403).json({
          error: `This account uses ${profileStore[cleanEmail].authProvider.toUpperCase()} sign-in. Please continue with ${profileStore[cleanEmail].authProvider}.`,
        });
        return;
      }
      if (!storedHash && (!password || password.length < 6)) {
        res.status(401).json({ error: 'Password is required.' });
        return;
      }
      if (!storedHash && password && password.length >= 6) {
        credentialsStore[cleanEmail] = hashPassword(password);
        persistCredentialsStore();
      }
    } else {
      if (portalMode === 'admin') {
        res.status(403).json({ error: 'Admin Login requires verified administrator email and password.' });
        return;
      }
      let hasVerifiedGoogleToken = false;
      if (provider === 'google' && idToken) {
        try {
          const decoded = await verifyIdTokenFn(idToken);
          hasVerifiedGoogleToken =
            decoded.email?.toLowerCase() === cleanEmail && Boolean(decoded.email_verified);
          if (!hasVerifiedGoogleToken) {
            res.status(403).json({ error: 'Google ID token did not verify this email address.' });
            return;
          }
        } catch {
          res.status(401).json({ error: 'Invalid or expired Google ID token.' });
          return;
        }
      }

      const existingAccount = profileStore[cleanEmail];
      if (existingAccount && !hasVerifiedGoogleToken) {
        if (credentialsStore[cleanEmail] || existingAccount.authProvider !== provider) {
          res.status(403).json({
            error:
              existingAccount.authProvider === 'email'
                ? 'This email is registered with a password. Please sign in with your email and password.'
                : `This email is registered with ${existingAccount.authProvider}. Please verify via ${existingAccount.authProvider}.`,
          });
          return;
        }
      }
    }

    if (profileStore[cleanEmail]) {
      const existing = { ...profileStore[cleanEmail], isSignedIn: true };
      if (existing.twoFactorEnabled) {
        const method: 'email' | 'phone' =
          existing.twoFactorMethod === 'phone' && existing.phone ? 'phone' : 'email';
        const target = method === 'phone' ? normalizePhoneNumber(existing.phone || '') : cleanEmail;
        const challenge = createOtpChallenge({
          target,
          channel: method,
          purpose: '2fa',
          userKey: cleanEmail,
        });
        res.json({
          ok: true,
          requires2FA: true,
          challengeId: challenge.challengeId,
          method,
          maskedTarget: challenge.maskedTarget,
          expiresInSec: challenge.expiresInSec,
          ...(shouldExposeSandboxOtp() ? { devPreviewCode: challenge.code } : {}),
        });
        return;
      }

      profileStore[cleanEmail] = existing;
      persistProfileStore();
      const { token } = createDeviceSession(cleanEmail, existing.role || 'student', req);
      res.json({ ok: true, key: cleanEmail, token, isNew: false, profile: existing });
      return;
    }

    const nowIso = new Date().toISOString();
    const freshProfile = createFreshUserProfile({
      name: sanitizeTextField(name || '', 80) || cleanEmail.split('@')[0],
      email: cleanEmail,
      authProvider: provider,
      role: 'student',
      emailVerified: provider === 'google',
      acceptedTermsAt: nowIso,
      acceptedPrivacyAt: nowIso,
    });
    profileStore[cleanEmail] = freshProfile;
    persistProfileStore();
    const { token } = createDeviceSession(cleanEmail, freshProfile.role || 'student', req);
    res.json({ ok: true, key: cleanEmail, token, isNew: true, profile: freshProfile });
  });

  // Verify 2FA OTP challenge during login
  app.post('/api/auth/2fa/verify', (req, res) => {
    const { challengeId, code } = req.body as { challengeId?: string; code?: string };
    if (!challengeId || !code) {
      res.status(400).json({ error: 'Verification challengeId and 6-digit code are required.' });
      return;
    }
    const challenge = otpStore[challengeId];
    if (!challenge || challenge.purpose !== '2fa') {
      res.status(404).json({ error: '2FA challenge not found or already used.' });
      return;
    }
    if (Date.now() > challenge.expiresAt) {
      delete otpStore[challengeId];
      res.status(410).json({ error: '2FA verification code expired. Please sign in again.' });
      return;
    }
    if (challenge.attempts >= 5) {
      delete otpStore[challengeId];
      res.status(429).json({ error: 'Too many invalid 2FA attempts. Please sign in again.' });
      return;
    }
    if (!verifyOtpCode(code, challenge.hash, challenge.salt)) {
      challenge.attempts += 1;
      res.status(401).json({ error: 'Invalid 2FA verification code.' });
      return;
    }

    const userKey = challenge.userKey;
    delete otpStore[challengeId];
    if (!userKey || !profileStore[userKey]) {
      res.status(404).json({ error: 'Associated account was not found.' });
      return;
    }
    const updated = { ...profileStore[userKey], isSignedIn: true };
    profileStore[userKey] = updated;
    persistProfileStore();
    const { token } = createDeviceSession(userKey, updated.role || 'student', req);
    res.json({ ok: true, key: userKey, token, profile: updated });
  });

  // Enable / disable Two-Factor Authentication for authenticated user
  app.post('/api/auth/2fa/toggle', (req, res) => {
    const key = typeof req.query.key === 'string' ? req.query.key.trim().toLowerCase() : '';
    if (!verifyProfileAccess(req, key).valid) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const existing = profileStore[key];
    if (!existing) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }
    const { enabled, method } = req.body as { enabled?: boolean; method?: 'email' | 'phone' };
    const nextMethod: 'email' | 'phone' = method === 'phone' ? 'phone' : 'email';
    if (enabled && nextMethod === 'phone' && !existing.phone?.trim()) {
      res.status(400).json({ error: 'Add a phone number to your profile before enabling SMS 2FA.' });
      return;
    }
    const updated: UserProfile = {
      ...existing,
      twoFactorEnabled: Boolean(enabled),
      twoFactorMethod: nextMethod,
    };
    profileStore[key] = updated;
    persistProfileStore();
    res.json({ ok: true, profile: updated });
  });

  // Send OTP for Phone Auth, Email Verification, or Password Reset
  app.post('/api/auth/otp/send', (req, res) => {
    const { target, channel, purpose } = req.body as {
      target?: string;
      channel?: 'phone' | 'email';
      purpose?: OtpPurpose;
    };
    const resolvedPurpose: OtpPurpose =
      purpose === 'email-verify' || purpose === 'password-reset' ? purpose : 'phone-auth';
    const resolvedChannel: 'phone' | 'email' =
      channel === 'email' || resolvedPurpose === 'email-verify' ? 'email' : 'phone';

    if (!target || !target.trim()) {
      res.status(400).json({ error: 'Contact email or phone number is required.' });
      return;
    }

    let normalizedTarget = '';
    let userKey: string | undefined;

    if (resolvedChannel === 'phone') {
      if (!isValidPhoneNumber(target)) {
        res.status(400).json({ error: 'Enter a valid phone number (7–15 digits, e.g., +919876543210).' });
        return;
      }
      normalizedTarget = normalizePhoneNumber(target);
      if (resolvedPurpose === 'password-reset') {
        const found = Object.entries(profileStore).find(
          ([, p]) => normalizePhoneNumber(p.phone || '') === normalizedTarget,
        );
        if (!found) {
          res.status(404).json({ error: 'No account is linked to this phone number.' });
          return;
        }
        userKey = found[0];
      }
    } else {
      normalizedTarget = sanitizeTextField(target, 160).toLowerCase();
      if (!isValidEmailFormat(normalizedTarget)) {
        res.status(400).json({ error: 'Please enter a valid email address.' });
        return;
      }
      if (resolvedPurpose === 'password-reset') {
        if (!profileStore[normalizedTarget]) {
          res.status(404).json({ error: 'No account found for this email address.' });
          return;
        }
        userKey = normalizedTarget;
      } else if (resolvedPurpose === 'email-verify') {
        const key = typeof req.query.key === 'string' ? req.query.key.trim().toLowerCase() : normalizedTarget;
        if (!verifyProfileAccess(req, key).valid) {
          res.status(401).json({ error: 'Sign in first to verify your email address.' });
          return;
        }
        userKey = key;
      }
    }

    const challenge = createOtpChallenge({
      target: normalizedTarget,
      channel: resolvedChannel,
      purpose: resolvedPurpose,
      userKey,
    });
    res.json({
      ok: true,
      challengeId: challenge.challengeId,
      maskedTarget: challenge.maskedTarget,
      expiresInSec: challenge.expiresInSec,
      ...(shouldExposeSandboxOtp() ? { devPreviewCode: challenge.code } : {}),
    });
  });

  // Verify OTP for Phone Auth, Email Verification, or Password Reset step
  app.post('/api/auth/otp/verify', (req, res) => {
    const {
      challengeId,
      code,
      name,
      role,
      acceptedTerms,
      acceptedPrivacy,
    } = req.body as {
      challengeId?: string;
      code?: string;
      name?: string;
      role?: AccountRole;
      acceptedTerms?: boolean;
      acceptedPrivacy?: boolean;
    };

    if (!challengeId || !code) {
      res.status(400).json({ error: 'Verification challengeId and 6-digit OTP code are required.' });
      return;
    }
    const challenge = otpStore[challengeId];
    if (!challenge) {
      res.status(404).json({ error: 'OTP challenge not found or expired.' });
      return;
    }
    if (Date.now() > challenge.expiresAt) {
      delete otpStore[challengeId];
      res.status(410).json({ error: 'OTP expired. Request a fresh code.' });
      return;
    }
    if (challenge.attempts >= 5) {
      delete otpStore[challengeId];
      res.status(429).json({ error: 'Maximum OTP attempts exceeded. Request a new code.' });
      return;
    }
    if (!verifyOtpCode(code, challenge.hash, challenge.salt)) {
      challenge.attempts += 1;
      res.status(401).json({ error: 'Incorrect OTP code. Please check and retry.' });
      return;
    }

    if (challenge.purpose === 'password-reset') {
      challenge.verifiedForReset = true;
      res.json({ ok: true, verified: true, challengeId });
      return;
    }

    if (challenge.purpose === 'email-verify') {
      const targetKey = (challenge.userKey || challenge.target).toLowerCase();
      delete otpStore[challengeId];
      if (!profileStore[targetKey]) {
        res.status(404).json({ error: 'Profile not found.' });
        return;
      }
      const updated: UserProfile = {
        ...profileStore[targetKey],
        emailVerified: true,
      };
      profileStore[targetKey] = updated;
      persistProfileStore();
      res.json({ ok: true, profile: updated });
      return;
    }

    // phone-auth flow: sign in existing phone account or create new phone-authenticated account
    const normalizedPhone = normalizePhoneNumber(challenge.target);
    const digits = normalizedPhone.replace(/\D/g, '');
    const existingMatch = Object.entries(profileStore).find(
      ([, p]) => normalizePhoneNumber(p.phone || '') === normalizedPhone,
    );

    if (existingMatch) {
      delete otpStore[challengeId];
      const [foundKey, foundProfile] = existingMatch;
      const updated: UserProfile = {
        ...foundProfile,
        phone: normalizedPhone,
        phoneVerified: true,
        isSignedIn: true,
      };
      profileStore[foundKey] = updated;
      persistProfileStore();
      const { token } = createDeviceSession(foundKey, updated.role || 'student', req);
      res.json({ ok: true, key: foundKey, token, isNew: false, profile: updated });
      return;
    }

    if (role === 'admin') {
      res.status(403).json({ error: 'Admin accounts cannot be created via phone OTP.' });
      return;
    }
    if (!acceptedTerms || !acceptedPrivacy) {
      res.status(400).json({
        error: 'Please accept Terms & Conditions and Privacy Policy to complete registration.',
        needsRegistrationTerms: true,
      });
      return;
    }

    delete otpStore[challengeId];
    const resolvedRole: AccountRole =
      role && SELF_REGISTER_ROLES.includes(role) ? role : 'student';
    const phoneKey = `phone-${digits}@phone.voragen.local`;
    const nowIso = new Date().toISOString();
    const freshProfile = createFreshUserProfile({
      name: sanitizeTextField(name || '', 80) || `User ${digits.slice(-4)}`,
      email: phoneKey,
      authProvider: 'phone',
      role: resolvedRole,
      phone: normalizedPhone,
      emailVerified: false,
      phoneVerified: true,
      acceptedTermsAt: nowIso,
      acceptedPrivacyAt: nowIso,
    });
    profileStore[phoneKey] = freshProfile;
    persistProfileStore();
    const { token } = createDeviceSession(phoneKey, resolvedRole, req);
    res.json({ ok: true, key: phoneKey, token, isNew: true, profile: freshProfile });
  });

  // Complete password reset using verified OTP challenge
  app.post('/api/auth/reset-password', (req, res) => {
    const { challengeId, code, newPassword } = req.body as {
      challengeId?: string;
      code?: string;
      newPassword?: string;
    };
    if (!challengeId || !newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'Challenge ID and a new password (min 6 characters) are required.' });
      return;
    }
    const challenge = otpStore[challengeId];
    if (!challenge || challenge.purpose !== 'password-reset') {
      res.status(404).json({ error: 'Password reset challenge not found or expired.' });
      return;
    }
    if (Date.now() > challenge.expiresAt) {
      delete otpStore[challengeId];
      res.status(410).json({ error: 'Password reset OTP expired. Request a new code.' });
      return;
    }
    if (!challenge.verifiedForReset) {
      if (!code || !verifyOtpCode(code, challenge.hash, challenge.salt)) {
        challenge.attempts += 1;
        res.status(401).json({ error: 'Invalid OTP code for password reset.' });
        return;
      }
    }

    const userKey = (challenge.userKey || challenge.target).toLowerCase();
    delete otpStore[challengeId];
    if (!profileStore[userKey]) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }
    credentialsStore[userKey] = hashPassword(newPassword);
    persistCredentialsStore();
    // Revoke existing device sessions after password reset for security
    revokeAllUserSessions(userKey);
    res.json({ ok: true });
  });

  // List active sessions across all devices for authenticated user
  app.get('/api/auth/sessions', (req, res) => {
    const key = typeof req.query.key === 'string' ? req.query.key.trim().toLowerCase() : '';
    const verified = verifyProfileAccess(req, key);
    if (!verified.valid) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const sessions = Object.values(sessionsStore)
      .filter((s) => s.userKey === key && !s.revokedAt)
      .sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt))
      .map((s) => ({
        sessionId: s.sessionId,
        userKey: s.userKey,
        deviceLabel: s.deviceLabel,
        browser: s.browser,
        os: s.os,
        ip: s.ip,
        createdAt: s.createdAt,
        lastActiveAt: s.lastActiveAt,
        isCurrent: s.sessionId === verified.jti,
      }));
    res.json({ ok: true, sessions });
  });

  // Revoke a specific device session
  app.delete('/api/auth/sessions/:sessionId', (req, res) => {
    const key = typeof req.query.key === 'string' ? req.query.key.trim().toLowerCase() : '';
    const verified = verifyProfileAccess(req, key);
    if (!verified.valid) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const targetId = req.params.sessionId;
    const sess = sessionsStore[targetId];
    if (!sess || sess.userKey !== key) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    sess.revokedAt = new Date().toISOString();
    persistSessionsStore();
    res.json({ ok: true, revokedSessionId: targetId, revokedCurrent: targetId === verified.jti });
  });

  // Sign out all other devices while keeping current session active
  app.post('/api/auth/sessions/revoke-others', (req, res) => {
    const key = typeof req.query.key === 'string' ? req.query.key.trim().toLowerCase() : '';
    const verified = verifyProfileAccess(req, key);
    if (!verified.valid) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const revokedCount = revokeAllUserSessions(key, verified.jti);
    res.json({ ok: true, revokedCount });
  });

  // Revoke current session on logout
  app.post('/api/auth/logout', (req, res) => {
    const key = typeof req.query.key === 'string' ? req.query.key.trim().toLowerCase() : '';
    const verified = verifyProfileAccess(req, key);
    if (verified.valid && verified.jti && sessionsStore[verified.jti]) {
      sessionsStore[verified.jti].revokedAt = new Date().toISOString();
      persistSessionsStore();
    }
    res.json({ ok: true });
  });

  // Cloud SQL Authenticated Learner Snapshot & Progress Endpoints
  app.get('/api/sql/profile', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@pathforge.local`;
      await sql.getOrCreateUser(uid, email, req.user!.name || null);
      const dashboard = await sql.getUserDashboardRecords(uid);
      res.json({ ok: true, dashboard });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.put('/api/sql/profile', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@pathforge.local`;
      const body = req.body as {
        displayName?: string;
        targetCareerId?: string;
        streakPoints?: number;
        streakDays?: number;
      };
      await sql.getOrCreateUser(uid, email, body.displayName || req.user!.name || null);
      const updated = await sql.updateUserCareerSnapshot(uid, {
        displayName: body.displayName,
        targetCareerId: body.targetCareerId,
        streakPoints: body.streakPoints,
        streakDays: body.streakDays,
      });
      res.json({ ok: true, user: updated });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/sql/assessments', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@pathforge.local`;
      const { skillName, scorePct, remedialTriggered, notes } = req.body as {
        skillName?: string;
        scorePct?: number;
        remedialTriggered?: boolean;
        notes?: string;
      };
      if (!skillName || typeof scorePct !== 'number') {
        res.status(400).json({ error: 'skillName and numeric scorePct are required' });
        return;
      }
      const created = await sql.recordSqlAssessment(uid, email, {
        skillName,
        scorePct,
        remedialTriggered: Boolean(remedialTriggered),
        notes,
      });
      res.json({ ok: true, assessment: created });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Multi-Model Interactions API Chatbot (Free-tier default models: gemini-4-hydrogen & gemini-3.1-flash-lite)
  app.post('/api/ai/chat', async (req, res) => {
    const { message: rawMessage, model, thinkingLevel, previousInteractionId, profile } = req.body as {
      message?: string;
      model?: ChatModelId;
      thinkingLevel?: ThinkingPreset;
      previousInteractionId?: string;
      profile?: UserProfile;
    };

    const message = sanitizeTextField(rawMessage || '', 2000);
    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const selectedModel: ChatModelId =
      model === 'gemini-3.1-flash-lite' ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';
    const resolvedThinking = normalizeThinkingLevel(selectedModel, thinkingLevel);
    const targetRole = profile
      ? CAREER_ROLES.find((r) => r.id === profile.targetCareerId) ?? CAREER_ROLES[0]
      : CAREER_ROLES[0];
    const match = profile
      ? calculateSkillMatch(profile.skills, targetRole, profile.certifications, profile.projects)
      : null;

    const systemInstruction = `You are Voragen's Senior Career & Technical Coach.
${
  profile && match
    ? `Active learner: ${profile.name}. Target role: ${targetRole.title} (${match.overallReadinessPct}% ready).
Current skills: ${profile.skills.map((s) => `${s.name} (${s.level}%)`).join(', ') || 'None'}.
Missing skills: ${match.missingSkillNames.join(', ') || 'None'}.`
    : ''
}
Give clear, accurate, actionable guidance with code examples or concrete study steps when relevant.`;

    const ai = resolveAiClient();
    const activeModel = ai ? modelCooldowns.pickAvailableModel(selectedModel) : null;
    if (ai && activeModel) {
      const resolvedActiveThinking = normalizeThinkingLevel(activeModel, thinkingLevel);
      try {
        const interaction = await withTimeout(
          ai.interactions.create({
            model: activeModel,
            input: message.trim(),
            previous_interaction_id: previousInteractionId || undefined,
            system_instruction: previousInteractionId ? undefined : systemInstruction,
            generation_config: {
              thinking_level: resolvedActiveThinking as never,
              thinking_summaries: 'auto',
            },
          }),
          14000,
        );

        const steps = (interaction.steps || []) as unknown as InteractionStepLike[];
        const { text, thoughtSummary } = combineInteractionText(steps);
        const reply = text || interaction.output_text || 'I processed your question — try rephrasing with more context.';

        res.json({
          reply,
          thoughtSummary,
          interactionId: interaction.id,
          modelUsed: activeModel,
          thinkingLevel: resolvedActiveThinking,
          source: 'gemini-interactions',
        });
        return;
      } catch (err) {
        modelCooldowns.recordError(activeModel, err);
        const formatted = formatGeminiError(err);
        if (formatted.status === 403) {
          res.status(403).json({ error: formatted.message, needsPaidKey: true });
          return;
        }
      }
    }

    // Grounded adaptive career coach fallback when GEMINI_API_KEY is unset or quota is cooling down
    const nextGap = match?.missingSkillNames[0] || targetRole.requiredSkills[0]?.name || 'React';
    const fallbackReply = `Focusing on **${targetRole.title}**${match ? ` (currently ${match.overallReadinessPct}% ready)` : ''}: prioritize **${nextGap}** next. Break your session into 20 minutes of core concept mastery, 1 interactive Skill Analysis check, and 2 Code Arena problems targeting ${nextGap}.`;
    res.json({
      reply: fallbackReply,
      thoughtSummary: `Analyzed learner profile against ${targetRole.title} competencies using adaptive heuristics (${selectedModel} · ${resolvedThinking}).`,
      interactionId: previousInteractionId || `local-${Date.now()}`,
      modelUsed: selectedModel,
      thinkingLevel: resolvedThinking,
      source: 'adaptive-engine',
    });
  });

  // Search & Maps Grounded Career Advisor
  app.post('/api/ai/grounded-search', async (req, res) => {
    const { query: rawQuery, useSearch = true, useMaps = false, cityHint: rawCityHint } = req.body as {
      query?: string;
      useSearch?: boolean;
      useMaps?: boolean;
      cityHint?: string;
    };

    const query = sanitizeTextField(rawQuery || '', 500);
    const cityHint = sanitizeTextField(rawCityHint || '', 100);
    if (!query) {
      res.status(400).json({ error: 'Query is required' });
      return;
    }

    const tools: Array<{ type: 'google_search' } | { type: 'google_maps' }> = [];
    if (useSearch) tools.push({ type: 'google_search' });
    if (useMaps) tools.push({ type: 'google_maps' });
    if (tools.length === 0) tools.push({ type: 'google_search' });

    const ai = resolveAiClient();
    const searchModel = ai ? modelCooldowns.pickAvailableModel('gemini-4-hydrogen') : null;
    if (ai && searchModel) {
      try {
        const prompt = cityHint
          ? `${query.trim()}\nFocus location context: ${cityHint}`
          : query.trim();
        const interaction = await withTimeout(
          ai.interactions.create({
            model: searchModel,
            input: prompt,
            tools: tools as never,
            system_instruction:
              'Provide factual, up-to-date career, tech hiring, or employer location intelligence grounded in Google Search and Google Maps results. Keep answers concise and structured.',
          }),
          15000,
        );

        const steps = (interaction.steps || []) as unknown as InteractionStepLike[];
        const { text } = combineInteractionText(steps);
        const sources = extractGroundingSources(steps);

        res.json({
          text: text || interaction.output_text || 'No grounded summary returned.',
          sources,
          modelUsed: searchModel,
          source: 'gemini-grounded',
        });
        return;
      } catch (err) {
        modelCooldowns.recordError(searchModel, err);
        const formatted = formatGeminiError(err);
        if (formatted.status === 403) {
          res.status(403).json({ error: formatted.message, needsPaidKey: true });
          return;
        }
      }
    }

    const fallbackSources = [
      ...(useMaps
        ? [
            {
              title: `${cityHint || 'Global'} Tech Employer Hubs on Google Maps`,
              url: `https://www.google.com/maps/search/${encodeURIComponent(cityHint ? `software companies in ${cityHint}` : 'major technology campuses')}`,
              sourceType: 'maps' as const,
            },
          ]
        : []),
      ...(useSearch
        ? [
            {
              title: 'MDN & Roadmap Engineering Guides',
              url: 'https://developer.mozilla.org/en-US/docs/Learn',
              sourceType: 'search' as const,
            },
            {
              title: 'Google Careers Engineering Roles',
              url: 'https://www.google.com/about/careers/applications/',
              sourceType: 'search' as const,
            },
          ]
        : []),
    ];

    res.json({
      text: `Grounded Career Brief for "${query.trim()}"${cityHint ? ` (${cityHint})` : ''}: Top hiring teams emphasize TypeScript, React, Node.js/Python APIs, SQL query optimization, and verifiable project architectures. Open the curated reference links below or enable GEMINI_API_KEY in AI Studio Secrets for live real-time Search & Maps citations.`,
      sources: fallbackSources,
      modelUsed: 'gemini-4-hydrogen',
      source: 'adaptive-engine',
    });
  });

  // Audio Transcription Endpoint (gemini-3.5-transcribe)
  app.post('/api/ai/transcribe', async (req, res) => {
    const { audioBase64, mimeType, prompt } = req.body as {
      audioBase64?: string;
      mimeType?: string;
      prompt?: string;
    };

    if (!audioBase64) {
      res.status(400).json({ error: 'audioBase64 is required' });
      return;
    }

    const ai = resolveAiClient();
    if (ai && modelCooldowns.isAvailable('gemini-3.5-transcribe')) {
      try {
        const interaction = await withTimeout(
          ai.interactions.create({
            model: 'gemini-3.5-transcribe',
            input: [
              {
                type: 'text',
                text: prompt || 'Transcribe this learner recording accurately and summarize the key technical goal in 1 sentence.',
              },
              {
                type: 'audio',
                data: audioBase64,
                mime_type: mimeType || 'audio/webm',
              },
            ],
          }),
          15000,
        );
        const steps = (interaction.steps || []) as unknown as InteractionStepLike[];
        const { text } = combineInteractionText(steps);
        res.json({
          transcript: text || interaction.output_text || 'Transcription complete.',
          modelUsed: 'gemini-3.5-transcribe',
          source: 'gemini-transcribe',
        });
        return;
      } catch (err) {
        modelCooldowns.recordError('gemini-3.5-transcribe', err);
        const formatted = formatGeminiError(err);
        if (formatted.status === 403) {
          res.status(403).json({ error: formatted.message, needsPaidKey: true });
          return;
        }
      }
    }

    res.json({
      transcript:
        'Audio clip received cleanly. Live transcription will resume automatically once API quota refreshes.',
      modelUsed: 'gemini-3.5-transcribe',
      source: 'adaptive-engine',
    });
  });

  // Mock Technical Interview Evaluation Endpoint
  app.post('/api/ai/interview-eval', async (req, res) => {
    const { question: rawQuestion, answer: rawAnswer, roleTitle: rawRoleTitle } = req.body as {
      question?: string;
      answer?: string;
      roleTitle?: string;
    };
    const question = sanitizeTextField(rawQuestion || '', 600);
    const answer = sanitizeTextField(rawAnswer || '', 3000);
    const roleTitle = sanitizeTextField(rawRoleTitle || '', 120);
    if (!question || !answer) {
      res.status(400).json({ error: 'Question and answer are required' });
      return;
    }

    const ai = resolveAiClient();
    const evalModel = ai ? modelCooldowns.pickAvailableModel('gemini-4-hydrogen') : null;
    if (ai && evalModel) {
      try {
        const response = await withTimeout(
          ai.models.generateContent({
            model: evalModel,
            contents: `Evaluate this candidate's mock interview answer for a ${roleTitle || 'Software Engineer'} role.
Question: ${question}
Candidate Answer: ${answer}
Score 0-100, list 2 concrete strengths, 2 concrete improvements, and 2-sentence rubric feedback.`,
            config: {
              thinkingConfig: { thinkingLevel: getThinkingForModel(evalModel) },
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  scorePct: { type: Type.INTEGER },
                  strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                  improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
                  modelFeedback: { type: Type.STRING },
                },
              },
            },
          }),
          7500,
        );
        const parsed = JSON.parse(response.text || '{}') as Partial<InterviewEvaluation>;
        if (typeof parsed.scorePct === 'number') {
          res.json({
            scorePct: Math.max(0, Math.min(100, parsed.scorePct)),
            strengths: parsed.strengths || ['Clear attempt at framing the problem'],
            improvements: parsed.improvements || ['Add concrete trade-offs and edge-case handling'],
            modelFeedback: parsed.modelFeedback || 'Solid foundation; back claims with metrics or complexity analysis.',
          });
          return;
        }
      } catch (err) {
        modelCooldowns.recordError(evalModel, err);
      }
    }

    const wordCount = answer.trim().split(/\s+/).length;
    const hasTechTerms = /(api|database|cache|async|complexity|o\(|state|test|index|scale|auth|security|component)/i.test(
      answer,
    );
    const scorePct = Math.min(95, Math.max(35, 38 + Math.min(35, wordCount) + (hasTechTerms ? 22 : 0)));
    const fallback: InterviewEvaluation = {
      scorePct,
      strengths: [
        wordCount >= 20 ? 'Structured explanation with sufficient context' : 'Concise direct response',
        hasTechTerms ? 'Included concrete engineering terminology' : 'Focused on core goal',
      ],
      improvements: [
        'Explicitly state time/space complexity or failure recovery paths',
        'Give a measurable real-world project example to prove experience',
      ],
      modelFeedback: `Rubric score: ${scorePct}%. ${
        scorePct >= 75
          ? 'Strong interview-ready answer demonstrating solid architectural awareness.'
          : 'Expand on implementation details, edge cases, and trade-offs to reach senior-ready clarity.'
      }`,
    };
    res.json(fallback);
  });

  // Multi-Agent AI Collaboration Pipeline
  app.post('/api/ai/collaborate', async (req, res) => {
    const { profile, triggerReason } = req.body as {
      profile: UserProfile;
      triggerReason?: string;
    };

    if (!profile) {
      res.status(400).json({ error: 'Profile is required' });
      return;
    }

    const targetRole =
      CAREER_ROLES.find((r) => r.id === profile.targetCareerId) ?? CAREER_ROLES[0];
    const match = calculateSkillMatch(
      profile.skills,
      targetRole,
      profile.certifications,
      profile.projects,
    );
    const roadmap = generateAdaptiveRoadmap(
      profile.skills,
      targetRole,
      profile.remedialSkills,
      profile.completedModuleIds,
      LEARNING_CATALOG,
    );

    const cacheKey = buildProfileCollaborationKey(profile, triggerReason);
    const cachedReport = collaborateCache.get(cacheKey);
    if (cachedReport) {
      res.json(cachedReport);
      return;
    }

    const lowAssessments = profile.assessments.filter((a) => a.scorePct < 60);
    const ai = resolveAiClient();
    const isInitialStartupSync = triggerReason === 'Initial Student Profile Diagnostics';
    const selectedModel =
      ai && !isInitialStartupSync ? modelCooldowns.pickAvailableModel('gemini-4-hydrogen') : null;

    if (ai && selectedModel) {
      const prompt = `You are coordinating 4 specialized AI agents in Voragen for a learner:
Learner Name: ${profile.name}
Target Career: ${targetRole.title} (${targetRole.domain})
Current Skills: ${profile.skills.map((s) => `${s.name} (${s.level}%)`).join(', ')}
Missing Skills: ${match.missingSkillNames.join(', ') || 'None'}
Weak Skills (<60%): ${match.weakSkillNames.join(', ') || 'None'}
Low Assessments (<60%): ${lowAssessments.map((a) => `${a.skillName}: ${a.scorePct}%`).join(', ') || 'None'}
Certifications: ${profile.certifications.map((c) => c.title).join(', ') || 'None'}
Projects: ${profile.projects.map((p) => p.title).join(', ') || 'None'}
Trigger Event: ${triggerReason || 'Manual full diagnostic sync'}
Overall Computed Readiness: ${match.overallReadinessPct}%

Produce concise, grounded outputs from the 4 collaborating agents:
1. Skill Profiler Agent (Dr. Elena Vance)
2. Market Matcher Agent (Marcus Chen)
3. Curriculum Architect Agent (Prof. Aria Kapoor)
4. Adaptive Career Mentor Agent (Voragen Coordinator)`;

      const modelsToTry: GeminiTextModel[] =
        selectedModel === 'gemini-4-hydrogen' && modelCooldowns.isAvailable('gemini-3.1-flash-lite')
          ? ['gemini-4-hydrogen', 'gemini-3.1-flash-lite']
          : [selectedModel];

      for (const candidateModel of modelsToTry) {
        try {
          const response = await withTimeout(
            ai.models.generateContent({
              model: candidateModel,
              contents: prompt,
              config: {
                thinkingConfig: { thinkingLevel: getThinkingForModel(candidateModel) },
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    executiveSummary: { type: Type.STRING },
                    recalibrationNotice: { type: Type.STRING },
                    steps: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          agentName: { type: Type.STRING },
                          agentRole: { type: Type.STRING },
                          summary: { type: Type.STRING },
                          actionItems: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                          },
                        },
                      },
                    },
                  },
                },
              },
            }),
            7500,
          );

          const parsed = JSON.parse(response.text || '{}') as {
            executiveSummary?: string;
            recalibrationNotice?: string;
            steps?: Array<{
              agentName: string;
              agentRole: string;
              summary: string;
              actionItems: string[];
            }>;
          };

          if (parsed.steps && parsed.steps.length >= 3) {
            const report: MultiAgentReport = {
              generatedAt: new Date().toISOString(),
              source: 'gemini-4-hydrogen',
              overallReadinessPct: match.overallReadinessPct,
              executiveSummary:
                parsed.executiveSummary ||
                `Multi-agent analysis complete for ${targetRole.title} (${match.overallReadinessPct}% readiness).`,
              recalibrationNotice:
                parsed.recalibrationNotice ||
                (lowAssessments.length > 0
                  ? `Remedial modules activated for ${lowAssessments.map((a) => a.skillName).join(', ')}.`
                  : undefined),
              steps: parsed.steps.map((s) => ({
                ...s,
                modelUsed: candidateModel,
              })),
              recommendedModules: roadmap.slice(0, 6),
            };
            collaborateCache.set(cacheKey, report);
            res.json(report);
            return;
          }
        } catch (err) {
          const wasQuota = modelCooldowns.recordError(candidateModel, err);
          if (!wasQuota) break;
        }
      }
    }

    const report: MultiAgentReport = {
      generatedAt: new Date().toISOString(),
      source: 'adaptive-engine',
      overallReadinessPct: match.overallReadinessPct,
      executiveSummary: `${profile.name} is currently at ${match.overallReadinessPct}% readiness for ${targetRole.title}. Strongest foundation: ${match.strongSkillNames.join(', ') || 'Core basics'}. Priority gaps: ${match.missingSkillNames.join(', ') || 'Advanced specialization'}.`,
      recalibrationNotice:
        lowAssessments.length > 0
          ? `Adaptive Trigger: Recent assessment below 60% in ${lowAssessments.map((a) => a.skillName).join(', ')}. Curriculum Architect reprioritized foundational labs.`
          : triggerReason
            ? `Roadmap synchronized after: ${triggerReason}`
            : undefined,
      steps: [
        {
          agentName: 'Skill Profiler Agent',
          agentRole: 'Dr. Elena Vance · Competency Diagnostics',
          modelUsed: 'adaptive-engine',
          summary: `Evaluated ${profile.skills.length} existing skills and ${profile.assessments.length} diagnostic scores. Verified strengths in ${match.strongSkillNames.join(', ') || 'problem solving'}.`,
          actionItems: [
            match.weakSkillNames.length > 0
              ? `Reinforce below-threshold areas: ${match.weakSkillNames.join(', ')}`
              : 'All existing core skills meet baseline stability.',
            `Leverage ${profile.projects.length} portfolio project(s) and ${profile.certifications.length} certification(s).`,
          ],
        },
        {
          agentName: 'Market Matcher Agent',
          agentRole: 'Marcus Chen · Role Alignment',
          modelUsed: 'adaptive-engine',
          summary: `Compared profile against ${targetRole.title} (${targetRole.demandGrowth}, ${targetRole.salaryRange}). Missing ${match.missingSkillNames.length} required competencies.`,
          actionItems: [
            match.missingSkillNames.length > 0
              ? `Bridge critical hiring gaps: ${match.missingSkillNames.join(', ')}`
              : 'Profile meets core technical checklist for target applications.',
            `Estimated ${match.estimatedWeeksToReady} week(s) to reach 85%+ interview readiness.`,
          ],
        },
        {
          agentName: 'Curriculum Architect Agent',
          agentRole: 'Prof. Aria Kapoor · Adaptive Pathing',
          modelUsed: 'adaptive-engine',
          summary: `Sequenced ${roadmap.length} personalized modules placing ${profile.remedialSkills.length > 0 ? 'remedial bootcamps first' : 'highest-weight skill gaps first'}.`,
          actionItems: roadmap.slice(0, 3).map((m) => `${m.priority}: ${m.title} (${m.durationHours}h)`),
        },
        {
          agentName: 'Career Mentor Coordinator',
          agentRole: 'Voragen Adaptive Guidance',
          modelUsed: 'adaptive-engine',
          summary: `Recommended daily cadence: 1 AI Video Lesson + 2 Code Arena challenges to extend your ${profile.streakDays}-day streak.`,
          actionItems: [
            'Complete next Skill Analysis quiz to validate progress.',
            'Build one end-to-end project combining your existing SQL/Python backend with React.',
          ],
        },
      ],
      recommendedModules: roadmap.slice(0, 6),
    };

    collaborateCache.set(cacheKey, report);
    res.json(report);
  });

  // AI Mentor Chat Endpoint
  app.post('/api/ai/mentor', async (req, res) => {
    const { mentorId, message: rawMessage, profile, history } = req.body as {
      mentorId: string;
      message: string;
      profile: UserProfile;
      history?: Array<{ role: 'user' | 'assistant'; text: string }>;
    };

    const message = sanitizeTextField(rawMessage || '', 2000);
    if (!message || !profile) {
      res.status(400).json({ error: 'Message and profile are required' });
      return;
    }

    const mentor = MENTOR_STAFF.find((m) => m.id === mentorId) ?? MENTOR_STAFF[0];
    const targetRole =
      CAREER_ROLES.find((r) => r.id === profile.targetCareerId) ?? CAREER_ROLES[0];
    const match = calculateSkillMatch(
      profile.skills,
      targetRole,
      profile.certifications,
      profile.projects,
    );

    const ai = resolveAiClient();
    const mentorModel = ai ? modelCooldowns.pickAvailableModel('gemini-4-hydrogen') : null;
    if (ai && mentorModel) {
      const recentHistory = (history || [])
        .slice(-4)
        .map((h) => `${h.role === 'user' ? 'Learner' : mentor.name}: ${h.text}`)
        .join('\n');
      const modelsToTry: GeminiTextModel[] =
        mentorModel === 'gemini-4-hydrogen' && modelCooldowns.isAvailable('gemini-3.1-flash-lite')
          ? ['gemini-4-hydrogen', 'gemini-3.1-flash-lite']
          : [mentorModel];

      for (const candidateModel of modelsToTry) {
        try {
          const response = await withTimeout(
            ai.models.generateContent({
              model: candidateModel,
              contents: `${recentHistory ? recentHistory + '\n' : ''}Learner: ${message}`,
              config: {
                thinkingConfig: { thinkingLevel: getThinkingForModel(candidateModel) },
                systemInstruction: `You are ${mentor.name}, ${mentor.role} at Voragen. Specialty: ${mentor.specialty}.
You are mentoring ${profile.name} who wants to become a ${targetRole.title}.
Current readiness: ${match.overallReadinessPct}%.
Current skills: ${profile.skills.map((s) => `${s.name} (${s.level}%)`).join(', ')}.
Missing skills: ${match.missingSkillNames.join(', ') || 'None'}.
Remedial skills needing care: ${profile.remedialSkills.join(', ') || 'None'}.
Give practical, encouraging, technically accurate advice in 3-5 concise sentences with concrete next steps.`,
              },
            }),
            7500,
          );

          if (response.text) {
            res.json({ reply: response.text.trim(), mentorName: mentor.name, source: candidateModel });
            return;
          }
        } catch (err) {
          const wasQuota = modelCooldowns.recordError(candidateModel, err);
          if (!wasQuota) break;
        }
      }
    }

    const nextGap = match.missingSkillNames[0] || match.weakSkillNames[0] || targetRole.requiredSkills[0].name;
    const reply = `Hi ${profile.name} — speaking as ${mentor.name} (${mentor.role}): based on your ${match.overallReadinessPct}% readiness for ${targetRole.title}, your highest-leverage next move is mastering ${nextGap}. Since you already have a solid footing in ${profile.skills.map((s) => s.name).slice(0, 2).join(' and ') || 'core logic'}, try pairing a 15-minute AI Video Lesson on ${nextGap} with two Medium challenges in the Code Arena today.`;

    res.json({ reply, mentorName: mentor.name, source: 'adaptive-engine' });
  });

  // AI Video Lesson Studio Generator
  app.post('/api/ai/video-lesson', async (req, res) => {
    const { topic: rawTopic, mentorId, targetRoleTitle: rawRoleTitle } = req.body as {
      topic: string;
      mentorId: string;
      targetRoleTitle: string;
    };

    const topic = sanitizeTextField(rawTopic || '', 120);
    const targetRoleTitle = sanitizeTextField(rawRoleTitle || '', 120);
    if (!topic) {
      res.status(400).json({ error: 'Topic is required' });
      return;
    }

    const mentor = MENTOR_STAFF.find((m) => m.id === mentorId) ?? MENTOR_STAFF[0];
    const ai = resolveAiClient();
    const videoModel = ai ? modelCooldowns.pickAvailableModel('gemini-4-hydrogen') : null;

    if (ai && videoModel) {
      const modelsToTry: GeminiTextModel[] =
        videoModel === 'gemini-4-hydrogen' && modelCooldowns.isAvailable('gemini-3.1-flash-lite')
          ? ['gemini-4-hydrogen', 'gemini-3.1-flash-lite']
          : [videoModel];

      for (const candidateModel of modelsToTry) {
        try {
          const response = await withTimeout(
            ai.models.generateContent({
              model: candidateModel,
              contents: `Create a crisp 4-scene interactive AI video lesson on "${topic}" tailored for a learner aiming to become a ${targetRoleTitle || 'Full Stack Developer'}, presented by ${mentor.name}. Each scene needs a title, concise spoken narration (2 sentences), a visualDiagramTitle, a short practical codeSnippet (4-8 lines), and a 1-line keyTakeaway.`,
              config: {
                thinkingConfig: { thinkingLevel: getThinkingForModel(candidateModel) },
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    scenes: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          sceneNumber: { type: Type.INTEGER },
                          title: { type: Type.STRING },
                          narration: { type: Type.STRING },
                          visualDiagramTitle: { type: Type.STRING },
                          codeSnippet: { type: Type.STRING },
                          keyTakeaway: { type: Type.STRING },
                          durationSec: { type: Type.INTEGER },
                        },
                      },
                    },
                  },
                },
              },
            }),
            7500,
          );

          const parsed = JSON.parse(response.text || '{}') as { scenes?: AIVideoLesson['scenes'] };
          if (parsed.scenes && parsed.scenes.length >= 3) {
            const totalDurationSec = parsed.scenes.reduce((acc, s) => acc + (s.durationSec || 18), 0);
            const lesson: AIVideoLesson = {
              id: `vid-${Date.now()}`,
              topic,
              targetRole: targetRoleTitle,
              mentorName: mentor.name,
              totalDurationSec,
              scenes: parsed.scenes.map((s, idx) => ({
                ...s,
                sceneNumber: idx + 1,
                durationSec: s.durationSec || 18,
              })),
            };
            res.json(lesson);
            return;
          }
        } catch (err) {
          const wasQuota = modelCooldowns.recordError(candidateModel, err);
          if (!wasQuota) break;
        }
      }
    }

    const lesson: AIVideoLesson = {
      id: `vid-${Date.now()}`,
      topic,
      targetRole: targetRoleTitle || 'Full Stack Developer',
      mentorName: mentor.name,
      totalDurationSec: 72,
      scenes: [
        {
          sceneNumber: 1,
          title: `Why ${topic} Matters for ${targetRoleTitle || 'Your Goal'}`,
          narration: `Welcome to ${mentor.name}'s studio session. Today we bridge ${topic} directly to your existing foundations so you can ship production features with confidence.`,
          visualDiagramTitle: `${topic} Architecture Overview`,
          codeSnippet: `// Goal Alignment Blueprint\nconst skill = "${topic}";\nconst role = "${targetRoleTitle || 'Full Stack Developer'}";\nconsole.log(\`Bridging \${skill} -> \${role}\`);`,
          keyTakeaway: `${topic} unlocks real-world production capabilities required by top engineering teams.`,
          durationSec: 18,
        },
        {
          sceneNumber: 2,
          title: `Core Mental Model & Data Flow`,
          narration: `Think of ${topic} as predictable input-to-output transformations. Keeping state explicit prevents silent bugs under concurrent requests.`,
          visualDiagramTitle: `Input -> Transform -> Verified Output`,
          codeSnippet: `async function executePipeline(input) {\n  const validated = Boolean(input);\n  if (!validated) throw new Error("Invalid state");\n  return { status: "ready", topic: "${topic}" };\n}`,
          keyTakeaway: `Explicit validation boundaries keep ${topic} systems reliable and testable.`,
          durationSec: 18,
        },
        {
          sceneNumber: 3,
          title: `Common Mistakes & Production Guardrails`,
          narration: `Most learners lose assessment points by ignoring edge cases, null states, or async error propagation. Always handle failure paths cleanly.`,
          visualDiagramTitle: `Resilience & Error Boundary Pattern`,
          codeSnippet: `try {\n  const result = await fetch("/api/profile");\n  if (!result.ok) throw new Error("HTTP " + result.status);\n} catch (err) {\n  console.error("Recovered cleanly:", err.message);\n}`,
          keyTakeaway: `Defensive error handling separates hobby scripts from production engineering.`,
          durationSec: 18,
        },
        {
          sceneNumber: 4,
          title: `Your Next 20-Minute Action Sprint`,
          narration: `Now apply ${topic} immediately: solve one Easy or Medium Code Arena problem and take the Skill Analysis quiz to raise your readiness meter.`,
          visualDiagramTitle: `Learn -> Code -> Verify Mastery`,
          codeSnippet: `// Readiness Verification Loop\nconst steps = ["Watch Lesson", "Solve Code Arena", "Pass Assessment"];\nsteps.forEach((step, i) => console.log(\`\${i + 1}. \${step}\`));`,
          keyTakeaway: `Immediate active recall turns video knowledge into verified career readiness.`,
          durationSec: 18,
        },
      ],
    };

    res.json(lesson);
  });

  // Optional SQL AI session logger helper (best-effort)
  app.post('/api/sql/ai-session', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@pathforge.local`;
      const { mode, model, promptSummary } = req.body as {
        mode?: string;
        model?: string;
        promptSummary?: string;
      };
      const created = await sql.recordSqlAiSession(uid, email, {
        mode: mode || 'chat',
        model: model || 'gemini-4-hydrogen',
        promptSummary: promptSummary || 'Study session',
      });
    res.json({ ok: true, session: created });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  registerPlatformRoutes(app, {
    platformStore,
    persistPlatformStore,
    profileStore,
    sessionsStore,
    verifyProfileAccess,
  });

  return app;
}

async function startServer() {
  const app = createApiApp();

  // HTTP server + Live API WebSocket bridge (/ws/live)
  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', async (clientWs: WebSocket) => {
    const ai = getGeminiClient();
    if (!ai) {
      clientWs.send(
        JSON.stringify({
          type: 'status',
          mode: 'fallback',
          message:
            'Live Voice Tutor connected in offline coaching mode. Add GEMINI_API_KEY in AI Studio Secrets for bidirectional 16kHz/24kHz Gemini Live audio.',
        }),
      );
      clientWs.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString()) as { type?: string; text?: string };
          if (msg.type === 'text' && msg.text) {
            clientWs.send(
              JSON.stringify({
                type: 'text',
                text: `Live Coach Note: Break "${msg.text.slice(0, 60)}" into smaller milestones—review the syntax, run 2 Code Arena drills, and test your edge cases.`,
              }),
            );
          }
        } catch {
          // Ignore malformed client frames
        }
      });
      return;
    }

    let liveSession: Awaited<ReturnType<typeof ai.live.connect>> | null = null;
    try {
      liveSession = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction:
            'You are Voragen Live Voice Tutor. Coach learners concisely on programming, system design, and interview preparation in natural spoken English.',
        },
        callbacks: {
          onopen: () => {
            if (clientWs.readyState === clientWs.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: 'status',
                  mode: 'live',
                  message: 'Connected to Gemini 3.8 Live Tutor (16kHz in / 24kHz out).',
                }),
              );
            }
          },
          onmessage: (serverMsg) => {
            if (clientWs.readyState !== clientWs.OPEN) return;
            const parts = serverMsg.serverContent?.modelTurn?.parts || [];
            for (const part of parts) {
              if (part.inlineData?.data && part.inlineData.mimeType?.startsWith('audio/')) {
                clientWs.send(
                  JSON.stringify({
                    type: 'audio',
                    data: part.inlineData.data,
                    mimeType: part.inlineData.mimeType,
                  }),
                );
              } else if (part.text) {
                clientWs.send(JSON.stringify({ type: 'text', text: part.text }));
              }
            }
            if (serverMsg.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ type: 'interrupted' }));
            }
          },
          onerror: (err) => {
            if (clientWs.readyState === clientWs.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: 'error',
                  message: err?.message || 'Live API error',
                }),
              );
            }
          },
          onclose: () => {
            if (clientWs.readyState === clientWs.OPEN) {
              clientWs.send(JSON.stringify({ type: 'closed' }));
            }
          },
        },
      });
    } catch (err) {
      const formatted = formatGeminiError(err);
      if (clientWs.readyState === clientWs.OPEN) {
        clientWs.send(
          JSON.stringify({
            type: 'status',
            mode: 'fallback',
            message: formatted.message,
          }),
        );
      }
    }

    clientWs.on('message', (raw) => {
      if (!liveSession) return;
      try {
        const msg = JSON.parse(raw.toString()) as {
          type?: string;
          data?: string;
          text?: string;
        };
        if (msg.type === 'audio' && msg.data) {
          liveSession.sendRealtimeInput({
            audio: { data: msg.data, mimeType: 'audio/pcm;rate=16000' },
          });
        } else if (msg.type === 'text' && msg.text) {
          liveSession.sendClientContent({
            turns: [{ role: 'user', parts: [{ text: msg.text }] }],
            turnComplete: true,
          });
        }
      } catch {
        // Ignore non-JSON frames
      }
    });

    clientWs.on('close', () => {
      try {
        liveSession?.close();
      } catch {
        // Ignore close errors
      }
    });
  });

  httpServer.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`).pathname;
    if (pathname === '/ws/live') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  // Prevent browsers from caching stale HTML shell or favicon across rebrands/updates
  app.use((req, res, next) => {
    if (
      req.path === '/' ||
      req.path.endsWith('.html') ||
      req.path === '/favicon.svg' ||
      req.path === '/favicon.ico'
    ) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
    }
    next();
  });

  // Bind port 3000 immediately so healthchecks succeed while Vite warms up asynchronously
  if (process.env.NODE_ENV !== 'production') {
    process.env.DISABLE_HMR ??= 'true';
    const viteMiddlewarePromise = createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: 'spa',
    }).then((vite) => vite.middlewares);

    viteMiddlewarePromise.catch((err) => {
      console.error('Failed to initialize Vite dev middleware:', err);
    });

    app.use((req, res, next) => {
      if (req.path.startsWith('/api/') || req.path === '/api') {
        next();
        return;
      }
      viteMiddlewarePromise
        .then((middlewares) => middlewares(req, res, next))
        .catch(next);
    });
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false }));
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.on('error', (err) => {
    console.error(`Voragen server listen error on port ${PORT}:`, err);
    process.exit(1);
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Voragen server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VORAGEN_TEST_MODE) {
  startServer().catch((err) => {
    console.error('Failed to start Voragen server:', err);
    process.exit(1);
  });
}

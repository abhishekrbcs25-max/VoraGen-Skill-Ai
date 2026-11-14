import type { UserProfile } from '../types';

export type GeminiTextModel = 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite';

const MAX_COOLDOWN_MS = 60 * 60_000;
const DEFAULT_COOLDOWN_MS = 15 * 60_000;

export function isQuotaOrRateLimitError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('"code":429') ||
    msg.includes(' 429') ||
    msg.includes('rate limit')
  );
}

export function parseQuotaCooldownMs(
  err: unknown,
  defaultMs = DEFAULT_COOLDOWN_MS,
): number | null {
  if (!isQuotaOrRateLimitError(err)) return null;
  const msg = err instanceof Error ? err.message : String(err);
  const match = msg.match(/retryDelay["':\s]+(\d+)s/i) || msg.match(/retry in\s+(\d+)m/i);
  if (match) {
    const raw = Number(match[1]);
    if (!Number.isNaN(raw) && raw > 0) {
      const ms = msg.toLowerCase().includes('retry in') && !msg.includes('retryDelay')
        ? raw * 60_000
        : raw * 1000;
      return Math.min(MAX_COOLDOWN_MS, Math.max(30_000, ms));
    }
  }
  return defaultMs;
}

export class ModelCooldownTracker {
  private cooldowns = new Map<string, number>();

  isAvailable(model: string, nowMs = Date.now()): boolean {
    const until = this.cooldowns.get(model);
    if (!until) return true;
    if (nowMs >= until) {
      this.cooldowns.delete(model);
      return true;
    }
    return false;
  }

  recordError(model: string, err: unknown, nowMs = Date.now()): boolean {
    const cooldownMs = parseQuotaCooldownMs(err);
    if (cooldownMs === null) return false;
    this.cooldowns.set(model, nowMs + cooldownMs);
    return true;
  }

  pickAvailableModel(
    preferred: GeminiTextModel = 'gemini-4-hydrogen',
    nowMs = Date.now(),
  ): GeminiTextModel | null {
    const candidates: GeminiTextModel[] =
      preferred === 'gemini-3.1-flash-lite'
        ? ['gemini-3.1-flash-lite', 'gemini-4-hydrogen']
        : ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
    for (const candidate of candidates) {
      if (this.isAvailable(candidate, nowMs)) {
        return candidate;
      }
    }
    return null;
  }
}

export class TtlResponseCache<T> {
  private entries = new Map<string, { value: T; expiresAt: number }>();

  constructor(
    private readonly ttlMs = 10 * 60_000,
    private readonly maxEntries = 30,
  ) {}

  get(key: string, nowMs = Date.now()): T | null {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (nowMs >= entry.expiresAt) {
      this.entries.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: T, nowMs = Date.now()): void {
    if (this.entries.size >= this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey !== undefined) {
        this.entries.delete(oldestKey);
      }
    }
    this.entries.set(key, { value, expiresAt: nowMs + this.ttlMs });
  }
}

export function buildProfileCollaborationKey(
  profile: UserProfile,
  triggerReason?: string,
): string {
  const skillsSig = [...profile.skills]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((s) => `${s.name}:${s.level}:${s.verified ? 1 : 0}`)
    .join(',');
  return [
    profile.id,
    profile.targetCareerId,
    skillsSig,
    profile.assessments.length,
    profile.completedModuleIds.length,
    profile.remedialSkills.join(','),
    triggerReason || 'manual',
  ].join('|');
}

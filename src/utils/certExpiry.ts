import type { AppNotification, Certification } from '../types';

export const CERT_EXPIRY_ALERT_DAYS = 30;
export const CERT_EXPIRY_NOTIF_PREFIX = 'cert-expiry-';

export type CertExpiryStatus = 'none' | 'valid' | 'expiring-soon' | 'expired';

export interface CertExpiryEvaluation {
  status: CertExpiryStatus;
  daysRemaining: number | null;
  label: string;
  isAlertWorthy: boolean;
}

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseIsoDateParts(
  raw?: string,
): { year: number; month: number; day: number } | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  const match = ISO_DATE_RE.exec(trimmed);
  if (!match) return null;

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function sanitizeIsoDate(raw?: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const parts = parseIsoDateParts(raw);
  if (!parts) return undefined;
  const yyyy = String(parts.year).padStart(4, '0');
  const mm = String(parts.month).padStart(2, '0');
  const dd = String(parts.day).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getDaysUntilExpiry(expiryDate?: string, now: Date = new Date()): number | null {
  const parts = parseIsoDateParts(expiryDate);
  if (!parts) return null;
  const expiryUtcMs = Date.UTC(parts.year, parts.month - 1, parts.day);
  const todayUtcMs = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((expiryUtcMs - todayUtcMs) / 86_400_000);
}

export function evaluateCertificationExpiry(
  cert: Pick<Certification, 'expiryDate'>,
  now: Date = new Date(),
  alertWindowDays: number = CERT_EXPIRY_ALERT_DAYS,
): CertExpiryEvaluation {
  const daysRemaining = getDaysUntilExpiry(cert.expiryDate, now);
  if (daysRemaining === null) {
    return {
      status: 'none',
      daysRemaining: null,
      label: 'No expiry set',
      isAlertWorthy: false,
    };
  }

  if (daysRemaining < 0) {
    const absDays = Math.abs(daysRemaining);
    return {
      status: 'expired',
      daysRemaining,
      label: `Expired ${absDays} day${absDays === 1 ? '' : 's'} ago`,
      isAlertWorthy: true,
    };
  }

  if (daysRemaining === 0) {
    return {
      status: 'expiring-soon',
      daysRemaining: 0,
      label: 'Expires today',
      isAlertWorthy: true,
    };
  }

  if (daysRemaining <= alertWindowDays) {
    return {
      status: 'expiring-soon',
      daysRemaining,
      label: `Expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`,
      isAlertWorthy: true,
    };
  }

  return {
    status: 'valid',
    daysRemaining,
    label: `Expires ${cert.expiryDate}`,
    isAlertWorthy: false,
  };
}

export function getAlertWorthyCertifications(
  certifications: Certification[],
  now: Date = new Date(),
  alertWindowDays: number = CERT_EXPIRY_ALERT_DAYS,
): Array<{ cert: Certification; evaluation: CertExpiryEvaluation }> {
  return certifications
    .map((cert) => ({
      cert,
      evaluation: evaluateCertificationExpiry(cert, now, alertWindowDays),
    }))
    .filter((item) => item.evaluation.isAlertWorthy)
    .sort((a, b) => (a.evaluation.daysRemaining ?? 0) - (b.evaluation.daysRemaining ?? 0));
}

export function buildCertExpiryNotificationId(cert: Pick<Certification, 'id' | 'expiryDate'>): string {
  return `${CERT_EXPIRY_NOTIF_PREFIX}${cert.id}::${cert.expiryDate || ''}`;
}

export function syncCertExpiryNotifications(
  existing: AppNotification[],
  certifications: Certification[],
  dismissedIds: Set<string> = new Set(),
  now: Date = new Date(),
  alertWindowDays: number = CERT_EXPIRY_ALERT_DAYS,
): { notifications: AppNotification[]; newlyAdded: AppNotification[] } {
  const alertItems = getAlertWorthyCertifications(certifications, now, alertWindowDays);
  const existingById = new Map(existing.map((n) => [n.id, n]));
  const activeCertNotifIds = new Set<string>();
  const newlyAdded: AppNotification[] = [];
  const activeCertNotifs: AppNotification[] = [];

  for (const { cert, evaluation } of alertItems) {
    const id = buildCertExpiryNotificationId(cert);
    if (dismissedIds.has(id)) {
      continue;
    }
    activeCertNotifIds.add(id);

    const isExpired = evaluation.status === 'expired';
    const title = isExpired
      ? `Certificate Expired: ${cert.title}`
      : `Certificate Expiring Soon: ${cert.title}`;
    const detail = isExpired
      ? `${cert.issuer} credential expired on ${cert.expiryDate} (${evaluation.label}). Renew or update the expiry date in your Profile.`
      : `${cert.issuer} credential ${evaluation.label.toLowerCase()} (expires ${cert.expiryDate}). Renew soon to keep your verified status current.`;

    const prev = existingById.get(id);
    if (prev) {
      activeCertNotifs.push({
        ...prev,
        title,
        detail,
        category: 'cert',
        targetSection: 'profile',
        subTarget: cert.id,
      });
    } else {
      const fresh: AppNotification = {
        id,
        title,
        detail,
        timestamp: now.toISOString(),
        category: 'cert',
        read: false,
        targetSection: 'profile',
        subTarget: cert.id,
      };
      newlyAdded.push(fresh);
      activeCertNotifs.push(fresh);
    }
  }

  const nonCertNotifs = existing.filter((n) => !n.id.startsWith(CERT_EXPIRY_NOTIF_PREFIX));
  const retainedCertNotifs = existing
    .filter((n) => n.id.startsWith(CERT_EXPIRY_NOTIF_PREFIX) && activeCertNotifIds.has(n.id))
    .map((n) => activeCertNotifs.find((a) => a.id === n.id) ?? n);

  const combined = [...newlyAdded, ...retainedCertNotifs, ...nonCertNotifs].slice(0, 30);

  return {
    notifications: combined,
    newlyAdded,
  };
}

import type { AppNotification, NavSection, NotificationCategory } from '../types';

export function createNotification(params: {
  title: string;
  detail: string;
  category: NotificationCategory;
  targetSection?: NavSection;
  subTarget?: string;
  read?: boolean;
  timestamp?: string;
}): AppNotification {
  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: params.title,
    detail: params.detail,
    timestamp: params.timestamp || new Date().toISOString(),
    category: params.category,
    read: params.read ?? false,
    targetSection: params.targetSection,
    subTarget: params.subTarget,
  };
}

export function prependNotification(
  existing: AppNotification[],
  incoming: AppNotification,
  maxItems = 30,
): AppNotification[] {
  return [incoming, ...existing].slice(0, maxItems);
}

export function countUnreadNotifications(list: AppNotification[]): number {
  return list.reduce((acc, item) => (item.read ? acc : acc + 1), 0);
}

export function markNotificationRead(list: AppNotification[], id: string): AppNotification[] {
  return list.map((item) => (item.id === id ? { ...item, read: true } : item));
}

export function markAllNotificationsRead(list: AppNotification[]): AppNotification[] {
  return list.map((item) => (item.read ? item : { ...item, read: true }));
}

export function buildInitialNotifications(
  learnerName: string,
  targetRoleTitle: string,
): AppNotification[] {
  const now = Date.now();
  return [
    createNotification({
      title: '4-Agent Diagnostic Engine Online',
      detail: `Skill Profiler, Market Matcher, Curriculum Architect & Career Mentor calibrated for ${learnerName} (${targetRoleTitle}).`,
      category: 'ai',
      targetSection: 'skill-analysis',
      timestamp: new Date(now - 60_000).toISOString(),
    }),
    createNotification({
      title: '30-Day Productivity Heatmap Ready',
      detail: 'Daily coding sprints, skill checks, modules, and applications now light up your contribution grid.',
      category: 'code',
      targetSection: 'home',
      timestamp: new Date(now - 180_000).toISOString(),
    }),
  ];
}

export function formatRelativeTime(isoTimestamp: string, nowMs = Date.now()): string {
  const parsed = Date.parse(isoTimestamp);
  if (Number.isNaN(parsed)) return 'Just now';
  const diffSec = Math.max(0, Math.floor((nowMs - parsed) / 1000));
  if (diffSec < 45) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

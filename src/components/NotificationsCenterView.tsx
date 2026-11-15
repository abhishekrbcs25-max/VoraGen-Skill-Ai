import { useEffect, useState } from 'react';
import { Bell, CheckCheck, Megaphone, MessageCircle, Send } from 'lucide-react';
import type {
  AppNotification,
  NotificationChannelPrefs,
  PlatformMessage,
  UserProfile,
} from '../types';

interface NotificationsCenterViewProps {
  profile: UserProfile;
  sessionToken?: string;
  notifications: AppNotification[];
  onMarkAllRead: () => void;
  onUpdateProfile: (next: UserProfile) => void;
  onRequireAuth: (reason: string) => boolean;
}

const DEFAULT_PREFS: NotificationChannelPrefs = {
  email: true,
  sms: false,
  push: true,
  inApp: true,
  jobAlerts: true,
  learningReminders: true,
  communityReplies: true,
  securityAlerts: true,
};

export function NotificationsCenterView({
  profile,
  sessionToken,
  notifications,
  onMarkAllRead,
  onUpdateProfile,
  onRequireAuth,
}: NotificationsCenterViewProps) {
  const [messages, setMessages] = useState<PlatformMessage[]>([]);
  const [announcements, setAnnouncements] = useState<
    Array<{ id: string; title: string; body: string; audience: string; createdAt: string }>
  >([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipientKey, setRecipientKey] = useState('employer-demo');
  const [notice, setNotice] = useState<string | null>(null);

  const prefs = profile.notificationPrefs || DEFAULT_PREFS;

  useEffect(() => {
    fetch('/api/messages', {
      headers: sessionToken ? { 'x-voragen-token': sessionToken } : {},
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { messages?: PlatformMessage[] } | null) => {
        if (d?.messages) setMessages(d.messages);
      })
      .catch(() => {});

    fetch('/api/community/posts')
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          d: {
            announcements?: Array<{
              id: string;
              title: string;
              body: string;
              audience: string;
              createdAt: string;
            }>;
          } | null,
        ) => {
          if (d?.announcements) setAnnouncements(d.announcements);
        },
      )
      .catch(() => {});
  }, [sessionToken]);

  const handleTogglePref = (field: keyof NotificationChannelPrefs) => {
    if (!onRequireAuth('save notification channel preferences')) return;
    onUpdateProfile({
      ...profile,
      notificationPrefs: {
        ...prefs,
        [field]: !prefs[field],
      },
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onRequireAuth('send messages to recruiters or instructors')) return;
    if (!subject.trim() || !body.trim()) return;
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'x-voragen-token': sessionToken } : {}),
        },
        body: JSON.stringify({ recipientKey, subject, body }),
      });
      const data = (await res.json()) as { message?: PlatformMessage; error?: string };
      if (res.ok && data.message) {
        setMessages((prev) => [data.message!, ...prev]);
        setSubject('');
        setBody('');
        setNotice('Message dispatched securely.');
      } else {
        setNotice(data.error || 'Could not send message.');
      }
    } catch {
      setNotice('Unable to send message right now.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
            Notification Center, Announcements & Messaging Inbox
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Student-recruiter messages, platform announcements, live alerts, and granular Email / SMS / Push preferences.
          </p>
        </div>

        <button
          type="button"
          onClick={onMarkAllRead}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#0B2545] text-white dark:bg-[#1D4ED8]"
        >
          <CheckCheck className="w-4 h-4" />
          <span>Mark All Alerts Read</span>
        </button>
      </div>

      {notice && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-900 dark:text-emerald-200"
        >
          {notice}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Direct Messages Inbox + Compose */}
        <section className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-5">
          <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-600 dark:text-amber-400" />
            <span>Student, Instructor & Recruiter Inbox</span>
          </h2>

          <form onSubmit={handleSendMessage} className="space-y-3 bg-[#F4F7FB] dark:bg-[#05070B] p-4 rounded-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                aria-label="Select recipient"
                value={recipientKey}
                onChange={(e) => setRecipientKey(e.target.value)}
                className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#0A1628] px-3 py-2 text-xs text-slate-900 dark:text-white"
              >
                <option value="employer-demo">CloudScale Hiring Recruiter</option>
                <option value="elena">Dr. Elena Vance (Mentor / Instructor)</option>
                <option value="*">VoraGen Learner Support</option>
              </select>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject line..."
                className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#0A1628] px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <textarea
              rows={2}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your inquiry regarding an interview, assignment, or role..."
              className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#0A1628] px-3 py-2 text-xs text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Message</span>
            </button>
          </form>

          <div className="divide-y divide-slate-200 dark:divide-white/10">
            {messages.map((m) => (
              <div key={m.id} className="py-3 space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-[#0B2545] dark:text-white">
                    {m.senderName} ({m.senderRole})
                  </span>
                  <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    {m.createdAt.split('T')[0]}
                  </span>
                </div>
                <p className="text-xs font-semibold text-emerald-700 dark:text-amber-300">{m.subject}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">{m.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Announcements + Notification Channels */}
        <div className="lg:col-span-5 space-y-6">
          <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-3">
            <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-amber-500" />
              <span>Platform Announcements</span>
            </h2>
            <div className="space-y-2.5">
              {announcements.map((a) => (
                <div key={a.id} className="rounded-xl bg-[#F4F7FB] dark:bg-[#05070B] p-3.5 space-y-1 text-xs">
                  <p className="font-semibold text-emerald-700 dark:text-amber-400">{a.audience}</p>
                  <p className="font-bold text-[#0B2545] dark:text-white">{a.title}</p>
                  <p className="text-slate-600 dark:text-slate-300">{a.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-3">
            <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Channel & Alert Preferences</span>
            </h2>
            <div className="space-y-2.5 text-xs">
              {(
                [
                  ['email', 'Email Notifications (Assessments, Applications & Offers)'],
                  ['sms', 'SMS Alerts (Interview Reminders & Security OTPs)'],
                  ['push', 'Browser Push Notifications'],
                  ['inApp', 'In-App Notification Center'],
                  ['jobAlerts', 'Automated Job Match Alerts'],
                  ['learningReminders', 'Daily Study Streak Reminders'],
                  ['securityAlerts', 'Suspicious Login & Certificate Expiry Alerts'],
                ] as const
              ).map(([field, label]) => (
                <label key={field} className="flex items-center justify-between gap-3 cursor-pointer">
                  <span className="text-slate-700 dark:text-slate-200">{label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(prefs[field])}
                    onChange={() => handleTogglePref(field)}
                    className="w-4 h-4 accent-[#0B2545] dark:accent-[#1D4ED8]"
                  />
                </label>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-white/10 text-[11px] text-slate-500 dark:text-slate-400">
              Recent In-App Alerts: {notifications.length}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

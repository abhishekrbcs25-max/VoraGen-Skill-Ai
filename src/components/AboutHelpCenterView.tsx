import { useEffect, useState } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Cookie,
  Download,
  HelpCircle,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import type { SecurityAuditEntry, UserProfile } from '../types';

interface AboutHelpCenterViewProps {
  profile: UserProfile;
  sessionToken?: string;
  onUpdateProfile: (next: UserProfile) => void;
}

const FAQS = [
  {
    q: 'Why does a fresh account start at 0% career readiness?',
    a: 'VoraGen enforces genuine skill verification. Readiness rises only as you verify skills through our 20-question technical + live coding exams and projects.',
  },
  {
    q: 'How are certificates verified by employers?',
    a: 'Every credential carries a unique VG-... Certificate ID and deterministic QR verification matrix checkable under Certifications & Passport.',
  },
  {
    q: 'How do I report a suspicious or fraudulent job listing?',
    a: 'Open Global Jobs, run our heuristic Scam Detector on any listing, and click Report Scam to escalate it to Admin Moderation.',
  },
  {
    q: 'How can I export my complete data archive?',
    a: 'Click Download My Full Data Backup below or inside Settings to export your profile, assessments, courses, and invoices in portable JSON.',
  },
];

export function AboutHelpCenterView({
  profile,
  sessionToken,
  onUpdateProfile,
}: AboutHelpCenterViewProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditEntry[]>([]);
  const [loginHistory, setLoginHistory] = useState<
    Array<{ sessionId: string; deviceLabel: string; ip: string; createdAt: string; revokedAt?: string }>
  >([]);
  const [contactSubject, setContactSubject] = useState('');
  const [contactBody, setContactBody] = useState('');
  const [contactNotice, setContactNotice] = useState<string | null>(null);

  const cookies = profile.cookieConsent || {
    essential: true as const,
    analytics: true,
    personalization: true,
    updatedAt: new Date().toISOString().split('T')[0],
  };

  useEffect(() => {
    fetch('/api/security/audit-logs', {
      headers: sessionToken ? { 'x-voragen-token': sessionToken } : {},
    })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          d: {
            logs?: SecurityAuditEntry[];
            loginActivity?: typeof loginHistory;
          } | null,
        ) => {
          if (d?.logs) setAuditLogs(d.logs);
          if (d?.loginActivity) setLoginHistory(d.loginActivity);
        },
      )
      .catch(() => {});
  }, [sessionToken]);

  const handleExportAllData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      organization: 'Vora Generation Network',
      supportEmail: 'voragenerationnetwork@gmail.com',
      profile,
      auditLogs,
      loginHistory,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `voragen-full-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmitContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactSubject.trim() || !contactBody.trim()) return;
    setContactNotice(
      `Support request logged for Vora Generation Network (voragenerationnetwork@gmail.com).`,
    );
    setContactSubject('');
    setContactBody('');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
            About Us, FAQ, Privacy & Security Center
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Vora Generation Network — Verified skill development, adaptive learning, and trusted global recruitment.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportAllData}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <Download className="w-4 h-4" />
          <span>Export Full Data Archive</span>
        </button>
      </div>

      {/* About + Direct Support Contact */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-amber-400" />
            <span>About Vora Generation Network</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            VoraGen Skill AI bridges students, working professionals, and global employers using authentic assessment benchmarks, hands-on code sandboxes, multilingual AI tutors, and verifiable QR skill passports.
          </p>
          <div className="rounded-xl bg-[#F4F7FB] dark:bg-[#05070B] p-4 text-xs space-y-1">
            <p className="font-semibold text-[#0B2545] dark:text-white">Official Support Desk</p>
            <p className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-emerald-600 dark:text-amber-400" />
              <span>voragenerationnetwork@gmail.com</span>
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Organization: Vora Generation Network
            </p>
          </div>

          <form onSubmit={handleSubmitContact} className="space-y-2.5 text-xs pt-2">
            <p className="font-semibold text-[#0B2545] dark:text-white">Contact Support</p>
            <input
              type="text"
              value={contactSubject}
              onChange={(e) => setContactSubject(e.target.value)}
              placeholder="Subject..."
              className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-slate-900 dark:text-white"
            />
            <textarea
              rows={2}
              value={contactBody}
              onChange={(e) => setContactBody(e.target.value)}
              placeholder="Describe your question or feedback..."
              className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg font-semibold bg-[#0B2545] text-white dark:bg-[#1D4ED8]"
            >
              Send Support Inquiry
            </button>
            {contactNotice && (
              <p className="text-emerald-700 dark:text-emerald-300 font-medium">{contactNotice}</p>
            )}
          </form>
        </section>

        {/* FAQ Accordion */}
        <section className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-500" />
            <span>Help Center & Frequently Asked Questions</span>
          </h2>
          <div className="divide-y divide-slate-200 dark:divide-white/10 text-xs">
            {FAQS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={item.q} className="py-2.5">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-2 text-left font-bold text-[#0B2545] dark:text-white py-1"
                  >
                    <span>{item.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <p className="mt-1.5 text-slate-600 dark:text-slate-300 leading-relaxed">
                      {item.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Privacy, Terms, Cookies & Security Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4 text-xs">
          <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
            <Cookie className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Privacy Policy, Terms & Cookie Preferences</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            <strong>Privacy & Data Ownership:</strong> Personal skills, resumes, and certificates remain strictly under your signed-in account with salted PBKDF2 hashing and HMAC session tokens.
          </p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            <strong>Terms & Integrity:</strong> Employers must verify legitimate hiring domains; candidates commit to authentic assessment completion without external impersonation.
          </p>
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/10">
            <label className="flex items-center justify-between gap-3">
              <span>Essential Authentication Cookies (Always On)</span>
              <input type="checkbox" checked readOnly disabled className="w-4 h-4" />
            </label>
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span>Learning Analytics & Skill Heatmap Telemetry</span>
              <input
                type="checkbox"
                checked={cookies.analytics}
                onChange={() =>
                  onUpdateProfile({
                    ...profile,
                    cookieConsent: {
                      ...cookies,
                      analytics: !cookies.analytics,
                      updatedAt: new Date().toISOString().split('T')[0],
                    },
                  })
                }
                className="w-4 h-4 accent-[#0B2545]"
              />
            </label>
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span>Personalized Job & Course Recommendations</span>
              <input
                type="checkbox"
                checked={cookies.personalization}
                onChange={() =>
                  onUpdateProfile({
                    ...profile,
                    cookieConsent: {
                      ...cookies,
                      personalization: !cookies.personalization,
                      updatedAt: new Date().toISOString().split('T')[0],
                    },
                  })
                }
                className="w-4 h-4 accent-[#0B2545]"
              />
            </label>
          </div>
        </section>

        <section className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4 text-xs">
          <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-500" />
            <span>Security Audit Log & Login Activity</span>
          </h2>

          <div className="space-y-2 max-h-56 overflow-y-auto">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-lg bg-[#F4F7FB] dark:bg-[#05070B] p-3 flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <p className="font-bold text-[#0B2545] dark:text-white flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-amber-400" />
                    <span>{log.action}</span>
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">{log.detail}</p>
                </div>
                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  {log.ip} · {log.timestamp.split('T')[0]}
                </span>
              </div>
            ))}
          </div>

          {loginHistory.length > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-1.5">
              <p className="font-semibold text-[#0B2545] dark:text-white">
                Recent Device Login Sessions ({loginHistory.length})
              </p>
              {loginHistory.slice(0, 4).map((sess) => (
                <p key={sess.sessionId} className="text-slate-600 dark:text-slate-300">
                  {sess.deviceLabel} · IP {sess.ip} · {sess.revokedAt ? 'Revoked' : 'Active'}
                </p>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

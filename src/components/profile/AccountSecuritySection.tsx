import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Laptop,
  LogOut,
  Mail,
  MonitorSmartphone,
  Phone,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import type { DeviceSessionInfo, UserProfile } from '../../types';

interface AccountSecuritySectionProps {
  profile: UserProfile;
  sessionToken: string;
  onProfilePatched: (next: UserProfile) => void;
  onAccountDeleted: () => void;
  onSessionRevoked: () => void;
  onOpenAuthModal: () => void;
}

export function AccountSecuritySection({
  profile,
  sessionToken,
  onProfilePatched,
  onAccountDeleted,
  onSessionRevoked,
  onOpenAuthModal,
}: AccountSecuritySectionProps) {
  const [sessions, setSessions] = useState<DeviceSessionInfo[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [securityMsg, setSecurityMsg] = useState('');
  const [securityErr, setSecurityErr] = useState('');

  // Email verification OTP
  const [emailChallengeId, setEmailChallengeId] = useState('');
  const [emailOtpPreview, setEmailOtpPreview] = useState('');
  const [emailOtpInput, setEmailOtpInput] = useState('');

  // Password reset from inside security settings
  const [resetChallengeId, setResetChallengeId] = useState('');
  const [resetOtpPreview, setResetOtpPreview] = useState('');
  const [resetOtpInput, setResetOtpInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Account deletion confirmation
  const [deleteStepOpen, setDeleteStepOpen] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const loadSessions = useCallback(async () => {
    if (!profile.isSignedIn || !profile.email || !sessionToken) {
      setSessions([]);
      return;
    }
    setLoadingSessions(true);
    try {
      const res = await fetch(
        `/api/auth/sessions?key=${encodeURIComponent(profile.email)}`,
        { headers: { 'x-voragen-token': sessionToken } },
      );
      if (res.status === 401) {
        onSessionRevoked();
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as { sessions?: DeviceSessionInfo[] };
        setSessions(data.sessions || []);
      }
    } catch {
      // Non-fatal
    } finally {
      setLoadingSessions(false);
    }
  }, [profile.isSignedIn, profile.email, sessionToken, onSessionRevoked]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleToggle2FA = async (nextEnabled: boolean, method: 'email' | 'phone') => {
    if (!profile.isSignedIn || !sessionToken) {
      onOpenAuthModal();
      return;
    }
    setSecurityErr('');
    setSecurityMsg('');
    try {
      const res = await fetch(
        `/api/auth/2fa/toggle?key=${encodeURIComponent(profile.email)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-voragen-token': sessionToken,
          },
          body: JSON.stringify({ enabled: nextEnabled, method }),
        },
      );
      const data = (await res.json()) as { ok?: boolean; profile?: UserProfile; error?: string };
      if (!res.ok || !data.profile) {
        setSecurityErr(data.error || 'Could not update 2FA settings.');
        return;
      }
      onProfilePatched(data.profile);
      setSecurityMsg(
        nextEnabled
          ? `Two-Factor Authentication enabled via ${method.toUpperCase()}.`
          : 'Two-Factor Authentication disabled.',
      );
    } catch {
      setSecurityErr('Network error updating 2FA.');
    }
  };

  const handleSendEmailVerifyOtp = async () => {
    if (!profile.isSignedIn || !sessionToken) {
      onOpenAuthModal();
      return;
    }
    setSecurityErr('');
    setSecurityMsg('');
    try {
      const res = await fetch(
        `/api/auth/otp/send?key=${encodeURIComponent(profile.email)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-voragen-token': sessionToken,
          },
          body: JSON.stringify({
            target: profile.email,
            channel: 'email',
            purpose: 'email-verify',
          }),
        },
      );
      const data = (await res.json()) as {
        challengeId?: string;
        devPreviewCode?: string;
        error?: string;
      };
      if (!res.ok || !data.challengeId) {
        setSecurityErr(data.error || 'Could not send email verification code.');
        return;
      }
      setEmailChallengeId(data.challengeId);
      setEmailOtpPreview(data.devPreviewCode || '');
      setEmailOtpInput('');
    } catch {
      setSecurityErr('Network error sending verification OTP.');
    }
  };

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityErr('');
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId: emailChallengeId,
          code: emailOtpInput.trim(),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; profile?: UserProfile; error?: string };
      if (!res.ok || !data.profile) {
        setSecurityErr(data.error || 'Invalid email verification OTP.');
        return;
      }
      onProfilePatched(data.profile);
      setEmailChallengeId('');
      setEmailOtpPreview('');
      setEmailOtpInput('');
      setSecurityMsg('Email address verified!');
    } catch {
      setSecurityErr('Network error verifying email OTP.');
    }
  };

  const handleStartPasswordChange = async () => {
    setSecurityErr('');
    setSecurityMsg('');
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: profile.email,
          channel: 'email',
          purpose: 'password-reset',
        }),
      });
      const data = (await res.json()) as {
        challengeId?: string;
        devPreviewCode?: string;
        error?: string;
      };
      if (!res.ok || !data.challengeId) {
        setSecurityErr(data.error || 'Could not start password reset.');
        return;
      }
      setResetChallengeId(data.challengeId);
      setResetOtpPreview(data.devPreviewCode || '');
      setResetOtpInput('');
      setNewPasswordInput('');
    } catch {
      setSecurityErr('Network error requesting reset code.');
    }
  };

  const handleConfirmPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityErr('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId: resetChallengeId,
          code: resetOtpInput.trim(),
          newPassword: newPasswordInput,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setSecurityErr(data.error || 'Failed to update password.');
        return;
      }
      setResetChallengeId('');
      setSecurityMsg('Password updated cleanly! Active sessions were rotated for security.');
      onSessionRevoked();
    } catch {
      setSecurityErr('Network error updating password.');
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setSecurityErr('');
    try {
      const res = await fetch(
        `/api/auth/sessions/${encodeURIComponent(sessionId)}?key=${encodeURIComponent(profile.email)}`,
        {
          method: 'DELETE',
          headers: { 'x-voragen-token': sessionToken },
        },
      );
      const data = (await res.json()) as { ok?: boolean; revokedCurrent?: boolean; error?: string };
      if (!res.ok) {
        setSecurityErr(data.error || 'Could not revoke device session.');
        return;
      }
      if (data.revokedCurrent) {
        onSessionRevoked();
        return;
      }
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
      setSecurityMsg('Device session signed out.');
    } catch {
      setSecurityErr('Network error revoking session.');
    }
  };

  const handleRevokeOthers = async () => {
    setSecurityErr('');
    try {
      const res = await fetch(
        `/api/auth/sessions/revoke-others?key=${encodeURIComponent(profile.email)}`,
        {
          method: 'POST',
          headers: { 'x-voragen-token': sessionToken },
        },
      );
      const data = (await res.json()) as { ok?: boolean; revokedCount?: number; error?: string };
      if (!res.ok) {
        setSecurityErr(data.error || 'Could not sign out other devices.');
        return;
      }
      await loadSessions();
      setSecurityMsg(`Signed out ${data.revokedCount || 0} other device session(s).`);
    } catch {
      setSecurityErr('Network error revoking other sessions.');
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityErr('');
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/profile?key=${encodeURIComponent(profile.email)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-voragen-token': sessionToken,
        },
        body: JSON.stringify({ confirmEmail: deleteConfirmInput.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; deleted?: boolean; error?: string };
      if (!res.ok || !data.deleted) {
        setSecurityErr(data.error || 'Account deletion failed. Verify confirmation text.');
        return;
      }
      onAccountDeleted();
    } catch {
      setSecurityErr('Network error deleting account.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!profile.isSignedIn) {
    return (
      <section
        id="security-section"
        className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 flex flex-wrap items-center justify-between gap-4"
      >
        <div className="space-y-1">
          <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-amber-400" />
            <span>Account Security, 2FA &amp; Multi-Device Sessions</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sign in to verify your email/phone, enable Two-Factor Authentication, manage active
            devices, or delete your account.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAuthModal}
          className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#0B2545] text-white dark:bg-[#1D4ED8]"
        >
          Sign In / Register
        </button>
      </section>
    );
  }

  return (
    <section
      id="security-section"
      className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-amber-400" />
          <div>
            <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
              Account Security, 2FA &amp; Multi-Device Sessions
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Email/Phone verification, Two-Factor Authentication, password rotation, active
              sessions, and account deletion.
            </p>
          </div>
        </div>
      </div>

      {securityMsg && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-xs font-medium text-emerald-900 dark:text-emerald-200">
          {securityMsg}
        </div>
      )}
      {securityErr && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3.5 py-2 text-xs font-medium text-rose-800 dark:text-amber-300">
          {securityErr}
        </div>
      )}

      {/* Verification, 2FA, and Password Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Email & Phone Verification Status */}
        <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B2545] dark:text-white">
            Contact Verification
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 truncate">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{profile.email}</span>
              </span>
              {profile.emailVerified ? (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verified
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendEmailVerifyOtp}
                  className="px-2.5 py-1 rounded-md font-semibold bg-[#0B2545] text-white dark:bg-[#1D4ED8] shrink-0"
                >
                  Verify Email
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 truncate">
                <Phone className="w-3.5 h-3.5 shrink-0" />
                <span>{profile.phone || 'No phone saved'}</span>
              </span>
              <span
                className={`text-[11px] font-semibold ${
                  profile.phoneVerified
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {profile.phoneVerified ? 'Verified' : 'Unverified'}
              </span>
            </div>
          </div>

          {emailChallengeId && (
            <form
              onSubmit={handleVerifyEmailOtp}
              className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/10"
            >
              {emailOtpPreview && (
                <p className="text-[11px] font-mono text-amber-800 dark:text-amber-300">
                  Sandbox Code: <strong>{emailOtpPreview}</strong>
                </p>
              )}
              <div className="flex gap-1.5">
                <input
                  type="text"
                  maxLength={6}
                  value={emailOtpInput}
                  onChange={(e) => setEmailOtpInput(e.target.value)}
                  placeholder="6-digit OTP"
                  aria-label="Email verification OTP code"
                  className="flex-1 rounded-md border border-slate-300 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#0A1628] px-2.5 py-1 text-xs font-mono text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-700 text-white"
                >
                  Confirm
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Two-Factor Authentication (2FA) */}
        <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B2545] dark:text-white">
              Two-Factor Auth (2FA)
            </h3>
            <span
              className={`text-[11px] font-semibold ${
                profile.twoFactorEnabled
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {profile.twoFactorEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Require a 6-digit OTP challenge on new sign-ins.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                handleToggle2FA(
                  !profile.twoFactorEnabled,
                  profile.twoFactorMethod || 'email',
                )
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                profile.twoFactorEnabled
                  ? 'border border-slate-300 dark:border-[#1E3A5F] text-slate-700 dark:text-slate-200 bg-white dark:bg-[#0A1628]'
                  : 'bg-[#0B2545] text-white dark:bg-[#1D4ED8]'
              }`}
            >
              {profile.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
            </button>
            <select
              aria-label="2FA delivery method"
              value={profile.twoFactorMethod || 'email'}
              onChange={(e) =>
                handleToggle2FA(
                  Boolean(profile.twoFactorEnabled),
                  e.target.value as 'email' | 'phone',
                )
              }
              className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#0A1628] px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
            >
              <option value="email">Email OTP</option>
              <option value="phone">Phone SMS OTP</option>
            </select>
          </div>
        </div>

        {/* Password & Legal Acceptance */}
        <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B2545] dark:text-white">
            Password &amp; Legal Consent
          </h3>
          {!resetChallengeId ? (
            <button
              type="button"
              onClick={handleStartPasswordChange}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#0A1628] text-slate-800 dark:text-white hover:border-[#0B2545]"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Change / Reset Password</span>
            </button>
          ) : (
            <form onSubmit={handleConfirmPasswordChange} className="space-y-2">
              {resetOtpPreview && (
                <p className="text-[11px] font-mono text-amber-800 dark:text-amber-300">
                  Reset Code: <strong>{resetOtpPreview}</strong>
                </p>
              )}
              <input
                type="text"
                maxLength={6}
                value={resetOtpInput}
                onChange={(e) => setResetOtpInput(e.target.value)}
                placeholder="6-digit OTP"
                aria-label="Password change OTP"
                required
                className="w-full rounded-md border border-slate-300 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#0A1628] px-2.5 py-1 text-xs font-mono text-slate-900 dark:text-white"
              />
              <input
                type="password"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="New password (min 6 chars)"
                aria-label="New account password"
                required
                className="w-full rounded-md border border-slate-300 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#0A1628] px-2.5 py-1 text-xs text-slate-900 dark:text-white"
              />
              <div className="flex gap-1.5">
                <button
                  type="submit"
                  className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-700 text-white"
                >
                  Update Password
                </button>
                <button
                  type="button"
                  onClick={() => setResetChallengeId('')}
                  className="px-2 py-1 text-xs text-slate-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
          <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 pt-1 border-t border-slate-200 dark:border-white/10">
            <p>
              Terms Accepted:{' '}
              {profile.acceptedTermsAt ? profile.acceptedTermsAt.slice(0, 10) : 'Recorded'}
            </p>
            <p>
              Privacy Policy:{' '}
              {profile.acceptedPrivacyAt ? profile.acceptedPrivacyAt.slice(0, 10) : 'Recorded'}
            </p>
          </div>
        </div>
      </div>

      {/* Multi-Device Session Management */}
      <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MonitorSmartphone className="w-4 h-4 text-[#0B2545] dark:text-amber-400" />
            <h3 className="text-sm font-bold text-[#0B2545] dark:text-white">
              Active Devices &amp; Session Management ({sessions.length})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadSessions}
              disabled={loadingSessions}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-[#1E3A5F]/70 text-slate-700 dark:text-slate-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingSessions ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            {sessions.length > 1 && (
              <button
                type="button"
                onClick={handleRevokeOthers}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0B2545] text-white dark:bg-[#1D4ED8]"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out Other Devices</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F4F7FB] dark:bg-[#05070B] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-[#1E3A5F]/60">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Device &amp; Browser</th>
                <th className="py-2.5 px-3 font-semibold">IP Address</th>
                <th className="py-2.5 px-3 font-semibold">Last Active</th>
                <th className="py-2.5 px-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-[#1E3A5F]/40">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 px-3 text-center text-slate-500 dark:text-slate-400">
                    Current browser session active.
                  </td>
                </tr>
              ) : (
                sessions.map((sess) => (
                  <tr key={sess.sessionId} className="hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                        <Laptop className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{sess.deviceLabel}</span>
                        {sess.isCurrent && (
                          <span className="rounded border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
                            Current Device
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                      {sess.ip}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                      {new Date(sess.lastActiveAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRevokeSession(sess.sessionId)}
                        className="px-2.5 py-1 rounded-md text-[11px] font-semibold border border-slate-300 dark:border-[#1E3A5F]/70 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                      >
                        {sess.isCurrent ? 'Sign Out Here' : 'Revoke'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Danger Zone: Account Deletion */}
      <div className="rounded-xl border border-rose-500/35 bg-rose-50/50 dark:bg-rose-500/5 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-rose-900 dark:text-rose-200">
                Delete Account Permanently
              </h3>
              <p className="text-[11px] text-rose-800/80 dark:text-rose-300/80">
                Permanently removes your profile, resume, certifications, assessments, credentials,
                and active device sessions.
              </p>
            </div>
          </div>
          {!deleteStepOpen && (
            <button
              type="button"
              onClick={() => {
                setDeleteStepOpen(true);
                setDeleteConfirmInput('');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-rose-500/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-500/15"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Account</span>
            </button>
          )}
        </div>

        {deleteStepOpen && (
          <form
            onSubmit={handleDeleteAccount}
            className="flex flex-wrap items-center gap-2 pt-2 border-t border-rose-500/20"
          >
            <input
              type="text"
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              placeholder={`Type ${profile.email} or DELETE to confirm`}
              aria-label="Confirm account deletion"
              required
              className="flex-1 min-w-[220px] rounded-lg border border-rose-300 dark:border-rose-500/50 bg-white dark:bg-[#05070B] px-3 py-1.5 text-xs text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              disabled={isDeleting}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-700 text-white hover:bg-rose-800 disabled:opacity-60"
            >
              {isDeleting ? 'Deleting...' : 'Confirm Permanent Delete'}
            </button>
            <button
              type="button"
              onClick={() => setDeleteStepOpen(false)}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

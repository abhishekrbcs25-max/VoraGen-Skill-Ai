import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { signInWithGooglePopup } from '../lib/firebase';
import { Logo } from './Logo';
import type { AccountRole, UserProfile } from '../types';

type AuthViewMode = 'signin' | 'register' | 'phone' | 'forgot-password' | 'admin' | 'two-factor';

interface AuthModalProps {
  open: boolean;
  reason?: string;
  onClose: () => void;
  onAuthSuccess: (userKey: string, nextProfile: UserProfile, token?: string) => void;
}

const ROLE_OPTIONS: Array<{ value: Exclude<AccountRole, 'admin'>; label: string; hint: string }> = [
  { value: 'student', label: 'Student', hint: 'Pursuing degree / campus learner' },
  { value: 'working-professional', label: 'Working Professional', hint: 'Upskilling or switching roles' },
  { value: 'job-seeker', label: 'Job Seeker', hint: 'Actively interviewing & applying' },
  { value: 'employer', label: 'Employer / Recruiter', hint: 'Evaluating talent & roles' },
];

export function AuthModal({ open, reason, onClose, onAuthSuccess }: AuthModalProps) {
  const [viewMode, setViewMode] = useState<AuthViewMode>('signin');
  const [oauthStepProvider, setOauthStepProvider] = useState<'google' | 'microsoft' | null>(null);
  const [oauthEmail, setOauthEmail] = useState('');
  const [oauthName, setOauthName] = useState('');

  // Standard email/password state
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedRole, setSelectedRole] = useState<Exclude<AccountRole, 'admin'>>('student');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [showLegalDoc, setShowLegalDoc] = useState<'terms' | 'privacy' | null>(null);

  // Phone + OTP auth state
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneNameInput, setPhoneNameInput] = useState('');
  const [otpChallengeId, setOtpChallengeId] = useState('');
  const [otpMaskedTarget, setOtpMaskedTarget] = useState('');
  const [otpPreviewCode, setOtpPreviewCode] = useState('');
  const [otpCodeInput, setOtpCodeInput] = useState('');

  // Forgot & Reset Password state
  const [resetTargetInput, setResetTargetInput] = useState('');
  const [resetChannel, setResetChannel] = useState<'email' | 'phone'>('email');
  const [resetChallengeId, setResetChallengeId] = useState('');
  const [resetPreviewCode, setResetPreviewCode] = useState('');
  const [resetOtpInput, setResetOtpInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmNewPasswordInput, setConfirmNewPasswordInput] = useState('');

  // 2FA challenge state
  const [twoFaChallengeId, setTwoFaChallengeId] = useState('');
  const [twoFaMethod, setTwoFaMethod] = useState<'email' | 'phone'>('email');
  const [twoFaMaskedTarget, setTwoFaMaskedTarget] = useState('');
  const [twoFaPreviewCode, setTwoFaPreviewCode] = useState('');
  const [twoFaCodeInput, setTwoFaCodeInput] = useState('');

  // Admin portal state
  const [hasAdminAccount, setHasAdminAccount] = useState<boolean | null>(null);
  const [adminBootstrapMode, setAdminBootstrapMode] = useState(false);

  const [authError, setAuthError] = useState('');
  const [authStatusMsg, setAuthStatusMsg] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  const resetTransientState = () => {
    setOauthStepProvider(null);
    setAuthError('');
    setAuthStatusMsg('');
    setOtpChallengeId('');
    setOtpPreviewCode('');
    setOtpCodeInput('');
    setResetChallengeId('');
    setResetPreviewCode('');
    setResetOtpInput('');
    setTwoFaChallengeId('');
    setTwoFaPreviewCode('');
    setTwoFaCodeInput('');
  };

  useEffect(() => {
    if (!open) {
      setViewMode('signin');
      setOauthStepProvider(null);
      setOauthEmail('');
      setOauthName('');
      setNameInput('');
      setEmailInput('');
      setPasswordInput('');
      setPhoneInput('');
      setPhoneNameInput('');
      setOtpChallengeId('');
      setOtpMaskedTarget('');
      setOtpPreviewCode('');
      setOtpCodeInput('');
      setResetTargetInput('');
      setResetChannel('email');
      setResetChallengeId('');
      setResetPreviewCode('');
      setResetOtpInput('');
      setNewPasswordInput('');
      setConfirmNewPasswordInput('');
      setTwoFaChallengeId('');
      setTwoFaPreviewCode('');
      setTwoFaCodeInput('');
      setAcceptedTerms(false);
      setAcceptedPrivacy(false);
      setShowLegalDoc(null);
      setAuthError('');
      setAuthStatusMsg('');
      return;
    }
    fetch('/api/auth/admin-status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { hasAdmin?: boolean } | null) => {
        if (data && typeof data.hasAdmin === 'boolean') {
          setHasAdminAccount(data.hasAdmin);
          setAdminBootstrapMode(!data.hasAdmin);
        }
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setViewMode('signin');
        resetTransientState();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const switchMode = (next: AuthViewMode) => {
    setViewMode(next);
    resetTransientState();
  };

  const performServerAuth = async (params: {
    mode: 'register' | 'signin';
    name: string;
    email: string;
    password?: string;
    authProvider: UserProfile['authProvider'];
    idToken?: string;
    portalMode?: 'standard' | 'admin';
  }) => {
    if (params.mode === 'register' && (!acceptedTerms || !acceptedPrivacy)) {
      setAuthError('Please accept both the Terms & Conditions and Privacy Policy to continue.');
      return;
    }
    setIsSubmittingAuth(true);
    setAuthError('');
    setAuthStatusMsg('');
    try {
      const endpoint = params.mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: params.name,
          email: params.email,
          password: params.password,
          authProvider: params.authProvider,
          idToken: params.idToken,
          role: selectedRole,
          acceptedTerms: params.mode === 'register' ? acceptedTerms : undefined,
          acceptedPrivacy: params.mode === 'register' ? acceptedPrivacy : undefined,
          portalMode: params.portalMode || 'standard',
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        key?: string;
        token?: string;
        profile?: UserProfile;
        error?: string;
        requires2FA?: boolean;
        challengeId?: string;
        method?: 'email' | 'phone';
        maskedTarget?: string;
        devPreviewCode?: string;
      };

      if (res.ok && data.requires2FA && data.challengeId) {
        setTwoFaChallengeId(data.challengeId);
        setTwoFaMethod(data.method || 'email');
        setTwoFaMaskedTarget(data.maskedTarget || '');
        setTwoFaPreviewCode(data.devPreviewCode || '');
        setTwoFaCodeInput('');
        setViewMode('two-factor');
        return;
      }

      if (!res.ok || !data.profile || !data.key) {
        setAuthError(data.error || 'Authentication failed. Please try again.');
        return;
      }

      resetTransientState();
      setPasswordInput('');
      setEmailInput('');
      setNameInput('');
      onAuthSuccess(data.key, data.profile, data.token);
    } catch {
      setAuthError('Network error while connecting to VoraGen authentication.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleGooglePopupSignIn = async () => {
    const mode = viewMode === 'register' ? 'register' : 'signin';
    if (mode === 'register' && (!acceptedTerms || !acceptedPrivacy)) {
      setAuthError('Please accept Terms & Conditions and Privacy Policy before registering.');
      return;
    }
    setIsSubmittingAuth(true);
    setAuthError('');
    try {
      const { user, idToken } = await signInWithGooglePopup();
      if (user.email) {
        await performServerAuth({
          mode,
          name: user.displayName || user.email.split('@')[0],
          email: user.email,
          authProvider: 'google',
          idToken,
        });
        return;
      }
    } catch {
      setOauthStepProvider('google');
      setOauthEmail('');
      setOauthName('');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleOAuthConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oauthStepProvider) return;
    const cleanEmail = oauthEmail.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAuthError('Please enter a valid account email.');
      return;
    }
    const cleanName = oauthName.trim() || cleanEmail.split('@')[0];
    performServerAuth({
      mode: viewMode === 'register' ? 'register' : 'signin',
      name: cleanName,
      email: cleanEmail,
      authProvider: oauthStepProvider,
    });
  };

  const handleEmailAuth = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAuthError('Please enter a valid email address.');
      return;
    }
    if (passwordInput.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }
    const isReg = viewMode === 'register';
    const cleanName = isReg
      ? nameInput.trim() || cleanEmail.split('@')[0]
      : cleanEmail.split('@')[0];

    performServerAuth({
      mode: isReg ? 'register' : 'signin',
      name: cleanName,
      email: cleanEmail,
      password: passwordInput,
      authProvider: 'email',
      portalMode: viewMode === 'admin' ? 'admin' : 'standard',
    });
  };

  const handleAdminBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms || !acceptedPrivacy) {
      setAuthError('Please accept Terms & Conditions and Privacy Policy.');
      return;
    }
    if (passwordInput.length < 8) {
      setAuthError('Admin password must be at least 8 characters.');
      return;
    }
    setIsSubmittingAuth(true);
    setAuthError('');
    try {
      const res = await fetch('/api/auth/admin-bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameInput.trim() || 'Workspace Admin',
          email: emailInput.trim(),
          password: passwordInput,
          acceptedTerms,
          acceptedPrivacy,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        key?: string;
        token?: string;
        profile?: UserProfile;
        error?: string;
      };
      if (!res.ok || !data.profile || !data.key) {
        setAuthError(data.error || 'Could not initialize Admin account.');
        return;
      }
      setHasAdminAccount(true);
      setAdminBootstrapMode(false);
      resetTransientState();
      onAuthSuccess(data.key, data.profile, data.token);
    } catch {
      setAuthError('Network error during Admin initialization.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthStatusMsg('');
    setIsSubmittingAuth(true);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: phoneInput.trim(),
          channel: 'phone',
          purpose: 'phone-auth',
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        challengeId?: string;
        maskedTarget?: string;
        devPreviewCode?: string;
        error?: string;
      };
      if (!res.ok || !data.challengeId) {
        setAuthError(data.error || 'Could not send OTP to that phone number.');
        return;
      }
      setOtpChallengeId(data.challengeId);
      setOtpMaskedTarget(data.maskedTarget || phoneInput.trim());
      setOtpPreviewCode(data.devPreviewCode || '');
      setOtpCodeInput('');
      setAuthStatusMsg('6-digit OTP generated. Enter it below to verify your phone number.');
    } catch {
      setAuthError('Network error while sending OTP.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmittingAuth(true);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId: otpChallengeId,
          code: otpCodeInput.trim(),
          name: phoneNameInput.trim(),
          role: selectedRole,
          acceptedTerms,
          acceptedPrivacy,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        key?: string;
        token?: string;
        profile?: UserProfile;
        error?: string;
      };
      if (!res.ok || !data.profile || !data.key) {
        setAuthError(data.error || 'Invalid or expired OTP code.');
        return;
      }
      resetTransientState();
      onAuthSuccess(data.key, data.profile, data.token);
    } catch {
      setAuthError('Network error while verifying OTP.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleSendResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthStatusMsg('');
    setIsSubmittingAuth(true);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: resetTargetInput.trim(),
          channel: resetChannel,
          purpose: 'password-reset',
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        challengeId?: string;
        devPreviewCode?: string;
        maskedTarget?: string;
        error?: string;
      };
      if (!res.ok || !data.challengeId) {
        setAuthError(data.error || 'Could not start password reset.');
        return;
      }
      setResetChallengeId(data.challengeId);
      setResetPreviewCode(data.devPreviewCode || '');
      setAuthStatusMsg(`Reset OTP sent to ${data.maskedTarget || resetTargetInput}.`);
    } catch {
      setAuthError('Network error sending password reset OTP.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleCompletePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPasswordInput.length < 6) {
      setAuthError('New password must be at least 6 characters.');
      return;
    }
    if (newPasswordInput !== confirmNewPasswordInput) {
      setAuthError('New password and confirmation do not match.');
      return;
    }
    setAuthError('');
    setIsSubmittingAuth(true);
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
        setAuthError(data.error || 'Could not reset password.');
        return;
      }
      setResetChallengeId('');
      setResetOtpInput('');
      setNewPasswordInput('');
      setConfirmNewPasswordInput('');
      setViewMode('signin');
      setAuthStatusMsg('Password updated cleanly! Sign in with your new password.');
    } catch {
      setAuthError('Network error resetting password.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmittingAuth(true);
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId: twoFaChallengeId,
          code: twoFaCodeInput.trim(),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        key?: string;
        token?: string;
        profile?: UserProfile;
        error?: string;
      };
      if (!res.ok || !data.profile || !data.key) {
        setAuthError(data.error || 'Invalid 2FA verification code.');
        return;
      }
      resetTransientState();
      onAuthSuccess(data.key, data.profile, data.token);
    } catch {
      setAuthError('Network error verifying 2FA code.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const modalTitle =
    viewMode === 'register'
      ? 'Create Your VoraGen Account'
      : viewMode === 'phone'
        ? 'Phone Number & OTP Sign In'
        : viewMode === 'forgot-password'
          ? 'Reset Your Password'
          : viewMode === 'admin'
            ? adminBootstrapMode
              ? 'Initialize Workspace Admin'
              : 'Administrator Sign In'
            : viewMode === 'two-factor'
              ? 'Two-Factor Verification'
              : 'Sign In to VoraGen';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="voragen-auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto"
    >
      <div className="w-full max-w-lg my-auto rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#0A1628] p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Logo className="w-9 h-9 shrink-0" />
            <div>
              <h2
                id="voragen-auth-modal-title"
                className="font-display text-lg font-bold text-[#0B2545] dark:text-white leading-tight"
              >
                {modalTitle}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                VoraGen Skill AI · Secure Career & Talent Workspace
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              resetTransientState();
              onClose();
            }}
            aria-label="Close sign in modal"
            className="p-1.5 rounded-lg text-slate-500 hover:text-[#0B2545] dark:text-slate-400 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {reason && (
          <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3.5 py-2.5 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>{reason}</span>
          </div>
        )}

        {/* Primary Auth Portal Tabs */}
        {viewMode !== 'two-factor' && (
          <div
            role="tablist"
            aria-label="Authentication methods"
            className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-[#F4F7FB] dark:bg-[#05070B] border border-slate-200 dark:border-[#1E3A5F]/60"
          >
            {(
              [
                { id: 'signin', label: 'Sign In' },
                { id: 'register', label: 'Register' },
                { id: 'phone', label: 'Phone OTP' },
                { id: 'admin', label: 'Admin' },
              ] as const
            ).map((tab) => {
              const active = viewMode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => switchMode(tab.id)}
                  className={`py-2 px-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#0B2545] text-white dark:bg-[#1D4ED8] dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-[#0B2545] dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {authStatusMsg && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{authStatusMsg}</span>
          </div>
        )}

        {/* 2FA Verification Step */}
        {viewMode === 'two-factor' && (
          <form onSubmit={handleVerify2FA} className="space-y-3">
            <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-3.5 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-[#0B2545] dark:text-amber-300">
                <ShieldCheck className="w-4 h-4" />
                <span>Two-Factor Authentication Required ({twoFaMethod.toUpperCase()})</span>
              </div>
              <p>
                Enter the 6-digit security code dispatched to{' '}
                <span className="font-mono font-semibold">{twoFaMaskedTarget}</span>.
              </p>
              {twoFaPreviewCode && (
                <p className="rounded-md border border-amber-500/35 bg-amber-500/10 px-2.5 py-1.5 font-mono text-[11px] text-amber-900 dark:text-amber-200">
                  Sandbox OTP Preview: <strong>{twoFaPreviewCode}</strong>
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="modal-2fa-code"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                6-Digit 2FA Code
              </label>
              <input
                id="modal-2fa-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={twoFaCodeInput}
                onChange={(e) => setTwoFaCodeInput(e.target.value)}
                placeholder="123456"
                required
                className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm font-mono tracking-widest text-[#0B2545] dark:text-white"
              />
            </div>

            {authError && <p className="text-xs font-medium text-rose-600 dark:text-amber-300">{authError}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="flex-1 py-2.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-[#1E3A5F]/70 text-slate-700 dark:text-slate-300"
              >
                Back to Sign In
              </button>
              <button
                type="submit"
                disabled={isSubmittingAuth}
                className="flex-1 py-2.5 rounded-lg text-xs font-semibold bg-[#0B2545] text-white dark:bg-[#1D4ED8] disabled:opacity-60"
              >
                {isSubmittingAuth ? 'Verifying...' : 'Verify & Complete Login'}
              </button>
            </div>
          </form>
        )}

        {/* Phone Number Authentication + OTP Flow */}
        {viewMode === 'phone' && (
          <div className="space-y-3">
            {!otpChallengeId ? (
              <form onSubmit={handleSendPhoneOtp} className="space-y-3">
                <div>
                  <label
                    htmlFor="modal-phone-input"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Phone Number (with country code)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      id="modal-phone-input"
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="+91 98765 43210"
                      required
                      className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] pl-9 pr-3 py-2 text-sm text-[#0B2545] dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="modal-phone-name"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Full Name (for new accounts)
                  </label>
                  <input
                    id="modal-phone-name"
                    type="text"
                    value={phoneNameInput}
                    onChange={(e) => setPhoneNameInput(e.target.value)}
                    placeholder="Your full name"
                    className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-[#0B2545] dark:text-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="modal-phone-role"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Account Role (new phone registration)
                  </label>
                  <select
                    id="modal-phone-role"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as Exclude<AccountRole, 'admin'>)}
                    className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-[#0B2545] dark:text-white"
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} — {opt.hint}
                      </option>
                    ))}
                  </select>
                </div>

                <LegalAcceptanceFields
                  acceptedTerms={acceptedTerms}
                  acceptedPrivacy={acceptedPrivacy}
                  onChangeTerms={setAcceptedTerms}
                  onChangePrivacy={setAcceptedPrivacy}
                  showLegalDoc={showLegalDoc}
                  onToggleLegalDoc={(doc) => setShowLegalDoc(showLegalDoc === doc ? null : doc)}
                />

                {authError && <p className="text-xs font-medium text-rose-600 dark:text-amber-300">{authError}</p>}

                <button
                  type="submit"
                  disabled={isSubmittingAuth}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] disabled:opacity-60"
                >
                  {isSubmittingAuth ? 'Sending OTP...' : 'Send 6-Digit OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyPhoneOtp} className="space-y-3">
                <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-3 text-xs space-y-1">
                  <p className="text-slate-700 dark:text-slate-300">
                    Code sent to <span className="font-mono font-semibold">{otpMaskedTarget}</span>
                  </p>
                  {otpPreviewCode && (
                    <p className="rounded-md border border-amber-500/35 bg-amber-500/10 px-2.5 py-1 font-mono text-[11px] text-amber-900 dark:text-amber-200">
                      Sandbox OTP Preview: <strong>{otpPreviewCode}</strong>
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="modal-phone-otp-code"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Enter 6-Digit OTP
                  </label>
                  <input
                    id="modal-phone-otp-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCodeInput}
                    onChange={(e) => setOtpCodeInput(e.target.value)}
                    placeholder="6-digit code"
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm font-mono tracking-widest text-[#0B2545] dark:text-white"
                  />
                </div>

                {authError && <p className="text-xs font-medium text-rose-600 dark:text-amber-300">{authError}</p>}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpChallengeId('');
                      setOtpCodeInput('');
                    }}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-[#1E3A5F]/70 text-slate-700 dark:text-slate-300"
                  >
                    Change Number
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAuth}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-[#1D4ED8] disabled:opacity-60"
                  >
                    {isSubmittingAuth ? 'Verifying...' : 'Verify OTP & Continue'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Forgot & Reset Password Flow */}
        {viewMode === 'forgot-password' && (
          <div className="space-y-3">
            {!resetChallengeId ? (
              <form onSubmit={handleSendResetOtp} className="space-y-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setResetChannel('email')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border ${
                      resetChannel === 'email'
                        ? 'border-[#0B2545] bg-[#0B2545]/10 text-[#0B2545] dark:border-amber-400 dark:bg-amber-400/10 dark:text-amber-300'
                        : 'border-slate-300 dark:border-[#1E3A5F]/70 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Reset via Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetChannel('phone')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border ${
                      resetChannel === 'phone'
                        ? 'border-[#0B2545] bg-[#0B2545]/10 text-[#0B2545] dark:border-amber-400 dark:bg-amber-400/10 dark:text-amber-300'
                        : 'border-slate-300 dark:border-[#1E3A5F]/70 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Reset via Phone OTP
                  </button>
                </div>

                <div>
                  <label
                    htmlFor="modal-reset-target"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    {resetChannel === 'email' ? 'Registered Email Address' : 'Registered Phone Number'}
                  </label>
                  <input
                    id="modal-reset-target"
                    type={resetChannel === 'email' ? 'email' : 'tel'}
                    value={resetTargetInput}
                    onChange={(e) => setResetTargetInput(e.target.value)}
                    placeholder={resetChannel === 'email' ? 'you@domain.com' : '+919876543210'}
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-[#0B2545] dark:text-white"
                  />
                </div>

                {authError && <p className="text-xs font-medium text-rose-600 dark:text-amber-300">{authError}</p>}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-[#1E3A5F]/70 text-slate-700 dark:text-slate-300"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAuth}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold bg-[#0B2545] text-white dark:bg-[#1D4ED8] disabled:opacity-60"
                  >
                    {isSubmittingAuth ? 'Sending...' : 'Send Reset OTP'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCompletePasswordReset} className="space-y-3">
                {resetPreviewCode && (
                  <p className="rounded-md border border-amber-500/35 bg-amber-500/10 px-2.5 py-1.5 font-mono text-[11px] text-amber-900 dark:text-amber-200">
                    Sandbox Reset OTP Preview: <strong>{resetPreviewCode}</strong>
                  </p>
                )}

                <div>
                  <label
                    htmlFor="modal-reset-otp"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    6-Digit Reset OTP
                  </label>
                  <input
                    id="modal-reset-otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={resetOtpInput}
                    onChange={(e) => setResetOtpInput(e.target.value)}
                    placeholder="123456"
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm font-mono tracking-widest text-[#0B2545] dark:text-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="modal-reset-new-password"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    New Password
                  </label>
                  <input
                    id="modal-reset-new-password"
                    type="password"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Minimum 6 characters"
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-[#0B2545] dark:text-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="modal-reset-confirm-password"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Confirm New Password
                  </label>
                  <input
                    id="modal-reset-confirm-password"
                    type="password"
                    value={confirmNewPasswordInput}
                    onChange={(e) => setConfirmNewPasswordInput(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-[#0B2545] dark:text-white"
                  />
                </div>

                {authError && <p className="text-xs font-medium text-rose-600 dark:text-amber-300">{authError}</p>}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setResetChallengeId('')}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-[#1E3A5F]/70 text-slate-700 dark:text-slate-300"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAuth}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold bg-emerald-700 text-white dark:bg-[#1D4ED8] disabled:opacity-60"
                  >
                    {isSubmittingAuth ? 'Updating...' : 'Save New Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Admin Portal Mode */}
        {viewMode === 'admin' && (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-3 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-[#0B2545] dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#0B2545] dark:text-white">
                  {adminBootstrapMode
                    ? 'First-Time Workspace Admin Setup'
                    : 'Administrator Access Control'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {adminBootstrapMode
                    ? 'No administrator exists yet. Create the initial Admin account (locks permanently once created).'
                    : 'Restricted to verified Administrator credentials. Standard student/recruiter accounts are rejected.'}
                </p>
              </div>
            </div>

            {hasAdminAccount === false && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAdminBootstrapMode(false)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border ${
                    !adminBootstrapMode
                      ? 'border-[#0B2545] bg-[#0B2545]/10 text-[#0B2545] dark:border-amber-400 dark:text-amber-300'
                      : 'border-slate-300 dark:border-[#1E3A5F]/70 text-slate-500'
                  }`}
                >
                  Admin Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setAdminBootstrapMode(true)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border ${
                    adminBootstrapMode
                      ? 'border-[#0B2545] bg-[#0B2545]/10 text-[#0B2545] dark:border-amber-400 dark:text-amber-300'
                      : 'border-slate-300 dark:border-[#1E3A5F]/70 text-slate-500'
                  }`}
                >
                  Initialize First Admin
                </button>
              </div>
            )}

            <form
              onSubmit={adminBootstrapMode ? handleAdminBootstrap : handleEmailAuth}
              className="space-y-3"
            >
              {adminBootstrapMode && (
                <div>
                  <label
                    htmlFor="modal-admin-name"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Administrator Name
                  </label>
                  <input
                    id="modal-admin-name"
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Workspace Administrator"
                    className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-[#0B2545] dark:text-white"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="modal-admin-email"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Admin Email
                </label>
                <input
                  id="modal-admin-email"
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="admin@organization.com"
                  required
                  className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-[#0B2545] dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="modal-admin-password"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Admin Password
                </label>
                <input
                  id="modal-admin-password"
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder={adminBootstrapMode ? 'Minimum 8 characters' : 'Enter admin password'}
                  required
                  className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-[#0B2545] dark:text-white"
                />
              </div>

              {adminBootstrapMode && (
                <LegalAcceptanceFields
                  acceptedTerms={acceptedTerms}
                  acceptedPrivacy={acceptedPrivacy}
                  onChangeTerms={setAcceptedTerms}
                  onChangePrivacy={setAcceptedPrivacy}
                  showLegalDoc={showLegalDoc}
                  onToggleLegalDoc={(doc) => setShowLegalDoc(showLegalDoc === doc ? null : doc)}
                />
              )}

              {authError && <p className="text-xs font-medium text-rose-600 dark:text-amber-300">{authError}</p>}

              <button
                type="submit"
                disabled={isSubmittingAuth}
                className="w-full py-2.5 rounded-lg text-sm font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] disabled:opacity-60"
              >
                {isSubmittingAuth
                  ? 'Authenticating...'
                  : adminBootstrapMode
                    ? 'Create Administrator Account'
                    : 'Sign In as Administrator'}
              </button>
            </form>
          </div>
        )}

        {/* Standard Sign In / Create Account Views */}
        {(viewMode === 'signin' || viewMode === 'register') && (
          <>
            {oauthStepProvider ? (
              <form onSubmit={handleOAuthConfirm} className="space-y-3">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Continue with <span className="font-bold capitalize">{oauthStepProvider}</span> Account
                </p>
                <input
                  type="text"
                  value={oauthName}
                  onChange={(e) => setOauthName(e.target.value)}
                  placeholder="Full Name"
                  aria-label="Provider display name"
                  className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-[#0B2545] dark:text-white"
                />
                <input
                  type="email"
                  value={oauthEmail}
                  onChange={(e) => setOauthEmail(e.target.value)}
                  placeholder={
                    oauthStepProvider === 'google' ? 'your.name@gmail.com' : 'your.name@outlook.com'
                  }
                  aria-label="Provider account email"
                  required
                  className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-[#0B2545] dark:text-white"
                />
                {authError && <p className="text-xs font-medium text-rose-600 dark:text-amber-300">{authError}</p>}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setOauthStepProvider(null)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-[#1E3A5F]/70 text-slate-700 dark:text-slate-300"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAuth}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold bg-[#0B2545] text-white dark:bg-[#1D4ED8] disabled:opacity-60"
                  >
                    Confirm {oauthStepProvider === 'google' ? 'Google' : 'Microsoft'}
                  </button>
                </div>
              </form>
            ) : (
              <>
                {/* Google & Microsoft Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleGooglePopupSignIn}
                    disabled={isSubmittingAuth}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#05070B] text-xs font-semibold text-[#0B2545] dark:text-white hover:bg-[#F4F7FB] dark:hover:bg-white/10 transition-colors disabled:opacity-60"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
                      />
                    </svg>
                    <span>{viewMode === 'register' ? 'Google Sign Up' : 'Google Sign In'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (viewMode === 'register' && (!acceptedTerms || !acceptedPrivacy)) {
                        setAuthError('Please accept Terms & Conditions and Privacy Policy first.');
                        return;
                      }
                      setOauthStepProvider('microsoft');
                      setOauthEmail('');
                      setOauthName('');
                    }}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#05070B] text-xs font-semibold text-[#0B2545] dark:text-white hover:bg-[#F4F7FB] dark:hover:bg-white/10 transition-colors"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 21 21" aria-hidden="true">
                      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                    </svg>
                    <span>{viewMode === 'register' ? 'Microsoft Sign Up' : 'Microsoft Sign In'}</span>
                  </button>
                </div>

                <div className="relative flex items-center py-0.5">
                  <div className="flex-grow border-t border-slate-200 dark:border-white/10" />
                  <span className="shrink mx-3 text-[11px] text-slate-500 dark:text-slate-400">
                    or continue with email
                  </span>
                  <div className="flex-grow border-t border-slate-200 dark:border-white/10" />
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-3">
                  {viewMode === 'register' && (
                    <>
                      <div>
                        <label
                          htmlFor="modal-auth-role"
                          className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                        >
                          I am registering as a
                        </label>
                        <select
                          id="modal-auth-role"
                          value={selectedRole}
                          onChange={(e) =>
                            setSelectedRole(e.target.value as Exclude<AccountRole, 'admin'>)
                          }
                          className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-[#0B2545] dark:text-white"
                        >
                          {ROLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label} — {opt.hint}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="modal-auth-name"
                          className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                        >
                          Full Name
                        </label>
                        <input
                          id="modal-auth-name"
                          type="text"
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          placeholder="Your full name"
                          className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-[#0B2545] dark:text-white"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label
                      htmlFor="modal-auth-email"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        id="modal-auth-email"
                        type="email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="you@domain.com"
                        required
                        className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] pl-9 pr-3 py-2 text-sm text-[#0B2545] dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
                        htmlFor="modal-auth-password"
                        className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                      >
                        Password
                      </label>
                      {viewMode === 'signin' && (
                        <button
                          type="button"
                          onClick={() => switchMode('forgot-password')}
                          className="text-[11px] font-semibold text-emerald-700 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
                        >
                          <KeyRound className="w-3 h-3" />
                          <span>Forgot password?</span>
                        </button>
                      )}
                    </div>
                    <input
                      id="modal-auth-password"
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Minimum 6 characters"
                      required
                      className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-[#0B2545] dark:text-white"
                    />
                  </div>

                  {viewMode === 'register' && (
                    <LegalAcceptanceFields
                      acceptedTerms={acceptedTerms}
                      acceptedPrivacy={acceptedPrivacy}
                      onChangeTerms={setAcceptedTerms}
                      onChangePrivacy={setAcceptedPrivacy}
                      showLegalDoc={showLegalDoc}
                      onToggleLegalDoc={(doc) => setShowLegalDoc(showLegalDoc === doc ? null : doc)}
                    />
                  )}

                  {authError && (
                    <p className="text-xs font-medium text-rose-600 dark:text-amber-300">
                      {authError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmittingAuth}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
                  >
                    {viewMode === 'register' ? (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>
                          {isSubmittingAuth ? 'Creating Account...' : 'Create Account & Save Details'}
                        </span>
                      </>
                    ) : (
                      <span>{isSubmittingAuth ? 'Signing In...' : 'Sign In & Save Details'}</span>
                    )}
                  </button>
                </form>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function LegalAcceptanceFields({
  acceptedTerms,
  acceptedPrivacy,
  onChangeTerms,
  onChangePrivacy,
  showLegalDoc,
  onToggleLegalDoc,
}: {
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  onChangeTerms: (v: boolean) => void;
  onChangePrivacy: (v: boolean) => void;
  showLegalDoc: 'terms' | 'privacy' | null;
  onToggleLegalDoc: (doc: 'terms' | 'privacy') => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-3 space-y-2 text-xs">
      <label className="flex items-start gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => onChangeTerms(e.target.checked)}
          className="mt-0.5 rounded accent-[#0B2545] dark:accent-[#1D4ED8]"
        />
        <span>
          I accept the{' '}
          <button
            type="button"
            onClick={() => onToggleLegalDoc('terms')}
            className="font-semibold underline text-[#0B2545] dark:text-amber-400"
          >
            Terms &amp; Conditions
          </button>
        </span>
      </label>

      <label className="flex items-start gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
        <input
          type="checkbox"
          checked={acceptedPrivacy}
          onChange={(e) => onChangePrivacy(e.target.checked)}
          className="mt-0.5 rounded accent-[#0B2545] dark:accent-[#1D4ED8]"
        />
        <span>
          I accept the{' '}
          <button
            type="button"
            onClick={() => onToggleLegalDoc('privacy')}
            className="font-semibold underline text-[#0B2545] dark:text-amber-400"
          >
            Privacy Policy
          </button>
        </span>
      </label>

      {showLegalDoc && (
        <div className="rounded-md border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-2.5 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
          {showLegalDoc === 'terms' ? (
            <p>
              <strong>VoraGen Terms &amp; Conditions:</strong> You retain full ownership of your
              resume, projects, and profile data. Assessment scores and certifications must represent
              authentic work. Accounts may be revoked or deleted at your request at any time.
            </p>
          ) : (
            <p>
              <strong>VoraGen Privacy Policy:</strong> Personal contact details, phone numbers,
              educational credentials, and uploaded resumes are stored strictly according to your
              Profile Visibility setting and never sold to third parties. Contact
              voragenerationnetwork@gmail.com for privacy inquiries.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

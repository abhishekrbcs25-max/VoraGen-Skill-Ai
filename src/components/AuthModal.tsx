import { useEffect, useState } from 'react';
import { Lock, X } from 'lucide-react';
import { signInWithGooglePopup } from '../lib/firebase';
import { Logo } from './Logo';
import type { UserProfile } from '../types';

interface AuthModalProps {
  open: boolean;
  reason?: string;
  onClose: () => void;
  onAuthSuccess: (userKey: string, nextProfile: UserProfile, token?: string) => void;
}

export function AuthModal({ open, reason, onClose, onAuthSuccess }: AuthModalProps) {
  const [authTab, setAuthTab] = useState<'signin' | 'register'>('signin');
  const [oauthStepProvider, setOauthStepProvider] = useState<'google' | 'microsoft' | null>(null);
  const [oauthEmail, setOauthEmail] = useState('');
  const [oauthName, setOauthName] = useState('');

  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOauthStepProvider(null);
        setAuthError('');
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const performServerAuth = async (params: {
    mode: 'register' | 'signin';
    name: string;
    email: string;
    password?: string;
    authProvider: UserProfile['authProvider'];
  }) => {
    setIsSubmittingAuth(true);
    setAuthError('');
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
        setAuthError(data.error || 'Authentication failed. Please try again.');
        return;
      }
      setOauthStepProvider(null);
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
    setIsSubmittingAuth(true);
    setAuthError('');
    try {
      const { user } = await signInWithGooglePopup();
      if (user.email) {
        await performServerAuth({
          mode: authTab,
          name: user.displayName || user.email.split('@')[0],
          email: user.email,
          authProvider: 'google',
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
      mode: authTab,
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
    const cleanName =
      authTab === 'register'
        ? nameInput.trim() || cleanEmail.split('@')[0]
        : cleanEmail.split('@')[0];

    performServerAuth({
      mode: authTab,
      name: cleanName,
      email: cleanEmail,
      password: passwordInput,
      authProvider: 'email',
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="voragen-auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0E131F] p-6 shadow-2xl space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Logo className="w-8 h-8 shrink-0" />
            <div>
              <h2
                id="voragen-auth-modal-title"
                className="font-display text-lg font-bold text-slate-950 dark:text-white leading-tight"
              >
                {authTab === 'register' ? 'Create Your VoraGen Account' : 'Sign In to VoraGen'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                VoraGen Skill AI · Private Learner Workspace
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setOauthStepProvider(null);
              setAuthError('');
              onClose();
            }}
            aria-label="Close sign in modal"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {reason && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>{reason}</span>
          </div>
        )}

        {/* Sign In / Create Account Switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#141B2D]">
          <button
            type="button"
            onClick={() => {
              setAuthTab('signin');
              setOauthStepProvider(null);
              setAuthError('');
            }}
            className={`py-2 text-xs font-semibold rounded-md transition-colors ${
              authTab === 'signin'
                ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthTab('register');
              setOauthStepProvider(null);
              setAuthError('');
            }}
            className={`py-2 text-xs font-semibold rounded-md transition-colors ${
              authTab === 'register'
                ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Create Account
          </button>
        </div>

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
              className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#141B2D] px-3 py-2 text-sm text-slate-900 dark:text-white"
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
              className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#141B2D] px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
            {authError && <p className="text-xs text-red-600 dark:text-pink-400">{authError}</p>}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOauthStepProvider(null)}
                className="flex-1 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-300"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmittingAuth}
                className="flex-1 py-2 rounded-lg text-xs font-semibold bg-red-600 text-white dark:bg-blue-600 disabled:opacity-60"
              >
                Confirm {oauthStepProvider === 'google' ? 'Google' : 'Microsoft'}
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Google & Microsoft Options */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleGooglePopupSignIn}
                disabled={isSubmittingAuth}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#141B2D] text-sm font-semibold text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 transition-colors disabled:opacity-60"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
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
                <span>
                  {authTab === 'register' ? 'Register with Google' : 'Sign in with Google'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOauthStepProvider('microsoft');
                  setOauthEmail('');
                  setOauthName('');
                }}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#141B2D] text-sm font-semibold text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 21 21" aria-hidden="true">
                  <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                  <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                  <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                  <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                </svg>
                <span>
                  {authTab === 'register' ? 'Register with Microsoft' : 'Sign in with Microsoft'}
                </span>
              </button>
            </div>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-slate-200 dark:border-white/10" />
              <span className="shrink mx-3 text-[11px] text-slate-500 dark:text-slate-400">
                or continue with email
              </span>
              <div className="flex-grow border-t border-slate-200 dark:border-white/10" />
            </div>

            {/* Email & Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-3">
              {authTab === 'register' && (
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
                    className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#141B2D] px-3 py-2 text-sm text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="modal-auth-email"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Email Address
                </label>
                <input
                  id="modal-auth-email"
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="you@domain.com"
                  required
                  className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#141B2D] px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="modal-auth-password"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Password
                </label>
                <input
                  id="modal-auth-password"
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                  className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#141B2D] px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>

              {authError && <p className="text-xs text-red-600 dark:text-pink-400">{authError}</p>}

              <button
                type="submit"
                disabled={isSubmittingAuth}
                className="w-full py-2.5 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors disabled:opacity-60"
              >
                {isSubmittingAuth
                  ? 'Signing In...'
                  : authTab === 'register'
                    ? 'Create Account & Save Details'
                    : 'Sign In & Save Details'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

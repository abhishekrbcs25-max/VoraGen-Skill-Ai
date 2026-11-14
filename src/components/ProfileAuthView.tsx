import { useEffect, useState } from 'react';
import {
  Award,
  Check,
  Copy,
  FolderGit2,
  LogIn,
  LogOut,
  Plus,
  ShieldCheck,
  Target,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { signInWithGooglePopup } from '../lib/firebase';
import type { CareerRole, SkillMatchBreakdown, UserProfile, UserSkill } from '../types';

interface ProfileAuthViewProps {
  profile: UserProfile;
  roles: CareerRole[];
  match: SkillMatchBreakdown;
  onUpdateProfile: (next: UserProfile) => void;
  onAuthSuccess: (userKey: string, nextProfile: UserProfile, token?: string) => void;
  onSignOut: () => void;
  onResetDemo: () => void;
  onVerifySkill: (skillName: string) => void;
}

export function ProfileAuthView({
  profile,
  roles,
  match,
  onUpdateProfile,
  onAuthSuccess,
  onSignOut,
  onResetDemo,
  onVerifySkill,
}: ProfileAuthViewProps) {
  const [authTab, setAuthTab] = useState<'signin' | 'register'>('register');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [oauthStepProvider, setOauthStepProvider] = useState<'google' | 'microsoft' | null>(null);
  const [oauthEmail, setOauthEmail] = useState('');
  const [oauthName, setOauthName] = useState('');

  // Email/password form fields (positioned below Google & Microsoft options)
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // Add skill
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState(65);
  const [newSkillCat, setNewSkillCat] = useState<UserSkill['category']>('Frontend');

  // Add certification
  const [certTitle, setCertTitle] = useState('');
  const [certIssuer, setCertIssuer] = useState('');
  const [certYear, setCertYear] = useState('2026');

  // Add project
  const [projTitle, setProjTitle] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projSkills, setProjSkills] = useState('');
  const [projRepo, setProjRepo] = useState('');

  // Add goal
  const [goalInput, setGoalInput] = useState('');
  const [copiedReadme, setCopiedReadme] = useState(false);

  const currentRole = roles.find((r) => r.id === profile.targetCareerId) ?? roles[0];

  useEffect(() => {
    if (!showAuthModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAuthModal(false);
        setOauthStepProvider(null);
        setAuthError('');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showAuthModal]);

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
      onAuthSuccess(data.key, data.profile, data.token);
      setOauthStepProvider(null);
      setShowAuthModal(false);
      setPasswordInput('');
      setEmailInput('');
      setNameInput('');
    } catch {
      setAuthError('Network error while connecting to Voragen auth.');
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
      // Fall back to explicit Google account email confirmation step when popup is blocked or closed
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

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSkillName.trim();
    if (!trimmed) return;
    const exists = profile.skills.some(
      (s) => s.name.toLowerCase() === trimmed.toLowerCase(),
    );
    const updatedSkills = exists
      ? profile.skills.map((s) =>
          s.name.toLowerCase() === trimmed.toLowerCase()
            ? { ...s, level: newSkillLevel, category: newSkillCat }
            : s,
        )
      : [
          ...profile.skills,
          { name: trimmed, level: newSkillLevel, category: newSkillCat, verified: false },
        ];
    onUpdateProfile({ ...profile, skills: updatedSkills });
    setNewSkillName('');
  };

  const handleAddCertification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!certTitle.trim() || !certIssuer.trim()) return;
    onUpdateProfile({
      ...profile,
      certifications: [
        ...profile.certifications,
        {
          id: `cert-${Date.now()}`,
          title: certTitle.trim(),
          issuer: certIssuer.trim(),
          year: certYear.trim() || '2026',
        },
      ],
    });
    setCertTitle('');
    setCertIssuer('');
  };

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projTitle.trim() || !projDesc.trim()) return;
    onUpdateProfile({
      ...profile,
      projects: [
        ...profile.projects,
        {
          id: `proj-${Date.now()}`,
          title: projTitle.trim(),
          description: projDesc.trim(),
          skillsUsed: projSkills
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          repoUrl: projRepo.trim() || undefined,
        },
      ],
    });
    setProjTitle('');
    setProjDesc('');
    setProjSkills('');
    setProjRepo('');
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalInput.trim()) return;
    onUpdateProfile({
      ...profile,
      careerGoals: [...profile.careerGoals, goalInput.trim()],
    });
    setGoalInput('');
  };

  const copyPortfolioMarkdown = async () => {
    const md = `# ${profile.name} — Career Readiness Passport
Target Role: ${currentRole.title} (${match.overallReadinessPct}% Ready)
Skills: ${profile.skills.map((s) => `${s.name} (${s.level}%)`).join(', ')}
Certifications: ${profile.certifications.map((c) => `${c.title} - ${c.issuer} (${c.year})`).join('; ')}
Projects: ${profile.projects.map((p) => `${p.title}: ${p.description}`).join('; ')}`;
    try {
      await navigator.clipboard.writeText(md);
      setCopiedReadme(true);
      setTimeout(() => setCopiedReadme(false), 2500);
    } catch {
      // Fallback ignored in restricted clipboard contexts
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Account Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
            Learner Profile & Account
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Manage your skills, certifications, projects, career goals, and sign-in credentials.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={copyPortfolioMarkdown}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            {copiedReadme ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedReadme ? 'Copied GitHub Summary' : 'Export GitHub Summary'}</span>
          </button>

          {profile.isSignedIn && (
            <button
              type="button"
              onClick={onResetDemo}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              Clear Workspace
            </button>
          )}

          {profile.isSignedIn ? (
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white dark:bg-white/10 dark:hover:bg-white/20"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAuthTab('register');
                setShowAuthModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Register</span>
            </button>
          )}
        </div>
      </div>

      {/* Identity & Career Goal Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-600/10 dark:bg-blue-500/15 flex items-center justify-center text-red-700 dark:text-blue-400 font-display font-bold text-lg">
              {(profile.name.trim() || 'VG').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
                  {profile.isSignedIn ? profile.name : 'Guest Visitor'}
                </h2>
                {profile.isSignedIn && (
                  <UserCheck className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {profile.isSignedIn
                  ? `${profile.email} · ${profile.authProvider.toUpperCase()}`
                  : 'Sign in or create an account to save updates'}
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <label
                htmlFor="profile-name"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Full Name
              </label>
              <input
                id="profile-name"
                type="text"
                value={profile.name}
                onChange={(e) => onUpdateProfile({ ...profile, name: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#141B2D] px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="profile-education"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                University / Organization Role
              </label>
              <input
                id="profile-education"
                type="text"
                value={profile.education}
                onChange={(e) => onUpdateProfile({ ...profile, education: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#141B2D] px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="profile-target-career"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Primary Target Career
              </label>
              <select
                id="profile-target-career"
                value={profile.targetCareerId}
                onChange={(e) => onUpdateProfile({ ...profile, targetCareerId: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#141B2D] px-3 py-2 text-sm text-slate-900 dark:text-white"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} ({r.domain})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Career Goals Editor */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-red-600 dark:text-pink-400" />
              <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
                Personal Career Goals
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Your AI Mentor & Curriculum Agent align recommendations around these concrete milestones.
            </p>

            <ul className="mt-4 space-y-2">
              {profile.careerGoals.map((goal, idx) => (
                <li
                  key={`${goal}-${idx}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#141B2D] px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-200"
                >
                  <span>{goal}</span>
                  <button
                    type="button"
                    aria-label={`Remove goal ${goal}`}
                    onClick={() =>
                      onUpdateProfile({
                        ...profile,
                        careerGoals: profile.careerGoals.filter((_, i) => i !== idx),
                      })
                    }
                    className="text-slate-400 hover:text-red-600 dark:hover:text-pink-400 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <form onSubmit={handleAddGoal} className="mt-4 flex gap-2">
            <input
              type="text"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              placeholder="Add a career goal (e.g., Land a Full Stack internship by May)"
              aria-label="New career goal"
              className="flex-1 rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#141B2D] px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add Goal</span>
            </button>
          </form>
        </div>
      </div>

      {/* Existing Skills Section */}
      <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-6 space-y-5">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
            Existing Skills Inventory ({profile.skills.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Adjust proficiency sliders or add new competencies—your readiness meter recalculates immediately.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profile.skills.length === 0 ? (
            <div className="md:col-span-2 lg:col-span-3 rounded-xl border border-dashed border-slate-300 dark:border-white/15 p-5 text-center text-xs text-slate-500 dark:text-slate-400">
              No skills added yet. Add your existing skills below and run a Genuine Skill Check to verify them.
            </div>
          ) : (
            profile.skills.map((skill) => (
              <div
                key={skill.name}
                className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#141B2D] p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {skill.name}
                    </span>
                    <span
                      className={`block text-[11px] font-medium ${
                        skill.verified
                          ? 'text-emerald-700 dark:text-amber-400'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {skill.category} · {skill.verified ? 'Verified Genuine' : 'Unverified Claim'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold tabular-nums text-red-700 dark:text-amber-400">
                      {skill.level}%
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove skill ${skill.name}`}
                      onClick={() =>
                        onUpdateProfile({
                          ...profile,
                          skills: profile.skills.filter((s) => s.name !== skill.name),
                        })
                      }
                      className="text-slate-400 hover:text-red-600 dark:hover:text-pink-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <input
                  type="range"
                  min={5}
                  max={100}
                  value={skill.level}
                  aria-label={`${skill.name} proficiency`}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    onUpdateProfile({
                      ...profile,
                      skills: profile.skills.map((s) =>
                        s.name === skill.name ? { ...s, level: val, verified: false } : s,
                      ),
                    });
                  }}
                  className="w-full accent-red-600 dark:accent-blue-500 cursor-pointer"
                />

                <div className="flex items-center justify-between pt-0.5">
                  <button
                    type="button"
                    onClick={() => onVerifySkill(skill.name)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 dark:text-blue-400 hover:underline"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{skill.verified ? 'Re-Verify Skill' : 'Verify Genuine'}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleAddSkill} className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-200 dark:border-white/10">
          <input
            type="text"
            value={newSkillName}
            onChange={(e) => setNewSkillName(e.target.value)}
            placeholder="Skill name (e.g., JavaScript, React, Docker)"
            aria-label="Add skill name"
            className="sm:col-span-5 rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#141B2D] px-3 py-2 text-sm text-slate-900 dark:text-white"
          />
          <select
            value={newSkillCat}
            onChange={(e) => setNewSkillCat(e.target.value as UserSkill['category'])}
            aria-label="Skill category"
            className="sm:col-span-3 rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#141B2D] px-3 py-2 text-sm text-slate-900 dark:text-white"
          >
            <option value="Frontend">Frontend</option>
            <option value="Backend">Backend</option>
            <option value="Data & AI">Data & AI</option>
            <option value="Cloud & DevOps">Cloud & DevOps</option>
            <option value="Security">Security</option>
            <option value="Foundations">Foundations</option>
          </select>
          <div className="sm:col-span-2 flex items-center gap-2">
            <input
              type="number"
              min={5}
              max={100}
              value={newSkillLevel}
              onChange={(e) => setNewSkillLevel(Number(e.target.value))}
              aria-label="Skill percentage"
              className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#141B2D] px-3 py-2 text-sm tabular-nums text-slate-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            className="sm:col-span-2 px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap"
          >
            Add Skill
          </button>
        </form>
      </section>

      {/* Certifications & Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Certifications */}
        <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
              Certifications ({profile.certifications.length})
            </h2>
          </div>

          <div className="space-y-2.5">
            {profile.certifications.map((cert) => (
              <div
                key={cert.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#141B2D] p-3.5"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {cert.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {cert.issuer} · {cert.year}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Delete certification ${cert.title}`}
                  onClick={() =>
                    onUpdateProfile({
                      ...profile,
                      certifications: profile.certifications.filter((c) => c.id !== cert.id),
                    })
                  }
                  className="text-slate-400 hover:text-red-600 dark:hover:text-pink-400 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddCertification} className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-white/10">
            <input
              type="text"
              value={certTitle}
              onChange={(e) => setCertTitle(e.target.value)}
              placeholder="Certification title (e.g., AWS Cloud Practitioner)"
              aria-label="Certification title"
              className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#141B2D] px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={certIssuer}
                onChange={(e) => setCertIssuer(e.target.value)}
                placeholder="Issuer (e.g., Coursera, AWS)"
                aria-label="Certification issuer"
                className="flex-1 rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#141B2D] px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
              <input
                type="text"
                value={certYear}
                onChange={(e) => setCertYear(e.target.value)}
                placeholder="Year"
                aria-label="Certification year"
                className="w-24 rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#141B2D] px-3 py-2 text-sm tabular-nums text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap"
              >
                Add
              </button>
            </div>
          </form>
        </section>

        {/* Projects */}
        <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-6 space-y-4">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-red-600 dark:text-pink-400" />
            <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
              Projects Portfolio ({profile.projects.length})
            </h2>
          </div>

          <div className="space-y-2.5">
            {profile.projects.map((proj) => (
              <div
                key={proj.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#141B2D] p-3.5"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {proj.title}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{proj.description}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Stack: {proj.skillsUsed.join(' · ') || 'General'}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Delete project ${proj.title}`}
                  onClick={() =>
                    onUpdateProfile({
                      ...profile,
                      projects: profile.projects.filter((p) => p.id !== proj.id),
                    })
                  }
                  className="text-slate-400 hover:text-red-600 dark:hover:text-pink-400 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddProject} className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-white/10">
            <input
              type="text"
              value={projTitle}
              onChange={(e) => setProjTitle(e.target.value)}
              placeholder="Project title (e.g., AI Habit Tracker)"
              aria-label="Project title"
              className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#141B2D] px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
            <input
              type="text"
              value={projDesc}
              onChange={(e) => setProjDesc(e.target.value)}
              placeholder="Short outcome description"
              aria-label="Project description"
              className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#141B2D] px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={projSkills}
                onChange={(e) => setProjSkills(e.target.value)}
                placeholder="Skills comma-separated (React, SQL)"
                aria-label="Project skills"
                className="flex-1 rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#141B2D] px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap"
              >
                Add Project
              </button>
            </div>
          </form>
        </section>
      </div>

      {/* Sign In / Register Modal with Google, Microsoft, and Email below */}
      {showAuthModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0E131F] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h2
                id="auth-modal-title"
                className="font-display text-xl font-bold text-slate-950 dark:text-white"
              >
                {authTab === 'register' ? 'Create Your Voragen Account' : 'Sign In to Voragen'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowAuthModal(false);
                  setOauthStepProvider(null);
                  setAuthError('');
                }}
                className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                Close
              </button>
            </div>

            {/* Sign In / Register Switcher */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#141B2D]">
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
                Register
              </button>
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
            </div>

            {oauthStepProvider ? (
              <form onSubmit={handleOAuthConfirm} className="space-y-3">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Continue with{' '}
                  <span className="font-bold capitalize">{oauthStepProvider}</span> Account
                </p>
                <input
                  type="text"
                  value={oauthName}
                  onChange={(e) => setOauthName(e.target.value)}
                  placeholder="Display Name"
                  aria-label="Provider display name"
                  className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#141B2D] px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
                <input
                  type="email"
                  value={oauthEmail}
                  onChange={(e) => setOauthEmail(e.target.value)}
                  placeholder={
                    oauthStepProvider === 'google'
                      ? 'your.name@gmail.com'
                      : 'your.name@outlook.com'
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
                    className="flex-1 py-2 rounded-lg text-xs font-semibold bg-red-600 text-white dark:bg-blue-600"
                  >
                    Confirm {oauthStepProvider === 'google' ? 'Google' : 'Microsoft'}
                  </button>
                </div>
              </form>
            ) : (
              <>
                {/* Google & Microsoft Account Buttons FIRST */}
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
                      {authTab === 'register'
                        ? 'Register with Microsoft'
                        : 'Sign in with Microsoft'}
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

                {/* Email Registration / Sign In Form BELOW Google & Microsoft */}
                <form onSubmit={handleEmailAuth} className="space-y-3">
                  {authTab === 'register' && (
                    <div>
                      <label
                        htmlFor="auth-name"
                        className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                      >
                        Full Name
                      </label>
                      <input
                        id="auth-name"
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
                      htmlFor="auth-email"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Email Address
                    </label>
                    <input
                      id="auth-email"
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="student@university.edu"
                      required
                      className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#141B2D] px-3 py-2 text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="auth-password"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Password
                    </label>
                    <input
                      id="auth-password"
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Minimum 6 characters"
                      required
                      className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#141B2D] px-3 py-2 text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  {authError && (
                    <p className="text-xs text-red-600 dark:text-pink-400">{authError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmittingAuth}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors disabled:opacity-60"
                  >
                    {isSubmittingAuth
                      ? 'Preparing Fresh Workspace...'
                      : authTab === 'register'
                        ? 'Create Fresh Account with Email'
                        : 'Sign In with Email'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

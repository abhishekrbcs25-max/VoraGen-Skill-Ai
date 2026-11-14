import { useEffect, useState } from 'react';
import {
  Award,
  Check,
  Copy,
  FolderGit2,
  LogIn,
  LogOut,
  Plus,
  Save,
  ShieldCheck,
  Target,
  Trash2,
  UserCheck,
} from 'lucide-react';
import type { CareerRole, SkillMatchBreakdown, UserProfile, UserSkill } from '../types';

interface ProfileAuthViewProps {
  profile: UserProfile;
  roles: CareerRole[];
  match: SkillMatchBreakdown;
  onUpdateProfile: (next: UserProfile) => void;
  onSignOut: () => void;
  onResetDemo: () => void;
  onVerifySkill: (skillName: string) => void;
  onOpenAuthModal: () => void;
}

export function ProfileAuthView({
  profile,
  roles,
  match,
  onUpdateProfile,
  onSignOut,
  onResetDemo,
  onVerifySkill,
  onOpenAuthModal,
}: ProfileAuthViewProps) {
  // Draft state lets signed-out visitors enter details smoothly and trigger AuthModal on Save
  const [draftName, setDraftName] = useState(profile.name);
  const [draftEducation, setDraftEducation] = useState(profile.education);
  const [draftCareerId, setDraftCareerId] = useState(profile.targetCareerId);
  const [identitySaved, setIdentitySaved] = useState(false);

  useEffect(() => {
    setDraftName(profile.name);
    setDraftEducation(profile.education);
    setDraftCareerId(profile.targetCareerId);
  }, [profile.name, profile.education, profile.targetCareerId, profile.isSignedIn]);

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

  const handleSaveIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      ...profile,
      name: draftName.trim(),
      education: draftEducation.trim(),
      targetCareerId: draftCareerId,
    });
    if (!profile.isSignedIn) return;
    setIdentitySaved(true);
    setTimeout(() => setIdentitySaved(false), 2000);
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
    if (!profile.isSignedIn) return;
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
    if (!profile.isSignedIn) return;
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
    if (!profile.isSignedIn) return;
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
    if (!profile.isSignedIn) return;
    setGoalInput('');
  };

  const copyPortfolioMarkdown = async () => {
    const md = `# ${profile.name || 'Learner'} — Career Readiness Passport
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
              onClick={onOpenAuthModal}
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
        <form
          onSubmit={handleSaveIdentity}
          className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-6 space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-600/10 dark:bg-blue-500/15 flex items-center justify-center text-red-700 dark:text-blue-400 font-display font-bold text-lg">
              {(draftName.trim() || 'VG').slice(0, 2).toUpperCase()}
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
                value={draftName}
                onChange={(e) => {
                  const val = e.target.value;
                  setDraftName(val);
                  if (profile.isSignedIn) {
                    onUpdateProfile({ ...profile, name: val, education: draftEducation, targetCareerId: draftCareerId });
                  }
                }}
                placeholder="Enter your full name"
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
                value={draftEducation}
                onChange={(e) => {
                  const val = e.target.value;
                  setDraftEducation(val);
                  if (profile.isSignedIn) {
                    onUpdateProfile({ ...profile, name: draftName, education: val, targetCareerId: draftCareerId });
                  }
                }}
                placeholder="e.g., B.Tech CS or Software Intern"
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
                value={draftCareerId}
                onChange={(e) => {
                  const val = e.target.value;
                  setDraftCareerId(val);
                  if (profile.isSignedIn) {
                    onUpdateProfile({ ...profile, name: draftName, education: draftEducation, targetCareerId: val });
                  }
                }}
                className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#141B2D] px-3 py-2 text-sm text-slate-900 dark:text-white"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} ({r.domain})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors"
            >
              {identitySaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              <span>
                {identitySaved
                  ? 'Profile Saved'
                  : profile.isSignedIn
                    ? 'Save Profile Details'
                    : 'Save Profile Details (Requires Sign In)'}
              </span>
            </button>
          </div>
        </form>

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
    </div>
  );
}

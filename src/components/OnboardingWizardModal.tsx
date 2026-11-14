import { useEffect, useState } from 'react';
import { Award, CheckCircle2, Plus, Sparkles, Trash2 } from 'lucide-react';
import type { CareerRole, UserProfile, UserSkill } from '../types';

interface OnboardingWizardModalProps {
  open: boolean;
  profile: UserProfile;
  roles: CareerRole[];
  onComplete: (updated: UserProfile) => void;
  onSkip: () => void;
}

const STARTER_SKILL_SUGGESTIONS: Array<{ name: string; category: UserSkill['category'] }> = [
  { name: 'Python', category: 'Data & AI' },
  { name: 'JavaScript', category: 'Frontend' },
  { name: 'React', category: 'Frontend' },
  { name: 'Node.js', category: 'Backend' },
  { name: 'SQL', category: 'Backend' },
  { name: 'TypeScript', category: 'Frontend' },
  { name: 'HTML/CSS', category: 'Frontend' },
  { name: 'Machine Learning', category: 'Data & AI' },
];

export function OnboardingWizardModal({
  open,
  profile,
  roles,
  onComplete,
  onSkip,
}: OnboardingWizardModalProps) {
  const [name, setName] = useState(profile.name);
  const [education, setEducation] = useState(profile.education || '');
  const [targetCareerId, setTargetCareerId] = useState(profile.targetCareerId || roles[0].id);
  const [skills, setSkills] = useState<UserSkill[]>(profile.skills);
  const [skillInput, setSkillInput] = useState('');
  const [skillCat, setSkillCat] = useState<UserSkill['category']>('Frontend');
  const [skillLevel, setSkillLevel] = useState(65);
  const [goalInput, setGoalInput] = useState('');
  const [certInput, setCertInput] = useState('');
  const [projectInput, setProjectInput] = useState('');

  useEffect(() => {
    if (open) {
      setName(profile.name);
      setEducation(profile.education || '');
      setTargetCareerId(profile.targetCareerId || roles[0].id);
      setSkills(profile.skills);
      setSkillInput('');
      setGoalInput('');
      setCertInput('');
      setProjectInput('');
    }
  }, [open, profile.id, profile.name, profile.education, profile.targetCareerId, profile.skills, roles]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onSkip]);

  if (!open) return null;

  const addSkill = (sName: string, sCat: UserSkill['category'], sLevel: number) => {
    const trimmed = sName.trim();
    if (!trimmed) return;
    if (skills.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) return;
    setSkills((prev) => [...prev, { name: trimmed, category: sCat, level: sLevel, verified: false }]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const chosenRole = roles.find((r) => r.id === targetCareerId) ?? roles[0];
    const nextProfile: UserProfile = {
      ...profile,
      name: name.trim() || profile.name,
      education: education.trim() || 'Independent Learner',
      headline: `Aspiring ${chosenRole.title}`,
      targetCareerId,
      skills,
      careerGoals: goalInput.trim()
        ? [goalInput.trim()]
        : [`Reach 85%+ readiness for ${chosenRole.title}`],
      certifications: certInput.trim()
        ? [
            {
              id: `cert-${Date.now()}`,
              title: certInput.trim(),
              issuer: 'Self-Reported Credential',
              year: '2026',
            },
          ]
        : [],
      projects: projectInput.trim()
        ? [
            {
              id: `proj-${Date.now()}`,
              title: projectInput.trim(),
              description: 'Initial portfolio project added during account onboarding.',
              skillsUsed: skills.slice(0, 3).map((s) => s.name),
            },
          ]
        : [],
      needsOnboarding: false,
    };
    onComplete(nextProfile);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0E131F] p-6 sm:p-7 shadow-2xl space-y-5 my-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-red-700 dark:text-amber-400">
              <Sparkles className="w-4 h-4" />
              <span>Fresh Learner Onboarding · Clean Workspace</span>
            </div>
            <h2
              id="onboarding-title"
              className="mt-1 font-display text-xl sm:text-2xl font-bold text-slate-950 dark:text-white"
            >
              Welcome to Voragen, {profile.name}!
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Your new account starts completely fresh. Enter your real background, target career, and existing skills below.
            </p>
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white shrink-0"
          >
            Skip
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="onboard-name"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Full Name
              </label>
              <input
                id="onboard-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#141B2D] px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label
                htmlFor="onboard-edu"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                University / Current Role
              </label>
              <input
                id="onboard-edu"
                type="text"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="e.g., B.Tech CS Year 2 or Junior Analyst"
                className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#141B2D] px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="onboard-career"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Target Career Goal
            </label>
            <select
              id="onboard-career"
              value={targetCareerId}
              onChange={(e) => setTargetCareerId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#141B2D] px-3 py-2 text-sm text-slate-900 dark:text-white"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.domain})
                </option>
              ))}
            </select>
          </div>

          {/* Fresh Existing Skills Builder */}
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#141B2D] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                Your Existing Skills ({skills.length} added)
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                You can verify if skills are genuine right after setup
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {STARTER_SKILL_SUGGESTIONS.map((item) => {
                const added = skills.some((s) => s.name === item.name);
                return (
                  <button
                    key={item.name}
                    type="button"
                    disabled={added}
                    onClick={() => addSkill(item.name, item.category, 65)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      added
                        ? 'bg-emerald-600/20 text-emerald-700 dark:text-amber-300'
                        : 'bg-white dark:bg-[#0E131F] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:border-red-500'
                    }`}
                  >
                    {added ? `✓ ${item.name}` : `+ ${item.name}`}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                placeholder="Custom skill (e.g., Docker)"
                aria-label="Custom onboarding skill"
                className="sm:col-span-5 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0E131F] px-3 py-1.5 text-xs text-slate-900 dark:text-white"
              />
              <select
                value={skillCat}
                onChange={(e) => setSkillCat(e.target.value as UserSkill['category'])}
                aria-label="Custom skill category"
                className="sm:col-span-3 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0E131F] px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
              >
                <option value="Frontend">Frontend</option>
                <option value="Backend">Backend</option>
                <option value="Data & AI">Data & AI</option>
                <option value="Cloud & DevOps">Cloud & DevOps</option>
                <option value="Security">Security</option>
                <option value="Foundations">Foundations</option>
              </select>
              <input
                type="number"
                min={10}
                max={100}
                value={skillLevel}
                onChange={(e) => setSkillLevel(Number(e.target.value))}
                aria-label="Claimed proficiency"
                className="sm:col-span-2 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0E131F] px-2.5 py-1.5 text-xs tabular-nums text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => {
                  addSkill(skillInput, skillCat, skillLevel);
                  setSkillInput('');
                }}
                className="sm:col-span-2 inline-flex items-center justify-center gap-1 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-semibold py-1.5 px-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {skills.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
                {skills.map((s) => (
                  <div
                    key={s.name}
                    className="flex items-center justify-between gap-2 rounded-lg bg-white dark:bg-[#0E131F] px-3 py-1.5 border border-slate-200 dark:border-white/10 text-xs"
                  >
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {s.name} <span className="font-normal text-slate-500">({s.category})</span>
                    </span>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={10}
                        max={100}
                        value={s.level}
                        aria-label={`${s.name} proficiency`}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setSkills((prev) =>
                            prev.map((item) =>
                              item.name === s.name ? { ...item, level: val } : item,
                            ),
                          );
                        }}
                        className="w-24 accent-red-600 dark:accent-blue-500"
                      />
                      <span className="font-mono font-semibold tabular-nums w-9 text-right">
                        {s.level}%
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove ${s.name}`}
                        onClick={() =>
                          setSkills((prev) => prev.filter((item) => item.name !== s.name))
                        }
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="onboard-goal"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Personal Goal (Optional)
              </label>
              <input
                id="onboard-goal"
                type="text"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder="e.g., Internship in 10 weeks"
                className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#141B2D] px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label
                htmlFor="onboard-cert"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Certification (Optional)
              </label>
              <input
                id="onboard-cert"
                type="text"
                value={certInput}
                onChange={(e) => setCertInput(e.target.value)}
                placeholder="e.g., AWS Cloud Practitioner"
                className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#141B2D] px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label
                htmlFor="onboard-proj"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Project Title (Optional)
              </label>
              <input
                id="onboard-proj"
                type="text"
                value={projectInput}
                onChange={(e) => setProjectInput(e.target.value)}
                placeholder="e.g., Expense Tracker API"
                className="w-full rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#141B2D] px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-white/10">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Award className="w-4 h-4 text-amber-500" />
              <span>AI Agents will personalize your fresh roadmap immediately.</span>
            </span>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Fresh Profile & Launch</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

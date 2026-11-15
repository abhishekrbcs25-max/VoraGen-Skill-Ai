import { useEffect, useState } from 'react';
import {
  Check,
  GraduationCap,
  Languages,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type {
  EducationStatus,
  LanguageProficiency,
  UserProfile,
  UserSkill,
} from '../../types';

interface ProfileEducationSkillsSectionProps {
  profile: UserProfile;
  onUpdateProfile: (next: UserProfile) => void;
  onVerifySkill: (skillName: string) => void;
}

const EDUCATION_STATUSES: EducationStatus[] = [
  'High School',
  'Pursuing Undergraduate',
  "Graduated (Bachelor's)",
  'Pursuing Postgraduate',
  "Graduated (Master's / PhD)",
  'Diploma / Bootcamp',
  'Working Professional',
];

const QUICK_SOFT_SKILLS = [
  'Communication',
  'Team Leadership',
  'Problem Solving',
  'Time Management',
  'Adaptability',
  'Conflict Resolution',
];

const QUICK_NON_TECH_SKILLS = [
  'Product Strategy',
  'Agile / Scrum',
  'Technical Writing',
  'UX Research',
  'Project Budgeting',
  'Stakeholder Alignment',
];

export function ProfileEducationSkillsSection({
  profile,
  onUpdateProfile,
  onVerifySkill,
}: ProfileEducationSkillsSectionProps) {
  // Academic summary fields
  const [collegeName, setCollegeName] = useState(profile.collegeName || '');
  const [educationSummary, setEducationSummary] = useState(profile.education || '');
  const [eduStatus, setEduStatus] = useState<EducationStatus | ''>(
    profile.currentEducationStatus || '',
  );
  const [graduationYear, setGraduationYear] = useState(profile.graduationYear || '');
  const [cgpaOrPct, setCgpaOrPct] = useState(profile.cgpaOrPercentage || '');
  const [eduSaved, setEduSaved] = useState(false);

  // Additional Education qualification entry
  const [entryInstitution, setEntryInstitution] = useState('');
  const [entryDegree, setEntryDegree] = useState('');
  const [entryField, setEntryField] = useState('');
  const [entryStartYear, setEntryStartYear] = useState('');
  const [entryEndYear, setEntryEndYear] = useState('');
  const [entryGpa, setEntryGpa] = useState('');

  // Technical skills
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState(65);
  const [newSkillCat, setNewSkillCat] = useState<UserSkill['category']>('Frontend');

  // Non-technical & soft skills
  const [nonTechInput, setNonTechInput] = useState('');
  const [softSkillInput, setSoftSkillInput] = useState('');

  // Languages known
  const [langName, setLangName] = useState('');
  const [langProficiency, setLangProficiency] = useState<LanguageProficiency>('Fluent');

  useEffect(() => {
    setCollegeName(profile.collegeName || '');
    setEducationSummary(profile.education || '');
    setEduStatus(profile.currentEducationStatus || '');
    setGraduationYear(profile.graduationYear || '');
    setCgpaOrPct(profile.cgpaOrPercentage || '');
  }, [
    profile.collegeName,
    profile.education,
    profile.currentEducationStatus,
    profile.graduationYear,
    profile.cgpaOrPercentage,
    profile.isSignedIn,
  ]);

  const handleSaveAcademicOverview = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      ...profile,
      collegeName: collegeName.trim(),
      education: educationSummary.trim(),
      currentEducationStatus: eduStatus || undefined,
      graduationYear: graduationYear.trim(),
      cgpaOrPercentage: cgpaOrPct.trim(),
    });
    if (!profile.isSignedIn) return;
    setEduSaved(true);
    setTimeout(() => setEduSaved(false), 2000);
  };

  const handleAddEducationEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryInstitution.trim() || !entryDegree.trim()) return;
    onUpdateProfile({
      ...profile,
      educationHistory: [
        ...(profile.educationHistory || []),
        {
          id: `edu-${Date.now()}`,
          institution: entryInstitution.trim(),
          degree: entryDegree.trim(),
          fieldOfStudy: entryField.trim(),
          startYear: entryStartYear.trim(),
          endYear: entryEndYear.trim(),
          gpaOrScore: entryGpa.trim() || undefined,
        },
      ],
    });
    if (!profile.isSignedIn) return;
    setEntryInstitution('');
    setEntryDegree('');
    setEntryField('');
    setEntryStartYear('');
    setEntryEndYear('');
    setEntryGpa('');
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

  const addTagSkill = (kind: 'nonTechnicalSkills' | 'softSkills', value: string) => {
    const clean = value.trim();
    if (!clean) return;
    const current = profile[kind] || [];
    if (current.some((item) => item.toLowerCase() === clean.toLowerCase())) return;
    onUpdateProfile({
      ...profile,
      [kind]: [...current, clean],
    });
    if (!profile.isSignedIn) return;
    if (kind === 'nonTechnicalSkills') setNonTechInput('');
    else setSoftSkillInput('');
  };

  const handleAddLanguage = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = langName.trim();
    if (!clean) return;
    const current = profile.languagesKnown || [];
    if (current.some((l) => l.language.toLowerCase() === clean.toLowerCase())) return;
    onUpdateProfile({
      ...profile,
      languagesKnown: [
        ...current,
        { id: `lang-${Date.now()}`, language: clean, proficiency: langProficiency },
      ],
    });
    if (!profile.isSignedIn) return;
    setLangName('');
  };

  return (
    <div className="space-y-6">
      {/* Educational Qualifications & College Details */}
      <section
        id="education-section"
        className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-5"
      >
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-[#0B2545] dark:text-amber-400" />
          <div>
            <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
              Education &amp; Academic Qualifications
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              College/university details, current education status, graduation year, and CGPA/percentage.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveAcademicOverview} className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          <div className="md:col-span-4">
            <label
              htmlFor="profile-college-name"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              College / University Name
            </label>
            <input
              id="profile-college-name"
              type="text"
              value={collegeName}
              onChange={(e) => setCollegeName(e.target.value)}
              placeholder="e.g., Anna University / MIT"
              className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div className="md:col-span-3">
            <label
              htmlFor="profile-education"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Degree / Specialization
            </label>
            <input
              id="profile-education"
              type="text"
              value={educationSummary}
              onChange={(e) => setEducationSummary(e.target.value)}
              placeholder="e.g., B.E. Computer Science"
              className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div className="md:col-span-3">
            <label
              htmlFor="profile-edu-status"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Current Education Status
            </label>
            <select
              id="profile-edu-status"
              value={eduStatus}
              onChange={(e) => setEduStatus(e.target.value as EducationStatus | '')}
              className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
            >
              <option value="">Select status...</option>
              {EDUCATION_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-1">
            <label
              htmlFor="profile-grad-year"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Grad Year
            </label>
            <input
              id="profile-grad-year"
              type="text"
              value={graduationYear}
              onChange={(e) => setGraduationYear(e.target.value)}
              placeholder="2026"
              className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-2.5 py-2 text-sm tabular-nums text-slate-900 dark:text-white"
            />
          </div>

          <div className="md:col-span-1">
            <label
              htmlFor="profile-cgpa"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              CGPA / %
            </label>
            <input
              id="profile-cgpa"
              type="text"
              value={cgpaOrPct}
              onChange={(e) => setCgpaOrPct(e.target.value)}
              placeholder="8.9"
              className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-2.5 py-2 text-sm tabular-nums text-slate-900 dark:text-white"
            />
          </div>

          <div className="md:col-span-12 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB]"
            >
              {eduSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              <span>{eduSaved ? 'Education Saved' : 'Save Academic Summary'}</span>
            </button>
          </div>
        </form>

        {/* Detailed Qualification Entries */}
        <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Educational Qualifications History ({(profile.educationHistory || []).length})
          </h3>

          {(profile.educationHistory || []).length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(profile.educationHistory || []).map((edu) => (
                <div
                  key={edu.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-3.5"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {edu.degree}
                      {edu.fieldOfStudy ? ` · ${edu.fieldOfStudy}` : ''}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                      {edu.institution}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {[edu.startYear, edu.endYear].filter(Boolean).join(' – ') || 'Completed'}
                      {edu.gpaOrScore ? ` · Score: ${edu.gpaOrScore}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove qualification ${edu.degree}`}
                    onClick={() =>
                      onUpdateProfile({
                        ...profile,
                        educationHistory: (profile.educationHistory || []).filter(
                          (item) => item.id !== edu.id,
                        ),
                      })
                    }
                    className="text-slate-400 hover:text-[#0B2545] dark:hover:text-amber-400 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleAddEducationEntry} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <input
              type="text"
              value={entryInstitution}
              onChange={(e) => setEntryInstitution(e.target.value)}
              placeholder="Institution / School"
              aria-label="Education institution"
              className="sm:col-span-3 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs text-slate-900 dark:text-white"
            />
            <input
              type="text"
              value={entryDegree}
              onChange={(e) => setEntryDegree(e.target.value)}
              placeholder="Degree (e.g., B.Tech)"
              aria-label="Education degree"
              className="sm:col-span-2 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs text-slate-900 dark:text-white"
            />
            <input
              type="text"
              value={entryField}
              onChange={(e) => setEntryField(e.target.value)}
              placeholder="Major / Stream"
              aria-label="Education field of study"
              className="sm:col-span-2 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs text-slate-900 dark:text-white"
            />
            <input
              type="text"
              value={entryStartYear}
              onChange={(e) => setEntryStartYear(e.target.value)}
              placeholder="Start"
              aria-label="Education start year"
              className="sm:col-span-1 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-2.5 py-2 text-xs tabular-nums text-slate-900 dark:text-white"
            />
            <input
              type="text"
              value={entryEndYear}
              onChange={(e) => setEntryEndYear(e.target.value)}
              placeholder="End"
              aria-label="Education end year"
              className="sm:col-span-1 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-2.5 py-2 text-xs tabular-nums text-slate-900 dark:text-white"
            />
            <input
              type="text"
              value={entryGpa}
              onChange={(e) => setEntryGpa(e.target.value)}
              placeholder="CGPA / %"
              aria-label="Education CGPA or percentage"
              className="sm:col-span-1 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-2.5 py-2 text-xs tabular-nums text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              className="sm:col-span-2 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-[#1D4ED8]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Degree</span>
            </button>
          </form>
        </div>
      </section>

      {/* Technical, Non-Technical, Soft Skills & Languages */}
      <section
        id="skills-section"
        className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-6"
      >
        <div>
          <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
            Technical Skills Inventory ({profile.skills.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Adjust proficiency sliders or verify technical skills via interactive assessments.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profile.skills.length === 0 ? (
            <div className="md:col-span-2 lg:col-span-3 rounded-xl border border-dashed border-slate-300 dark:border-white/15 p-5 text-center text-xs text-slate-500 dark:text-slate-400">
              No technical skills added yet. Add your core skills below and run a Genuine Skill Check.
            </div>
          ) : (
            profile.skills.map((skill) => (
              <div
                key={skill.name}
                className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-4 space-y-2.5"
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
                    <span className="font-mono text-sm font-semibold tabular-nums text-[#0B2545] dark:text-amber-400">
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
                      className="text-slate-400 hover:text-[#0B2545] dark:hover:text-amber-400"
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
                  className="w-full accent-[#0B2545] dark:accent-[#1D4ED8] cursor-pointer"
                />

                <div className="flex items-center justify-between pt-0.5">
                  <button
                    type="button"
                    onClick={() => onVerifySkill(skill.name)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0B2545] dark:text-emerald-400 hover:underline"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{skill.verified ? 'Re-Verify Skill' : 'Verify Genuine'}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <form
          onSubmit={handleAddSkill}
          className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-200 dark:border-white/10"
        >
          <input
            type="text"
            value={newSkillName}
            onChange={(e) => setNewSkillName(e.target.value)}
            placeholder="Technical skill (e.g., JavaScript, React, Docker)"
            aria-label="Add skill name"
            className="sm:col-span-5 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
          />
          <select
            value={newSkillCat}
            onChange={(e) => setNewSkillCat(e.target.value as UserSkill['category'])}
            aria-label="Skill category"
            className="sm:col-span-3 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
          >
            <option value="Frontend">Frontend</option>
            <option value="Backend">Backend</option>
            <option value="Data & AI">Data &amp; AI</option>
            <option value="Cloud & DevOps">Cloud &amp; DevOps</option>
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
              className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm tabular-nums text-slate-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            className="sm:col-span-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] whitespace-nowrap"
          >
            Add Skill
          </button>
        </form>

        {/* Non-Technical & Soft Skills + Languages Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-4 border-t border-slate-200 dark:border-white/10">
          {/* Non-Technical Skills */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B2545] dark:text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Non-Technical Skills ({(profile.nonTechnicalSkills || []).length})</span>
            </h3>
            <div className="flex flex-wrap gap-1.5 min-h-[28px]">
              {(profile.nonTechnicalSkills || []).map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    aria-label={`Remove non-technical skill ${skill}`}
                    onClick={() =>
                      onUpdateProfile({
                        ...profile,
                        nonTechnicalSkills: (profile.nonTechnicalSkills || []).filter(
                          (s) => s !== skill,
                        ),
                      })
                    }
                    className="text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={nonTechInput}
                onChange={(e) => setNonTechInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTagSkill('nonTechnicalSkills', nonTechInput);
                  }
                }}
                placeholder="e.g., Product Strategy"
                aria-label="Add non-technical skill"
                className="flex-1 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => addTagSkill('nonTechnicalSkills', nonTechInput)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#0B2545] text-white dark:bg-[#1D4ED8]"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {QUICK_NON_TECH_SKILLS.filter(
                (q) => !(profile.nonTechnicalSkills || []).includes(q),
              )
                .slice(0, 3)
                .map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addTagSkill('nonTechnicalSkills', s)}
                    className="text-[10px] px-2 py-0.5 rounded border border-dashed border-slate-300 dark:border-[#1E3A5F] text-slate-500 dark:text-slate-400 hover:text-[#0B2545] dark:hover:text-amber-300"
                  >
                    + {s}
                  </button>
                ))}
            </div>
          </div>

          {/* Soft Skills */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B2545] dark:text-emerald-400">
              Soft Skills ({(profile.softSkills || []).length})
            </h3>
            <div className="flex flex-wrap gap-1.5 min-h-[28px]">
              {(profile.softSkills || []).map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    aria-label={`Remove soft skill ${skill}`}
                    onClick={() =>
                      onUpdateProfile({
                        ...profile,
                        softSkills: (profile.softSkills || []).filter((s) => s !== skill),
                      })
                    }
                    className="text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={softSkillInput}
                onChange={(e) => setSoftSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTagSkill('softSkills', softSkillInput);
                  }
                }}
                placeholder="e.g., Communication, Leadership"
                aria-label="Add soft skill"
                className="flex-1 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => addTagSkill('softSkills', softSkillInput)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 text-white dark:bg-[#1D4ED8]"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {QUICK_SOFT_SKILLS.filter((q) => !(profile.softSkills || []).includes(q))
                .slice(0, 3)
                .map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addTagSkill('softSkills', s)}
                    className="text-[10px] px-2 py-0.5 rounded border border-dashed border-slate-300 dark:border-[#1E3A5F] text-slate-500 dark:text-slate-400 hover:text-[#0B2545] dark:hover:text-emerald-300"
                  >
                    + {s}
                  </button>
                ))}
            </div>
          </div>

          {/* Languages Known */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B2545] dark:text-white flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5" />
              <span>Languages Known ({(profile.languagesKnown || []).length})</span>
            </h3>
            <div className="space-y-1.5 min-h-[28px]">
              {(profile.languagesKnown || []).map((lang) => (
                <div
                  key={lang.id}
                  className="flex items-center justify-between rounded-md border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] px-2.5 py-1.5 text-xs"
                >
                  <span className="font-medium text-slate-900 dark:text-white">
                    {lang.language}{' '}
                    <span className="text-slate-500 dark:text-slate-400">({lang.proficiency})</span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove language ${lang.language}`}
                    onClick={() =>
                      onUpdateProfile({
                        ...profile,
                        languagesKnown: (profile.languagesKnown || []).filter(
                          (l) => l.id !== lang.id,
                        ),
                      })
                    }
                    className="text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddLanguage} className="flex gap-1.5">
              <input
                type="text"
                value={langName}
                onChange={(e) => setLangName(e.target.value)}
                placeholder="Language (e.g., English)"
                aria-label="Language name"
                className="flex-1 min-w-0 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
              />
              <select
                value={langProficiency}
                onChange={(e) => setLangProficiency(e.target.value as LanguageProficiency)}
                aria-label="Language proficiency"
                className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-2 py-1.5 text-xs text-slate-900 dark:text-white"
              >
                <option value="Basic">Basic</option>
                <option value="Conversational">Conversational</option>
                <option value="Fluent">Fluent</option>
                <option value="Native">Native</option>
              </select>
              <button
                type="submit"
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#0B2545] text-white dark:bg-[#1D4ED8]"
              >
                Add
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

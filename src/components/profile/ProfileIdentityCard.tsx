import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  Check,
  CheckCircle2,
  Eye,
  Github,
  Globe,
  Linkedin,
  MapPin,
  Phone,
  Save,
  Search,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { searchCareerRoles } from '../../data/careerRolesCatalog';
import { sanitizeAvatarImageUrl, sanitizeExternalUrl } from '../../utils/validation';
import type { CareerRole, ProfileVisibility, UserProfile } from '../../types';

interface ProfileIdentityCardProps {
  profile: UserProfile;
  roles: CareerRole[];
  onUpdateProfile: (next: UserProfile) => void;
}

const ROLE_LABELS: Record<NonNullable<UserProfile['role']>, string> = {
  student: 'Student',
  'working-professional': 'Working Professional',
  'job-seeker': 'Job Seeker',
  employer: 'Employer / Recruiter',
  admin: 'Administrator',
};

export function ProfileIdentityCard({
  profile,
  roles,
  onUpdateProfile,
}: ProfileIdentityCardProps) {
  const [draftName, setDraftName] = useState(profile.name);
  const [draftHeadline, setDraftHeadline] = useState(profile.headline || '');
  const [draftPhone, setDraftPhone] = useState(profile.phone || '');
  const [draftDob, setDraftDob] = useState(profile.dateOfBirth || '');
  const [draftLocation, setDraftLocation] = useState(profile.location || '');
  const [draftPrefLocation, setDraftPrefLocation] = useState(profile.preferredWorkLocation || '');
  const [draftPortfolio, setDraftPortfolio] = useState(profile.portfolioUrl || '');
  const [draftGithub, setDraftGithub] = useState(profile.githubUrl || '');
  const [draftLinkedin, setDraftLinkedin] = useState(profile.linkedinUrl || '');
  const [draftVisibility, setDraftVisibility] = useState<ProfileVisibility>(
    profile.profileVisibility || 'recruiters',
  );
  const [draftCareerId, setDraftCareerId] = useState(profile.targetCareerId);
  const [avatarError, setAvatarError] = useState('');
  const [identitySaved, setIdentitySaved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [careerSearchInput, setCareerSearchInput] = useState('');
  const [careerAppliedQuery, setCareerAppliedQuery] = useState('');

  useEffect(() => {
    setDraftName(profile.name);
    setDraftHeadline(profile.headline || '');
    setDraftPhone(profile.phone || '');
    setDraftDob(profile.dateOfBirth || '');
    setDraftLocation(profile.location || '');
    setDraftPrefLocation(profile.preferredWorkLocation || '');
    setDraftPortfolio(profile.portfolioUrl || '');
    setDraftGithub(profile.githubUrl || '');
    setDraftLinkedin(profile.linkedinUrl || '');
    setDraftVisibility(profile.profileVisibility || 'recruiters');
    setDraftCareerId(profile.targetCareerId);
  }, [
    profile.name,
    profile.headline,
    profile.phone,
    profile.dateOfBirth,
    profile.location,
    profile.preferredWorkLocation,
    profile.portfolioUrl,
    profile.githubUrl,
    profile.linkedinUrl,
    profile.profileVisibility,
    profile.targetCareerId,
    profile.isSignedIn,
  ]);

  const filteredCareerRoles = useMemo(() => {
    const list = searchCareerRoles(roles, careerAppliedQuery);
    const active = roles.find((r) => r.id === draftCareerId);
    if (active && !list.some((r) => r.id === active.id)) {
      return [active, ...list];
    }
    return list;
  }, [roles, careerAppliedQuery, draftCareerId]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarError('');
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|jpg|webp|gif)$/i.test(file.type)) {
      setAvatarError('Please select a PNG, JPG, WebP, or GIF image.');
      return;
    }
    if (file.size > 450_000) {
      setAvatarError('Image must be 450 KB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      const safe = sanitizeAvatarImageUrl(dataUrl);
      if (!safe) {
        setAvatarError('Unsupported or oversized image format.');
        return;
      }
      onUpdateProfile({ ...profile, avatarUrl: safe });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      ...profile,
      name: draftName.trim(),
      headline: draftHeadline.trim(),
      phone: draftPhone.trim(),
      dateOfBirth: draftDob,
      location: draftLocation.trim(),
      preferredWorkLocation: draftPrefLocation.trim(),
      portfolioUrl: sanitizeExternalUrl(draftPortfolio) || '',
      githubUrl: sanitizeExternalUrl(draftGithub) || '',
      linkedinUrl: sanitizeExternalUrl(draftLinkedin) || '',
      profileVisibility: draftVisibility,
      targetCareerId: draftCareerId,
    });
    if (!profile.isSignedIn) return;
    setIdentitySaved(true);
    setTimeout(() => setIdentitySaved(false), 2000);
  };

  const safeAvatar = sanitizeAvatarImageUrl(profile.avatarUrl);

  return (
    <form
      id="identity-section"
      onSubmit={handleSaveIdentity}
      className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-5"
    >
      {/* Profile Picture + Identity Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-4">
          <div className="relative">
            {safeAvatar ? (
              <img
                src={safeAvatar}
                alt={`${profile.name || 'User'} avatar`}
                className="w-16 h-16 rounded-2xl object-cover border border-slate-300 dark:border-[#1E3A5F]"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-[#0B2545]/10 dark:bg-[#1D4ED8]/20 flex items-center justify-center text-[#0B2545] dark:text-amber-300 font-display font-bold text-xl border border-slate-200 dark:border-[#1E3A5F]/70">
                {(draftName.trim() || 'VG').slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
                {profile.isSignedIn ? profile.name : 'Guest Visitor'}
              </h2>
              {profile.isSignedIn && (
                <UserCheck className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
              )}
              {profile.isSignedIn && (
                <span className="rounded-md border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-2 py-0.5 text-[11px] font-semibold text-[#0B2545] dark:text-amber-300">
                  {ROLE_LABELS[profile.role || 'student']}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {profile.isSignedIn
                ? `${profile.email} · ${profile.authProvider.toUpperCase()}`
                : 'Sign in or create an account to save profile updates'}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleAvatarUpload}
                aria-label="Upload profile picture"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] text-slate-700 dark:text-slate-200 hover:border-[#0B2545]"
              >
                <Camera className="w-3 h-3" />
                <span>{safeAvatar ? 'Change Photo' : 'Upload Photo'}</span>
              </button>
              {safeAvatar && (
                <button
                  type="button"
                  onClick={() => onUpdateProfile({ ...profile, avatarUrl: '' })}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:underline"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove</span>
                </button>
              )}
            </div>
            {avatarError && <p className="text-[11px] text-rose-600 dark:text-amber-300">{avatarError}</p>}
          </div>
        </div>

        {/* Profile Visibility Selector */}
        <div className="min-w-[200px]">
          <label
            htmlFor="profile-visibility"
            className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Profile Visibility</span>
          </label>
          <select
            id="profile-visibility"
            value={draftVisibility}
            onChange={(e) => setDraftVisibility(e.target.value as ProfileVisibility)}
            className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-white"
          >
            <option value="public">Public (Anyone with link)</option>
            <option value="recruiters">Recruiters &amp; Employers Only</option>
            <option value="private">Private (Only Me)</option>
          </select>
        </div>
      </div>

      {/* Core Identity, Demographics & Contact */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="Enter your full name"
            className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label
            htmlFor="profile-headline"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Professional Headline
          </label>
          <input
            id="profile-headline"
            type="text"
            value={draftHeadline}
            onChange={(e) => setDraftHeadline(e.target.value)}
            placeholder="e.g., CS Final Year · Full Stack & Cloud"
            className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label
            htmlFor="profile-dob"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Date of Birth (Optional)
          </label>
          <input
            id="profile-dob"
            type="date"
            value={draftDob}
            onChange={(e) => setDraftDob(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="profile-phone"
              className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              <Phone className="w-3 h-3" />
              <span>Phone Number</span>
            </label>
            {profile.phoneVerified && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-3 h-3" />
                Verified
              </span>
            )}
          </div>
          <input
            id="profile-phone"
            type="tel"
            value={draftPhone}
            onChange={(e) => setDraftPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label
            htmlFor="profile-location"
            className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            <MapPin className="w-3 h-3" />
            <span>Current Location</span>
          </label>
          <input
            id="profile-location"
            type="text"
            value={draftLocation}
            onChange={(e) => setDraftLocation(e.target.value)}
            placeholder="e.g., Bengaluru, India"
            className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label
            htmlFor="profile-preferred-location"
            className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            <MapPin className="w-3 h-3" />
            <span>Preferred Work Location</span>
          </label>
          <input
            id="profile-preferred-location"
            type="text"
            value={draftPrefLocation}
            onChange={(e) => setDraftPrefLocation(e.target.value)}
            placeholder="e.g., Hyderabad, Remote, Global"
            className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Professional Links: Portfolio, GitHub, LinkedIn */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-200 dark:border-white/10">
        <div>
          <label
            htmlFor="profile-portfolio-url"
            className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            <Globe className="w-3 h-3" />
            <span>Portfolio Website</span>
          </label>
          <input
            id="profile-portfolio-url"
            type="url"
            value={draftPortfolio}
            onChange={(e) => setDraftPortfolio(e.target.value)}
            placeholder="https://yourportfolio.dev"
            className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label
            htmlFor="profile-github-url"
            className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            <Github className="w-3 h-3" />
            <span>GitHub Profile</span>
          </label>
          <input
            id="profile-github-url"
            type="url"
            value={draftGithub}
            onChange={(e) => setDraftGithub(e.target.value)}
            placeholder="https://github.com/username"
            className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label
            htmlFor="profile-linkedin-url"
            className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            <Linkedin className="w-3 h-3" />
            <span>LinkedIn Profile</span>
          </label>
          <input
            id="profile-linkedin-url"
            type="url"
            value={draftLinkedin}
            onChange={(e) => setDraftLinkedin(e.target.value)}
            placeholder="https://linkedin.com/in/username"
            className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Primary Career Goal Search + Save */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end pt-2 border-t border-slate-200 dark:border-white/10">
        <div className="lg:col-span-8 space-y-1.5">
          <label
            htmlFor="profile-target-career"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            Primary Target Career ({filteredCareerRoles.length} of {roles.length} goals)
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex gap-1.5 sm:w-64">
              <input
                type="search"
                value={careerSearchInput}
                onChange={(e) => {
                  setCareerSearchInput(e.target.value);
                  if (!e.target.value.trim()) setCareerAppliedQuery('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setCareerAppliedQuery(careerSearchInput);
                  }
                }}
                placeholder="Search 200+ goals..."
                aria-label="Search profile career goals"
                className="flex-1 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setCareerAppliedQuery(careerSearchInput)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8]"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
              </button>
            </div>
            <select
              id="profile-target-career"
              value={draftCareerId}
              onChange={(e) => setDraftCareerId(e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
            >
              {filteredCareerRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.domain})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="lg:col-span-4">
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg text-xs font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] transition-colors"
          >
            {identitySaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>
              {identitySaved
                ? 'Identity & Links Saved'
                : profile.isSignedIn
                  ? 'Save Identity & Contact Details'
                  : 'Save Details (Requires Sign In)'}
            </span>
          </button>
        </div>
      </div>
    </form>
  );
}

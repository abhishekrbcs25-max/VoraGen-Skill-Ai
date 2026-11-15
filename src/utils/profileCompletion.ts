import type { UserProfile } from '../types';

export interface ProfileCompletionItem {
  id: string;
  label: string;
  sectionAnchor: string;
  weight: number;
  completed: boolean;
}

export interface ProfileCompletionSummary {
  percentage: number;
  completedCount: number;
  totalCount: number;
  tierLabel: 'Starter' | 'Building' | 'Competitive' | 'All-Star';
  items: ProfileCompletionItem[];
  missingItems: ProfileCompletionItem[];
}

export function calculateProfileCompletion(profile: UserProfile): ProfileCompletionSummary {
  const hasAcademic =
    Boolean(profile.collegeName?.trim()) ||
    Boolean(profile.education?.trim()) ||
    Boolean(profile.educationHistory && profile.educationHistory.length > 0);

  const hasLinks =
    Boolean(profile.githubUrl?.trim()) ||
    Boolean(profile.linkedinUrl?.trim()) ||
    Boolean(profile.portfolioUrl?.trim());

  const checks: ProfileCompletionItem[] = [
    {
      id: 'avatar',
      label: 'Upload profile picture',
      sectionAnchor: 'identity-section',
      weight: 5,
      completed: Boolean(profile.avatarUrl?.trim()),
    },
    {
      id: 'identity',
      label: 'Full name & professional headline',
      sectionAnchor: 'identity-section',
      weight: 8,
      completed: Boolean(profile.name.trim() && profile.headline?.trim()),
    },
    {
      id: 'contact',
      label: 'Email & phone number',
      sectionAnchor: 'identity-section',
      weight: 7,
      completed: Boolean(profile.email.trim() && profile.phone?.trim()),
    },
    {
      id: 'contact-verified',
      label: 'Verify email or phone OTP',
      sectionAnchor: 'security-section',
      weight: 5,
      completed: Boolean(profile.emailVerified || profile.phoneVerified),
    },
    {
      id: 'location',
      label: 'Current & preferred work location',
      sectionAnchor: 'identity-section',
      weight: 6,
      completed: Boolean(profile.location?.trim() && profile.preferredWorkLocation?.trim()),
    },
    {
      id: 'education-college',
      label: 'College / university & degree details',
      sectionAnchor: 'education-section',
      weight: 8,
      completed: hasAcademic,
    },
    {
      id: 'education-status',
      label: 'Education status, graduation year & CGPA',
      sectionAnchor: 'education-section',
      weight: 6,
      completed: Boolean(
        profile.currentEducationStatus &&
          profile.graduationYear?.trim() &&
          profile.cgpaOrPercentage?.trim(),
      ),
    },
    {
      id: 'technical-skills',
      label: 'Add technical skills',
      sectionAnchor: 'skills-section',
      weight: 8,
      completed: profile.skills.length > 0,
    },
    {
      id: 'soft-nontech-skills',
      label: 'Soft & non-technical skills',
      sectionAnchor: 'skills-section',
      weight: 5,
      completed: Boolean(
        (profile.softSkills && profile.softSkills.length > 0) ||
          (profile.nonTechnicalSkills && profile.nonTechnicalSkills.length > 0),
      ),
    },
    {
      id: 'languages',
      label: 'Languages known',
      sectionAnchor: 'skills-section',
      weight: 4,
      completed: Boolean(profile.languagesKnown && profile.languagesKnown.length > 0),
    },
    {
      id: 'experience',
      label: 'Work or internship experience',
      sectionAnchor: 'experience-section',
      weight: 8,
      completed: Boolean(
        (profile.workExperience && profile.workExperience.length > 0) ||
          (profile.internshipExperience && profile.internshipExperience.length > 0),
      ),
    },
    {
      id: 'projects',
      label: 'Completed projects',
      sectionAnchor: 'projects-section',
      weight: 7,
      completed: profile.projects.length > 0,
    },
    {
      id: 'certs-awards',
      label: 'Certifications or achievements',
      sectionAnchor: 'certifications-section',
      weight: 6,
      completed: Boolean(
        profile.certifications.length > 0 ||
          (profile.achievements && profile.achievements.length > 0),
      ),
    },
    {
      id: 'links',
      label: 'Portfolio, GitHub or LinkedIn links',
      sectionAnchor: 'links-resume-section',
      weight: 5,
      completed: hasLinks,
    },
    {
      id: 'resume-upload',
      label: 'Upload resume document',
      sectionAnchor: 'links-resume-section',
      weight: 5,
      completed: Boolean(profile.uploadedResume?.fileName),
    },
    {
      id: 'career-preferences',
      label: 'Career interests, preferred roles & work mode',
      sectionAnchor: 'preferences-section',
      weight: 7,
      completed: Boolean(
        (profile.careerInterests?.length || profile.preferredJobRoles?.length) &&
          profile.workModePreference &&
          profile.availabilityNoticePeriod?.trim(),
      ),
    },
  ];

  const totalWeight = checks.reduce((sum, item) => sum + item.weight, 0);
  const earnedWeight = checks
    .filter((item) => item.completed)
    .reduce((sum, item) => sum + item.weight, 0);

  const percentage = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
  const completedCount = checks.filter((c) => c.completed).length;
  const missingItems = checks.filter((c) => !c.completed);

  const tierLabel: ProfileCompletionSummary['tierLabel'] =
    percentage >= 90
      ? 'All-Star'
      : percentage >= 65
        ? 'Competitive'
        : percentage >= 35
          ? 'Building'
          : 'Starter';

  return {
    percentage,
    completedCount,
    totalCount: checks.length,
    tierLabel,
    items: checks,
    missingItems,
  };
}

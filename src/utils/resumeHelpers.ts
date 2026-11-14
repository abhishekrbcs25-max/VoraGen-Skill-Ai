import type { EducationEntry, UserProfile } from '../types';

export interface ResumeCompletenessResult {
  scorePct: number;
  completedSections: string[];
  missingSections: string[];
}

export function sortEducationEntries(entries: EducationEntry[] = []): EducationEntry[] {
  return [...entries].sort((a, b) => {
    const endA = Number.parseInt(a.endYear || a.startYear || '0', 10) || 0;
    const endB = Number.parseInt(b.endYear || b.startYear || '0', 10) || 0;
    if (endB !== endA) return endB - endA;
    const startA = Number.parseInt(a.startYear || '0', 10) || 0;
    const startB = Number.parseInt(b.startYear || '0', 10) || 0;
    return startB - startA;
  });
}

export function calculateResumeCompleteness(profile: UserProfile): ResumeCompletenessResult {
  const checks: Array<{ label: string; ok: boolean }> = [
    {
      label: 'Contact & Summary',
      ok: Boolean(profile.name.trim() && profile.email.trim() && (profile.resumeSummary?.trim() || profile.headline.trim())),
    },
    {
      label: 'Educational Background',
      ok: Boolean((profile.educationHistory && profile.educationHistory.length > 0) || profile.education.trim()),
    },
    {
      label: 'Skills Gained',
      ok: profile.skills.length > 0,
    },
    {
      label: 'Projects',
      ok: profile.projects.length > 0,
    },
    {
      label: 'Certifications Obtained',
      ok: profile.certifications.length > 0,
    },
  ];

  const completedSections = checks.filter((c) => c.ok).map((c) => c.label);
  const missingSections = checks.filter((c) => !c.ok).map((c) => c.label);
  const scorePct = Math.round((completedSections.length / checks.length) * 100);

  return {
    scorePct,
    completedSections,
    missingSections,
  };
}

export function draftResumeSummary(profile: UserProfile, targetRoleTitle: string): string {
  const sortedEdu = sortEducationEntries(profile.educationHistory);
  const eduText = sortedEdu[0]
    ? `${sortedEdu[0].degree}${sortedEdu[0].fieldOfStudy ? ` in ${sortedEdu[0].fieldOfStudy}` : ''} at ${sortedEdu[0].institution}`
    : profile.education.trim();
  const topSkills = profile.skills
    .slice()
    .sort((a, b) => b.level - a.level)
    .slice(0, 5)
    .map((s) => s.name);

  const parts: string[] = [];
  parts.push(
    eduText
      ? `${targetRoleTitle} candidate with academic background in ${eduText}.`
      : `Motivated ${targetRoleTitle} candidate building verified hands-on engineering mastery.`,
  );
  if (topSkills.length > 0) {
    parts.push(`Core technical strengths in ${topSkills.join(', ')}.`);
  }
  if (profile.projects.length > 0 || profile.certifications.length > 0) {
    parts.push(
      `Delivered ${profile.projects.length} technical project${profile.projects.length === 1 ? '' : 's'} and earned ${profile.certifications.length} industry certification${profile.certifications.length === 1 ? '' : 's'}.`,
    );
  }
  return parts.join(' ');
}

export function buildResumeMarkdown(profile: UserProfile, targetRoleTitle: string): string {
  const lines: string[] = [];
  const name = profile.name.trim() || 'Candidate Name';
  lines.push(`# ${name}`);
  if (profile.headline.trim()) {
    lines.push(`**${profile.headline.trim()}**`);
  } else {
    lines.push(`**Target Role: ${targetRoleTitle}**`);
  }

  const contactBits = [
    profile.email.trim(),
    profile.phone?.trim(),
    profile.location?.trim(),
    profile.linkedinUrl?.trim(),
    profile.githubUrl?.trim(),
    profile.portfolioUrl?.trim(),
  ].filter(Boolean);
  if (contactBits.length > 0) {
    lines.push(contactBits.join(' | '));
  }
  lines.push('');

  if (profile.resumeSummary?.trim()) {
    lines.push('## Professional Summary');
    lines.push(profile.resumeSummary.trim());
    lines.push('');
  }

  lines.push('## Educational Background');
  const sortedEdu = sortEducationEntries(profile.educationHistory);
  if (sortedEdu.length > 0) {
    for (const edu of sortedEdu) {
      const span = [edu.startYear, edu.endYear].filter(Boolean).join(' – ');
      const titleLine = `- **${edu.degree}${edu.fieldOfStudy ? `, ${edu.fieldOfStudy}` : ''}** — ${edu.institution}${span ? ` (${span})` : ''}${edu.gpaOrScore ? ` · ${edu.gpaOrScore}` : ''}`;
      lines.push(titleLine);
      if (edu.highlights?.trim()) {
        lines.push(`  - ${edu.highlights.trim()}`);
      }
    }
  } else if (profile.education.trim()) {
    lines.push(`- ${profile.education.trim()}`);
  } else {
    lines.push('- Not added yet');
  }
  lines.push('');

  lines.push('## Skills Gained');
  if (profile.skills.length > 0) {
    lines.push(
      profile.skills
        .map((s) => `${s.name} (${s.level}%${s.verified ? ', Verified' : ''})`)
        .join(' · '),
    );
  } else {
    lines.push('- Not added yet');
  }
  lines.push('');

  lines.push('## Projects');
  if (profile.projects.length > 0) {
    for (const proj of profile.projects) {
      lines.push(`- **${proj.title}**${proj.repoUrl ? ` — ${proj.repoUrl}` : ''}`);
      lines.push(`  - ${proj.description}`);
      if (proj.skillsUsed.length > 0) {
        lines.push(`  - Tech Stack: ${proj.skillsUsed.join(', ')}`);
      }
    }
  } else {
    lines.push('- Not added yet');
  }
  lines.push('');

  lines.push('## Certifications Obtained');
  if (profile.certifications.length > 0) {
    for (const cert of profile.certifications) {
      lines.push(
        `- **${cert.title}** — ${cert.issuer} (${cert.year})${cert.credentialId ? ` · ID: ${cert.credentialId}` : ''}`,
      );
    }
  } else {
    lines.push('- Not added yet');
  }

  return lines.join('\n');
}

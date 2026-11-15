import { CAREER_ROLES, DIAGNOSTIC_QUIZZES, MENTOR_STAFF } from '../data/careerData';
import { COURSES_CATALOG } from '../data/coursesCatalog';
import { FLAGSHIP_COMPANIES } from '../data/companiesCatalog';
import { FLAGSHIP_CODING_CHALLENGES } from '../data/codingCatalog';
import type { NavSection } from '../types';

export interface SearchEntry {
  id: string;
  label: string;
  category:
    | 'Navigation'
    | 'Courses & Learning'
    | 'Skill Assessment'
    | 'Career Role'
    | 'AI Mentor & Video'
    | 'Code Arena'
    | 'Skill Game'
    | 'Global Company'
    | 'Portals & Governance'
    | 'Settings & Support';
  description: string;
  keywords: string[];
  targetSection: NavSection | 'support';
  subTarget?: string;
}

const STATIC_ENTRIES: SearchEntry[] = [
  {
    id: 'nav-home',
    label: 'Home Dashboard & Productivity Heatmap',
    category: 'Navigation',
    description: 'Motivational overview, 30-day productivity heatmap, live readiness meter, and signature modules',
    keywords: ['home', 'dashboard', 'overview', 'readiness', 'motivation', 'heatmap', 'productivity', 'contribution', 'activity'],
    targetSection: 'home',
  },
  {
    id: 'nav-courses',
    label: 'Online Courses & Interactive Learning Hub',
    category: 'Courses & Learning',
    description: 'Browse Free & Paid courses, live classes, PDF notes, offline packs, multilingual switcher, and lesson quizzes',
    keywords: ['courses', 'lessons', 'video', 'ebook', 'pdf', 'offline', 'multilingual', 'tamil', 'hindi', 'malayalam', 'live'],
    targetSection: 'courses',
  },
  {
    id: 'nav-projects',
    label: 'Projects, Team Labs & Hackathons',
    category: 'Navigation',
    description: 'Guided mini/major/industry projects, GitHub repo submissions, AI & instructor reviews, and hackathons',
    keywords: ['projects', 'hackathon', 'github', 'portfolio', 'team', 'submission', 'review', 'capstone'],
    targetSection: 'projects',
  },
  {
    id: 'nav-certifications',
    label: 'Certifications, Badges & Digital Skill Passport',
    category: 'Navigation',
    description: 'Printable PDF certificates, QR code verification, badge milestones, and public skill passport',
    keywords: ['certificates', 'qr', 'verify', 'badges', 'passport', 'linkedin', 'achievements', 'pdf'],
    targetSection: 'certifications',
  },
  {
    id: 'nav-applications',
    label: 'My Applications, Internships, Drives & Career Fairs',
    category: 'Navigation',
    description: 'Track application status, saved jobs, campus placement drives, and virtual career fairs',
    keywords: ['applications', 'saved', 'shortlisted', 'internship', 'campus', 'placement', 'fair', 'offer'],
    targetSection: 'applications',
  },
  {
    id: 'nav-community',
    label: 'Community Forum, Mentors & Gamification Leaderboard',
    category: 'Navigation',
    description: 'Q&A discussions, study groups, project showcase, 1:1 mentor booking, XP leaderboard, and referrals',
    keywords: ['community', 'forum', 'mentors', 'booking', 'leaderboard', 'xp', 'referral', 'webinar', 'study group'],
    targetSection: 'community',
  },
  {
    id: 'nav-inbox',
    label: 'Notification Center & Messages Inbox',
    category: 'Navigation',
    description: 'Recruiter & instructor messages, platform announcements, and notification channel preferences',
    keywords: ['notifications', 'inbox', 'messages', 'recruiter', 'announcements', 'email', 'sms', 'push'],
    targetSection: 'notifications-center',
  },
  {
    id: 'nav-employer-portal',
    label: 'Employer & Recruiter Dashboard',
    category: 'Portals & Governance',
    description: 'Post jobs & internships, AI rank candidates, schedule interviews, and issue offer letters',
    keywords: ['employer', 'recruiter', 'post job', 'candidates', 'shortlist', 'offer letter', 'analytics'],
    targetSection: 'employer-portal',
  },
  {
    id: 'nav-admin-portal',
    label: 'Admin Dashboard & Platform Moderation',
    category: 'Portals & Governance',
    description: 'Manage users & roles, publish courses, approve jobs, resolve scam reports, and broadcast notices',
    keywords: ['admin', 'moderation', 'users', 'scam', 'revenue', 'analytics', 'broadcast'],
    targetSection: 'admin-portal',
  },
  {
    id: 'nav-pricing',
    label: 'Pricing, Subscriptions & GST Invoices',
    category: 'Portals & Governance',
    description: 'Free & Pro plans, UPI/Card checkout, promo coupons, downloadable GST invoices, and refunds',
    keywords: ['pricing', 'billing', 'subscription', 'pro', 'invoice', 'gst', 'coupon', 'refund', 'upi'],
    targetSection: 'pricing',
  },
  {
    id: 'nav-help-center',
    label: 'About, Privacy, FAQ & Security Audit Log',
    category: 'Settings & Support',
    description: 'About Vora Generation Network, FAQ, privacy policy, cookie settings, and login audit trail',
    keywords: ['about', 'faq', 'privacy', 'terms', 'cookies', 'audit', 'security', 'login history', 'contact'],
    targetSection: 'help-center',
  },
  {
    id: 'nav-profile',
    label: 'User Profile & Sign In / Register',
    category: 'Navigation',
    description: 'Manage skills, certifications, projects, career goals, Google/Microsoft/Email auth',
    keywords: ['profile', 'account', 'login', 'sign in', 'register', 'google', 'microsoft', 'certifications', 'projects', 'goals'],
    targetSection: 'profile',
  },
  {
    id: 'nav-resume',
    label: 'Resume Builder, ATS Optimizer & Cover Letters',
    category: 'Navigation',
    description: 'Create resumes across multiple templates & versions, score ATS keywords, and draft cover letters',
    keywords: ['resume', 'cv', 'template', 'cover letter', 'ats', 'education', 'skills', 'projects', 'pdf', 'print', 'export'],
    targetSection: 'resume',
  },
  {
    id: 'nav-skill-analysis',
    label: 'Skill Analysis, Aptitude & Timed Exams',
    category: 'Navigation',
    description: '20-question technical exams, logical/quantitative/communication aptitude, timed mode, and 4 AI agents',
    keywords: ['skill', 'analysis', 'aptitude', 'logical', 'quantitative', 'communication', 'timed', 'quiz', 'weakness', 'remedial'],
    targetSection: 'skill-analysis',
  },
  {
    id: 'nav-career-matching',
    label: 'Career Matching & Pivot Simulator',
    category: 'Navigation',
    description: 'Compare skills with job roles and simulate career switches',
    keywords: ['career', 'matching', 'role', 'pivot', 'simulator', 'gap'],
    targetSection: 'career-matching',
  },
  {
    id: 'nav-learning',
    label: 'Learning Recommendations & Roadmap',
    category: 'Navigation',
    description: 'Personalized courses, tutorials, exercises, and remedial bootcamps',
    keywords: ['learning', 'recommendations', 'courses', 'tutorials', 'roadmap', 'exercises'],
    targetSection: 'learning-recommendations',
  },
  {
    id: 'nav-progress',
    label: 'Progress Tracking & Accuracy Meter',
    category: 'Navigation',
    description: 'Weighted readiness gauge, domain mastery bars, and assessment history',
    keywords: ['progress', 'tracking', 'meter', 'analytics', 'history', 'score'],
    targetSection: 'progress-tracking',
  },
  {
    id: 'nav-ai-mentor',
    label: 'AI Mentor, Study Toolkit & Video Studio',
    category: 'Navigation',
    description: 'Chat with AI Staff Teachers, debug code, summarize notes, generate revision sheets & concept videos',
    keywords: ['ai', 'mentor', 'teacher', 'study', 'debugger', 'summarize', 'revision', 'video', 'chat'],
    targetSection: 'ai-mentor',
  },
  {
    id: 'nav-career-lab',
    label: 'Career Lab (Mock Interviewer, HR, GD & ATS)',
    category: 'Navigation',
    description: 'AI technical/HR interview simulator, video/voice confidence rubric, GD prep, and cohort benchmarks',
    keywords: ['career lab', 'interview', 'mock', 'hr', 'gd', 'ats', 'confidence', 'voice', 'video'],
    targetSection: 'career-lab',
  },
  {
    id: 'nav-authenticity',
    label: 'Genuine Skill Authenticity Test',
    category: 'Skill Assessment',
    description: 'Verify whether claimed profile skills are genuine or overclaimed',
    keywords: ['genuine', 'authenticity', 'verify', 'verification', 'honest', 'claimed'],
    targetSection: 'skill-analysis',
    subTarget: 'authenticity',
  },
  {
    id: 'nav-code-arena',
    label: 'Code Arena (50,000+ Programs)',
    category: 'Navigation',
    description: 'Solve Easy, Medium, and Hard coding problems to earn streak points',
    keywords: ['code', 'arena', 'programming', 'leetcode', 'streak', 'points', 'easy', 'medium', 'hard'],
    targetSection: 'code-arena',
  },
  {
    id: 'nav-games',
    label: 'Voragen Games Arcade',
    category: 'Navigation',
    description: 'Play 6 cognitive & technical skill games',
    keywords: ['games', 'arcade', 'puzzle', 'play'],
    targetSection: 'games',
  },
  {
    id: 'nav-jobs',
    label: 'Global Jobs, Scam Detector & Market Intel',
    category: 'Navigation',
    description: 'Find internships/fresher/remote jobs, detect fake listings, and explore global hiring hubs',
    keywords: ['jobs', 'companies', 'internship', 'fresher', 'scam', 'market', 'apply', 'salary'],
    targetSection: 'global-jobs',
  },
  {
    id: 'nav-settings',
    label: 'Settings & Preferences',
    category: 'Settings & Support',
    description: 'Theme mode (Light/Dark/System), AI remedial threshold, voice narration, study goals, data export',
    keywords: ['settings', 'preferences', 'theme', 'light', 'dark', 'system', 'voice', 'export', 'threshold'],
    targetSection: 'settings',
  },
  {
    id: 'nav-support',
    label: 'Help & Support (Vora Generation Network)',
    category: 'Settings & Support',
    description: 'Contact Vora Generation Network · voragenerationnetwork@gmail.com',
    keywords: ['help', 'support', 'contact', 'vora', 'voragenerationnetwork', 'email'],
    targetSection: 'support',
  },
  // Specific Games
  {
    id: 'game-word-connect',
    label: 'Word Connect Game',
    category: 'Skill Game',
    description: 'Connect letter tiles to form technical vocabulary',
    keywords: ['word', 'connect', 'letters', 'game', 'vocabulary'],
    targetSection: 'games',
    subTarget: 'word-connect',
  },
  {
    id: 'game-sudoku',
    label: 'Logic Sudoku Game',
    category: 'Skill Game',
    description: 'Train deductive reasoning with interactive Sudoku',
    keywords: ['sudoku', 'logic', 'grid', 'numbers', 'game'],
    targetSection: 'games',
    subTarget: 'sudoku',
  },
  {
    id: 'game-zip',
    label: 'Zip Path Puzzle',
    category: 'Skill Game',
    description: 'Trace a continuous Hamiltonian path through numbered nodes',
    keywords: ['zip', 'path', 'linkedin', 'route', 'grid', 'game'],
    targetSection: 'games',
    subTarget: 'zip',
  },
  {
    id: 'game-word-find',
    label: 'Word Finding Grid',
    category: 'Skill Game',
    description: 'Spot hidden engineering terms inside the letter matrix',
    keywords: ['word', 'finding', 'search', 'grid', 'game'],
    targetSection: 'games',
    subTarget: 'word-find',
  },
  {
    id: 'game-spot-diff',
    label: 'Spot the Difference (Architecture)',
    category: 'Skill Game',
    description: 'Audit system architecture diagrams to spot missing components',
    keywords: ['spot', 'difference', 'architecture', 'diagram', 'game'],
    targetSection: 'games',
    subTarget: 'spot-diff',
  },
  {
    id: 'ai-chatbot',
    label: 'Multi-Model Gemini Chatbot',
    category: 'AI Mentor & Video',
    description: 'Stateful multi-turn reasoning with Gemini 4 Hydrogen and 3.1 Flash Lite',
    keywords: ['chatbot', 'gemini', 'thinking', 'reasoning', 'hydrogen', 'flash', 'chat'],
    targetSection: 'ai-mentor',
    subTarget: 'chatbot',
  },
  {
    id: 'ai-live-voice',
    label: 'Live Voice Tutor & Audio Transcriber',
    category: 'AI Mentor & Video',
    description: 'Real-time 16kHz/24kHz Gemini Live voice coaching and speech transcription',
    keywords: ['voice', 'live', 'mic', 'audio', 'transcribe', 'speech', 'tutor'],
    targetSection: 'ai-mentor',
    subTarget: 'live-voice',
  },
  {
    id: 'ai-search-maps',
    label: 'Search & Maps Career Advisor',
    category: 'AI Mentor & Video',
    description: 'Live Google Search and Google Maps grounded employer & skill insights',
    keywords: ['search', 'maps', 'grounding', 'advisor', 'citations', 'hubs'],
    targetSection: 'ai-mentor',
    subTarget: 'search-maps',
  },
  {
    id: 'jobs-maps-explorer',
    label: 'Global Employer Tech Hubs Map',
    category: 'Global Company',
    description: 'Interactive Google Maps explorer with pins for global engineering hubs',
    keywords: ['map', 'google maps', 'locations', 'hubs', 'pins', 'cities'],
    targetSection: 'global-jobs',
  },
  {
    id: 'game-3d-defender',
    label: '3D Skill Defender Arena (Three.js)',
    category: 'Skill Game',
    description: 'Full-viewport 3D WebGL space craft mission collecting Skill Mastery Cores',
    keywords: ['3d', 'threejs', 'webgl', 'defender', 'space', 'arcade', 'game'],
    targetSection: 'games',
    subTarget: 'skill-defender-3d',
  },
  {
    id: 'game-code-bug',
    label: 'Code Error Finder Game',
    category: 'Skill Game',
    description: 'Identify subtle syntax and logic bugs in real code snippets',
    keywords: ['code', 'error', 'bug', 'finder', 'debug', 'game'],
    targetSection: 'games',
    subTarget: 'code-bug',
  },
];

export function buildSearchCatalog(): SearchEntry[] {
  const entries: SearchEntry[] = [...STATIC_ENTRIES];

  for (const role of CAREER_ROLES) {
    entries.push({
      id: `role-${role.id}`,
      label: role.title,
      category: 'Career Role',
      description: `${role.domain} · ${role.salaryRange}`,
      keywords: [role.title, role.domain, ...role.requiredSkills.map((s) => s.name)],
      targetSection: 'career-matching',
      subTarget: role.id,
    });
  }

  for (const skill of Object.keys(DIAGNOSTIC_QUIZZES)) {
    entries.push({
      id: `quiz-${skill}`,
      label: `${skill} Skill Assessment`,
      category: 'Skill Assessment',
      description: `Take interactive diagnostic quiz for ${skill}`,
      keywords: [skill, 'quiz', 'test', 'assessment', 'diagnostic'],
      targetSection: 'skill-analysis',
      subTarget: skill,
    });
  }

  for (const mentor of MENTOR_STAFF) {
    entries.push({
      id: `mentor-${mentor.id}`,
      label: mentor.name,
      category: 'AI Mentor & Video',
      description: `${mentor.role} · ${mentor.specialty}`,
      keywords: [mentor.name, mentor.role, mentor.specialty, 'mentor', 'teacher', 'video'],
      targetSection: 'ai-mentor',
      subTarget: mentor.id,
    });
  }

  for (const ch of FLAGSHIP_CODING_CHALLENGES) {
    entries.push({
      id: `challenge-${ch.id}`,
      label: `${ch.title} (${ch.difficulty})`,
      category: 'Code Arena',
      description: `#${ch.indexNumber} · ${ch.topic} · +${ch.points} pts`,
      keywords: [ch.title, ch.topic, ch.difficulty, 'code', 'algorithm'],
      targetSection: 'code-arena',
      subTarget: ch.id,
    });
  }

  for (const co of FLAGSHIP_COMPANIES) {
    entries.push({
      id: `company-${co.id}`,
      label: `${co.companyName} — ${co.roleTitle}`,
      category: 'Global Company',
      description: `${co.city}, ${co.country} · ${co.workMode}`,
      keywords: [co.companyName, co.roleTitle, co.industry, co.country, ...co.requiredSkills],
      targetSection: 'global-jobs',
      subTarget: co.id,
    });
  }

  for (const course of COURSES_CATALOG) {
    entries.push({
      id: `course-${course.id}`,
      label: course.title,
      category: 'Courses & Learning',
      description: `${course.level} · ${course.pricing} · ${course.technology}`,
      keywords: [course.title, course.category, course.technology, course.level, course.pricing],
      targetSection: 'courses',
      subTarget: course.id,
    });
  }

  return entries;
}

export function searchPlatformOptions(query: string, limit = 10): SearchEntry[] {
  const q = query.trim().toLowerCase();
  const catalog = buildSearchCatalog();

  if (!q) {
    return catalog.slice(0, limit);
  }

  const scored: Array<{ entry: SearchEntry; score: number }> = [];

  for (const entry of catalog) {
    const labelLower = entry.label.toLowerCase();
    const descLower = entry.description.toLowerCase();
    const catLower = entry.category.toLowerCase();
    const kwMatch = entry.keywords.some((k) => k.toLowerCase().includes(q));

    let score = 0;
    if (labelLower === q) score += 100;
    else if (labelLower.startsWith(q)) score += 75;
    else if (labelLower.includes(q)) score += 50;

    if (entry.keywords.some((k) => k.toLowerCase() === q)) score += 45;
    else if (entry.keywords.some((k) => k.toLowerCase().startsWith(q))) score += 30;
    else if (kwMatch) score += 20;

    if (catLower.includes(q)) score += 15;
    if (descLower.includes(q)) score += 10;

    if (score > 0) {
      scored.push({ entry, score });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.entry.label.localeCompare(b.entry.label));
  return scored.slice(0, limit).map((s) => s.entry);
}

import { CAREER_ROLES, DIAGNOSTIC_QUIZZES, MENTOR_STAFF } from '../data/careerData';
import { FLAGSHIP_COMPANIES } from '../data/companiesCatalog';
import { FLAGSHIP_CODING_CHALLENGES } from '../data/codingCatalog';
import type { NavSection } from '../types';

export interface SearchEntry {
  id: string;
  label: string;
  category:
    | 'Navigation'
    | 'Skill Assessment'
    | 'Career Role'
    | 'AI Mentor & Video'
    | 'Code Arena'
    | 'Skill Game'
    | 'Global Company'
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
    id: 'nav-profile',
    label: 'User Profile & Sign In / Register',
    category: 'Navigation',
    description: 'Manage skills, certifications, projects, career goals, Google/Microsoft/Email auth',
    keywords: ['profile', 'account', 'login', 'sign in', 'register', 'google', 'microsoft', 'certifications', 'projects', 'goals'],
    targetSection: 'profile',
  },
  {
    id: 'nav-skill-analysis',
    label: 'Skill Analysis & Multi-Agent Diagnostics',
    category: 'Navigation',
    description: 'Strengths, weaknesses, diagnostic quizzes, and 4-agent AI collaboration',
    keywords: ['skill', 'analysis', 'assessment', 'quiz', 'weakness', 'strength', 'agents', 'remedial'],
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
    label: 'AI Mentor & Video Lesson Studio',
    category: 'Navigation',
    description: 'Chat with AI Staff Teachers and generate interactive AI concept videos',
    keywords: ['ai', 'mentor', 'teacher', 'staff', 'video', 'studio', 'lesson', 'chat'],
    targetSection: 'ai-mentor',
  },
  {
    id: 'nav-career-lab',
    label: 'Career Lab (Mock Interviewer & ATS Scanner)',
    category: 'Navigation',
    description: 'AI technical interview simulator, resume/JD ATS extractor, and cohort benchmarks',
    keywords: ['career lab', 'interview', 'mock', 'ats', 'resume', 'scanner', 'benchmark', 'cohort'],
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
    label: 'Global Jobs & 20,000+ Companies',
    category: 'Navigation',
    description: 'Find skill-matched job vacancies, company logos, contact info, and apply links',
    keywords: ['jobs', 'companies', 'apply', 'vacancy', 'hiring', 'careers', 'salary'],
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
    label: 'Help & Support (Abhishek R)',
    category: 'Settings & Support',
    description: 'Contact Abhishek R · abhishekr.bcs25@gmail.com · 9745169331',
    keywords: ['help', 'support', 'contact', 'abhishek', 'email', 'phone', '9745169331'],
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

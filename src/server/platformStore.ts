import fs from 'node:fs';
import path from 'node:path';
import type {
  BillingTransaction,
  CommunityPost,
  CourseItem,
  EmployerApplicantItem,
  EmployerPostedJob,
  MentorBooking,
  PlatformMessage,
  ScamReportItem,
  SecurityAuditEntry,
} from '../types';
import { COURSES_CATALOG } from '../data/coursesCatalog';

export interface PlatformAnnouncement {
  id: string;
  title: string;
  body: string;
  audience: 'All Users' | 'Students' | 'Employers';
  createdAt: string;
}

export interface EmployerCompanyProfile {
  employerKey: string;
  companyName: string;
  industry: string;
  website: string;
  headquarters: string;
  description: string;
  verificationStatus: 'Unverified' | 'Pending Review' | 'Verified Partner';
}

export interface VerifiedCertificateRecord {
  certId: string;
  holderName: string;
  title: string;
  issuer: string;
  category: 'Course' | 'Skill Assessment' | 'Internship' | 'Project' | 'Training';
  issuedYear: string;
  expiryDate?: string;
}

export interface UserModerationState {
  suspended?: boolean;
  verifiedBadge?: boolean;
}

export interface PlatformStoreData {
  communityPosts: CommunityPost[];
  mentorBookings: MentorBooking[];
  messages: PlatformMessage[];
  announcements: PlatformAnnouncement[];
  employerProfiles: Record<string, EmployerCompanyProfile>;
  employerJobs: EmployerPostedJob[];
  employerApplicants: EmployerApplicantItem[];
  scamReports: ScamReportItem[];
  billingTransactions: BillingTransaction[];
  auditLogs: SecurityAuditEntry[];
  verifiedCertificates: VerifiedCertificateRecord[];
  customCourses: CourseItem[];
  userModeration: Record<string, UserModerationState>;
}

const DATA_DIR = path.resolve(process.cwd(), '.pathforge-data');
const PLATFORM_FILE = path.join(DATA_DIR, 'platform.json');

export function createSeedPlatformStore(): PlatformStoreData {
  return {
    communityPosts: [
      {
        id: 'post-1',
        authorName: 'Ananya Nair',
        authorRole: 'Full Stack Track',
        category: 'Q&A',
        title: 'Best strategy to optimize PostgreSQL queries with 5M+ analytics events?',
        body: 'Should I start with composite B-Tree indexes on (user_id, created_at) or partition the events table monthly?',
        tags: ['SQL', 'PostgreSQL', 'Performance'],
        votes: 18,
        createdAt: '2026-11-12T09:15:00Z',
        replies: [
          {
            id: 'rep-1',
            authorName: 'Marcus Chen',
            text: 'Start with a composite B-Tree index matching your equality + range predicate, then inspect EXPLAIN (ANALYZE, BUFFERS) before partitioning.',
            createdAt: '2026-11-12T10:02:00Z',
          },
        ],
      },
      {
        id: 'post-2',
        authorName: 'Karthik Rao',
        authorRole: 'Study Group Lead',
        category: 'Study Group',
        title: 'Weekend DSA + System Design Cohort (React & Node Track)',
        body: 'Solving 3 Medium Code Arena problems every Saturday 10 AM IST and reviewing mock interview answers together.',
        tags: ['DSA', 'Study Group', 'Code Arena'],
        votes: 24,
        createdAt: '2026-11-13T07:30:00Z',
        replies: [],
      },
      {
        id: 'post-3',
        authorName: 'Dr. Elena Vance',
        authorRole: 'Principal Mentor',
        category: 'Webinar',
        title: 'Live Breakdown: Passing 20-Question Verification & ATS Resumes',
        body: 'Join our open review session covering verified coding assessments, GitHub project READMEs, and clean ATS keywords.',
        tags: ['Webinar', 'ATS Resume', 'Hiring'],
        votes: 31,
        createdAt: '2026-11-14T11:00:00Z',
        replies: [],
      },
    ],
    mentorBookings: [],
    messages: [
      {
        id: 'msg-seed-1',
        senderName: 'Vora Generation Network',
        senderRole: 'Support',
        recipientKey: '*',
        subject: 'Welcome to VoraGen Verified Hiring & Learning Inbox',
        body: 'Recruiter interview invitations, instructor project reviews, and certificate expiry notices appear right here.',
        createdAt: '2026-11-14T08:00:00Z',
        read: false,
      },
    ],
    announcements: [
      {
        id: 'ann-1',
        title: 'APAC & Global Virtual Career Fair Open for Registration',
        body: '38 verified engineering booths are open across India, Singapore, and Remote cohorts. Verify your skills and RSVP under Applications & Drives.',
        audience: 'All Users',
        createdAt: '2026-11-14T06:00:00Z',
      },
      {
        id: 'ann-2',
        title: 'QR-Verified Digital Skill Passports Now Live',
        body: 'Download printable PDF certificates and share instant credential lookup links directly with recruiters.',
        audience: 'Students',
        createdAt: '2026-11-13T15:20:00Z',
      },
    ],
    employerProfiles: {
      'employer-demo': {
        employerKey: 'employer-demo',
        companyName: 'CloudScale Technologies',
        industry: 'Cloud & Enterprise SaaS',
        website: 'https://cloudscale.example.com',
        headquarters: 'Bengaluru, India',
        description: 'Building resilient distributed developer infrastructure across APAC and Europe.',
        verificationStatus: 'Verified Partner',
      },
    },
    employerJobs: [
      {
        id: 'emp-job-1',
        employerKey: 'employer-demo',
        companyName: 'CloudScale Technologies',
        roleTitle: 'Associate Full Stack Engineer',
        employmentType: 'Full-Time',
        workMode: 'Hybrid',
        location: 'Bengaluru, India',
        salaryRange: 'INR 10 – 16 LPA',
        experienceLevel: 'Fresher',
        educationReq: 'B.Tech / B.E / MCA (2025–2026)',
        requiredSkills: ['React', 'TypeScript', 'Node.js', 'SQL'],
        vacancies: 6,
        deadline: '2026-12-28',
        description: 'Build reliable customer analytics dashboards and REST APIs alongside senior product engineers.',
        responsibilities: [
          'Implement accessible React + TypeScript views backed by Express & PostgreSQL',
          'Write deterministic unit tests and participate in peer code reviews',
        ],
        benefits: ['Health Insurance', 'Learning Stipend', 'Hybrid Flexibility'],
        status: 'Approved',
        createdAt: '2026-11-12T09:00:00Z',
      },
      {
        id: 'emp-job-2',
        employerKey: 'employer-demo',
        companyName: 'CloudScale Technologies',
        roleTitle: 'AI Systems Engineering Intern (Paid)',
        employmentType: 'Internship',
        workMode: 'Remote',
        location: 'Remote (Global)',
        salaryRange: 'INR 35,000 / month Stipend',
        experienceLevel: 'Entry-Level',
        educationReq: 'Pursuing Undergraduate / Postgraduate CS',
        requiredSkills: ['Python', 'LLM & Agent Systems', 'TypeScript'],
        vacancies: 4,
        deadline: '2026-12-20',
        description: '6-month paid virtual internship focusing on evaluation harnesses and RAG accuracy.',
        responsibilities: ['Build evaluation benchmarks', 'Document model failure modes'],
        benefits: ['PPO Conversion Opportunity', 'Paid Stipend', 'Completion Certificate'],
        status: 'Approved',
        createdAt: '2026-11-13T10:30:00Z',
      },
    ],
    employerApplicants: [
      {
        id: 'cand-1',
        jobId: 'emp-job-1',
        jobTitle: 'Associate Full Stack Engineer',
        companyName: 'CloudScale Technologies',
        candidateName: 'Diya Menon',
        candidateEmail: 'diya.menon@student.edu',
        skills: ['React', 'TypeScript', 'Node.js', 'SQL', 'Git & CI/CD'],
        education: 'B.Tech CSE · 2026',
        cgpa: '8.9',
        resumeSummary: 'Built multi-tenant analytics dashboard and SQL query profiler with 98% test pass rate.',
        matchPct: 92,
        status: 'Applied',
        appliedAt: '2026-11-13',
      },
      {
        id: 'cand-2',
        jobId: 'emp-job-1',
        jobTitle: 'Associate Full Stack Engineer',
        companyName: 'CloudScale Technologies',
        candidateName: 'Rohan Deshmukh',
        candidateEmail: 'rohan.d@student.edu',
        skills: ['JavaScript', 'React', 'HTML/CSS', 'Python'],
        education: 'B.E IT · 2026',
        cgpa: '8.1',
        resumeSummary: 'Created student placement tracker SPA and automated REST API integration tests.',
        matchPct: 74,
        status: 'Shortlisted',
        appliedAt: '2026-11-12',
      },
    ],
    scamReports: [
      {
        id: 'scam-seed-1',
        companyName: 'Apex QuickHire Consultancy',
        jobTitle: 'Remote Data Analyst (Direct Offer)',
        reason: 'Asked candidate for INR 2,500 laptop registration fee via personal UPI.',
        riskScore: 88,
        flags: [
          'Requests upfront registration, training, or deposit fee from candidates.',
          'Uses generic free webmail instead of a verified corporate domain email.',
        ],
        reportedBy: 'community-member',
        createdAt: '2026-11-11',
        resolution: 'Flagged & Removed',
      },
    ],
    billingTransactions: [],
    auditLogs: [
      {
        id: 'audit-seed-1',
        userKey: '*',
        action: 'SECURITY_BASELINE_VERIFIED',
        detail: 'PBKDF2-SHA512 hashing, HMAC session tokens, and OWASP security headers active.',
        ip: '127.0.0.1',
        device: 'VoraGen Security Engine',
        timestamp: '2026-11-14T08:00:00Z',
      },
    ],
    verifiedCertificates: [
      {
        certId: 'VG-CERT-PY-2026',
        holderName: 'Diya Menon',
        title: 'Applied Python & Machine Learning Pipelines',
        issuer: 'Vora Generation Network',
        category: 'Course',
        issuedYear: '2026',
        expiryDate: '2028-11-14',
      },
      {
        certId: 'VG-CERT-FS-8841',
        holderName: 'Aarav Sharma',
        title: 'Full Stack Developer Verified Skill Benchmark',
        issuer: 'Vora Generation Network',
        category: 'Skill Assessment',
        issuedYear: '2026',
      },
    ],
    customCourses: [...COURSES_CATALOG],
    userModeration: {},
  };
}

export function loadPlatformStore(): PlatformStoreData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(PLATFORM_FILE)) {
      const seed = createSeedPlatformStore();
      fs.writeFileSync(PLATFORM_FILE, JSON.stringify(seed, null, 2));
      return seed;
    }
    const parsed = JSON.parse(fs.readFileSync(PLATFORM_FILE, 'utf-8')) as Partial<PlatformStoreData>;
    const seed = createSeedPlatformStore();
    return {
      ...seed,
      ...parsed,
      customCourses:
        Array.isArray(parsed.customCourses) && parsed.customCourses.length > 0
          ? parsed.customCourses
          : seed.customCourses,
    };
  } catch {
    return createSeedPlatformStore();
  }
}

export function savePlatformStore(data: PlatformStoreData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(PLATFORM_FILE, JSON.stringify(data, null, 2));
  } catch {
    // Non-fatal in read-only sandboxes
  }
}

import crypto from 'node:crypto';
import type express from 'express';
import {
  analyzeJobScamRisk,
  buildLocalStudyToolResponse,
  calculateSubscriptionCheckout,
  rankCandidatesForJob,
  type StudyToolMode,
} from '../utils/platformEngines';
import { verifySessionToken } from '../utils/securityHelpers';
import { sanitizeExternalUrl, sanitizeTextField } from '../utils/validation';
import type {
  AccountRole,
  BillingTransaction,
  CourseItem,
  EmployerApplicantItem,
  EmployerPostedJob,
  MentorBooking,
  PlatformMessage,
  ScamReportItem,
  StudyLanguage,
  SubscriptionPlanId,
  UserProfile,
} from '../types';
import type { PlatformStoreData } from './platformStore';

type PaymentMethodLocal = 'UPI' | 'Card' | 'NetBanking';

export interface PlatformRoutesDeps {
  platformStore: PlatformStoreData;
  persistPlatformStore: () => void;
  profileStore: Record<string, UserProfile>;
  sessionsStore: Record<string, { sessionId: string; userKey: string; deviceLabel: string; ip: string; createdAt: string; lastActiveAt: string; revokedAt?: string }>;
  verifyProfileAccess: (
    req: express.Request,
    key: string,
  ) => { valid: boolean; sub?: string; jti?: string; role?: string };
}

function getCallerIdentity(req: express.Request): {
  authenticated: boolean;
  userKey?: string;
  role?: string;
} {
  const token =
    typeof req.headers['x-voragen-token'] === 'string' ? req.headers['x-voragen-token'] : '';
  if (!token) return { authenticated: false };
  const verified = verifySessionToken(token);
  if (!verified.valid || !verified.sub) return { authenticated: false };
  return { authenticated: true, userKey: verified.sub.toLowerCase(), role: verified.role };
}

function appendAudit(
  store: PlatformStoreData,
  persist: () => void,
  entry: {
    userKey: string;
    action: string;
    detail: string;
    ip?: string;
    device?: string;
    suspicious?: boolean;
  },
) {
  store.auditLogs.unshift({
    id: `aud-${crypto.randomUUID().slice(0, 8)}`,
    userKey: entry.userKey,
    action: entry.action,
    detail: entry.detail,
    ip: entry.ip || '127.0.0.1',
    device: entry.device || 'Web Browser',
    suspicious: entry.suspicious,
    timestamp: new Date().toISOString(),
  });
  store.auditLogs = store.auditLogs.slice(0, 120);
  persist();
}

export function registerPlatformRoutes(app: express.Express, deps: PlatformRoutesDeps): void {
  const { platformStore, persistPlatformStore, profileStore, sessionsStore } = deps;

  // 1. Courses catalog (Section 4)
  app.get('/api/courses', (_req, res) => {
    res.json({ courses: platformStore.customCourses });
  });

  // 2. Online Certificate Verification & Registry (Section 7 + 20.4)
  app.get('/api/certificates/verify', (req, res) => {
    const certId = sanitizeTextField(req.query.id || '', 64).toUpperCase();
    if (!certId) {
      res.status(400).json({ error: 'Provide a certificate ID to verify.' });
      return;
    }

    const staticMatch = platformStore.verifiedCertificates.find(
      (c) => c.certId.toUpperCase() === certId,
    );
    if (staticMatch) {
      res.json({ verified: true, record: staticMatch });
      return;
    }

    for (const prof of Object.values(profileStore)) {
      const cert = prof.certifications.find(
        (c) =>
          (c.credentialId || '').toUpperCase() === certId ||
          c.id.toUpperCase() === certId,
      );
      if (cert) {
        res.json({
          verified: true,
          record: {
            certId: cert.credentialId || cert.id,
            holderName: prof.name || 'Verified Learner',
            title: cert.title,
            issuer: cert.issuer,
            category: 'Training',
            issuedYear: cert.year,
            expiryDate: cert.expiryDate,
          },
        });
        return;
      }
    }

    res.status(404).json({ verified: false, error: `No verified certificate matches ${certId}.` });
  });

  app.post('/api/certificates/register', (req, res) => {
    const caller = getCallerIdentity(req);
    if (!caller.authenticated || !caller.userKey) {
      res.status(401).json({ error: 'Sign in required to register verifiable certificates.' });
      return;
    }
    const { certId, holderName, title, issuer, category, issuedYear, expiryDate } = req.body as {
      certId?: string;
      holderName?: string;
      title?: string;
      issuer?: string;
      category?: 'Course' | 'Skill Assessment' | 'Internship' | 'Project' | 'Training';
      issuedYear?: string;
      expiryDate?: string;
    };
    const cleanId = sanitizeTextField(certId || `VG-${Date.now().toString().slice(-6)}`, 64).toUpperCase();
    const record = {
      certId: cleanId,
      holderName: sanitizeTextField(holderName || profileStore[caller.userKey]?.name || 'Learner', 80),
      title: sanitizeTextField(title || 'VoraGen Verified Credential', 140),
      issuer: sanitizeTextField(issuer || 'Vora Generation Network', 100),
      category: category || 'Training',
      issuedYear: sanitizeTextField(issuedYear || '2026', 12),
      expiryDate: sanitizeTextField(expiryDate || '', 24) || undefined,
    };
    platformStore.verifiedCertificates = [
      record,
      ...platformStore.verifiedCertificates.filter((c) => c.certId !== cleanId),
    ];
    persistPlatformStore();
    res.json({ ok: true, record });
  });

  // 3. Project Evaluation & Instructor Review (Section 6)
  app.post('/api/projects/review', (req, res) => {
    const caller = getCallerIdentity(req);
    if (!caller.authenticated || !caller.userKey) {
      res.status(401).json({ error: 'Sign in required to submit projects for AI & Instructor review.' });
      return;
    }
    const { title, description, repoUrl, skillsUsed } = req.body as {
      title?: string;
      description?: string;
      repoUrl?: string;
      skillsUsed?: string[];
    };
    const cleanTitle = sanitizeTextField(title || '', 120);
    const cleanDesc = sanitizeTextField(description || '', 500);
    if (!cleanTitle || cleanDesc.length < 15) {
      res.status(400).json({ error: 'Provide project title and description (min 15 chars).' });
      return;
    }
    const safeRepo = sanitizeExternalUrl(repoUrl);
    const skillCount = Array.isArray(skillsUsed) ? skillsUsed.length : 0;
    const score = Math.min(98, 68 + (safeRepo ? 12 : 0) + Math.min(12, skillCount * 4) + (cleanDesc.length > 60 ? 6 : 0));
    const feedback = [
      `AI Architecture Score: ${score}/100.`,
      safeRepo ? 'Valid repository link verified for recruiter inspection.' : 'Add a public GitHub repo URL to boost recruiter confidence.',
      'Instructor Note: Clear problem statement and tech stack alignment; consider documenting edge-case unit tests in README.',
    ].join(' ');

    appendAudit(platformStore, persistPlatformStore, {
      userKey: caller.userKey,
      action: 'PROJECT_REVIEW_SUBMITTED',
      detail: `Submitted "${cleanTitle}" (${score}/100)`,
      ip: req.ip,
    });
    res.json({ ok: true, score, feedback, repoUrl: safeRepo });
  });

  // 4. AI Study Assistant Toolkit (Section 5)
  app.post('/api/ai/study-tool', (req, res) => {
    const { mode, topicOrCode, language, key } = req.body as {
      mode?: StudyToolMode;
      topicOrCode?: string;
      language?: StudyLanguage;
      key?: string;
    };
    const prof = (key && profileStore[key.toLowerCase()]) || undefined;
    const output = buildLocalStudyToolResponse({
      mode: mode || 'explain-simple',
      topicOrCode: sanitizeTextField(topicOrCode || 'JavaScript', 800),
      language: language || 'English',
      profile: prof || {
        id: 'guest',
        name: 'Learner',
        email: '',
        authProvider: 'guest',
        isSignedIn: false,
        headline: '',
        education: '',
        targetCareerId: 'fullstack-dev',
        careerGoals: [],
        skills: [],
        certifications: [],
        projects: [],
        assessments: [],
        completedModuleIds: [],
        remedialSkills: [],
        streakDays: 0,
        streakPoints: 0,
        solvedChallengeIds: [],
        gamesWon: 0,
        applications: [],
      },
      targetRoleTitle: 'Full Stack Developer',
    });
    res.json({ ok: true, output, mode: mode || 'explain-simple' });
  });

  // 5. Community Forum, Mentors & Messages (Section 14, 15, 16)
  app.get('/api/community/posts', (_req, res) => {
    res.json({
      posts: platformStore.communityPosts,
      announcements: platformStore.announcements,
    });
  });

  app.post('/api/community/posts', (req, res) => {
    const caller = getCallerIdentity(req);
    if (!caller.authenticated || !caller.userKey) {
      res.status(401).json({ error: 'Sign in required to publish community posts.' });
      return;
    }
    const prof = profileStore[caller.userKey];
    const { title, body, category, tags } = req.body as {
      title?: string;
      body?: string;
      category?: 'Q&A' | 'Study Group' | 'Project Showcase' | 'Career Advice' | 'Webinar';
      tags?: string[];
    };
    const cleanTitle = sanitizeTextField(title || '', 160);
    const cleanBody = sanitizeTextField(body || '', 1200);
    if (!cleanTitle || !cleanBody) {
      res.status(400).json({ error: 'Post title and message are required.' });
      return;
    }
    const post = {
      id: `post-${crypto.randomUUID().slice(0, 8)}`,
      authorName: prof?.name || caller.userKey,
      authorRole: prof?.headline || 'VoraGen Member',
      category: category || 'Q&A',
      title: cleanTitle,
      body: cleanBody,
      tags: Array.isArray(tags) ? tags.map((t) => sanitizeTextField(t, 32)).filter(Boolean).slice(0, 5) : [],
      votes: 1,
      createdAt: new Date().toISOString(),
      replies: [],
    };
    platformStore.communityPosts.unshift(post);
    persistPlatformStore();
    res.json({ ok: true, post });
  });

  app.post('/api/community/posts/:id/vote', (req, res) => {
    const post = platformStore.communityPosts.find((p) => p.id === req.params.id);
    if (!post) {
      res.status(404).json({ error: 'Post not found.' });
      return;
    }
    const delta = (req.body as { direction?: string }).direction === 'down' ? -1 : 1;
    post.votes = Math.max(0, post.votes + delta);
    persistPlatformStore();
    res.json({ ok: true, post });
  });

  app.post('/api/community/posts/:id/reply', (req, res) => {
    const caller = getCallerIdentity(req);
    if (!caller.authenticated || !caller.userKey) {
      res.status(401).json({ error: 'Sign in required to reply to discussions.' });
      return;
    }
    const post = platformStore.communityPosts.find((p) => p.id === req.params.id);
    if (!post) {
      res.status(404).json({ error: 'Post not found.' });
      return;
    }
    const text = sanitizeTextField((req.body as { text?: string }).text || '', 600);
    if (!text) {
      res.status(400).json({ error: 'Reply cannot be empty.' });
      return;
    }
    const prof = profileStore[caller.userKey];
    post.replies.push({
      id: `rep-${crypto.randomUUID().slice(0, 8)}`,
      authorName: prof?.name || caller.userKey,
      text,
      createdAt: new Date().toISOString(),
    });
    persistPlatformStore();
    res.json({ ok: true, post });
  });

  app.post('/api/community/posts/:id/report', (req, res) => {
    const post = platformStore.communityPosts.find((p) => p.id === req.params.id);
    if (!post) {
      res.status(404).json({ error: 'Post not found.' });
      return;
    }
    post.reported = true;
    persistPlatformStore();
    res.json({ ok: true, post });
  });

  // Mentor Bookings (Section 16)
  app.get('/api/mentors/bookings', (req, res) => {
    const caller = getCallerIdentity(req);
    const bookings = caller.userKey
      ? platformStore.mentorBookings.filter((b) => b.userKey === caller.userKey)
      : [];
    res.json({ bookings });
  });

  app.post('/api/mentors/bookings', (req, res) => {
    const caller = getCallerIdentity(req);
    if (!caller.authenticated || !caller.userKey) {
      res.status(401).json({ error: 'Sign in required to book 1:1 mentor sessions.' });
      return;
    }
    const { mentorId, mentorName, topic, slot } = req.body as {
      mentorId?: string;
      mentorName?: string;
      topic?: string;
      slot?: string;
    };
    const cleanTopic = sanitizeTextField(topic || '', 160);
    const cleanSlot = sanitizeTextField(slot || '', 80);
    if (!mentorId || !cleanTopic || !cleanSlot) {
      res.status(400).json({ error: 'Mentor, topic, and slot are required.' });
      return;
    }
    const prof = profileStore[caller.userKey];
    const booking: MentorBooking = {
      id: `mb-${crypto.randomUUID().slice(0, 8)}`,
      mentorId: sanitizeTextField(mentorId, 40),
      mentorName: sanitizeTextField(mentorName || 'VoraGen Mentor', 80),
      userKey: caller.userKey,
      userName: prof?.name || caller.userKey,
      topic: cleanTopic,
      slot: cleanSlot,
      status: 'Confirmed',
      createdAt: new Date().toISOString(),
    };
    platformStore.mentorBookings.unshift(booking);
    persistPlatformStore();
    res.json({ ok: true, booking });
  });

  // Direct Messages Inbox (Section 14)
  app.get('/api/messages', (req, res) => {
    const caller = getCallerIdentity(req);
    const msgs = platformStore.messages.filter(
      (m) => m.recipientKey === '*' || (caller.userKey && m.recipientKey === caller.userKey),
    );
    res.json({ messages: msgs });
  });

  app.post('/api/messages', (req, res) => {
    const caller = getCallerIdentity(req);
    if (!caller.authenticated || !caller.userKey) {
      res.status(401).json({ error: 'Sign in required to send messages.' });
      return;
    }
    const prof = profileStore[caller.userKey];
    const { recipientKey, subject, body, senderRole } = req.body as {
      recipientKey?: string;
      subject?: string;
      body?: string;
      senderRole?: 'Recruiter' | 'Instructor' | 'Learner' | 'Support';
    };
    const cleanSub = sanitizeTextField(subject || '', 140);
    const cleanBody = sanitizeTextField(body || '', 1000);
    if (!cleanSub || !cleanBody) {
      res.status(400).json({ error: 'Subject and message body are required.' });
      return;
    }
    const msg: PlatformMessage = {
      id: `msg-${crypto.randomUUID().slice(0, 8)}`,
      senderName: prof?.name || caller.userKey,
      senderRole: senderRole || (caller.role === 'employer' ? 'Recruiter' : 'Learner'),
      recipientKey: sanitizeTextField(recipientKey || caller.userKey, 160).toLowerCase(),
      subject: cleanSub,
      body: cleanBody,
      createdAt: new Date().toISOString(),
      read: false,
    };
    platformStore.messages.unshift(msg);
    persistPlatformStore();
    res.json({ ok: true, message: msg });
  });

  // 6. Scam Reports (Section 8 / Innovation 20.6)
  app.post('/api/jobs/scam-report', (req, res) => {
    const { companyName, jobTitle, reason, contactEmail, website, salaryText, description } =
      req.body as {
        companyName?: string;
        jobTitle?: string;
        reason?: string;
        contactEmail?: string;
        website?: string;
        salaryText?: string;
        description?: string;
      };
    const cleanCompany = sanitizeTextField(companyName || '', 120);
    const cleanReason = sanitizeTextField(reason || '', 400);
    if (!cleanCompany || !cleanReason) {
      res.status(400).json({ error: 'Company name and scam reason are required.' });
      return;
    }
    const analysis = analyzeJobScamRisk({
      companyName: cleanCompany,
      contactEmail,
      website,
      salaryText,
      description: `${cleanReason} ${description || ''}`,
    });
    const caller = getCallerIdentity(req);
    const item: ScamReportItem = {
      id: `scam-${crypto.randomUUID().slice(0, 8)}`,
      companyName: cleanCompany,
      jobTitle: sanitizeTextField(jobTitle || 'Reported Listing', 120),
      reason: cleanReason,
      riskScore: analysis.riskScore,
      flags: analysis.flags,
      reportedBy: caller.userKey || 'visitor',
      createdAt: new Date().toISOString().split('T')[0],
      resolution: 'Open',
    };
    platformStore.scamReports.unshift(item);
    persistPlatformStore();
    res.json({ ok: true, report: item });
  });

  // 7. Employer Portal Endpoints (Section 13)
  app.get('/api/employer/workspace', (req, res) => {
    const caller = getCallerIdentity(req);
    const employerKey = caller.userKey || 'employer-demo';
    const companyProfile = platformStore.employerProfiles[employerKey] ||
      platformStore.employerProfiles['employer-demo'];
    const jobs = platformStore.employerJobs;
    const rankedApplicants = rankCandidatesForJob(
      platformStore.employerApplicants,
      jobs[0]?.requiredSkills || ['React', 'TypeScript', 'Node.js', 'SQL'],
    );
    res.json({
      companyProfile,
      jobs,
      applicants: rankedApplicants,
    });
  });

  app.post('/api/employer/company', (req, res) => {
    const caller = getCallerIdentity(req);
    if (!caller.authenticated || !caller.userKey) {
      res.status(401).json({ error: 'Sign in required to update company profile.' });
      return;
    }
    const body = req.body as Partial<{
      companyName: string;
      industry: string;
      website: string;
      headquarters: string;
      description: string;
      requestVerification: boolean;
    }>;
    const prev = platformStore.employerProfiles[caller.userKey] || {
      employerKey: caller.userKey,
      companyName: 'Your Company',
      industry: 'Technology',
      website: 'https://example.com',
      headquarters: 'Remote',
      description: '',
      verificationStatus: 'Unverified' as const,
    };
    const updated = {
      ...prev,
      companyName: sanitizeTextField(body.companyName || prev.companyName, 120),
      industry: sanitizeTextField(body.industry || prev.industry, 80),
      website: sanitizeExternalUrl(body.website) || prev.website,
      headquarters: sanitizeTextField(body.headquarters || prev.headquarters, 100),
      description: sanitizeTextField(body.description || prev.description, 500),
      verificationStatus: body.requestVerification ? ('Pending Review' as const) : prev.verificationStatus,
    };
    platformStore.employerProfiles[caller.userKey] = updated;
    persistPlatformStore();
    res.json({ ok: true, companyProfile: updated });
  });

  app.post('/api/employer/jobs', (req, res) => {
    const caller = getCallerIdentity(req);
    if (!caller.authenticated || !caller.userKey) {
      res.status(401).json({ error: 'Sign in required to publish jobs or internships.' });
      return;
    }
    const b = req.body as Partial<EmployerPostedJob>;
    const companyName = sanitizeTextField(b.companyName || '', 120);
    const roleTitle = sanitizeTextField(b.roleTitle || '', 120);
    if (!companyName || !roleTitle) {
      res.status(400).json({ error: 'Company name and job title are required.' });
      return;
    }
    const newJob: EmployerPostedJob = {
      id: `emp-job-${crypto.randomUUID().slice(0, 8)}`,
      employerKey: caller.userKey,
      companyName,
      roleTitle,
      employmentType: b.employmentType || 'Full-Time',
      workMode: b.workMode || 'Hybrid',
      location: sanitizeTextField(b.location || 'Remote', 100),
      salaryRange: sanitizeTextField(b.salaryRange || 'Competitive', 80),
      experienceLevel: b.experienceLevel || 'Fresher',
      educationReq: sanitizeTextField(b.educationReq || 'Any Technical Graduate', 120),
      requiredSkills: Array.isArray(b.requiredSkills)
        ? b.requiredSkills.map((s) => sanitizeTextField(s, 40)).filter(Boolean).slice(0, 12)
        : ['JavaScript', 'SQL'],
      vacancies: Math.max(1, Math.min(500, Number(b.vacancies) || 1)),
      deadline: sanitizeTextField(b.deadline || '2026-12-31', 24),
      description: sanitizeTextField(b.description || 'Engineering role on VoraGen.', 800),
      responsibilities: Array.isArray(b.responsibilities) && b.responsibilities.length
        ? b.responsibilities.slice(0, 6)
        : ['Build clean production software and collaborate with mentors'],
      benefits: Array.isArray(b.benefits) && b.benefits.length
        ? b.benefits.slice(0, 6)
        : ['Learning Allowance', 'Flexible Work'],
      status: caller.role === 'admin' ? 'Approved' : 'Pending Approval',
      createdAt: new Date().toISOString(),
    };
    platformStore.employerJobs.unshift(newJob);
    persistPlatformStore();
    appendAudit(platformStore, persistPlatformStore, {
      userKey: caller.userKey,
      action: 'EMPLOYER_JOB_POSTED',
      detail: `${companyName} posted ${roleTitle} (${newJob.status})`,
      ip: req.ip,
    });
    res.json({ ok: true, job: newJob });
  });

  app.delete('/api/employer/jobs/:id', (req, res) => {
    const caller = getCallerIdentity(req);
    if (!caller.authenticated) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    const idx = platformStore.employerJobs.findIndex((j) => j.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Job posting not found.' });
      return;
    }
    platformStore.employerJobs.splice(idx, 1);
    persistPlatformStore();
    res.json({ ok: true });
  });

  app.patch('/api/employer/applicants/:id', (req, res) => {
    const caller = getCallerIdentity(req);
    if (!caller.authenticated) {
      res.status(401).json({ error: 'Sign in required to update applicant pipeline status.' });
      return;
    }
    const cand = platformStore.employerApplicants.find((a) => a.id === req.params.id);
    if (!cand) {
      res.status(404).json({ error: 'Applicant record not found.' });
      return;
    }
    const b = req.body as Partial<EmployerApplicantItem>;
    if (b.status) cand.status = b.status;
    if (b.interviewSlot) cand.interviewSlot = sanitizeTextField(b.interviewSlot, 100);
    if (b.offerLetterText) cand.offerLetterText = sanitizeTextField(b.offerLetterText, 1200);
    persistPlatformStore();
    res.json({ ok: true, applicant: cand });
  });

  // 8. Admin Platform Governance & Moderation (Section 17)
  app.get('/api/admin/overview', (_req, res) => {
    const users = Object.entries(profileStore).map(([key, prof]) => ({
      userKey: key,
      name: prof.name || key,
      email: prof.email || key,
      role: prof.role || 'student',
      skillsCount: prof.skills.length,
      applicationsCount: prof.applications.length,
      subscriptionPlan: prof.subscriptionPlan || 'free',
      suspended: Boolean(platformStore.userModeration[key]?.suspended),
      verifiedBadge: Boolean(platformStore.userModeration[key]?.verifiedBadge || prof.emailVerified),
    }));

    const totalRevenueInr = platformStore.billingTransactions
      .filter((t) => t.status === 'Paid')
      .reduce((sum, t) => sum + t.totalInr, 0);

    res.json({
      users,
      courses: platformStore.customCourses,
      jobs: platformStore.employerJobs,
      scamReports: platformStore.scamReports,
      reportedPosts: platformStore.communityPosts.filter((p) => p.reported),
      announcements: platformStore.announcements,
      metrics: {
        totalUsers: users.length,
        totalCourses: platformStore.customCourses.length,
        totalJobsPosted: platformStore.employerJobs.length,
        totalApplications:
          platformStore.employerApplicants.length +
          Object.values(profileStore).reduce((s, p) => s + p.applications.length, 0),
        totalRevenueInr,
      },
    });
  });

  app.post('/api/admin/users/:key/moderate', (req, res) => {
    const caller = getCallerIdentity(req);
    if (!caller.authenticated) {
      res.status(401).json({ error: 'Sign in required for admin actions.' });
      return;
    }
    const targetKey = req.params.key.toLowerCase();
    const prof = profileStore[targetKey];
    if (!prof) {
      res.status(404).json({ error: 'User profile not found.' });
      return;
    }
    const b = req.body as { role?: AccountRole; suspended?: boolean; verifiedBadge?: boolean };
    if (b.role) prof.role = b.role;
    platformStore.userModeration[targetKey] = {
      suspended: b.suspended ?? platformStore.userModeration[targetKey]?.suspended,
      verifiedBadge: b.verifiedBadge ?? platformStore.userModeration[targetKey]?.verifiedBadge,
    };
    persistPlatformStore();
    appendAudit(platformStore, persistPlatformStore, {
      userKey: caller.userKey || 'admin',
      action: 'ADMIN_USER_MODERATED',
      detail: `Updated ${targetKey}: role=${prof.role}, suspended=${Boolean(b.suspended)}`,
      ip: req.ip,
    });
    res.json({ ok: true });
  });

  app.post('/api/admin/jobs/:id/moderate', (req, res) => {
    const caller = getCallerIdentity(req);
    if (!caller.authenticated) {
      res.status(401).json({ error: 'Sign in required.' });
      return;
    }
    const job = platformStore.employerJobs.find((j) => j.id === req.params.id);
    if (!job) {
      res.status(404).json({ error: 'Job not found.' });
      return;
    }
    const nextStatus = (req.body as { status?: EmployerPostedJob['status'] }).status;
    if (nextStatus === 'Approved' || nextStatus === 'Rejected' || nextStatus === 'Pending Approval') {
      job.status = nextStatus;
      persistPlatformStore();
    }
    res.json({ ok: true, job });
  });

  app.post('/api/admin/scam-reports/:id/resolve', (req, res) => {
    const report = platformStore.scamReports.find((r) => r.id === req.params.id);
    if (!report) {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }
    const resolution = (req.body as { resolution?: ScamReportItem['resolution'] }).resolution;
    if (resolution) {
      report.resolution = resolution;
      persistPlatformStore();
    }
    res.json({ ok: true, report });
  });

  app.post('/api/admin/courses', (req, res) => {
    const caller = getCallerIdentity(req);
    if (!caller.authenticated) {
      res.status(401).json({ error: 'Sign in required to manage courses.' });
      return;
    }
    const b = req.body as Partial<CourseItem>;
    const title = sanitizeTextField(b.title || '', 140);
    if (!title) {
      res.status(400).json({ error: 'Course title is required.' });
      return;
    }
    const baseTemplate = platformStore.customCourses[0];
    const course: CourseItem = {
      id: `course-${crypto.randomUUID().slice(0, 8)}`,
      title,
      category: sanitizeTextField(b.category || 'Web Development', 60),
      technology: sanitizeTextField(b.technology || 'TypeScript', 60),
      industry: sanitizeTextField(b.industry || 'Software', 60),
      level: b.level || 'Intermediate',
      pricing: b.pricing || 'Free',
      priceUsd: b.pricing === 'Paid' ? Math.max(9, Number(b.priceUsd) || 29) : 0,
      durationHours: Math.max(1, Number(b.durationHours) || 8),
      rating: 4.9,
      reviewsCount: 1,
      newlyAdded: true,
      prerequisites: ['Basic Programming'],
      learningOutcomes: ['Master practical workflows and build portfolio deliverables'],
      instructor: baseTemplate.instructor,
      syllabus: ['Module 1: Core Concepts', 'Module 2: Guided Lab'],
      lessons: baseTemplate.lessons,
      reviews: [],
    };
    platformStore.customCourses.unshift(course);
    persistPlatformStore();
    res.json({ ok: true, course });
  });

  app.post('/api/admin/announcements', (req, res) => {
    const { title, body, audience } = req.body as {
      title?: string;
      body?: string;
      audience?: 'All Users' | 'Students' | 'Employers';
    };
    const cleanTitle = sanitizeTextField(title || '', 140);
    const cleanBody = sanitizeTextField(body || '', 600);
    if (!cleanTitle || !cleanBody) {
      res.status(400).json({ error: 'Announcement title and body are required.' });
      return;
    }
    const item = {
      id: `ann-${crypto.randomUUID().slice(0, 8)}`,
      title: cleanTitle,
      body: cleanBody,
      audience: audience || 'All Users',
      createdAt: new Date().toISOString(),
    };
    platformStore.announcements.unshift(item);
    persistPlatformStore();
    res.json({ ok: true, announcement: item });
  });

  // 9. Payments, Checkout, Coupons & Refunds (Section 18)
  app.get('/api/billing/history', (req, res) => {
    const caller = getCallerIdentity(req);
    const txs = caller.userKey
      ? platformStore.billingTransactions.filter((t) => t.userKey === caller.userKey)
      : [];
    res.json({ transactions: txs });
  });

  app.post('/api/billing/checkout', (req, res) => {
    const caller = getCallerIdentity(req);
    if (!caller.authenticated || !caller.userKey) {
      res.status(401).json({ error: 'Sign in required to purchase plans or bundles.' });
      return;
    }
    const { planId, paymentMethod, couponCode, simulateFailure } = req.body as {
      planId?: SubscriptionPlanId;
      paymentMethod?: PaymentMethodLocal;
      couponCode?: string;
      simulateFailure?: boolean;
    };
    const summary = calculateSubscriptionCheckout(planId || 'pro-monthly', couponCode);
    const prof = profileStore[caller.userKey];
    const tx: BillingTransaction = {
      id: `tx-${crypto.randomUUID().slice(0, 8)}`,
      invoiceNumber: `INV-VG-${Date.now().toString().slice(-6)}`,
      userKey: caller.userKey,
      userName: prof?.name || caller.userKey,
      userEmail: prof?.email || caller.userKey,
      planId: summary.plan.id,
      planName: summary.plan.name,
      paymentMethod: paymentMethod || 'UPI',
      couponApplied: summary.couponLabel,
      subtotalInr: summary.subtotalInr,
      discountInr: summary.discountInr,
      gstInr: summary.gstInr,
      totalInr: summary.totalInr,
      status: simulateFailure ? 'Failed' : 'Paid',
      createdAt: new Date().toISOString().split('T')[0],
    };

    platformStore.billingTransactions.unshift(tx);
    if (!simulateFailure && prof) {
      prof.subscriptionPlan = summary.plan.id;
      prof.autoRenewSubscription = true;
    }
    persistPlatformStore();
    appendAudit(platformStore, persistPlatformStore, {
      userKey: caller.userKey,
      action: simulateFailure ? 'PAYMENT_FAILED' : 'PAYMENT_COMPLETED',
      detail: `${summary.plan.name} via ${tx.paymentMethod} (INR ${tx.totalInr})`,
      ip: req.ip,
    });

    if (simulateFailure) {
      res.status(402).json({
        ok: false,
        error: 'Payment declined by bank sandbox. Retry with another UPI/Card method.',
        transaction: tx,
      });
      return;
    }

    res.json({ ok: true, transaction: tx, activePlan: summary.plan.id });
  });

  app.post('/api/billing/transactions/:id/refund', (req, res) => {
    const caller = getCallerIdentity(req);
    if (!caller.authenticated || !caller.userKey) {
      res.status(401).json({ error: 'Sign in required.' });
      return;
    }
    const tx = platformStore.billingTransactions.find(
      (t) => t.id === req.params.id && t.userKey === caller.userKey,
    );
    if (!tx) {
      res.status(404).json({ error: 'Invoice transaction not found.' });
      return;
    }
    tx.status = 'Refunded';
    const prof = profileStore[caller.userKey];
    if (prof) prof.subscriptionPlan = 'free';
    persistPlatformStore();
    res.json({ ok: true, transaction: tx });
  });

  // 10. Security Audit Log & Login Activity History (Section 19)
  app.get('/api/security/audit-logs', (req, res) => {
    const caller = getCallerIdentity(req);
    const logs = platformStore.auditLogs.filter(
      (l) => l.userKey === '*' || (caller.userKey && l.userKey === caller.userKey),
    );
    const loginActivity = caller.userKey
      ? Object.values(sessionsStore).filter((s) => s.userKey === caller.userKey)
      : [];
    res.json({ logs: logs.slice(0, 40), loginActivity });
  });
}

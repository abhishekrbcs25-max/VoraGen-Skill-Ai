import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Megaphone,
  Plus,
  Shield,
  Users,
} from 'lucide-react';
import type {
  AccountRole,
  CourseItem,
  EmployerPostedJob,
  ScamReportItem,
} from '../types';

interface AdminUserRow {
  userKey: string;
  name: string;
  email: string;
  role: AccountRole;
  skillsCount: number;
  applicationsCount: number;
  subscriptionPlan: string;
  suspended: boolean;
  verifiedBadge: boolean;
}

interface AdminPortalViewProps {
  sessionToken?: string;
  onRequireAuth: (reason: string) => boolean;
}

export function AdminPortalView({ sessionToken, onRequireAuth }: AdminPortalViewProps) {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [jobs, setJobs] = useState<EmployerPostedJob[]>([]);
  const [scamReports, setScamReports] = useState<ScamReportItem[]>([]);
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalCourses: 0,
    totalJobsPosted: 0,
    totalApplications: 0,
    totalRevenueInr: 0,
  });

  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseTech, setNewCourseTech] = useState('TypeScript');
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceBody, setAnnounceBody] = useState('');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const loadOverview = () => {
    fetch('/api/admin/overview')
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          d: {
            users?: AdminUserRow[];
            courses?: CourseItem[];
            jobs?: EmployerPostedJob[];
            scamReports?: ScamReportItem[];
            metrics?: typeof metrics;
          } | null,
        ) => {
          if (!d) return;
          if (d.users) setUsers(d.users);
          if (d.courses) setCourses(d.courses);
          if (d.jobs) setJobs(d.jobs);
          if (d.scamReports) setScamReports(d.scamReports);
          if (d.metrics) setMetrics(d.metrics);
        },
      )
      .catch(() => {});
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const handleModerateUser = async (
    userKey: string,
    patch: { role?: AccountRole; suspended?: boolean; verifiedBadge?: boolean },
  ) => {
    if (!onRequireAuth('perform admin user management actions')) return;
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userKey)}/moderate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'x-voragen-token': sessionToken } : {}),
        },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        setStatusNotice(`Updated account governance for ${userKey}.`);
        loadOverview();
      }
    } catch {
      setStatusNotice('Admin update failed.');
    }
  };

  const handleModerateJob = async (
    jobId: string,
    status: EmployerPostedJob['status'],
  ) => {
    if (!onRequireAuth('approve or reject job listings')) return;
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/moderate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'x-voragen-token': sessionToken } : {}),
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setStatusNotice(`Job listing set to ${status}.`);
        loadOverview();
      }
    } catch {
      // Ignore
    }
  };

  const handleResolveScam = async (
    reportId: string,
    resolution: ScamReportItem['resolution'],
  ) => {
    try {
      const res = await fetch(`/api/admin/scam-reports/${reportId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution }),
      });
      if (res.ok) {
        setStatusNotice(`Scam report resolved as ${resolution}.`);
        loadOverview();
      }
    } catch {
      // Ignore
    }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onRequireAuth('publish new courses')) return;
    if (!newCourseTitle.trim()) return;
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'x-voragen-token': sessionToken } : {}),
        },
        body: JSON.stringify({ title: newCourseTitle, technology: newCourseTech }),
      });
      if (res.ok) {
        setNewCourseTitle('');
        setStatusNotice('New course published to catalog.');
        loadOverview();
      }
    } catch {
      // Ignore
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announceTitle.trim() || !announceBody.trim()) return;
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: announceTitle, body: announceBody, audience: 'All Users' }),
      });
      if (res.ok) {
        setAnnounceTitle('');
        setAnnounceBody('');
        setStatusNotice('Broadcast announcement delivered to Inbox & Alerts.');
      }
    } catch {
      // Ignore
    }
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 dark:border-white/10 pb-5">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-emerald-600 dark:text-amber-400" />
          <span>Admin Dashboard & Platform Governance</span>
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Manage users & roles, publish courses, approve employer jobs, resolve scam alerts, and inspect platform analytics.
        </p>
      </div>

      {/* Platform Analytics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          ['Registered Users', metrics.totalUsers],
          ['Published Courses', metrics.totalCourses],
          ['Employer Postings', metrics.totalJobsPosted],
          ['Total Applications', metrics.totalApplications],
          ['Billing Revenue', `INR ${metrics.totalRevenueInr}`],
        ].map(([label, val]) => (
          <div
            key={String(label)}
            className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-4"
          >
            <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
            <p className="mt-1 font-display text-xl font-bold tabular-nums text-[#0B2545] dark:text-white">
              {val}
            </p>
          </div>
        ))}
      </div>

      {statusNotice && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-900 dark:text-emerald-200"
        >
          {statusNotice}
        </div>
      )}

      {/* User Directory */}
      <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4">
        <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
          <Users className="w-5 h-5" />
          <span>User & Role Management ({users.length})</span>
        </h2>

        {users.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No registered user accounts recorded yet. Sign up an account to moderate roles and verification badges.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400">
                  <th className="py-2 pr-3">User</th>
                  <th className="py-2 pr-3">Role</th>
                  <th className="py-2 pr-3">Plan</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {users.map((u) => (
                  <tr key={u.userKey}>
                    <td className="py-2.5 pr-3">
                      <p className="font-semibold text-[#0B2545] dark:text-white">{u.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{u.email}</p>
                    </td>
                    <td className="py-2.5 pr-3">
                      <select
                        aria-label={`Change role for ${u.email}`}
                        value={u.role}
                        onChange={(e) =>
                          handleModerateUser(u.userKey, { role: e.target.value as AccountRole })
                        }
                        className="rounded border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-2 py-1"
                      >
                        <option value="student">Student</option>
                        <option value="working-professional">Professional</option>
                        <option value="job-seeker">Job Seeker</option>
                        <option value="employer">Employer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-2.5 pr-3 font-mono">{u.subscriptionPlan}</td>
                    <td className="py-2.5 pr-3">
                      {u.suspended ? 'Suspended' : u.verifiedBadge ? 'Verified' : 'Active'}
                    </td>
                    <td className="py-2.5 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          handleModerateUser(u.userKey, { verifiedBadge: !u.verifiedBadge })
                        }
                        className="px-2.5 py-1 rounded border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-semibold"
                      >
                        {u.verifiedBadge ? 'Unverify' : 'Verify'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleModerateUser(u.userKey, { suspended: !u.suspended })}
                        className="px-2.5 py-1 rounded border border-amber-500/40 text-amber-700 dark:text-amber-300 font-semibold"
                      >
                        {u.suspended ? 'Restore' : 'Suspend'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Job Moderation + Scam Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            <span>Employer Job Approvals ({jobs.length})</span>
          </h2>
          <div className="space-y-3 text-xs">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="rounded-xl bg-[#F4F7FB] dark:bg-[#05070B] p-3.5 flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <p className="font-bold text-[#0B2545] dark:text-white">
                    {job.companyName} — {job.roleTitle}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Status: <strong>{job.status}</strong> · {job.employmentType}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleModerateJob(job.id, 'Approved')}
                    className="px-2.5 py-1 rounded bg-emerald-600 text-white font-semibold"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModerateJob(job.id, 'Rejected')}
                    className="px-2.5 py-1 rounded border border-slate-300 dark:border-[#1E3A5F]/70 font-semibold"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span>Job Scam & Abuse Reports ({scamReports.length})</span>
          </h2>
          <div className="space-y-3 text-xs">
            {scamReports.map((rep) => (
              <div key={rep.id} className="rounded-xl bg-[#F4F7FB] dark:bg-[#05070B] p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#0B2545] dark:text-white">
                    {rep.companyName} · Risk {rep.riskScore}/100
                  </span>
                  <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                    {rep.resolution}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300">{rep.reason}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleResolveScam(rep.id, 'Flagged & Removed')}
                    className="px-2.5 py-1 rounded bg-amber-600 text-white font-semibold"
                  >
                    Flag & Remove
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResolveScam(rep.id, 'Verified Legitimate')}
                    className="px-2.5 py-1 rounded border border-slate-300 dark:border-[#1E3A5F]/70 font-semibold"
                  >
                    Mark Safe
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Add Course + Broadcast Announcement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form
          onSubmit={handleAddCourse}
          className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-3 text-xs"
        >
          <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            <span>Publish New Course ({courses.length} active)</span>
          </h2>
          <input
            type="text"
            value={newCourseTitle}
            onChange={(e) => setNewCourseTitle(e.target.value)}
            placeholder="Course Title (e.g. System Design Interview Masterclass)"
            className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-slate-900 dark:text-white"
          />
          <input
            type="text"
            value={newCourseTech}
            onChange={(e) => setNewCourseTech(e.target.value)}
            placeholder="Primary Technology"
            className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-slate-900 dark:text-white"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold bg-[#0B2545] text-white dark:bg-[#1D4ED8]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Course to Catalog</span>
          </button>
        </form>

        <form
          onSubmit={handleBroadcast}
          className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-3 text-xs"
        >
          <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-emerald-600 dark:text-amber-400" />
            <span>Broadcast Platform Announcement</span>
          </h2>
          <input
            type="text"
            value={announceTitle}
            onChange={(e) => setAnnounceTitle(e.target.value)}
            placeholder="Announcement Headline..."
            className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-slate-900 dark:text-white"
          />
          <textarea
            rows={2}
            value={announceBody}
            onChange={(e) => setAnnounceBody(e.target.value)}
            placeholder="Message shown across Notification Center..."
            className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-slate-900 dark:text-white"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Publish Announcement
          </button>
        </form>
      </div>
    </div>
  );
}

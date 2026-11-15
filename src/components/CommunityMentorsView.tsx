import { useEffect, useState } from 'react';
import {
  Award,
  Calendar,
  Copy,
  Flag,
  MessageSquare,
  Send,
  ThumbsDown,
  ThumbsUp,
  Trophy,
  Users,
} from 'lucide-react';
import { MENTOR_STAFF } from '../data/careerData';
import { MENTOR_SLOTS_DEFAULT } from '../data/projectsCatalog';
import type { CommunityPost, MentorBooking, UserProfile } from '../types';

interface CommunityMentorsViewProps {
  profile: UserProfile;
  sessionToken?: string;
  onRequireAuth: (reason: string) => boolean;
}

export function CommunityMentorsView({
  profile,
  sessionToken,
  onRequireAuth,
}: CommunityMentorsViewProps) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [bookings, setBookings] = useState<MentorBooking[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [postCategory, setPostCategory] = useState<CommunityPost['category']>('Q&A');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const [selectedMentorId, setSelectedMentorId] = useState(MENTOR_STAFF[0].id);
  const [bookingSlot, setBookingSlot] = useState(MENTOR_SLOTS_DEFAULT[0]);
  const [bookingTopic, setBookingTopic] = useState('Portfolio & Career Readiness Review');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [copiedReferral, setCopiedReferral] = useState(false);

  useEffect(() => {
    fetch('/api/community/posts')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { posts?: CommunityPost[] } | null) => {
        if (d?.posts) setPosts(d.posts);
      })
      .catch(() => {});

    if (sessionToken) {
      fetch('/api/mentors/bookings', {
        headers: { 'x-voragen-token': sessionToken },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { bookings?: MentorBooking[] } | null) => {
          if (d?.bookings) setBookings(d.bookings);
        })
        .catch(() => {});
    }
  }, [sessionToken]);

  const handlePublishPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onRequireAuth('publish a discussion post in the community')) return;
    if (!postTitle.trim() || !postBody.trim()) return;
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'x-voragen-token': sessionToken } : {}),
        },
        body: JSON.stringify({
          title: postTitle,
          body: postBody,
          category: postCategory,
          tags: [postCategory, 'VoraGen'],
        }),
      });
      const data = (await res.json()) as { post?: CommunityPost; error?: string };
      if (res.ok && data.post) {
        setPosts((prev) => [data.post!, ...prev]);
        setPostTitle('');
        setPostBody('');
        setStatusNotice('Discussion published to VoraGen Community!');
      } else {
        setStatusNotice(data.error || 'Could not publish post.');
      }
    } catch {
      setStatusNotice('Network unavailable.');
    }
  };

  const handleVote = async (postId: string, direction: 'up' | 'down') => {
    try {
      const res = await fetch(`/api/community/posts/${postId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });
      const data = (await res.json()) as { post?: CommunityPost };
      if (res.ok && data.post) {
        setPosts((prev) => prev.map((p) => (p.id === postId ? data.post! : p)));
      }
    } catch {
      // Ignore vote error
    }
  };

  const handleReply = async (postId: string) => {
    if (!onRequireAuth('reply to a community discussion')) return;
    const text = (replyDrafts[postId] || '').trim();
    if (!text) return;
    try {
      const res = await fetch(`/api/community/posts/${postId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'x-voragen-token': sessionToken } : {}),
        },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json()) as { post?: CommunityPost };
      if (res.ok && data.post) {
        setPosts((prev) => prev.map((p) => (p.id === postId ? data.post! : p)));
        setReplyDrafts((prev) => ({ ...prev, [postId]: '' }));
      }
    } catch {
      // Ignore network errors
    }
  };

  const handleReportPost = async (postId: string) => {
    try {
      await fetch(`/api/community/posts/${postId}/report`, { method: 'POST' });
      setStatusNotice('Post flagged for VoraGen Admin moderation review.');
    } catch {
      // Ignore
    }
  };

  const handleBookMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onRequireAuth('schedule a 1:1 mentor session')) return;
    const mentor = MENTOR_STAFF.find((m) => m.id === selectedMentorId) || MENTOR_STAFF[0];
    try {
      const res = await fetch('/api/mentors/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'x-voragen-token': sessionToken } : {}),
        },
        body: JSON.stringify({
          mentorId: mentor.id,
          mentorName: mentor.name,
          topic: bookingTopic,
          slot: bookingSlot,
        }),
      });
      const data = (await res.json()) as { booking?: MentorBooking; error?: string };
      if (res.ok && data.booking) {
        setBookings((prev) => [data.booking!, ...prev]);
        setStatusNotice(`Booked 1:1 session with ${mentor.name} for ${bookingSlot}.`);
      } else {
        setStatusNotice(data.error || 'Could not schedule mentor session.');
      }
    } catch {
      setStatusNotice('Unable to reach mentor scheduler.');
    }
  };

  const visiblePosts =
    categoryFilter === 'All' ? posts : posts.filter((p) => p.category === categoryFilter);

  const userLevel = Math.max(1, Math.floor(profile.streakPoints / 100) + 1);
  const referralCode =
    profile.referralCode || `VORA-${(profile.name || 'JOIN').replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() || '2026'}`;

  const leaderboard = [
    { name: profile.name || 'You', points: profile.streakPoints, streak: profile.streakDays },
    { name: 'Ananya Nair', points: 480, streak: 14 },
    { name: 'Karthik Rao', points: 410, streak: 11 },
    { name: 'Diya Menon', points: 365, streak: 9 },
  ].sort((a, b) => b.points - a.points);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
            Community Forum, 1:1 Mentors & Leaderboard
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Collaborate in Q&A, study groups & webinars, book live 1:1 mentor guidance, and climb global XP rankings.
          </p>
        </div>

        <div className="font-mono text-xs tabular-nums text-emerald-700 dark:text-amber-400">
          Level {userLevel} · {profile.streakPoints} XP · {profile.streakDays}d Streak
        </div>
      </div>

      {statusNotice && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-900 dark:text-emerald-200"
        >
          {statusNotice}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Q&A Forum & Study Groups */}
        <div className="lg:col-span-7 space-y-5">
          <form
            onSubmit={handlePublishPost}
            className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-5 space-y-3"
          >
            <h2 className="font-display text-base font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
              <span>Start a Discussion, Study Group or Project Showcase</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder="Discussion headline..."
                className="sm:col-span-2 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
              <select
                aria-label="Discussion category"
                value={postCategory}
                onChange={(e) => setPostCategory(e.target.value as CommunityPost['category'])}
                className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs text-slate-900 dark:text-white"
              >
                <option value="Q&A">Q&A</option>
                <option value="Study Group">Study Group</option>
                <option value="Project Showcase">Project Showcase</option>
                <option value="Career Advice">Career Advice</option>
                <option value="Webinar">Webinar</option>
              </select>
            </div>
            <textarea
              rows={2}
              value={postBody}
              onChange={(e) => setPostBody(e.target.value)}
              placeholder="Ask a doubt, invite teammates, or share project learnings..."
              className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-xs text-slate-900 dark:text-white"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Community Guidelines: Keep feedback constructive, technical, and spam-free.
              </span>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#0B2545] text-white dark:bg-[#1D4ED8]"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Publish Post</span>
              </button>
            </div>
          </form>

          <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-[#F4F7FB] dark:bg-[#0A1628] border border-slate-200 dark:border-[#1E3A5F]/60 w-fit">
            {['All', 'Q&A', 'Study Group', 'Project Showcase', 'Webinar'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-md text-xs font-medium ${
                  categoryFilter === cat
                    ? 'bg-white dark:bg-[#1D4ED8] text-[#0B2545] dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {visiblePosts.map((post) => (
              <article
                key={post.id}
                className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold text-emerald-700 dark:text-amber-400">
                      {post.category} · {post.authorName} ({post.authorRole})
                    </p>
                    <h3 className="mt-1 font-display text-sm font-bold text-[#0B2545] dark:text-white">
                      {post.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleVote(post.id, 'up')}
                      aria-label={`Upvote ${post.title}`}
                      className="p-1.5 rounded-md border border-slate-200 dark:border-[#1E3A5F]/70 text-emerald-700 dark:text-emerald-300"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-xs font-bold tabular-nums px-1.5">
                      {post.votes}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleVote(post.id, 'down')}
                      aria-label={`Downvote ${post.title}`}
                      className="p-1.5 rounded-md border border-slate-200 dark:border-[#1E3A5F]/70 text-slate-500"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReportPost(post.id)}
                      aria-label={`Report ${post.title}`}
                      className="p-1.5 rounded-md text-slate-400 hover:text-amber-600"
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{post.body}</p>

                {post.replies.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-white/10">
                    {post.replies.map((rep) => (
                      <div key={rep.id} className="text-xs text-slate-600 dark:text-slate-300">
                        <strong className="text-[#0B2545] dark:text-white">{rep.authorName}:</strong> {rep.text}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={replyDrafts[post.id] || ''}
                    onChange={(e) =>
                      setReplyDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                    }
                    placeholder="Write an answer or comment..."
                    className="flex-1 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleReply(post.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0B2545] text-white dark:bg-[#1D4ED8]"
                  >
                    Reply
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Right Column: Mentor Booking + Leaderboard & Referral */}
        <div className="lg:col-span-5 space-y-6">
          <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Book 1:1 Career & Technical Mentor</span>
            </h2>
            <form onSubmit={handleBookMentor} className="space-y-3 text-xs">
              <select
                aria-label="Choose a mentor"
                value={selectedMentorId}
                onChange={(e) => setSelectedMentorId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-slate-900 dark:text-white"
              >
                {MENTOR_STAFF.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.role}
                  </option>
                ))}
              </select>
              <select
                aria-label="Choose session slot"
                value={bookingSlot}
                onChange={(e) => setBookingSlot(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-slate-900 dark:text-white"
              >
                {MENTOR_SLOTS_DEFAULT.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={bookingTopic}
                onChange={(e) => setBookingTopic(e.target.value)}
                placeholder="Session focus topic..."
                className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Calendar className="w-4 h-4" />
                <span>Confirm Mentor Session</span>
              </button>
            </form>

            {bookings.length > 0 && (
              <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-2 text-xs">
                <p className="font-semibold text-[#0B2545] dark:text-white">Your Booked Sessions:</p>
                {bookings.map((b) => (
                  <div key={b.id} className="rounded-lg bg-[#F4F7FB] dark:bg-[#05070B] p-2.5">
                    <p className="font-bold text-[#0B2545] dark:text-white">{b.mentorName}</p>
                    <p className="text-slate-600 dark:text-slate-300">
                      {b.slot} · {b.topic} ({b.status})
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <span>Global XP Leaderboard & Challenges</span>
            </h2>
            <div className="divide-y divide-slate-200 dark:divide-white/10 text-xs">
              {leaderboard.map((row, idx) => (
                <div key={`${row.name}-${idx}`} className="py-2 flex items-center justify-between gap-2">
                  <span className="font-semibold text-[#0B2545] dark:text-white">
                    #{idx + 1} · {row.name}
                  </span>
                  <span className="font-mono tabular-nums text-emerald-700 dark:text-amber-400">
                    {row.points} XP · {row.streak}d streak
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-[#F4F7FB] dark:bg-[#05070B] p-4 space-y-2 text-xs">
              <p className="font-semibold text-[#0B2545] dark:text-white flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
                <span>Referral Program (10% Scholarship Discount)</span>
              </p>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-sm text-[#0B2545] dark:text-amber-300">
                  {referralCode}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(referralCode).catch(() => {});
                    setCopiedReferral(true);
                    setTimeout(() => setCopiedReferral(false), 2000);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-300 dark:border-[#1E3A5F]/70 font-semibold"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedReferral ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Referred Friends: {profile.referredUsersCount || 0} · Use REFER10 in Pricing & Billing.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

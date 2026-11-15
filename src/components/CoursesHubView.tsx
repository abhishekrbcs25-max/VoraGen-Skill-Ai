import { useMemo, useState } from 'react';
import {
  Bookmark,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Globe,
  HardDriveDownload,
  Play,
  SlidersHorizontal,
  Star,
  User,
} from 'lucide-react';
import { COURSES_CATALOG } from '../data/coursesCatalog';
import type { CareerRole, CourseItem, CourseLesson, StudyLanguage, UserProfile } from '../types';
import { sanitizeExternalUrl } from '../utils/validation';

interface CoursesHubViewProps {
  profile: UserProfile;
  targetRole: CareerRole;
  dailyStudyMinutes: number;
  courses?: CourseItem[];
  onUpdateProfile: (next: UserProfile) => void;
  onRequireAuth: (reason: string) => boolean;
  onNavigateRoadmap?: () => void;
  initialCourseId?: string;
}

const LANGUAGES: StudyLanguage[] = ['English', 'Tamil', 'Malayalam', 'Hindi', 'Spanish'];
const PLAYBACK_SPEEDS = ['0.75x', '1.0x', '1.25x', '1.5x', '2.0x'];

export function CoursesHubView({
  profile,
  targetRole,
  dailyStudyMinutes,
  courses: propCourses,
  onUpdateProfile,
  onRequireAuth,
  onNavigateRoadmap,
  initialCourseId,
}: CoursesHubViewProps) {
  const catalog = propCourses && propCourses.length > 0 ? propCourses : COURSES_CATALOG;
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<'All' | CourseItem['level']>('All');
  const [pricingFilter, setPricingFilter] = useState<'All' | 'Free' | 'Paid'>('All');
  const [spotlightFilter, setSpotlightFilter] = useState<'All' | 'Trending' | 'Popular' | 'New' | 'Recommended'>('All');
  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourseId || catalog[0].id);
  const [selectedLessonId, setSelectedLessonId] = useState<string>(catalog[0].lessons[0].id);
  const [playbackSpeed, setPlaybackSpeed] = useState('1.0x');
  const [studyLanguage, setStudyLanguage] = useState<StudyLanguage>(profile.preferredStudyLanguage || 'English');
  const [lessonQuizSelection, setLessonQuizSelection] = useState<number | null>(null);
  const [lessonQuizFeedback, setLessonQuizFeedback] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const recommendedSkillNames = useMemo(
    () => new Set(targetRole.requiredSkills.map((s) => s.name.toLowerCase())),
    [targetRole.requiredSkills],
  );

  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((course) => {
      if (levelFilter !== 'All' && course.level !== levelFilter) return false;
      if (pricingFilter !== 'All' && course.pricing !== pricingFilter) return false;
      if (spotlightFilter === 'Trending' && !course.trending) return false;
      if (spotlightFilter === 'Popular' && !course.popular) return false;
      if (spotlightFilter === 'New' && !course.newlyAdded) return false;
      if (
        spotlightFilter === 'Recommended' &&
        !Array.from(recommendedSkillNames).some((sk) =>
          `${course.title} ${course.technology} ${course.category}`.toLowerCase().includes(sk.split(' ')[0]),
        )
      ) {
        return false;
      }
      if (!q) return true;
      return `${course.title} ${course.category} ${course.technology} ${course.industry}`
        .toLowerCase()
        .includes(q);
    });
  }, [catalog, search, levelFilter, pricingFilter, spotlightFilter, recommendedSkillNames]);

  const activeCourse = useMemo(
    () => catalog.find((c) => c.id === selectedCourseId) || filteredCourses[0] || catalog[0],
    [catalog, selectedCourseId, filteredCourses],
  );

  const activeLesson: CourseLesson = useMemo(
    () => activeCourse.lessons.find((l) => l.id === selectedLessonId) || activeCourse.lessons[0],
    [activeCourse, selectedLessonId],
  );

  const enrolledSet = new Set(profile.enrolledCourseIds || []);
  const completedLessonsSet = new Set(profile.completedLessonIds || []);
  const bookmarkedLessonsSet = new Set(profile.bookmarkedLessonIds || []);
  const offlineSet = new Set(profile.offlineCourseIds || []);

  const totalLessonsInActive = activeCourse.lessons.length;
  const completedInActive = activeCourse.lessons.filter((l) => completedLessonsSet.has(l.id)).length;
  const activeCompletionPct = totalLessonsInActive
    ? Math.round((completedInActive / totalLessonsInActive) * 100)
    : 0;

  const totalCompletedAll = completedLessonsSet.size;
  const dailyGoalPct = Math.min(100, Math.round(((totalCompletedAll * 20) / Math.max(15, dailyStudyMinutes)) * 100));

  const handleSelectCourse = (course: CourseItem) => {
    setSelectedCourseId(course.id);
    const resumeLesson =
      course.lessons.find((l) => !completedLessonsSet.has(l.id)) || course.lessons[0];
    setSelectedLessonId(resumeLesson.id);
    setLessonQuizSelection(null);
    setLessonQuizFeedback(null);
  };

  const handleEnrollCourse = (courseId: string) => {
    if (!onRequireAuth('enroll and save your course progress')) return;
    if (enrolledSet.has(courseId)) return;
    onUpdateProfile({
      ...profile,
      enrolledCourseIds: [...(profile.enrolledCourseIds || []), courseId],
    });
    setStatusNotice(`Enrolled in "${activeCourse.title}". Resume anytime from your dashboard.`);
  };

  const handleToggleOfflineCache = (courseId: string) => {
    if (!onRequireAuth('save courses for offline study')) return;
    const next = offlineSet.has(courseId)
      ? (profile.offlineCourseIds || []).filter((id) => id !== courseId)
      : [...(profile.offlineCourseIds || []), courseId];
    onUpdateProfile({ ...profile, offlineCourseIds: next });
    setStatusNotice(
      offlineSet.has(courseId)
        ? 'Removed offline lesson package.'
        : 'Saved lessons, PDFs & eBook notes for Offline Study Mode.',
    );
  };

  const handleToggleCompleteLesson = (lessonId: string) => {
    if (!onRequireAuth('track lesson completion and study streaks')) return;
    const next = completedLessonsSet.has(lessonId)
      ? (profile.completedLessonIds || []).filter((id) => id !== lessonId)
      : [...(profile.completedLessonIds || []), lessonId];
    const enrolled = enrolledSet.has(activeCourse.id)
      ? profile.enrolledCourseIds || []
      : [...(profile.enrolledCourseIds || []), activeCourse.id];
    onUpdateProfile({
      ...profile,
      enrolledCourseIds: enrolled,
      completedLessonIds: next,
      streakPoints: profile.streakPoints + (completedLessonsSet.has(lessonId) ? 0 : 10),
    });
  };

  const handleToggleBookmarkLesson = (lessonId: string) => {
    if (!onRequireAuth('bookmark lessons')) return;
    const next = bookmarkedLessonsSet.has(lessonId)
      ? (profile.bookmarkedLessonIds || []).filter((id) => id !== lessonId)
      : [...(profile.bookmarkedLessonIds || []), lessonId];
    onUpdateProfile({ ...profile, bookmarkedLessonIds: next });
  };

  const handleSaveNote = (lessonId: string, note: string) => {
    if (!onRequireAuth('save personal lesson notes')) return;
    onUpdateProfile({
      ...profile,
      lessonNotes: {
        ...(profile.lessonNotes || {}),
        [lessonId]: note,
      },
    });
  };

  const handleDownloadNotes = (lesson: CourseLesson) => {
    const content = [
      `VoraGen Study Material — ${lesson.pdfTitle}`,
      `Course: ${activeCourse.title} (${activeCourse.instructor.name})`,
      `Lesson: ${lesson.title} (${lesson.format})`,
      '',
      `Multilingual Summary (${studyLanguage}):`,
      lesson.translations[studyLanguage] || lesson.summary,
      '',
      `eBook Reference: ${lesson.ebookChapter}`,
      `Practical Exercise: ${lesson.practicalExercise}`,
      lesson.codeExample ? `\nCode Example:\n${lesson.codeExample}` : '',
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = lesson.pdfTitle.replace(/\.pdf$/i, '.txt');
    link.click();
    URL.revokeObjectURL(url);
    setStatusNotice(`Downloaded study notes for "${lesson.title}".`);
  };

  const handleCheckLessonQuiz = () => {
    if (lessonQuizSelection === null) return;
    if (lessonQuizSelection === activeLesson.quizQuestion.correctIndex) {
      setLessonQuizFeedback('Correct answer verified! Lesson readiness boosted.');
      if (profile.isSignedIn && !completedLessonsSet.has(activeLesson.id)) {
        handleToggleCompleteLesson(activeLesson.id);
      }
    } else {
      setLessonQuizFeedback('Review the summary and code snippet above, then try another option.');
    }
  };

  const safeExternalUrl = sanitizeExternalUrl(activeLesson.externalResourceUrl);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
            Online Courses & Interactive Learning Hub
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Free & paid structured courses with recorded classes, live sessions, offline packs, multilingual summaries, and lesson quizzes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateRoadmap && (
            <button
              type="button"
              onClick={onNavigateRoadmap}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-[#1E3A5F]/70 text-[#0B2545] dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5 whitespace-nowrap"
            >
              Adaptive Remedial Roadmap
            </button>
          )}
          <div className="text-right font-mono text-xs tabular-nums text-emerald-700 dark:text-amber-400">
            {totalCompletedAll} Lessons Done · Daily Goal {dailyGoalPct}%
          </div>
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

      {/* Search & Filter Toolbar */}
      <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label htmlFor="course-search" className="sr-only">
              Search courses by technology or industry
            </label>
            <input
              id="course-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search React, SQL, Kubernetes, Cybersecurity, AI..."
              className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3.5 py-2 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <select
            aria-label="Filter by difficulty level"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as 'All' | CourseItem['level'])}
            className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
          >
            <option value="All">All Difficulty Levels</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>

          <select
            aria-label="Filter by pricing"
            value={pricingFilter}
            onChange={(e) => setPricingFilter(e.target.value as 'All' | 'Free' | 'Paid')}
            className="rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] px-3 py-2 text-sm text-slate-900 dark:text-white"
          >
            <option value="All">Free & Paid Courses</option>
            <option value="Free">Free Courses Only</option>
            <option value="Paid">Pro / Paid Courses</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-[#F4F7FB] dark:bg-[#05070B] border border-slate-200 dark:border-[#1E3A5F]/60">
            {(['All', 'Recommended', 'Trending', 'Popular', 'New'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setSpotlightFilter(tab)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  spotlightFilter === tab
                    ? 'bg-white dark:bg-[#1D4ED8] text-[#0B2545] dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-[#0B2545] dark:hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="tabular-nums">{filteredCourses.length} courses matching</span>
          </div>
        </div>
      </section>

      {/* Course Catalog + Interactive Player Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Course Catalog Cards */}
        <div className="lg:col-span-5 space-y-3">
          {filteredCourses.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              No courses match your filters. Reset filters to view all tracks.
            </div>
          ) : (
            filteredCourses.map((course) => {
              const isSelected = course.id === activeCourse.id;
              const isEnrolled = enrolledSet.has(course.id);
              const doneCount = course.lessons.filter((l) => completedLessonsSet.has(l.id)).length;
              return (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => handleSelectCourse(course)}
                  className={`w-full text-left rounded-2xl border p-4 transition-colors ${
                    isSelected
                      ? 'border-[#0B2545] dark:border-amber-400 bg-[#F4F7FB] dark:bg-[#0F213E]'
                      : 'border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] hover:border-[#0B2545]/50 dark:hover:border-amber-400/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>
                      {course.category} · {course.level} · {course.pricing === 'Free' ? 'Free' : `$${course.priceUsd}`}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums text-amber-700 dark:text-amber-400 font-semibold">
                      <Star className="w-3 h-3 fill-current" />
                      {course.rating.toFixed(1)}
                    </span>
                  </div>
                  <h2 className="mt-1.5 font-display text-sm font-bold text-[#0B2545] dark:text-white">
                    {course.title}
                  </h2>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    {course.instructor.name} · {course.durationHours}h · {course.lessons.length} lessons
                    {isEnrolled ? ` · ${doneCount}/${course.lessons.length} done` : ''}
                  </p>
                </button>
              );
            })
          )}
        </div>

        {/* Course Details & Interactive Lesson Player */}
        <section className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-emerald-700 dark:text-amber-400">
                {activeCourse.technology} · {activeCourse.industry} · {activeCourse.durationHours} Hours
              </p>
              <h2 className="font-display text-xl font-bold text-[#0B2545] dark:text-white">
                {activeCourse.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {activeCourse.instructor.name} ({activeCourse.instructor.title})
                </span>
                {activeCourse.expiresInDays && (
                  <span>· Access valid {activeCourse.expiresInDays} days</span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleToggleOfflineCache(activeCourse.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                  offlineSet.has(activeCourse.id)
                    ? 'border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                    : 'border-slate-300 dark:border-[#1E3A5F]/70 text-slate-700 dark:text-slate-200'
                }`}
              >
                <HardDriveDownload className="w-3.5 h-3.5" />
                <span>{offlineSet.has(activeCourse.id) ? 'Saved Offline' : 'Offline Pack'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleEnrollCourse(activeCourse.id)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] transition-colors whitespace-nowrap"
              >
                {enrolledSet.has(activeCourse.id)
                  ? `Enrolled (${activeCompletionPct}%)`
                  : activeCourse.pricing === 'Free'
                    ? 'Enroll Free'
                    : 'Start Course'}
              </button>
            </div>
          </div>

          {/* Prerequisites & Learning Outcomes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <h3 className="font-semibold text-[#0B2545] dark:text-white">Syllabus & Prerequisites</h3>
              <p className="text-slate-600 dark:text-slate-300">
                Prerequisites: {activeCourse.prerequisites.join(' · ')}
              </p>
              <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                {activeCourse.syllabus.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-1.5">
              <h3 className="font-semibold text-[#0B2545] dark:text-white">Learning Outcomes</h3>
              <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                {activeCourse.learningOutcomes.map((o) => (
                  <li key={o}>• {o}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Interactive Lesson Selector Tabs */}
          <div className="space-y-2 border-t border-slate-200 dark:border-white/10 pt-4">
            <h3 className="text-xs font-semibold text-[#0B2545] dark:text-white">
              Lessons ({completedInActive}/{totalLessonsInActive} completed)
            </h3>
            <div className="flex flex-wrap gap-2">
              {activeCourse.lessons.map((lesson, idx) => {
                const isLessonActive = lesson.id === activeLesson.id;
                const isDone = completedLessonsSet.has(lesson.id);
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => {
                      setSelectedLessonId(lesson.id);
                      setLessonQuizSelection(null);
                      setLessonQuizFeedback(null);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      isLessonActive
                        ? 'bg-[#0B2545] text-white border-[#0B2545] dark:bg-[#1D4ED8] dark:border-[#1D4ED8]'
                        : isDone
                          ? 'border-emerald-500/40 bg-emerald-50/70 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                          : 'border-slate-200 dark:border-[#1E3A5F]/60 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <Play className="w-3 h-3" />
                    <span>
                      {idx + 1}. {lesson.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Lesson Player & Multilingual Materials */}
          <div className="rounded-xl bg-[#F4F7FB] dark:bg-[#05070B] border border-slate-200 dark:border-[#1E3A5F]/60 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-medium text-emerald-700 dark:text-amber-400">
                  {activeLesson.format} · {activeLesson.durationMinutes} min · {activeLesson.slidesCount} Slides
                  {activeLesson.liveSchedule ? ` · Live: ${activeLesson.liveSchedule}` : ''}
                </p>
                <h4 className="font-display text-base font-bold text-[#0B2545] dark:text-white mt-0.5">
                  {activeLesson.title}
                </h4>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="lesson-speed" className="sr-only">
                  Playback speed
                </label>
                <select
                  id="lesson-speed"
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(e.target.value)}
                  className="rounded-md border border-slate-300 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#0A1628] px-2 py-1 text-xs font-mono text-slate-800 dark:text-slate-100"
                >
                  {PLAYBACK_SPEEDS.map((sp) => (
                    <option key={sp} value={sp}>
                      {sp}
                    </option>
                  ))}
                </select>

                <label htmlFor="study-language" className="sr-only">
                  Study language
                </label>
                <select
                  id="study-language"
                  value={studyLanguage}
                  onChange={(e) => setStudyLanguage(e.target.value as StudyLanguage)}
                  className="rounded-md border border-slate-300 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#0A1628] px-2 py-1 text-xs text-slate-800 dark:text-slate-100"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => handleToggleBookmarkLesson(activeLesson.id)}
                  aria-label="Bookmark lesson"
                  className={`p-1.5 rounded-md border ${
                    bookmarkedLessonsSet.has(activeLesson.id)
                      ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                      : 'border-slate-300 dark:border-[#1E3A5F]/70 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                <span>Multilingual Lesson Notes ({studyLanguage})</span>
              </p>
              <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                {activeLesson.translations[studyLanguage] || activeLesson.summary}
              </p>
            </div>

            {activeLesson.codeExample && (
              <pre className="p-3 rounded-lg bg-[#05070B] text-emerald-300 font-mono text-xs overflow-x-auto">
                {activeLesson.codeExample}
              </pre>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
              <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-amber-400" />
                {activeLesson.ebookChapter} · Exercise: {activeLesson.practicalExercise}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadNotes(activeLesson)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-[#1E3A5F]/70 text-xs font-semibold text-[#0B2545] dark:text-white hover:bg-white dark:hover:bg-white/10"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF / Notes</span>
                </button>
                {safeExternalUrl && (
                  <a
                    href={safeExternalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#0B2545] dark:text-amber-400 hover:underline"
                  >
                    <span>Docs</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Interactive Lesson Quiz Check */}
            <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-2">
              <p className="text-xs font-semibold text-[#0B2545] dark:text-white">
                Quick Lesson Check: {activeLesson.quizQuestion.prompt}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeLesson.quizQuestion.options.map((opt, idx) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setLessonQuizSelection(idx)}
                    className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                      lessonQuizSelection === idx
                        ? 'border-[#0B2545] dark:border-amber-400 bg-white dark:bg-[#0F213E] font-semibold'
                        : 'border-slate-200 dark:border-[#1E3A5F]/60 bg-white/70 dark:bg-[#0A1628]'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCheckLessonQuiz}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Verify Answer
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleCompleteLesson(activeLesson.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    completedLessonsSet.has(activeLesson.id)
                      ? 'bg-emerald-600/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40'
                      : 'bg-[#0B2545] text-white dark:bg-[#1D4ED8]'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {completedLessonsSet.has(activeLesson.id) ? 'Lesson Completed' : 'Mark Lesson Complete'}
                  </span>
                </button>
              </div>
              {lessonQuizFeedback && (
                <p className="text-xs font-medium text-emerald-700 dark:text-amber-300">
                  {lessonQuizFeedback}
                </p>
              )}
            </div>

            {/* Personal Lesson Notes */}
            <div className="pt-3 border-t border-slate-200 dark:border-white/10">
              <label
                htmlFor="personal-lesson-note"
                className="block text-xs font-semibold text-[#0B2545] dark:text-white mb-1"
              >
                My Personal Study Notes
              </label>
              <textarea
                id="personal-lesson-note"
                rows={2}
                value={profile.lessonNotes?.[activeLesson.id] || ''}
                onChange={(e) => handleSaveNote(activeLesson.id, e.target.value)}
                placeholder="Write revision takeaways for this lesson..."
                className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#0A1628] px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Learner Reviews */}
          {activeCourse.reviews.length > 0 && (
            <div className="border-t border-slate-200 dark:border-white/10 pt-4 space-y-2">
              <h3 className="text-xs font-semibold text-[#0B2545] dark:text-white flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Verified Learner Reviews ({activeCourse.reviewsCount})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeCourse.reviews.map((rev, i) => (
                  <div
                    key={`${rev.author}-${i}`}
                    className="rounded-lg bg-[#F4F7FB] dark:bg-[#05070B] p-3 text-xs space-y-1"
                  >
                    <p className="font-semibold text-[#0B2545] dark:text-white">
                      {rev.author} · {rev.rating}/5 · {rev.date}
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">{rev.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Learning History Summary */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-white/10 pt-3">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Daily Target: {dailyStudyMinutes} mins/day
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Enrolled Courses: {enrolledSet.size} · Bookmarks: {bookmarkedLessonsSet.size}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}

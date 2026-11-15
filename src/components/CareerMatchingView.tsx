import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Compass, Search, Target } from 'lucide-react';
import { searchCareerRoles } from '../data/careerRolesCatalog';
import { calculateSkillMatch } from '../utils/skillEngine';
import type { CareerRole, SkillMatchBreakdown, UserProfile } from '../types';

interface CareerMatchingViewProps {
  profile: UserProfile;
  roles: CareerRole[];
  activeRole: CareerRole;
  activeMatch: SkillMatchBreakdown;
  onSelectCareerGoal: (roleId: string) => void;
  initialRoleId?: string;
}

export function CareerMatchingView({
  profile,
  roles,
  activeRole,
  activeMatch,
  onSelectCareerGoal,
  initialRoleId,
}: CareerMatchingViewProps) {
  const [previewRoleId, setPreviewRoleId] = useState<string>(initialRoleId || activeRole.id);
  const [searchInput, setSearchInput] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState('ALL');
  const [showAllMatches, setShowAllMatches] = useState(false);

  useEffect(() => {
    if (initialRoleId && roles.some((r) => r.id === initialRoleId)) {
      setPreviewRoleId(initialRoleId);
    }
  }, [initialRoleId, roles]);

  const domains = useMemo(
    () => Array.from(new Set(roles.map((r) => r.domain))).sort(),
    [roles],
  );

  const filteredRoles = useMemo(
    () => searchCareerRoles(roles, appliedQuery, domainFilter),
    [roles, appliedQuery, domainFilter],
  );

  const isFiltering = Boolean(appliedQuery.trim()) || domainFilter !== 'ALL';
  const visibleRoles = useMemo(() => {
    if (showAllMatches || isFiltering || filteredRoles.length <= 18) {
      return filteredRoles;
    }
    const base = filteredRoles.slice(0, 18);
    if (!base.some((r) => r.id === activeRole.id)) {
      const foundActive = filteredRoles.find((r) => r.id === activeRole.id);
      if (foundActive) base.unshift(foundActive);
    }
    return base;
  }, [filteredRoles, showAllMatches, isFiltering, activeRole.id]);

  const previewRole = roles.find((r) => r.id === previewRoleId) ?? activeRole;
  const previewMatch = calculateSkillMatch(
    profile.skills,
    previewRole,
    profile.certifications,
    profile.projects,
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedQuery(searchInput);
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 dark:border-white/10 pb-5">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
          Career Matching & What-If Pivot Simulator
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Search {roles.length} industry career goals, compare verified skill readiness, and switch tracks instantaneously.
        </p>
      </div>

      {/* Career Goal Search + Filter Controls */}
      <form
        onSubmit={handleSearchSubmit}
        className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="career-goal-search"
            type="search"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              if (!e.target.value.trim()) setAppliedQuery('');
            }}
            placeholder="Search career goals by keyword (e.g., Robotics, FinTech, Kubernetes, GenAI, Security)..."
            aria-label="Search career goals by keyword"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] text-sm text-slate-900 dark:text-white"
          />
        </div>

        <select
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
          aria-label="Filter career goals by domain"
          className="sm:w-52 px-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-[#F4F7FB] dark:bg-[#05070B] text-sm text-slate-900 dark:text-white"
        >
          <option value="ALL">All Domains ({domains.length})</option>
          {domains.map((dom) => (
            <option key={dom} value={dom}>
              {dom}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] transition-colors whitespace-nowrap"
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
          </button>

          {(appliedQuery || searchInput || domainFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setAppliedQuery('');
                setDomainFilter('ALL');
              }}
              className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-[#1E3A5F]/70 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
            >
              Reset
            </button>
          )}
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
        <span>
          Showing <strong className="text-[#0B2545] dark:text-amber-400">{visibleRoles.length}</strong> of{' '}
          <strong className="text-[#0B2545] dark:text-white">{filteredRoles.length}</strong> matching career goals ({roles.length} total catalog)
        </span>
        {filteredRoles.length > 18 && !isFiltering && (
          <button
            type="button"
            onClick={() => setShowAllMatches((v) => !v)}
            className="font-semibold text-[#0B2545] dark:text-amber-400 hover:underline"
          >
            {showAllMatches ? 'Show Top 18 Roles' : `Show All ${filteredRoles.length} Career Goals`}
          </button>
        )}
      </div>

      {/* Role Cards Grid */}
      {visibleRoles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-8 text-center text-sm text-slate-600 dark:text-slate-400">
          No career goals matched &ldquo;{appliedQuery}&rdquo;. Try another keyword like AI, Cloud, Security, Mobile, or Data.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleRoles.map((role) => {
            const m = calculateSkillMatch(
              profile.skills,
              role,
              profile.certifications,
              profile.projects,
            );
            const isTarget = role.id === activeRole.id;
            const isPreview = role.id === previewRole.id;

            return (
              <div
                key={role.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between transition-colors ${
                  isTarget
                    ? 'border-[#0B2545] dark:border-[#1D4ED8] bg-[#F4F7FB] dark:bg-[#0F213E]'
                    : isPreview
                      ? 'border-amber-500 dark:border-amber-400 bg-white dark:bg-[#0A1628]'
                      : 'border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {role.domain} · {role.demandGrowth}
                      </p>
                      <h2 className="mt-1 font-display text-lg font-bold text-[#0B2545] dark:text-white">
                        {role.title}
                      </h2>
                    </div>
                    <span className="font-mono text-lg font-bold tabular-nums text-[#0B2545] dark:text-amber-400">
                      {m.overallReadinessPct}%
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {role.summary}
                  </p>

                  <div className="mt-3 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#0B2545] via-emerald-600 to-amber-500 dark:from-[#1D4ED8] dark:via-emerald-500 dark:to-amber-400"
                      style={{ width: `${m.overallReadinessPct}%` }}
                    />
                  </div>

                  <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                    {role.salaryRange} · ~{m.estimatedWeeksToReady} wks to ready
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewRoleId(role.id)}
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:underline"
                  >
                    Inspect Gap Matrix
                  </button>

                  {isTarget ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-amber-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Active Goal</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewRoleId(role.id);
                        onSelectCareerGoal(role.id);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] transition-colors"
                    >
                      <span>Set Career Goal</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed Side-by-Side Gap Breakdown for Inspected Role */}
      <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Compass className="w-5 h-5 text-[#0B2545] dark:text-amber-400" />
            <div>
              <h2 className="font-display text-lg font-bold text-[#0B2545] dark:text-white">
                Skill Gap Matrix: {previewRole.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {previewRole.id === activeRole.id
                  ? 'Currently active target career'
                  : `What-If Simulation (${previewMatch.overallReadinessPct}% match vs ${activeMatch.overallReadinessPct}% current goal)`}
              </p>
            </div>
          </div>

          {previewRole.id !== activeRole.id && (
            <button
              type="button"
              onClick={() => onSelectCareerGoal(previewRole.id)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB]"
            >
              <Target className="w-3.5 h-3.5" />
              <span>Switch & Recalculate AI Roadmap</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400">
                <th className="py-2.5 pr-4 font-medium">Required Skill</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 px-4 font-medium text-right">Current</th>
                <th className="py-2.5 px-4 font-medium text-right">Target</th>
                <th className="py-2.5 pl-4 font-medium w-48">Gap Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {previewMatch.matchedSkills.map((row) => (
                <tr key={row.name} className="hover:bg-slate-50 dark:hover:bg-white/5">
                  <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">
                    {row.name}
                  </td>
                  <td className="py-3 px-4 text-xs">
                    <span
                      className={`font-semibold ${
                        row.status === 'Mastered'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : row.status === 'In Progress'
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-[#0B2545] dark:text-sky-300'
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                    {row.currentLevel}%
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {row.targetLevel}%
                  </td>
                  <td className="py-3 pl-4">
                    <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          row.status === 'Mastered'
                            ? 'bg-emerald-600 dark:bg-emerald-500'
                            : row.status === 'In Progress'
                              ? 'bg-amber-500 dark:bg-amber-400'
                              : 'bg-[#0B2545] dark:bg-[#1D4ED8]'
                        }`}
                        style={{
                          width: `${Math.min(100, Math.round((row.currentLevel / row.targetLevel) * 100))}%`,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

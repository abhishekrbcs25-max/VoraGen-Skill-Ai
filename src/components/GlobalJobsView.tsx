import { useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  Building2,
  CheckCircle2,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Phone,
  Search,
} from 'lucide-react';
import {
  FLAGSHIP_COMPANIES,
  TOTAL_GLOBAL_COMPANIES,
  getCompanyByIndex,
  queryGlobalCompanies,
} from '../data/companiesCatalog';
import { calculateJobSkillMatchPct } from '../utils/skillEngine';
import { sanitizeExternalUrl } from '../utils/validation';
import { EmployerMapExplorer } from './EmployerMapExplorer';
import type { CompanyJob, UserProfile } from '../types';

interface GlobalJobsViewProps {
  profile: UserProfile;
  readinessPct: number;
  onApplyForJob: (company: CompanyJob, matchPct: number) => void;
  initialCompanyId?: string;
}

export function GlobalJobsView({
  profile,
  readinessPct,
  onApplyForJob,
  initialCompanyId,
}: GlobalJobsViewProps) {
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('All');
  const [workMode, setWorkMode] = useState<'All' | 'Remote' | 'Hybrid' | 'On-Site'>('All');
  const [page, setPage] = useState(1);
  const [selectedCompany, setSelectedCompany] = useState<CompanyJob | null>(null);

  useEffect(() => {
    if (!initialCompanyId) return;
    const flagship = FLAGSHIP_COMPANIES.find((c) => c.id === initialCompanyId);
    if (flagship) {
      setSelectedCompany(flagship);
      return;
    }
    const idxMatch = initialCompanyId.replace('co-global-', '');
    if (/^\d+$/.test(idxMatch)) {
      setSelectedCompany(getCompanyByIndex(parseInt(idxMatch, 10)));
    }
  }, [initialCompanyId]);

  const result = useMemo(
    () => queryGlobalCompanies({ search, country, workMode, page, pageSize: 12 }),
    [search, country, workMode, page],
  );

  const activeCompany = selectedCompany ?? result.items[0] ?? null;
  const appliedCompanyIds = new Set(profile.applications.map((a) => a.companyId));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
            Global Job Seeking & {TOTAL_GLOBAL_COMPANIES.toLocaleString()}+ Companies
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Skill-matched vacancies across global employers with verified company profiles, contact desks, and progress-tracked applications.
          </p>
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-300 tabular-nums">
          Readiness: <strong className="font-mono text-red-700 dark:text-amber-400">{readinessPct}%</strong> · Applied:{' '}
          <strong className="font-mono">{profile.applications.length}</strong>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search company, role, or skill (e.g., Google, Python, Stripe)"
            aria-label="Search global companies and jobs"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0E131F] text-sm text-slate-900 dark:text-white"
          />
        </div>

        <select
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by country"
          className="md:col-span-3 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0E131F] px-3 py-2 text-sm text-slate-900 dark:text-white"
        >
          <option value="All">All Countries (Global)</option>
          <option value="United States">United States</option>
          <option value="India">India</option>
          <option value="Germany">Germany</option>
          <option value="United Kingdom">United Kingdom</option>
          <option value="Canada">Canada</option>
          <option value="Australia">Australia</option>
          <option value="Singapore">Singapore</option>
        </select>

        <div className="md:col-span-4 flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#141B2D] border border-slate-200 dark:border-white/10">
          {(['All', 'Remote', 'Hybrid', 'On-Site'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setWorkMode(mode);
                setPage(1);
              }}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                workMode === mode
                  ? 'bg-white dark:bg-blue-600 text-red-700 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Google Maps & Geo-Hub Explorer */}
      <EmployerMapExplorer
        companies={result.items}
        activeCompany={activeCompany}
        onSelectCompany={(co) => setSelectedCompany(co)}
      />

      {/* Directory + Company Detail Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Companies List */}
        <section className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E131F] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{result.totalMatches.toLocaleString()} matching employers</span>
            <span className="font-mono tabular-nums">Page {page}</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-[560px] overflow-y-auto">
            {result.items.map((co) => {
              const skillMatch = calculateJobSkillMatchPct(profile.skills, co.requiredSkills);
              const isSelected = activeCompany?.id === co.id;
              const isApplied = appliedCompanyIds.has(co.id);

              return (
                <button
                  key={co.id}
                  type="button"
                  onClick={() => setSelectedCompany(co)}
                  className={`w-full text-left p-4 transition-colors flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-red-50/60 dark:bg-blue-500/15'
                      : 'hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Crisp SVG Company Emblem */}
                    <svg viewBox="0 0 44 44" className="w-11 h-11 shrink-0" aria-hidden="true">
                      <defs>
                        <linearGradient id={`grad-${co.id}`} x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={co.logoPrimary} />
                          <stop offset="100%" stopColor={co.logoSecondary} />
                        </linearGradient>
                      </defs>
                      <rect width="44" height="44" rx="10" fill={`url(#grad-${co.id})`} />
                      <text
                        x="22"
                        y="27"
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize={co.logoMonogram.length > 2 ? '11' : '15'}
                        fontWeight="700"
                        fontFamily="Outfit, sans-serif"
                      >
                        {co.logoMonogram}
                      </text>
                    </svg>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-bold text-slate-950 dark:text-white truncate">
                          {co.companyName}
                        </span>
                        {isApplied && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-amber-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                        {co.roleTitle}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {co.city}, {co.country} · {co.workMode}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`font-mono text-sm font-bold tabular-nums ${
                        skillMatch >= 60
                          ? 'text-emerald-700 dark:text-amber-400'
                          : 'text-red-700 dark:text-pink-400'
                      }`}
                    >
                      {skillMatch}% match
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{co.salary}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="px-4 py-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded border border-slate-300 dark:border-white/15 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded border border-slate-300 dark:border-white/15"
            >
              Next 12
            </button>
          </div>
        </section>

        {/* Active Company Details & Apply Card */}
        <section className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-6 space-y-5">
          {activeCompany ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <svg viewBox="0 0 56 56" className="w-14 h-14 shrink-0" aria-hidden="true">
                    <rect width="56" height="56" rx="14" fill={activeCompany.logoPrimary} />
                    <text
                      x="28"
                      y="34"
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize={activeCompany.logoMonogram.length > 2 ? '14' : '19'}
                      fontWeight="700"
                      fontFamily="Outfit, sans-serif"
                    >
                      {activeCompany.logoMonogram}
                    </text>
                  </svg>
                  <div>
                    <h2 className="font-display text-xl font-bold text-slate-950 dark:text-white">
                      {activeCompany.companyName}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {activeCompany.industry} · Founded {activeCompany.founded} · {activeCompany.employees} employees
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#141B2D] p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" /> Open Role
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-700 dark:text-amber-400 tabular-nums">
                    {calculateJobSkillMatchPct(profile.skills, activeCompany.requiredSkills)}% Skill Match
                  </span>
                </div>
                <p className="font-display text-base font-bold text-slate-950 dark:text-white">
                  {activeCompany.roleTitle}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {activeCompany.description}
                </p>
                <p className="text-xs font-mono text-slate-700 dark:text-slate-200 pt-1">
                  Compensation: {activeCompany.salary} · {activeCompany.workMode}
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <p className="font-semibold text-slate-900 dark:text-white">
                  Required Skills Checklist
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                  {activeCompany.requiredSkills.join(' · ')}
                </p>
              </div>

              {/* Official Contact & Location Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <MapPin className="w-4 h-4 text-red-600 dark:text-pink-400 shrink-0" />
                  <span>
                    {activeCompany.city}, {activeCompany.country}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-mono tabular-nums">
                  <Phone className="w-4 h-4 text-emerald-600 dark:text-amber-400 shrink-0" />
                  <span>{activeCompany.contactPhone}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="truncate">{activeCompany.contactEmail}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Globe className="w-4 h-4 text-slate-500 shrink-0" />
                  <a
                    href={sanitizeExternalUrl(activeCompany.website) ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate hover:underline text-blue-600 dark:text-blue-400"
                  >
                    Official Website
                  </a>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href={sanitizeExternalUrl(activeCompany.careersUrl) ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    onApplyForJob(
                      activeCompany,
                      calculateJobSkillMatchPct(profile.skills, activeCompany.requiredSkills),
                    )
                  }
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors"
                >
                  <span>
                    {appliedCompanyIds.has(activeCompany.id)
                      ? 'Applied · Open Official Careers Portal'
                      : 'Apply for Job & Track Progress'}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-sm text-slate-500">
              <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              Select a company to inspect details.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

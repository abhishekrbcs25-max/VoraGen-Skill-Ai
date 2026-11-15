import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bookmark,
  Briefcase,
  Building2,
  CheckCircle2,
  Compass,
  ExternalLink,
  Flag,
  Globe,
  LocateFixed,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import {
  FLAGSHIP_COMPANIES,
  TOTAL_GLOBAL_COMPANIES,
  getCompanyByIndex,
  queryGlobalCompanies,
} from '../data/companiesCatalog';
import {
  calculateDistanceKm,
  inferLocationFromTimezone,
  resolveCoordinatesForCityCountry,
  resolveLocationFromCoords,
  searchManualLocations,
} from '../utils/locationHelpers';
import {
  analyzeJobScamRisk,
  buildJobMarketIntelligence,
} from '../utils/platformEngines';
import { calculateJobSkillMatchPct } from '../utils/skillEngine';
import { sanitizeExternalUrl } from '../utils/validation';
import { EmployerMapExplorer } from './EmployerMapExplorer';
import type { CareerRole, CompanyJob, UserLocation, UserProfile } from '../types';

interface GlobalJobsViewProps {
  profile: UserProfile;
  readinessPct: number;
  targetRole?: CareerRole;
  sessionToken?: string;
  userLocation?: UserLocation;
  onChangeLocation?: (location: UserLocation) => void;
  onApplyForJob: (company: CompanyJob, matchPct: number) => void;
  onToggleSaveJob?: (companyId: string) => void;
  onRequireAuth?: (reason: string) => boolean;
  initialCompanyId?: string;
}

export function GlobalJobsView({
  profile,
  readinessPct,
  targetRole,
  sessionToken,
  userLocation: propLocation,
  onChangeLocation,
  onApplyForJob,
  onToggleSaveJob,
  onRequireAuth,
  initialCompanyId,
}: GlobalJobsViewProps) {
  const userLocation = useMemo(
    () => propLocation ?? inferLocationFromTimezone(),
    [propLocation],
  );
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('All');
  const [workMode, setWorkMode] = useState<'All' | 'Remote' | 'Hybrid' | 'On-Site'>('All');
  const [jobCategory, setJobCategory] = useState<
    'All' | 'Fresher' | 'Internship' | 'Full-Time' | 'Freelance' | 'Government'
  >('All');
  const [page, setPage] = useState(1);
  const [selectedCompany, setSelectedCompany] = useState<CompanyJob | null>(null);
  const [sortNearest, setSortNearest] = useState(false);

  // Job Scam Detector & Report state
  const [scamSnippet, setScamSnippet] = useState('');
  const [scamReportNotice, setScamReportNotice] = useState<string | null>(null);

  // Location picker state
  const [citySearch, setCitySearch] = useState('');
  const [manualCity, setManualCity] = useState('');
  const [manualCountry, setManualCountry] = useState('');
  const [locating, setLocating] = useState(false);
  const [locStatus, setLocStatus] = useState('');

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

  const itemsWithDistance = useMemo(() => {
    const mapped = result.items.map((co) => {
      const coords = resolveCoordinatesForCityCountry(co.city, co.country);
      const distanceKm = calculateDistanceKm(userLocation, coords);
      return { company: co, distanceKm };
    });
    if (sortNearest) {
      return [...mapped].sort((a, b) => a.distanceKm - b.distanceKm);
    }
    return mapped;
  }, [result.items, userLocation, sortNearest]);

  const manualOptions = useMemo(() => searchManualLocations(citySearch), [citySearch]);

  const activeCompany = selectedCompany ?? itemsWithDistance[0]?.company ?? null;
  const appliedCompanyIds = new Set(profile.applications.map((a) => a.companyId));
  const savedJobSet = new Set(profile.savedJobIds || []);

  const fallbackRole: CareerRole = targetRole || {
    id: 'fullstack-dev',
    title: 'Full Stack Developer',
    domain: 'Software Engineering',
    salaryRange: '$78,000 - $135,000',
    demandGrowth: '+24% YoY',
    summary: '',
    requiredSkills: [],
  };

  const marketIntel = useMemo(
    () => buildJobMarketIntelligence(fallbackRole, result.items),
    [fallbackRole, result.items],
  );

  const activeScamRisk = useMemo(() => {
    if (!activeCompany) return null;
    if (scamSnippet.trim()) {
      return analyzeJobScamRisk({
        companyName: activeCompany.companyName,
        contactEmail: activeCompany.contactEmail,
        website: activeCompany.website,
        salaryText: activeCompany.salary,
        description: scamSnippet,
      });
    }
    return analyzeJobScamRisk({
      companyName: activeCompany.companyName,
      contactEmail: activeCompany.contactEmail,
      website: activeCompany.website,
      salaryText: activeCompany.salary,
      description: activeCompany.description,
    });
  }, [activeCompany, scamSnippet]);

  const handleReportScam = async () => {
    if (!activeCompany || !activeScamRisk) return;
    if (onRequireAuth && !onRequireAuth('report a suspicious job posting')) return;
    try {
      const res = await fetch('/api/jobs/scam-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'x-voragen-token': sessionToken } : {}),
        },
        body: JSON.stringify({
          companyName: activeCompany.companyName,
          jobTitle: activeCompany.roleTitle,
          reason: scamSnippet.trim() || 'User flagged listing for verification audit.',
          riskScore: activeScamRisk.riskScore,
          flags: activeScamRisk.flags,
        }),
      });
      if (res.ok) {
        setScamReportNotice(
          `Scam report logged for ${activeCompany.companyName} and routed to VoraGen Admin Moderation.`,
        );
        setScamSnippet('');
      }
    } catch {
      setScamReportNotice('Scam warning logged locally for review.');
    }
  };

  const handleAutoDetect = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setLocating(true);
      setLocStatus('Detecting browser coordinates...');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const detected = resolveLocationFromCoords(
            pos.coords.latitude,
            pos.coords.longitude,
            'auto',
          );
          onChangeLocation?.(detected);
          setLocStatus(`Auto-detected near ${detected.city}, ${detected.country}.`);
          setLocating(false);
        },
        () => {
          const fallback = inferLocationFromTimezone();
          onChangeLocation?.(fallback);
          setLocStatus(`Geolocation permission unavailable — inferred ${fallback.city}, ${fallback.country} from your time zone.`);
          setLocating(false);
        },
        { timeout: 6000 },
      );
      return;
    }
    const fallback = inferLocationFromTimezone();
    onChangeLocation?.(fallback);
    setLocStatus(`Inferred ${fallback.city}, ${fallback.country} from your device time zone.`);
  };

  const handleApplyManualCityCountry = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCity = manualCity.trim();
    const cleanCountry = manualCountry.trim();
    if (!cleanCity || !cleanCountry) return;
    const coords = resolveCoordinatesForCityCountry(cleanCity, cleanCountry);
    const updated: UserLocation = {
      city: cleanCity,
      country: cleanCountry,
      lat: coords.lat,
      lng: coords.lng,
      mode: 'manual',
    };
    onChangeLocation?.(updated);
    setLocStatus(`Manual location set to ${cleanCity}, ${cleanCountry}.`);
    setManualCity('');
    setManualCountry('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
            Global Job Seeking &amp; {TOTAL_GLOBAL_COMPANIES.toLocaleString()}+ Companies
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Skill-matched vacancies centered on your real location with manual or automatic GPS/time-zone detection.
          </p>
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-300 tabular-nums">
          Readiness: <strong className="font-mono text-[#0B2545] dark:text-amber-400">{readinessPct}%</strong> · Applied:{' '}
          <strong className="font-mono">{profile.applications.length}</strong>
        </div>
      </div>

      {/* User Location Controls (Auto-Detect + Manual Picker) */}
      <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#0A1628] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <MapPin className="w-4 h-4 text-emerald-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-[#0B2545] dark:text-white">
                Your Location: {userLocation.city}, {userLocation.country}{' '}
                <span className="ml-1 font-mono text-[11px] font-medium text-emerald-700 dark:text-amber-400">
                  ({userLocation.mode === 'auto' ? 'Auto-Detected' : 'Manual'})
                </span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                {userLocation.lat.toFixed(2)}°, {userLocation.lng.toFixed(2)}°
                {locStatus ? ` · ${locStatus}` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={locating}
              onClick={handleAutoDetect}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] disabled:opacity-60"
            >
              <LocateFixed className="w-3.5 h-3.5" />
              <span>{locating ? 'Locating...' : 'Auto-Detect My Location'}</span>
            </button>

            <button
              type="button"
              aria-pressed={sortNearest}
              onClick={() => setSortNearest((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                sortNearest
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-white dark:bg-[#05070B] text-slate-700 dark:text-slate-200 border-slate-300 dark:border-[#1E3A5F]/70'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{sortNearest ? 'Sorted: Nearest First' : 'Sort by Distance'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-2 border-t border-slate-200 dark:border-white/10">
          <div className="lg:col-span-6 space-y-2">
            <input
              type="search"
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              placeholder="Quick pick global city manually (Bengaluru, London, Tokyo, Berlin, Toronto)..."
              aria-label="Search manual location city"
              className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#05070B] px-3 py-1.5 text-xs text-slate-900 dark:text-white"
            />
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
              {manualOptions.slice(0, 10).map((entry) => (
                <button
                  key={`${entry.city}-${entry.country}`}
                  type="button"
                  onClick={() => {
                    onChangeLocation?.({
                      city: entry.city,
                      country: entry.country,
                      lat: entry.lat,
                      lng: entry.lng,
                      mode: 'manual',
                    });
                    setLocStatus(`Manual location set to ${entry.city}, ${entry.country}.`);
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                    userLocation.city === entry.city
                      ? 'bg-[#0B2545] text-white border-[#0B2545] dark:bg-[#1D4ED8]'
                      : 'bg-white dark:bg-[#05070B] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1E3A5F]/60'
                  }`}
                >
                  {entry.city.split(',')[0]}, {entry.country}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleApplyManualCityCountry} className="lg:col-span-6 flex flex-col sm:flex-row gap-2 items-stretch sm:items-start">
            <input
              type="text"
              value={manualCity}
              onChange={(e) => setManualCity(e.target.value)}
              placeholder="Custom City (e.g., Kochi)"
              aria-label="Custom city name"
              className="flex-1 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#05070B] px-3 py-1.5 text-xs text-slate-900 dark:text-white"
            />
            <input
              type="text"
              value={manualCountry}
              onChange={(e) => setManualCountry(e.target.value)}
              placeholder="Country (e.g., India)"
              aria-label="Custom country name"
              className="flex-1 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#05070B] px-3 py-1.5 text-xs text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-[#1D4ED8] whitespace-nowrap"
            >
              Set Location
            </button>
          </form>
        </div>
      </section>

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
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#0A1628] text-sm text-slate-900 dark:text-white"
          />
        </div>

        <select
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by country"
          className="md:col-span-3 rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#0A1628] px-3 py-2 text-sm text-slate-900 dark:text-white"
        >
          <option value="All">All Countries (Global)</option>
          <option value="India">India</option>
          <option value="United Kingdom">United Kingdom</option>
          <option value="Germany">Germany</option>
          <option value="Singapore">Singapore</option>
          <option value="Japan">Japan</option>
          <option value="Canada">Canada</option>
          <option value="Australia">Australia</option>
          <option value="United States">United States</option>
        </select>

        <div className="md:col-span-4 flex items-center gap-1 p-1 rounded-lg bg-[#F4F7FB] dark:bg-[#0A1628] border border-slate-200 dark:border-[#1E3A5F]/60">
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
                  ? 'bg-white dark:bg-[#1D4ED8] text-[#0B2545] dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Discovery Category Filter + Live Market Intelligence Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#0A1628] px-4 py-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['All', 'Fresher', 'Internship', 'Full-Time', 'Freelance', 'Government'] as const).map(
            (cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setJobCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  jobCategory === cat
                    ? 'bg-[#0B2545] text-white dark:bg-[#1D4ED8]'
                    : 'bg-white dark:bg-[#05070B] text-slate-700 dark:text-slate-300'
                }`}
              >
                {cat}
              </button>
            ),
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 dark:text-slate-300 tabular-nums">
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-amber-400">
            <TrendingUp className="w-3.5 h-3.5" />
            Market Median: {marketIntel.medianSalaryRange}
          </span>
          <span>·</span>
          <span>Remote/Hybrid: {marketIntel.remoteSharePct}%</span>
          <span>·</span>
          <span>Hotspots: {marketIntel.hiringHotspots.slice(0, 3).join(', ')}</span>
        </div>
      </div>

      {/* Interactive Google Maps & Geo-Hub Explorer centered on User Location */}
      <EmployerMapExplorer
        companies={itemsWithDistance.map((i) => i.company)}
        activeCompany={activeCompany}
        userLocation={userLocation}
        onSelectCompany={(co) => setSelectedCompany(co)}
      />

      {/* Directory + Company Detail Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Companies List */}
        <section className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{result.totalMatches.toLocaleString()} matching employers</span>
            <span className="font-mono tabular-nums">Page {page}</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-[560px] overflow-y-auto">
            {itemsWithDistance.map(({ company: co, distanceKm }) => {
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
                      ? 'bg-[#F4F7FB] dark:bg-[#0F213E]'
                      : 'hover:bg-slate-50 dark:hover:bg-[#0F213E]/60'
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
                        {co.city}, {co.country} · {co.workMode} · ~{distanceKm.toLocaleString()} km away
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`font-mono text-sm font-bold tabular-nums ${
                        skillMatch >= 60
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-amber-700 dark:text-amber-400'
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
        <section className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-6 space-y-5">
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
                    <h2 className="font-display text-xl font-bold text-[#0B2545] dark:text-white">
                      {activeCompany.companyName}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {activeCompany.industry} · Founded {activeCompany.founded} · {activeCompany.employees} employees
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" /> Open Role
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-700 dark:text-amber-400 tabular-nums">
                    {calculateJobSkillMatchPct(profile.skills, activeCompany.requiredSkills)}% Skill Match
                  </span>
                </div>
                <p className="font-display text-base font-bold text-[#0B2545] dark:text-white">
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
                  <MapPin className="w-4 h-4 text-[#0B2545] dark:text-amber-400 shrink-0" />
                  <span>
                    {activeCompany.city}, {activeCompany.country}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-mono tabular-nums">
                  <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
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
                    className="truncate hover:underline text-[#0B2545] dark:text-sky-300"
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
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-[#0B2545] text-white hover:bg-[#13315C] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] transition-colors"
                >
                  <span>
                    {appliedCompanyIds.has(activeCompany.id)
                      ? 'Applied · Open Official Careers Portal'
                      : 'Apply for Job & Track Progress'}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                {onToggleSaveJob && (
                  <button
                    type="button"
                    onClick={() => onToggleSaveJob(activeCompany.id)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold border transition-colors ${
                      savedJobSet.has(activeCompany.id)
                        ? 'bg-amber-500 text-slate-950 border-amber-500'
                        : 'border-slate-300 dark:border-[#1E3A5F]/70 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>{savedJobSet.has(activeCompany.id) ? 'Saved Job' : 'Save Job'}</span>
                  </button>
                )}
              </div>

              {/* Job Scam Detector & Integrity Verification */}
              {activeScamRisk && (
                <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-bold text-[#0B2545] dark:text-white">
                      {activeScamRisk.riskScore >= 30 ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      ) : (
                        <ShieldAlert className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      )}
                      <span>Job Scam Detector: {activeScamRisk.verdict}</span>
                    </span>
                    <span className="font-mono font-bold tabular-nums text-emerald-700 dark:text-amber-400">
                      Risk {activeScamRisk.riskScore}/100
                    </span>
                  </div>

                  <input
                    type="text"
                    value={scamSnippet}
                    onChange={(e) => setScamSnippet(e.target.value)}
                    placeholder="Optional: paste suspicious message/fee prompt to scan..."
                    aria-label="Scan suspicious job message"
                    className="w-full rounded-lg border border-slate-300 dark:border-[#1E3A5F]/70 bg-white dark:bg-[#0A1628] px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {activeScamRisk.flags[0] || activeScamRisk.recommendations[0]}
                    </span>
                    <button
                      type="button"
                      onClick={handleReportScam}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-amber-500/40 text-amber-800 dark:text-amber-300 font-semibold hover:bg-amber-500/10"
                    >
                      <Flag className="w-3 h-3" />
                      <span>Report Scam</span>
                    </button>
                  </div>
                  {scamReportNotice && (
                    <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                      {scamReportNotice}
                    </p>
                  )}
                </div>
              )}
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

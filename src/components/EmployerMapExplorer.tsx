import { useEffect, useMemo, useState } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
} from '@vis.gl/react-google-maps';
import { Compass, ExternalLink, LocateFixed, MapPin, Navigation, Sparkles } from 'lucide-react';
import { inferLocationFromTimezone } from '../utils/locationHelpers';
import type { CompanyJob, UserLocation } from '../types';
import type { GroundingSource } from '../utils/aiHelpers';

interface EmployerHubCoord {
  id: string;
  label: string;
  cityMatch: string;
  lat: number;
  lng: number;
  accent: string;
}

const TECH_HUB_COORDS: EmployerHubCoord[] = [
  { id: 'hub-mv', label: 'Silicon Valley (Mountain View / SF / Cupertino)', cityMatch: 'Mountain View', lat: 37.422, lng: -122.084, accent: '#2563EB' },
  { id: 'hub-sf', label: 'San Francisco SoMa', cityMatch: 'San Francisco', lat: 37.7897, lng: -122.4014, accent: '#635BFF' },
  { id: 'hub-sea', label: 'Seattle & Redmond Cloud Corridor', cityMatch: 'Redmond', lat: 47.674, lng: -122.1215, accent: '#00A4EF' },
  { id: 'hub-aus', label: 'Austin Tech Corridor', cityMatch: 'Austin', lat: 30.2672, lng: -97.7431, accent: '#D97706' },
  { id: 'hub-blr', label: 'Bengaluru Electronic City & Outer Ring', cityMatch: 'Bengaluru', lat: 12.9716, lng: 77.5946, accent: '#059669' },
  { id: 'hub-bom', label: 'Mumbai BKC & Powai', cityMatch: 'Mumbai', lat: 19.076, lng: 72.8777, accent: '#0B2545' },
  { id: 'hub-maa', label: 'Chennai OMR IT Corridor', cityMatch: 'Chennai', lat: 13.0827, lng: 80.2707, accent: '#15803D' },
  { id: 'hub-muc', label: 'Munich & Walldorf Engineering', cityMatch: 'Munich', lat: 48.1351, lng: 11.582, accent: '#009999' },
  { id: 'hub-lon', label: 'London Kings Cross Tech Hub', cityMatch: 'London', lat: 51.5313, lng: -0.1261, accent: '#1D4ED8' },
  { id: 'hub-syd', label: 'Sydney CBD Tech Central', cityMatch: 'Sydney', lat: -33.8688, lng: 151.2093, accent: '#0052CC' },
  { id: 'hub-ott', label: 'Ottawa & Toronto AI Corridor', cityMatch: 'Ottawa', lat: 45.4215, lng: -75.6972, accent: '#95BF47' },
  { id: 'hub-sto', label: 'Stockholm Tech Hub', cityMatch: 'Stockholm', lat: 59.3293, lng: 18.0686, accent: '#1DB954' },
];

export function resolveHubForCompany(company: CompanyJob | null): EmployerHubCoord {
  if (!company) return TECH_HUB_COORDS[4];
  const cityLower = company.city.toLowerCase();
  const direct = TECH_HUB_COORDS.find((h) => cityLower.includes(h.cityMatch.toLowerCase()));
  if (direct) return direct;
  if (cityLower.includes('seattle')) return TECH_HUB_COORDS[2];
  if (cityLower.includes('cupertino') || cityLower.includes('menlo') || cityLower.includes('santa clara') || cityLower.includes('san jose')) {
    return TECH_HUB_COORDS[0];
  }
  if (cityLower.includes('walldorf')) return TECH_HUB_COORDS[7];
  if (cityLower.includes('toronto')) return TECH_HUB_COORDS[10];
  if (cityLower.includes('dublin')) return TECH_HUB_COORDS[8];
  if (cityLower.includes('suwon') || cityLower.includes('tokyo') || cityLower.includes('singapore')) {
    return { id: 'hub-apac', label: `${company.city}, ${company.country}`, cityMatch: company.city, lat: 35.6762, lng: 139.6503, accent: '#D97706' };
  }
  return TECH_HUB_COORDS[4];
}

interface EmployerMapExplorerProps {
  companies: CompanyJob[];
  activeCompany: CompanyJob | null;
  userLocation?: UserLocation;
  onSelectCompany: (company: CompanyJob) => void;
}

export function EmployerMapExplorer({
  companies,
  activeCompany,
  userLocation: propUserLocation,
  onSelectCompany,
}: EmployerMapExplorerProps) {
  const userLocation = useMemo(
    () => propUserLocation ?? inferLocationFromTimezone(),
    [propUserLocation],
  );
  const compileTimeKey =
    (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_GOOGLE_MAPS_API_KEY ||
    '';
  const [runtimeKey, setRuntimeKey] = useState<string>(
    compileTimeKey && compileTimeKey !== 'MY_GOOGLE_MAPS_API_KEY' ? compileTimeKey : '',
  );
  const [selectedHubId, setSelectedHubId] = useState<string | null>(null);
  const [hasExplicitCompanyFocus, setHasExplicitCompanyFocus] = useState(false);

  // Grounded Maps & Search Advisor for user location or active employer hub
  const [insightsText, setInsightsText] = useState<string>('');
  const [insightsSources, setInsightsSources] = useState<GroundingSource[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    setHasExplicitCompanyFocus(false);
    setSelectedHubId(null);
  }, [userLocation.lat, userLocation.lng, userLocation.city]);

  useEffect(() => {
    if (runtimeKey) return;
    fetch('/api/config/maps')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { apiKey?: string } | null) => {
        if (data?.apiKey) setRuntimeKey(data.apiKey);
      })
      .catch(() => {
        // Safe fallback handled below
      });
  }, [runtimeKey]);

  const activeHub = useMemo(() => resolveHubForCompany(activeCompany), [activeCompany]);
  const mapCenter = hasExplicitCompanyFocus
    ? { lat: activeHub.lat, lng: activeHub.lng }
    : { lat: userLocation.lat, lng: userLocation.lng };

  const markerItems = useMemo(() => {
    const seenIds: Record<string, boolean> = {};
    const list: Array<{ company: CompanyJob; hub: EmployerHubCoord }> = [];
    for (const co of companies.slice(0, 12)) {
      const hub = resolveHubForCompany(co);
      if (!seenIds[hub.id]) {
        seenIds[hub.id] = true;
        list.push({ company: co, hub });
      }
    }
    return list;
  }, [companies]);

  const activeInfoMarker =
    markerItems.find((item) => item.hub.id === selectedHubId) || null;

  const fetchHubInsights = async () => {
    const targetCity = hasExplicitCompanyFocus && activeCompany
      ? `${activeCompany.city}, ${activeCompany.country}`
      : `${userLocation.city}, ${userLocation.country}`;
    const companyName = hasExplicitCompanyFocus && activeCompany?.companyName
      ? activeCompany.companyName
      : 'software engineering employers';
    setLoadingInsights(true);
    try {
      const res = await fetch('/api/ai/grounded-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `Summarize engineering tech hubs, transit accessibility, and developer career ecosystem near ${companyName} in ${targetCity}.`,
          useSearch: true,
          useMaps: true,
          cityHint: targetCity,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { text?: string; sources?: GroundingSource[] };
        setInsightsText(data.text || '');
        setInsightsSources(data.sources || []);
      }
    } catch {
      setInsightsText('Unable to load live hub insights right now.');
    } finally {
      setLoadingInsights(false);
    }
  };

  const userPlotX = ((userLocation.lng + 180) / 360) * 680 + 20;
  const userPlotY = ((90 - userLocation.lat) / 180) * 190 + 15;

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-white dark:bg-[#0A1628] p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Compass className="w-5 h-5 text-[#0B2545] dark:text-amber-400" />
          <div>
            <h2 className="font-display text-base font-bold text-[#0B2545] dark:text-white">
              Global Employer Hubs — Centered on {hasExplicitCompanyFocus && activeCompany ? activeCompany.city : `${userLocation.city}, ${userLocation.country}`}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your location pin ({userLocation.city}) anchors the map. Click any employer marker to inspect or recenter back on yourself.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasExplicitCompanyFocus && (
            <button
              type="button"
              onClick={() => {
                setHasExplicitCompanyFocus(false);
                setSelectedHubId(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-emerald-600/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
            >
              <LocateFixed className="w-3.5 h-3.5" />
              <span>Center on My Location</span>
            </button>
          )}

          <button
            type="button"
            onClick={fetchHubInsights}
            disabled={loadingInsights}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] disabled:opacity-60"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {loadingInsights
                ? 'Grounding Local Hub...'
                : `Explore ${hasExplicitCompanyFocus && activeCompany ? activeCompany.city.split(',')[0] : userLocation.city.split(',')[0]} Insights`}
            </span>
          </button>
        </div>
      </div>

      {/* Interactive Google Map (when key active) or Clean Interactive Geo-Grid Fallback */}
      {runtimeKey ? (
        <div className="w-full h-[340px] rounded-xl overflow-hidden border border-slate-200 dark:border-white/15">
          <APIProvider apiKey={runtimeKey}>
            <GoogleMap
              key={`gmap-${userLocation.lat.toFixed(3)}-${userLocation.lng.toFixed(3)}-${hasExplicitCompanyFocus ? activeHub.id : 'self'}`}
              defaultCenter={mapCenter}
              defaultZoom={hasExplicitCompanyFocus ? 6 : 5}
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              gestureHandling="cooperative"
              style={{ width: '100%', height: '100%' }}
            >
              {/* User Location Pin */}
              <AdvancedMarker
                position={{ lat: userLocation.lat, lng: userLocation.lng }}
                title={`Your Location: ${userLocation.city}, ${userLocation.country}`}
              >
                <Pin background="#059669" glyphColor="#FFFFFF" borderColor="#FBBF24" />
              </AdvancedMarker>

              {markerItems.map(({ company, hub }) => (
                <AdvancedMarker
                  key={`${hub.id}-${company.id}`}
                  position={{ lat: hub.lat, lng: hub.lng }}
                  title={`${company.companyName} (${company.city})`}
                  onClick={() => {
                    setHasExplicitCompanyFocus(true);
                    setSelectedHubId(hub.id);
                    onSelectCompany(company);
                  }}
                >
                  <Pin
                    background={hasExplicitCompanyFocus && activeCompany?.id === company.id ? '#D97706' : hub.accent}
                    glyphColor="#FFFFFF"
                    borderColor="#0B2545"
                  />
                </AdvancedMarker>
              ))}

              {activeInfoMarker && (
                <InfoWindow
                  position={{ lat: activeInfoMarker.hub.lat, lng: activeInfoMarker.hub.lng }}
                  onCloseClick={() => setSelectedHubId(null)}
                >
                  <div className="p-1 text-slate-900 max-w-[220px]">
                    <p className="font-bold text-sm">{activeInfoMarker.company.companyName}</p>
                    <p className="text-xs text-slate-600">{activeInfoMarker.company.roleTitle}</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {activeInfoMarker.company.city}, {activeInfoMarker.company.country}
                    </p>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </APIProvider>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-950 p-4 text-white space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
              <Navigation className="w-3.5 h-3.5" />
              Your Location: {userLocation.city}, {userLocation.country} ({userLocation.lat.toFixed(2)}°, {userLocation.lng.toFixed(2)}°)
            </span>
            <span className="text-[11px] text-amber-300">
              {hasExplicitCompanyFocus
                ? `Pinned Employer: ${activeHub.label}`
                : `Centered on You · ${markerItems.length} employer hubs plotted`}
            </span>
          </div>

          {/* Crisp SVG World Coordinate Plot */}
          <svg
            viewBox="0 0 720 220"
            className="w-full h-48 rounded-lg bg-[#070B16] border border-white/10"
            role="img"
            aria-label={`Global employer map centered on ${userLocation.city}, ${userLocation.country}`}
          >
            {[44, 88, 132, 176].map((y) => (
              <line key={y} x1="0" y1={y} x2="720" y2={y} stroke="rgba(148,163,184,0.12)" />
            ))}
            {[120, 240, 360, 480, 600].map((x) => (
              <line key={x} x1={x} y1="0" x2={x} y2="220" stroke="rgba(148,163,184,0.12)" />
            ))}

            {markerItems.map(({ company, hub }) => {
              const x = ((hub.lng + 180) / 360) * 680 + 20;
              const y = ((90 - hub.lat) / 180) * 190 + 15;
              const isFocused = hasExplicitCompanyFocus && (activeCompany?.id === company.id || activeHub.id === hub.id);
              return (
                <g
                  key={company.id}
                  onClick={() => {
                    setHasExplicitCompanyFocus(true);
                    onSelectCompany(company);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setHasExplicitCompanyFocus(true);
                      onSelectCompany(company);
                    }
                  }}
                  className="cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label={`Select ${company.companyName} in ${company.city}`}
                >
                  {isFocused && (
                    <circle cx={x} cy={y} r="13" fill="rgba(251,191,36,0.2)" stroke="#FBBF24" />
                  )}
                  <circle cx={x} cy={y} r={isFocused ? 6 : 4.5} fill={isFocused ? '#FBBF24' : '#38BDF8'} />
                  <text x={x + 9} y={y + 3} fill="#CBD5E1" fontSize="9.5" fontFamily="Outfit, sans-serif">
                    {company.companyName.split(' ')[0]} · {company.city.split(',')[0]}
                  </text>
                </g>
              );
            })}

            {/* Prominent User Location Marker */}
            <g aria-label={`Your current location: ${userLocation.city}, ${userLocation.country}`}>
              <circle cx={userPlotX} cy={userPlotY} r="14" fill="rgba(16,185,129,0.22)" stroke="#FBBF24" strokeWidth="1.5" />
              <circle cx={userPlotX} cy={userPlotY} r="6.5" fill="#10B981" stroke="#FFFFFF" strokeWidth="1.5" />
              <text x={userPlotX + 12} y={userPlotY - 4} fill="#34D399" fontSize="10.5" fontWeight="700" fontFamily="Outfit, sans-serif">
                You ({userLocation.city.split(',')[0]})
              </text>
            </g>
          </svg>
        </div>
      )}

      {/* Grounded Local Insights Output & Mandatory Source Links */}
      {insightsText && (
        <div className="rounded-xl border border-slate-200 dark:border-[#1E3A5F]/60 bg-[#F4F7FB] dark:bg-[#05070B] p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#0B2545] dark:text-amber-300">
            <MapPin className="w-4 h-4" />
            <span>Hub & Ecosystem Brief — {activeCompany?.city || 'Global'}</span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
            {insightsText}
          </p>
          {insightsSources.length > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex flex-wrap gap-2">
              {insightsSources.map((src) => (
                <a
                  key={src.url}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-white dark:bg-[#0A1628] border border-slate-200 dark:border-[#1E3A5F]/60 text-[#0B2545] dark:text-sky-300 hover:underline"
                >
                  <span>{src.title}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

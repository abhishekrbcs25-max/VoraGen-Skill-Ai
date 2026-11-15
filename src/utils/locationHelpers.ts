import type { UserLocation } from '../types';

export interface CityGeoEntry {
  city: string;
  country: string;
  lat: number;
  lng: number;
  timeZoneHint: string;
}

export const GLOBAL_USER_LOCATIONS: CityGeoEntry[] = [
  { city: 'Bengaluru, Karnataka', country: 'India', lat: 12.9716, lng: 77.5946, timeZoneHint: 'Asia/Kolkata' },
  { city: 'Mumbai, Maharashtra', country: 'India', lat: 19.076, lng: 72.8777, timeZoneHint: 'Asia/Kolkata' },
  { city: 'Hyderabad, Telangana', country: 'India', lat: 17.385, lng: 78.4867, timeZoneHint: 'Asia/Kolkata' },
  { city: 'Chennai, Tamil Nadu', country: 'India', lat: 13.0827, lng: 80.2707, timeZoneHint: 'Asia/Kolkata' },
  { city: 'Kochi, Kerala', country: 'India', lat: 9.9312, lng: 76.2673, timeZoneHint: 'Asia/Kolkata' },
  { city: 'New Delhi, Delhi', country: 'India', lat: 28.6139, lng: 77.209, timeZoneHint: 'Asia/Kolkata' },
  { city: 'Pune, Maharashtra', country: 'India', lat: 18.5204, lng: 73.8567, timeZoneHint: 'Asia/Kolkata' },
  { city: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198, timeZoneHint: 'Asia/Singapore' },
  { city: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503, timeZoneHint: 'Asia/Tokyo' },
  { city: 'Seoul', country: 'South Korea', lat: 37.5665, lng: 126.978, timeZoneHint: 'Asia/Seoul' },
  { city: 'Dubai', country: 'United Arab Emirates', lat: 25.2048, lng: 55.2708, timeZoneHint: 'Asia/Dubai' },
  { city: 'Riyadh', country: 'Saudi Arabia', lat: 24.7136, lng: 46.6753, timeZoneHint: 'Asia/Riyadh' },
  { city: 'London', country: 'United Kingdom', lat: 51.5074, lng: -0.1278, timeZoneHint: 'Europe/London' },
  { city: 'Dublin', country: 'Ireland', lat: 53.3498, lng: -6.2603, timeZoneHint: 'Europe/Dublin' },
  { city: 'Berlin', country: 'Germany', lat: 52.52, lng: 13.405, timeZoneHint: 'Europe/Berlin' },
  { city: 'Munich', country: 'Germany', lat: 48.1351, lng: 11.582, timeZoneHint: 'Europe/Berlin' },
  { city: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lng: 4.9041, timeZoneHint: 'Europe/Amsterdam' },
  { city: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522, timeZoneHint: 'Europe/Paris' },
  { city: 'Zurich', country: 'Switzerland', lat: 47.3769, lng: 8.5417, timeZoneHint: 'Europe/Zurich' },
  { city: 'Stockholm', country: 'Sweden', lat: 59.3293, lng: 18.0686, timeZoneHint: 'Europe/Stockholm' },
  { city: 'Sydney, NSW', country: 'Australia', lat: -33.8688, lng: 151.2093, timeZoneHint: 'Australia/Sydney' },
  { city: 'Melbourne, VIC', country: 'Australia', lat: -37.8136, lng: 144.9631, timeZoneHint: 'Australia/Melbourne' },
  { city: 'Toronto, ON', country: 'Canada', lat: 43.6532, lng: -79.3832, timeZoneHint: 'America/Toronto' },
  { city: 'Vancouver, BC', country: 'Canada', lat: 49.2827, lng: -123.1207, timeZoneHint: 'America/Vancouver' },
  { city: 'Sao Paulo', country: 'Brazil', lat: -23.5505, lng: -46.6333, timeZoneHint: 'America/Sao_Paulo' },
  { city: 'Nairobi', country: 'Kenya', lat: -1.2921, lng: 36.8219, timeZoneHint: 'Africa/Nairobi' },
  { city: 'San Francisco, CA', country: 'United States', lat: 37.7749, lng: -122.4194, timeZoneHint: 'America/Los_Angeles' },
  { city: 'New York, NY', country: 'United States', lat: 40.7128, lng: -74.006, timeZoneHint: 'America/New_York' },
];

export function calculateDistanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(h))));
}

export function resolveLocationFromCoords(
  lat: number,
  lng: number,
  mode: 'auto' | 'manual' = 'auto',
): UserLocation {
  let best = GLOBAL_USER_LOCATIONS[0];
  let bestDist = Infinity;
  for (const entry of GLOBAL_USER_LOCATIONS) {
    const d = calculateDistanceKm({ lat, lng }, entry);
    if (d < bestDist) {
      bestDist = d;
      best = entry;
    }
  }
  return {
    lat,
    lng,
    city: bestDist <= 180 ? best.city : `${best.city} Region`,
    country: best.country,
    mode,
  };
}

export function inferLocationFromTimezone(timeZone?: string): UserLocation {
  let tz = timeZone;
  if (!tz) {
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      tz = 'Asia/Kolkata';
    }
  }
  const direct = GLOBAL_USER_LOCATIONS.find((loc) => loc.timeZoneHint === tz);
  if (direct) {
    return {
      lat: direct.lat,
      lng: direct.lng,
      city: direct.city,
      country: direct.country,
      mode: 'auto',
    };
  }
  const tzLower = (tz || '').toLowerCase();
  if (tzLower.startsWith('asia/calcutta') || tzLower.startsWith('asia/kolkata')) {
    const blr = GLOBAL_USER_LOCATIONS[0];
    return { lat: blr.lat, lng: blr.lng, city: blr.city, country: blr.country, mode: 'auto' };
  }
  if (tzLower.startsWith('europe/')) {
    const lon = GLOBAL_USER_LOCATIONS.find((l) => l.city === 'London')!;
    return { lat: lon.lat, lng: lon.lng, city: lon.city, country: lon.country, mode: 'auto' };
  }
  if (tzLower.startsWith('australia/')) {
    const syd = GLOBAL_USER_LOCATIONS.find((l) => l.city.startsWith('Sydney'))!;
    return { lat: syd.lat, lng: syd.lng, city: syd.city, country: syd.country, mode: 'auto' };
  }
  if (tzLower.startsWith('asia/')) {
    const sg = GLOBAL_USER_LOCATIONS.find((l) => l.city === 'Singapore')!;
    return { lat: sg.lat, lng: sg.lng, city: sg.city, country: sg.country, mode: 'auto' };
  }
  if (tzLower.startsWith('africa/')) {
    const nbo = GLOBAL_USER_LOCATIONS.find((l) => l.city === 'Nairobi')!;
    return { lat: nbo.lat, lng: nbo.lng, city: nbo.city, country: nbo.country, mode: 'auto' };
  }
  if (tzLower.startsWith('america/')) {
    const tor = GLOBAL_USER_LOCATIONS.find((l) => l.city.startsWith('Toronto'))!;
    return { lat: tor.lat, lng: tor.lng, city: tor.city, country: tor.country, mode: 'auto' };
  }
  const fallback = GLOBAL_USER_LOCATIONS[0];
  return {
    lat: fallback.lat,
    lng: fallback.lng,
    city: fallback.city,
    country: fallback.country,
    mode: 'auto',
  };
}

export function searchManualLocations(query: string): CityGeoEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return GLOBAL_USER_LOCATIONS;
  return GLOBAL_USER_LOCATIONS.filter(
    (loc) =>
      loc.city.toLowerCase().includes(q) || loc.country.toLowerCase().includes(q),
  );
}

export function resolveCoordinatesForCityCountry(city: string, country: string): { lat: number; lng: number } {
  const cLower = city.toLowerCase();
  const countryLower = country.toLowerCase();
  const exact = GLOBAL_USER_LOCATIONS.find(
    (loc) =>
      cLower.includes(loc.city.split(',')[0].toLowerCase()) ||
      loc.city.toLowerCase().includes(cLower),
  );
  if (exact) return { lat: exact.lat, lng: exact.lng };

  if (cLower.includes('mountain view') || cLower.includes('cupertino') || cLower.includes('menlo') || cLower.includes('santa clara') || cLower.includes('san jose')) {
    return { lat: 37.422, lng: -122.084 };
  }
  if (cLower.includes('redmond') || cLower.includes('seattle')) {
    return { lat: 47.674, lng: -122.1215 };
  }
  if (cLower.includes('austin')) return { lat: 30.2672, lng: -97.7431 };
  if (cLower.includes('walldorf')) return { lat: 49.3064, lng: 8.6428 };
  if (cLower.includes('ottawa')) return { lat: 45.4215, lng: -75.6972 };
  if (cLower.includes('suwon')) return { lat: 37.2636, lng: 127.0286 };

  const byCountry = GLOBAL_USER_LOCATIONS.find((loc) =>
    countryLower.includes(loc.country.toLowerCase()),
  );
  if (byCountry) return { lat: byCountry.lat, lng: byCountry.lng };

  return { lat: 12.9716, lng: 77.5946 };
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GLOBAL_USER_LOCATIONS,
  calculateDistanceKm,
  resolveLocationFromCoords,
  inferLocationFromTimezone,
  searchManualLocations,
  resolveCoordinatesForCityCountry,
} from './locationHelpers';

test('calculateDistanceKm computes Haversine distances accurately', () => {
  assert.equal(calculateDistanceKm({ lat: 12.9716, lng: 77.5946 }, { lat: 12.9716, lng: 77.5946 }), 0);

  const blr = { lat: 12.9716, lng: 77.5946 };
  const lon = { lat: 51.5074, lng: -0.1278 };
  const distBlrLon = calculateDistanceKm(blr, lon);
  assert.ok(distBlrLon > 7900 && distBlrLon < 8200, `Unexpected Bengaluru-London distance: ${distBlrLon}`);

  const tokyo = { lat: 35.6762, lng: 139.6503 };
  const sf = { lat: 37.7749, lng: -122.4194 };
  assert.equal(calculateDistanceKm(tokyo, sf), calculateDistanceKm(sf, tokyo));
  assert.ok(calculateDistanceKm(tokyo, sf) > 8000);
});

test('resolveLocationFromCoords identifies nearest global hub cleanly', () => {
  const nearTokyo = resolveLocationFromCoords(35.68, 139.65, 'auto');
  assert.equal(nearTokyo.city, 'Tokyo');
  assert.equal(nearTokyo.country, 'Japan');
  assert.equal(nearTokyo.mode, 'auto');

  const nearLondon = resolveLocationFromCoords(51.51, -0.13, 'manual');
  assert.equal(nearLondon.city, 'London');
  assert.equal(nearLondon.country, 'United Kingdom');
  assert.equal(nearLondon.mode, 'manual');

  const remotePoint = resolveLocationFromCoords(32.0, 120.0, 'auto');
  assert.match(remotePoint.city, /Region/);
});

test('inferLocationFromTimezone resolves non-US and regional timezones reliably', () => {
  assert.equal(inferLocationFromTimezone('Asia/Kolkata').city, 'Bengaluru, Karnataka');
  assert.equal(inferLocationFromTimezone('Asia/Calcutta').city, 'Bengaluru, Karnataka');
  assert.equal(inferLocationFromTimezone('Europe/Berlin').city, 'Berlin');
  assert.equal(inferLocationFromTimezone('Asia/Tokyo').city, 'Tokyo');
  assert.equal(inferLocationFromTimezone('Australia/Sydney').city, 'Sydney, NSW');
  assert.equal(inferLocationFromTimezone('Europe/Madrid').city, 'London');
  assert.equal(inferLocationFromTimezone('Pacific/Unknown').city, GLOBAL_USER_LOCATIONS[0].city);
});

test('searchManualLocations and resolveCoordinatesForCityCountry support manual discovery', () => {
  assert.equal(searchManualLocations('').length, GLOBAL_USER_LOCATIONS.length);
  const germany = searchManualLocations('Germany');
  assert.ok(germany.some((c) => c.city === 'Berlin'));
  assert.ok(germany.some((c) => c.city === 'Munich'));

  const tokyoCoords = resolveCoordinatesForCityCountry('Tokyo', 'Japan');
  assert.ok(Math.abs(tokyoCoords.lat - 35.6762) < 0.01);

  const mvCoords = resolveCoordinatesForCityCountry('Mountain View, CA', 'United States');
  assert.ok(Math.abs(mvCoords.lat - 37.422) < 0.01);
});

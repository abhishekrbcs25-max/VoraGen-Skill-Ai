import test from 'node:test';
import assert from 'node:assert/strict';
import { CAREER_ROLES, createBlankUnauthenticatedProfile } from '../data/careerData';
import { calculateSkillMatch } from './skillEngine';
import {
  buildSkillProgressTracks,
  formatUserTimeZoneContext,
  getTimeOfDayGreeting,
} from './greeting';

test('getTimeOfDayGreeting handles Morning, Afternoon, and Evening accurately across timezones', () => {
  // 2026-11-15T12:00:00Z:
  // - UTC / Europe/London: 12:00 -> Good Afternoon
  // - Asia/Kolkata (+05:30): 17:30 -> Good Evening
  // - America/New_York (-05:00): 07:00 -> Good Morning
  const noonUtc = new Date('2026-11-15T12:00:00Z');
  assert.equal(getTimeOfDayGreeting(noonUtc, 'America/New_York'), 'Good Morning');
  assert.equal(getTimeOfDayGreeting(noonUtc, 'Europe/London'), 'Good Afternoon');
  assert.equal(getTimeOfDayGreeting(noonUtc, 'Asia/Kolkata'), 'Good Evening');

  // Midnight boundary (hour 00 -> Good Evening)
  const midnightUtc = new Date('2026-11-15T00:00:00Z');
  assert.equal(getTimeOfDayGreeting(midnightUtc, 'UTC'), 'Good Evening');

  // 05:00 boundary -> Good Morning
  const earlyMorningUtc = new Date('2026-11-15T05:00:00Z');
  assert.equal(getTimeOfDayGreeting(earlyMorningUtc, 'UTC'), 'Good Morning');

  // 16:59 boundary -> Good Afternoon; 17:00 -> Good Evening
  assert.equal(getTimeOfDayGreeting(new Date('2026-11-15T16:59:00Z'), 'UTC'), 'Good Afternoon');
  assert.equal(getTimeOfDayGreeting(new Date('2026-11-15T17:00:00Z'), 'UTC'), 'Good Evening');
});

test('formatUserTimeZoneContext formats readable timezone and local clock time', () => {
  const sampleDate = new Date('2026-11-15T14:30:00Z');
  const ctx = formatUserTimeZoneContext(sampleDate, 'Asia/Kolkata');
  assert.equal(ctx.timeZoneName, 'Asia/Kolkata');
  assert.match(ctx.localTime, /8:00/);
});

test('buildSkillProgressTracks reflects 0% blank state when signed out and includes role + custom skills when signed in', () => {
  const blank = createBlankUnauthenticatedProfile();
  const role = CAREER_ROLES[0];
  const blankMatch = calculateSkillMatch(blank.skills, role);
  const blankTracks = buildSkillProgressTracks(blank, role, blankMatch);
  assert.equal(blankTracks.length, role.requiredSkills.length);
  assert.ok(blankTracks.every((t) => t.currentLevel === 0 && t.status === 'Missing'));

  const activeProfile = {
    ...blank,
    isSignedIn: true,
    name: 'Aarav',
    skills: [
      { name: role.requiredSkills[0].name, level: 90, category: 'Frontend' as const, verified: true },
      { name: 'Rust', level: 55, category: 'Backend' as const, verified: false },
    ],
  };
  const activeMatch = calculateSkillMatch(activeProfile.skills, role);
  const activeTracks = buildSkillProgressTracks(activeProfile, role, activeMatch);

  assert.equal(activeTracks.length, role.requiredSkills.length + 1);
  const firstTrack = activeTracks[0];
  assert.equal(firstTrack.name, role.requiredSkills[0].name);
  assert.equal(firstTrack.status, 'Mastered');
  assert.equal(firstTrack.verified, true);

  const customTrack = activeTracks.find((t) => t.name === 'Rust');
  assert.ok(customTrack);
  assert.equal(customTrack.isRoleRequired, false);
  assert.equal(customTrack.status, 'In Progress');
});

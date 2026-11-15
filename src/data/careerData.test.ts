import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAREER_ROLES,
  DIAGNOSTIC_QUIZZES,
  INITIAL_SAMPLE_PROFILE,
  LEARNING_CATALOG,
  MENTOR_STAFF,
  createBlankUnauthenticatedProfile,
  createFreshUserProfile,
} from './careerData';
import {
  FLAGSHIP_CODING_CHALLENGES,
  TOTAL_CODING_PROBLEMS,
  getChallengeByIndex,
  queryCodingCatalog,
} from './codingCatalog';
import {
  FLAGSHIP_COMPANIES,
  TOTAL_GLOBAL_COMPANIES,
  getCompanyByIndex,
  queryGlobalCompanies,
} from './companiesCatalog';

test('CAREER_ROLES, LEARNING_CATALOG, MENTOR_STAFF, and DIAGNOSTIC_QUIZZES maintain referential integrity', () => {
  assert.ok(CAREER_ROLES.length >= 6);
  for (const role of CAREER_ROLES) {
    assert.ok(role.requiredSkills.length >= 4, `Role ${role.id} must define required skills`);
    for (const req of role.requiredSkills) {
      assert.ok(req.targetLevel >= 50 && req.targetLevel <= 100);
      assert.ok(req.weight >= 1 && req.weight <= 5);
    }
  }

  for (const mod of LEARNING_CATALOG) {
    assert.ok(mod.url.startsWith('https://'), `Catalog URL must use HTTPS: ${mod.url}`);
    assert.ok(mod.durationHours > 0);
  }

  assert.equal(MENTOR_STAFF.length, 3);
  for (const questions of Object.values(DIAGNOSTIC_QUIZZES)) {
    assert.ok(questions.length >= 20);
    for (const q of questions) {
      if (q.kind === 'coding') {
        assert.ok((q.testCases?.length ?? 0) >= 1, `Coding problem ${q.id} must have test cases`);
      } else {
        assert.ok(q.correctIndex >= 0 && q.correctIndex < q.options.length);
      }
      assert.ok(q.explanation.length > 10);
    }
  }
});

test('createBlankUnauthenticatedProfile and createFreshUserProfile isolate new user workspaces', () => {
  const blank = createBlankUnauthenticatedProfile();
  assert.equal(blank.isSignedIn, false);
  assert.equal(blank.name, '');
  assert.equal(blank.skills.length, 0);
  assert.equal(blank.educationHistory?.length, 0);
  assert.equal(blank.projects.length, 0);
  assert.equal(blank.certifications.length, 0);

  const fresh = createFreshUserProfile({
    name: 'Priya Menon',
    email: 'priya@voragen.dev',
    authProvider: 'google',
  });
  assert.equal(fresh.isSignedIn, true);
  assert.equal(fresh.authProvider, 'google');
  assert.equal(fresh.needsOnboarding, true);
  assert.equal(fresh.skills.length, 0);
  assert.ok(INITIAL_SAMPLE_PROFILE.skills.length > 0);
});

test('codingCatalog resolves clamped indices, flagship challenges, procedural problems, and filters', () => {
  assert.equal(getChallengeByIndex(0).indexNumber, 1);
  assert.equal(getChallengeByIndex(TOTAL_CODING_PROBLEMS + 999).indexNumber, TOTAL_CODING_PROBLEMS);
  assert.equal(getChallengeByIndex(1).id, FLAGSHIP_CODING_CHALLENGES[0].id);

  const procedural = getChallengeByIndex(250);
  assert.equal(procedural.isProcedural, true);
  assert.ok(procedural.testCases.length >= 2);

  const page1 = queryCodingCatalog({ search: '', difficulty: 'All', page: 1, pageSize: 10 });
  assert.equal(page1.items.length, 10);
  assert.equal(page1.totalMatches, TOTAL_CODING_PROBLEMS);

  const exactNum = queryCodingCatalog({ search: '#4200', difficulty: 'All', page: 1, pageSize: 10 });
  assert.equal(exactNum.items.length, 1);
  assert.equal(exactNum.items[0].indexNumber, 4200);

  const diffMismatch = queryCodingCatalog({
    search: '1',
    difficulty: 'Hard',
    page: 1,
    pageSize: 10,
  });
  assert.equal(diffMismatch.totalMatches, 0);

  const filtered = queryCodingCatalog({
    search: 'Arrays',
    difficulty: 'Easy',
    page: 1,
    pageSize: 5,
  });
  assert.ok(filtered.items.every((c) => c.difficulty === 'Easy'));
});

test('companiesCatalog resolves clamped indices, safe URLs, and multi-criteria filtering', () => {
  assert.equal(getCompanyByIndex(-5).indexNumber, 1);
  assert.equal(getCompanyByIndex(TOTAL_GLOBAL_COMPANIES + 50).indexNumber, TOTAL_GLOBAL_COMPANIES);
  assert.equal(getCompanyByIndex(1).companyName, FLAGSHIP_COMPANIES[0].companyName);

  const globalCo = getCompanyByIndex(500);
  assert.equal(globalCo.isFlagship, false);
  assert.ok(globalCo.website.startsWith('https://'));
  assert.ok(globalCo.careersUrl.startsWith('https://'));

  const page1 = queryGlobalCompanies({
    search: '',
    country: 'All',
    workMode: 'All',
    page: 1,
    pageSize: 12,
  });
  assert.equal(page1.items.length, 12);
  assert.equal(page1.totalMatches, TOTAL_GLOBAL_COMPANIES);

  const filtered = queryGlobalCompanies({
    search: 'Python',
    country: 'India',
    workMode: 'Hybrid',
    page: 1,
    pageSize: 12,
  });
  assert.ok(filtered.items.length > 0);
  assert.ok(filtered.items.every((co) => co.country.includes('India') && co.workMode === 'Hybrid'));
});

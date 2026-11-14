import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_HALF_EXTENT,
  clampDt,
  createInitialDefenderState,
  stepDefenderSimulation,
  type DefenderInputState,
} from './skillDefenderLogic';

const IDLE_INPUT: DefenderInputState = {
  left: false,
  right: false,
  up: false,
  down: false,
  fireJustPressed: false,
  dashJustPressed: false,
};

test('clampDt caps large frame deltas to 50ms and rejects negatives', () => {
  assert.equal(clampDt(0.5), 0.05);
  assert.equal(clampDt(-0.2), 0);
  assert.equal(clampDt(0.016), 0.016);
});

test('game survives opening 2 seconds with zero input without defeat', () => {
  let state = createInitialDefenderState(0, true);
  for (let i = 0; i < 60; i++) {
    state = stepDefenderSimulation(state, IDLE_INPUT, 1 / 30);
  }
  assert.equal(state.phase, 'playing');
  assert.equal(state.hp, 5);
});

test('spawns 3 genuinely distinct enemy archetypes in wave 1', () => {
  const state = createInitialDefenderState(0, true);
  const archetypes = new Set(state.threats.map((t) => t.archetype));
  assert.equal(archetypes.has('weaver'), true);
  assert.equal(archetypes.has('kiter'), true);
  assert.equal(archetypes.has('charger'), true);
});

test('player movement stays clamped inside arena bounds', () => {
  let state = createInitialDefenderState(0, true);
  for (let i = 0; i < 200; i++) {
    state = stepDefenderSimulation(
      state,
      { ...IDLE_INPUT, right: true, down: true },
      0.04,
    );
  }
  assert.equal(state.playerX <= ARENA_HALF_EXTENT, true);
  assert.equal(state.playerZ <= ARENA_HALF_EXTENT, true);
});

test('edge-triggered fire spawns projectile and defeats enemy with KO animation + score', () => {
  let state = createInitialDefenderState(0, true);
  // Place single 1-HP weaver right in front of player facing -Z
  state.threats = [
    {
      id: 99,
      archetype: 'weaver',
      x: 0,
      z: -3,
      vx: 0,
      vz: 0,
      hp: 1,
      maxHp: 1,
      radius: 0.8,
      phaseOffset: 0,
      telegraphTimer: 0,
      cooldownTimer: 2,
      koTimer: 0,
      hitFlashTimer: 0,
      charging: false,
    },
  ];
  state = stepDefenderSimulation(state, { ...IDLE_INPUT, fireJustPressed: true }, 0.016);
  assert.equal(state.projectiles.length, 1);

  for (let i = 0; i < 15; i++) {
    state = stepDefenderSimulation(state, IDLE_INPUT, 0.02);
  }
  assert.equal(state.score >= 100, true);
});

test('defeat condition is reachable when hp drops to 0', () => {
  let state = createInitialDefenderState(0, true);
  state.hp = 1;
  state.invulnTimer = 0;
  state.threats = [
    {
      id: 101,
      archetype: 'weaver',
      x: 0,
      z: 0,
      vx: 0,
      vz: 0,
      hp: 2,
      maxHp: 2,
      radius: 0.8,
      phaseOffset: 0,
      telegraphTimer: 0,
      cooldownTimer: 2,
      koTimer: 0,
      hitFlashTimer: 0,
      charging: false,
    },
  ];
  state = stepDefenderSimulation(state, IDLE_INPUT, 0.016);
  assert.equal(state.phase, 'gameover');
  assert.equal(state.hp, 0);
});

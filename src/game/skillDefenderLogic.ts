export type GamePhase = 'title' | 'playing' | 'paused' | 'victory' | 'gameover';

export type ThreatArchetype = 'weaver' | 'kiter' | 'charger';

export interface ThreatEntity {
  id: number;
  archetype: ThreatArchetype;
  x: number;
  z: number;
  vx: number;
  vz: number;
  hp: number;
  maxHp: number;
  radius: number;
  phaseOffset: number;
  telegraphTimer: number;
  cooldownTimer: number;
  koTimer: number; // > 0 means dissolving/toppling KO animation
  hitFlashTimer: number;
  charging: boolean;
}

export interface ProjectileEntity {
  id: number;
  fromPlayer: boolean;
  x: number;
  z: number;
  vx: number;
  vz: number;
  life: number;
  radius: number;
}

export interface MasteryCore {
  id: number;
  label: string;
  x: number;
  z: number;
  collected: boolean;
}

export interface DefenderInputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  fireJustPressed: boolean;
  dashJustPressed: boolean;
}

export interface DefenderState {
  phase: GamePhase;
  playerX: number;
  playerZ: number;
  playerVx: number;
  playerVz: number;
  playerFacingX: number;
  playerFacingZ: number;
  hp: number;
  maxHp: number;
  dashCooldown: number;
  fireCooldown: number;
  invulnTimer: number;
  hitstopTimer: number;
  trauma: number;
  wave: number;
  maxWaves: number;
  score: number;
  bestScore: number;
  combo: number;
  coresCollected: number;
  elapsedSec: number;
  nextEntityId: number;
  threats: ThreatEntity[];
  projectiles: ProjectileEntity[];
  cores: MasteryCore[];
  lastEvent: 'none' | 'shoot' | 'hit' | 'kill' | 'core' | 'hurt' | 'wave' | 'victory' | 'gameover';
}

export const ARENA_HALF_EXTENT = 18;
export const MAX_CONCURRENT_ATTACKERS = 3;

const CORE_LABELS = ['React', 'TypeScript', 'Node.js', 'SQL', 'Cloud', 'System Design'];

export function clampDt(rawDt: number): number {
  if (!Number.isFinite(rawDt) || rawDt < 0) return 0;
  return Math.min(rawDt, 0.05);
}

export function spawnWaveEntities(wave: number, startId: number): {
  threats: ThreatEntity[];
  cores: MasteryCore[];
  nextId: number;
} {
  let nextId = startId;
  const threats: ThreatEntity[] = [];
  const count = 4 + wave * 2;
  const archetypes: ThreatArchetype[] = ['weaver', 'kiter', 'charger'];

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + wave * 0.4;
    const dist = 11.5 + (i % 3) * 1.8;
    const archetype = archetypes[i % archetypes.length];
    const hp = archetype === 'charger' ? 2 + Math.floor(wave / 2) : archetype === 'kiter' ? 2 : 1;
    threats.push({
      id: nextId++,
      archetype,
      x: Math.cos(angle) * dist,
      z: Math.sin(angle) * dist,
      vx: 0,
      vz: 0,
      hp,
      maxHp: hp,
      radius: archetype === 'charger' ? 0.95 : 0.78,
      phaseOffset: i * 1.15,
      telegraphTimer: 0,
      cooldownTimer: 1.4 + (i % 4) * 0.55,
      koTimer: 0,
      hitFlashTimer: 0,
      charging: false,
    });
  }

  const cores: MasteryCore[] = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + wave * 0.8;
    cores.push({
      id: nextId++,
      label: CORE_LABELS[(wave * 3 + i) % CORE_LABELS.length],
      x: Math.cos(a) * 8.5,
      z: Math.sin(a) * 8.5,
      collected: false,
    });
  }

  return { threats, cores, nextId };
}

export function createInitialDefenderState(bestScore = 0, autostart = false): DefenderState {
  const wave1 = spawnWaveEntities(1, 1);
  return {
    phase: autostart ? 'playing' : 'title',
    playerX: 0,
    playerZ: 0,
    playerVx: 0,
    playerVz: 0,
    playerFacingX: 0,
    playerFacingZ: -1,
    hp: 5,
    maxHp: 5,
    dashCooldown: 0,
    fireCooldown: 0,
    invulnTimer: 1.5, // Safe opening seconds without input
    hitstopTimer: 0,
    trauma: 0,
    wave: 1,
    maxWaves: 3,
    score: 0,
    bestScore,
    combo: 1,
    coresCollected: 0,
    elapsedSec: 0,
    nextEntityId: wave1.nextId,
    threats: wave1.threats,
    projectiles: [],
    cores: wave1.cores,
    lastEvent: 'none',
  };
}

export function stepDefenderSimulation(
  state: DefenderState,
  input: DefenderInputState,
  rawDt: number,
): DefenderState {
  if (state.phase !== 'playing') return state;

  const dt = clampDt(rawDt);
  if (dt === 0) return state;

  const next: DefenderState = {
    ...state,
    lastEvent: 'none',
    trauma: Math.max(0, state.trauma - dt * 1.9),
    threats: state.threats.map((t) => ({ ...t })),
    projectiles: state.projectiles.map((p) => ({ ...p })),
    cores: state.cores.map((c) => ({ ...c })),
  };

  // Hitstop freezes physics briefly while hit flashes & camera trauma still decay
  if (next.hitstopTimer > 0) {
    next.hitstopTimer = Math.max(0, next.hitstopTimer - dt);
    for (const t of next.threats) {
      t.hitFlashTimer = Math.max(0, t.hitFlashTimer - dt);
    }
    return next;
  }

  next.elapsedSec += dt;
  next.fireCooldown = Math.max(0, next.fireCooldown - dt);
  next.dashCooldown = Math.max(0, next.dashCooldown - dt);
  next.invulnTimer = Math.max(0, next.invulnTimer - dt);

  // Player movement
  let moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let moveZ = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const moveLen = Math.hypot(moveX, moveZ);
  if (moveLen > 0) {
    moveX /= moveLen;
    moveZ /= moveLen;
    next.playerFacingX = moveX;
    next.playerFacingZ = moveZ;
  }

  const speed = 9.2;
  const targetVx = moveX * speed;
  const targetVz = moveZ * speed;
  const accelAlpha = 1 - Math.exp(-14 * dt);
  next.playerVx += (targetVx - next.playerVx) * accelAlpha;
  next.playerVz += (targetVz - next.playerVz) * accelAlpha;

  if (input.dashJustPressed && next.dashCooldown <= 0) {
    next.playerVx = next.playerFacingX * 22;
    next.playerVz = next.playerFacingZ * 22;
    next.dashCooldown = 1.1;
    next.invulnTimer = Math.max(next.invulnTimer, 0.25);
  }

  next.playerX = Math.max(
    -ARENA_HALF_EXTENT + 1.2,
    Math.min(ARENA_HALF_EXTENT - 1.2, next.playerX + next.playerVx * dt),
  );
  next.playerZ = Math.max(
    -ARENA_HALF_EXTENT + 1.2,
    Math.min(ARENA_HALF_EXTENT - 1.2, next.playerZ + next.playerVz * dt),
  );

  // Player pulse cannon shot (edge-triggered)
  if (input.fireJustPressed && next.fireCooldown <= 0) {
    // Auto-assist aim toward nearest living threat within cone, else facing vector
    let aimX = next.playerFacingX;
    let aimZ = next.playerFacingZ;
    let bestDist = 14;
    for (const t of next.threats) {
      if (t.koTimer > 0) continue;
      const dx = t.x - next.playerX;
      const dz = t.z - next.playerZ;
      const d = Math.hypot(dx, dz);
      if (d > 0.1 && d < bestDist) {
        bestDist = d;
        aimX = dx / d;
        aimZ = dz / d;
      }
    }
    next.projectiles.push({
      id: next.nextEntityId++,
      fromPlayer: true,
      x: next.playerX + aimX * 0.9,
      z: next.playerZ + aimZ * 0.9,
      vx: aimX * 24,
      vz: aimZ * 24,
      life: 1.4,
      radius: 0.35,
    });
    next.fireCooldown = 0.2;
    next.lastEvent = 'shoot';
  }

  // Count active attackers for crowd token pool
  let activeAttackTokens = next.threats.filter(
    (t) => t.koTimer === 0 && (t.telegraphTimer > 0 || t.charging),
  ).length;

  // Update threats with 3 distinct movement/behavior policies
  const speedScale = 1 + (next.wave - 1) * 0.16;
  const survivingThreats: ThreatEntity[] = [];

  for (const t of next.threats) {
    t.hitFlashTimer = Math.max(0, t.hitFlashTimer - dt);

    if (t.koTimer > 0) {
      t.koTimer -= dt;
      if (t.koTimer > 0) survivingThreats.push(t);
      continue;
    }

    const dx = next.playerX - t.x;
    const dz = next.playerZ - t.z;
    const dist = Math.max(0.001, Math.hypot(dx, dz));
    const nx = dx / dist;
    const nz = dz / dist;
    const perpX = -nz;
    const perpZ = nx;

    t.cooldownTimer = Math.max(0, t.cooldownTimer - dt);

    if (t.archetype === 'weaver') {
      // Policy 1: Sinusoidal flank-weaver chasing player
      const waveSwing = Math.sin(next.elapsedSec * 3.4 + t.phaseOffset) * 2.2;
      t.vx = (nx * 3.1 + perpX * waveSwing) * speedScale;
      t.vz = (nz * 3.1 + perpZ * waveSwing) * speedScale;
      t.x += t.vx * dt;
      t.z += t.vz * dt;
    } else if (t.archetype === 'kiter') {
      // Policy 2: Ranged kiter maintaining 8-10m orbit & firing telegraphed bolts
      const desired = 9.0;
      const radial = dist > desired + 1 ? 2.4 : dist < desired - 1 ? -2.8 : 0;
      t.vx = (nx * radial + perpX * 2.5) * speedScale;
      t.vz = (nz * radial + perpZ * 2.5) * speedScale;
      t.x += t.vx * dt;
      t.z += t.vz * dt;

      if (t.telegraphTimer > 0) {
        t.telegraphTimer -= dt;
        if (t.telegraphTimer <= 0) {
          next.projectiles.push({
            id: next.nextEntityId++,
            fromPlayer: false,
            x: t.x,
            z: t.z,
            vx: nx * 11.5 * speedScale,
            vz: nz * 11.5 * speedScale,
            life: 2.3,
            radius: 0.34,
          });
          t.cooldownTimer = 2.6;
        }
      } else if (t.cooldownTimer <= 0 && activeAttackTokens < MAX_CONCURRENT_ATTACKERS) {
        t.telegraphTimer = 0.55; // Visible telegraph before shot
        activeAttackTokens++;
      }
    } else {
      // Policy 3: Line-of-sight Charger with windup telegraph
      if (t.charging) {
        t.x += t.vx * dt;
        t.z += t.vz * dt;
        if (Math.abs(t.x) > ARENA_HALF_EXTENT - 1 || Math.abs(t.z) > ARENA_HALF_EXTENT - 1 || t.cooldownTimer <= 0) {
          t.charging = false;
          t.cooldownTimer = 2.4;
        }
      } else if (t.telegraphTimer > 0) {
        t.telegraphTimer -= dt;
        if (t.telegraphTimer <= 0) {
          t.charging = true;
          t.vx = nx * 12.5 * speedScale;
          t.vz = nz * 12.5 * speedScale;
          t.cooldownTimer = 0.85;
        }
      } else {
        t.x += nx * 1.8 * speedScale * dt;
        t.z += nz * 1.8 * speedScale * dt;
        if (t.cooldownTimer <= 0 && dist < 14 && activeAttackTokens < MAX_CONCURRENT_ATTACKERS) {
          t.telegraphTimer = 0.6;
          activeAttackTokens++;
        }
      }
    }

    // Keep threats inside arena boundary
    t.x = Math.max(-ARENA_HALF_EXTENT + 1, Math.min(ARENA_HALF_EXTENT - 1, t.x));
    t.z = Math.max(-ARENA_HALF_EXTENT + 1, Math.min(ARENA_HALF_EXTENT - 1, t.z));

    // Player contact damage
    if (next.invulnTimer <= 0 && Math.hypot(t.x - next.playerX, t.z - next.playerZ) < t.radius + 0.72) {
      next.hp = Math.max(0, next.hp - 1);
      next.invulnTimer = 1.05;
      next.combo = 1;
      next.trauma = Math.min(1, next.trauma + 0.65);
      next.hitstopTimer = 0.05;
      next.lastEvent = 'hurt';
    }

    survivingThreats.push(t);
  }
  next.threats = survivingThreats;

  // Update projectiles & collisions
  const remainingProjectiles: ProjectileEntity[] = [];
  for (const p of next.projectiles) {
    p.life -= dt;
    if (p.life <= 0) continue;
    p.x += p.vx * dt;
    p.z += p.vz * dt;
    if (Math.abs(p.x) > ARENA_HALF_EXTENT || Math.abs(p.z) > ARENA_HALF_EXTENT) continue;

    let consumed = false;
    if (p.fromPlayer) {
      for (const t of next.threats) {
        if (t.koTimer > 0) continue;
        if (Math.hypot(p.x - t.x, p.z - t.z) < t.radius + p.radius) {
          t.hp -= 1;
          t.hitFlashTimer = 0.09;
          consumed = true;
          if (t.hp <= 0) {
            t.koTimer = 0.32;
            const gained = (t.archetype === 'charger' ? 150 : 100) * next.combo;
            next.score += gained;
            next.bestScore = Math.max(next.bestScore, next.score);
            next.combo = Math.min(8, next.combo + 1);
            next.hitstopTimer = 0.035;
            next.trauma = Math.min(1, next.trauma + 0.3);
            next.lastEvent = 'kill';
          } else {
            next.lastEvent = 'hit';
          }
          break;
        }
      }
    } else if (next.invulnTimer <= 0) {
      if (Math.hypot(p.x - next.playerX, p.z - next.playerZ) < 0.72 + p.radius) {
        consumed = true;
        next.hp = Math.max(0, next.hp - 1);
        next.invulnTimer = 1.05;
        next.combo = 1;
        next.trauma = Math.min(1, next.trauma + 0.65);
        next.hitstopTimer = 0.05;
        next.lastEvent = 'hurt';
      }
    }

    if (!consumed) remainingProjectiles.push(p);
  }
  next.projectiles = remainingProjectiles;

  // Collect Skill Mastery Cores
  for (const core of next.cores) {
    if (!core.collected && Math.hypot(core.x - next.playerX, core.z - next.playerZ) < 1.35) {
      core.collected = true;
      next.coresCollected += 1;
      next.score += 120 * next.combo;
      next.bestScore = Math.max(next.bestScore, next.score);
      next.hp = Math.min(next.maxHp, next.hp + 1);
      next.lastEvent = 'core';
    }
  }

  // Check reachable defeat
  if (next.hp <= 0) {
    next.phase = 'gameover';
    next.bestScore = Math.max(next.bestScore, next.score);
    next.lastEvent = 'gameover';
    return next;
  }

  // Check wave completion / victory
  const living = next.threats.some((t) => t.koTimer === 0);
  if (!living && next.threats.length === 0) {
    if (next.wave >= next.maxWaves) {
      next.phase = 'victory';
      next.score += 300;
      next.bestScore = Math.max(next.bestScore, next.score);
      next.lastEvent = 'victory';
    } else {
      next.wave += 1;
      const spawned = spawnWaveEntities(next.wave, next.nextEntityId);
      next.threats = spawned.threats;
      next.cores = spawned.cores;
      next.nextEntityId = spawned.nextId;
      next.invulnTimer = 1.0;
      next.lastEvent = 'wave';
    }
  }

  return next;
}

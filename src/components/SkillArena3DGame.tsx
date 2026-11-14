import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Volume2, VolumeX, Pause, Play, RotateCcw, LogOut } from 'lucide-react';
import {
  ARENA_HALF_EXTENT,
  createInitialDefenderState,
  stepDefenderSimulation,
  type DefenderInputState,
  type DefenderState,
  type GamePhase,
} from '../game/skillDefenderLogic';

interface SkillArena3DGameProps {
  bestScoreInitial?: number;
  autostart?: boolean;
  onWin: (score: number) => void;
  onExit: () => void;
}

class ArcadeSynthAudio {
  private ctx: AudioContext | null = null;
  public muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playTone(freq: number, endFreq: number, duration: number, type: OscillatorType, volume = 0.08) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), ctx.currentTime + duration);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }
}

function buildPlayerShipMesh(): THREE.Group {
  const group = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.65, roughness: 0.28 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.5, roughness: 0.35, emissive: 0x451a03, emissiveIntensity: 0.35 });
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x67e8f9, metalness: 0.2, roughness: 0.15, emissive: 0x06b6d4, emissiveIntensity: 0.6 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.36, 1.55), hullMat);
  body.position.y = 0.62;
  group.add(body);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.75, 4), trimMat);
  nose.rotation.x = -Math.PI / 2;
  nose.rotation.y = Math.PI / 4;
  nose.position.set(0, 0.62, -1.05);
  group.add(nose);

  const leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.12, 0.7), hullMat);
  leftWing.position.set(-0.78, 0.55, 0.25);
  leftWing.rotation.z = 0.15;
  group.add(leftWing);

  const rightWing = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.12, 0.7), hullMat);
  rightWing.position.set(0.78, 0.55, 0.25);
  rightWing.rotation.z = -0.15;
  group.add(rightWing);

  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), canopyMat);
  canopy.scale.set(0.9, 0.7, 1.35);
  canopy.position.set(0, 0.84, -0.15);
  group.add(canopy);

  const thruster = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.07, 8, 16), canopyMat);
  thruster.position.set(0, 0.62, 0.85);
  group.add(thruster);

  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(1.0, 20),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.36, depthWrite: false }),
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.03;
  group.add(shadowDisc);

  return group;
}

function buildEnemyMesh(archetype: 'weaver' | 'kiter' | 'charger'): THREE.Group {
  const group = new THREE.Group();
  const palette =
    archetype === 'charger'
      ? { main: 0xdc2626, accent: 0xfbbf24 }
      : archetype === 'kiter'
        ? { main: 0xdb2777, accent: 0x38bdf8 }
        : { main: 0x0ea5e9, accent: 0xf59e0b };

  const mainMat = new THREE.MeshStandardMaterial({ color: palette.main, metalness: 0.55, roughness: 0.32 });
  const accentMat = new THREE.MeshStandardMaterial({
    color: palette.accent,
    emissive: palette.accent,
    emissiveIntensity: 0.45,
    metalness: 0.35,
    roughness: 0.3,
  });

  if (archetype === 'charger') {
    const core = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.72, 1.4), mainMat);
    core.position.y = 0.72;
    group.add(core);
    const ram = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.8, 4), accentMat);
    ram.rotation.x = Math.PI / 2;
    ram.position.set(0, 0.72, 0.95);
    group.add(ram);
    const shoulderL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.55, 0.9), accentMat);
    shoulderL.position.set(-0.78, 0.75, 0);
    group.add(shoulderL);
    const shoulderR = shoulderL.clone();
    shoulderR.position.x = 0.78;
    group.add(shoulderR);
  } else if (archetype === 'kiter') {
    const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.58, 0), mainMat);
    orb.position.y = 0.85;
    group.add(orb);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.09, 8, 20), accentMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.85;
    group.add(ring);
    const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.7, 8), accentMat);
    turret.rotation.x = Math.PI / 2;
    turret.position.set(0, 0.85, 0.52);
    group.add(turret);
  } else {
    const hull = new THREE.Mesh(new THREE.TetrahedronGeometry(0.75), mainMat);
    hull.position.y = 0.75;
    group.add(hull);
    const finL = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.38), accentMat);
    finL.position.set(0, 0.75, 0.15);
    group.add(finL);
  }

  // Telegraph ring for attacks
  const telegraphRing = new THREE.Mesh(
    new THREE.RingGeometry(0.92, 1.16, 24),
    new THREE.MeshBasicMaterial({ color: 0xfef08a, side: THREE.DoubleSide, transparent: true, opacity: 0.0 }),
  );
  telegraphRing.name = 'telegraph';
  telegraphRing.rotation.x = -Math.PI / 2;
  telegraphRing.position.y = 0.06;
  group.add(telegraphRing);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.85, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  group.add(shadow);

  return group;
}

function buildCoreMesh(): THREE.Group {
  const group = new THREE.Group();
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 0.65,
    metalness: 0.4,
    roughness: 0.2,
  });
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), crystalMat);
  gem.position.y = 0.85;
  group.add(gem);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.65, 0.05, 8, 24),
    new THREE.MeshBasicMaterial({ color: 0x34d399 }),
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 0.85;
  group.add(halo);
  return group;
}

export function SkillArena3DGame({
  bestScoreInitial = 0,
  autostart = false,
  onWin,
  onExit,
}: SkillArena3DGameProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const onWinRef = useRef(onWin);
  const onExitRef = useRef(onExit);
  onWinRef.current = onWin;
  onExitRef.current = onExit;

  const synthRef = useRef<ArcadeSynthAudio>(new ArcadeSynthAudio());
  const stateRef = useRef<DefenderState>(createInitialDefenderState(bestScoreInitial, autostart));
  const rewardClaimedRef = useRef(false);

  const [hud, setHud] = useState<{
    phase: GamePhase;
    hp: number;
    maxHp: number;
    score: number;
    bestScore: number;
    wave: number;
    maxWaves: number;
    combo: number;
    coresCollected: number;
    remainingThreats: number;
  }>(() => ({
    phase: stateRef.current.phase,
    hp: stateRef.current.hp,
    maxHp: stateRef.current.maxHp,
    score: 0,
    bestScore: bestScoreInitial,
    wave: 1,
    maxWaves: 3,
    combo: 1,
    coresCollected: 0,
    remainingThreats: stateRef.current.threats.length,
  }));
  const [muted, setMuted] = useState(false);
  const [webglFallback, setWebglFallback] = useState(false);

  const syncDocumentDataset = (phase: GamePhase) => {
    const mapped =
      phase === 'victory' ? 'gameover' : phase;
    document.body.dataset.state = mapped;
  };

  const syncHudFromState = () => {
    const s = stateRef.current;
    syncDocumentDataset(s.phase);
    setHud({
      phase: s.phase,
      hp: s.hp,
      maxHp: s.maxHp,
      score: s.score,
      bestScore: s.bestScore,
      wave: s.wave,
      maxWaves: s.maxWaves,
      combo: s.combo,
      coresCollected: s.coresCollected,
      remainingThreats: s.threats.filter((t) => t.koTimer === 0).length,
    });
  };

  const startGame = () => {
    rewardClaimedRef.current = false;
    stateRef.current = createInitialDefenderState(stateRef.current.bestScore, true);
    synthRef.current.playTone(440, 880, 0.14, 'triangle', 0.08);
    syncHudFromState();
  };

  const togglePause = () => {
    const s = stateRef.current;
    if (s.phase === 'playing') {
      stateRef.current = { ...s, phase: 'paused' };
    } else if (s.phase === 'paused') {
      stateRef.current = { ...s, phase: 'playing' };
    }
    syncHudFromState();
  };

  const toggleMute = () => {
    synthRef.current.muted = !synthRef.current.muted;
    setMuted(synthRef.current.muted);
  };

  useEffect(() => {
    syncDocumentDataset(stateRef.current.phase);
    return () => {
      delete document.body.dataset.state;
    };
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch {
      setWebglFallback(true);
      return;
    }

    const gl = renderer.getContext();
    const debugExt = gl.getExtension('WEBGL_debug_renderer_info');
    const glRendererStr = debugExt ? String(gl.getParameter(debugExt.UNMASKED_RENDERER_WEBGL)) : '';
    const isSoftwareGl = /SwiftShader|llvmpipe|Microsoft Basic Render Driver/i.test(glRendererStr);

    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = !isSoftwareGl;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050814);
    scene.fog = new THREE.Fog(0x050814, 26, 62);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 0.72;

    const camera = new THREE.PerspectiveCamera(
      50,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.1,
      120,
    );
    camera.position.set(0, 18, 17);
    camera.lookAt(0, 0, 0);

    // Three-point + hemisphere lighting
    const hemi = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.9);
    scene.add(hemi);
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.45);
    keyLight.position.set(14, 24, 12);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xec4899, 0.65);
    rimLight.position.set(-16, 12, -14);
    scene.add(rimLight);

    // Arena floor & grid
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(ARENA_HALF_EXTENT * 2, ARENA_HALF_EXTENT * 2),
      new THREE.MeshStandardMaterial({ color: 0x0b1224, metalness: 0.25, roughness: 0.78 }),
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const grid = new THREE.GridHelper(ARENA_HALF_EXTENT * 2, 18, 0x3b82f6, 0x1e293b);
    grid.position.y = 0.02;
    scene.add(grid);

    // Boundary energy frame pillars
    const borderMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xb45309, emissiveIntensity: 0.45 });
    const cornerOffsets = [
      [-ARENA_HALF_EXTENT, -ARENA_HALF_EXTENT],
      [ARENA_HALF_EXTENT, -ARENA_HALF_EXTENT],
      [-ARENA_HALF_EXTENT, ARENA_HALF_EXTENT],
      [ARENA_HALF_EXTENT, ARENA_HALF_EXTENT],
    ];
    for (const [cx, cz] of cornerOffsets) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 2.2, 8), borderMat);
      pillar.position.set(cx, 1.1, cz);
      scene.add(pillar);
    }

    // Instanced starfield
    const starCount = isSoftwareGl ? 140 : 280;
    const starGeo = new THREE.OctahedronGeometry(0.11, 0);
    const starMat = new THREE.MeshBasicMaterial({ color: 0x93c5fd });
    const stars = new THREE.InstancedMesh(starGeo, starMat, starCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < starCount; i++) {
      dummy.position.set((Math.random() - 0.5) * 68, -2 + Math.random() * 14, (Math.random() - 0.5) * 68);
      dummy.scale.setScalar(0.6 + Math.random() * 1.1);
      dummy.updateMatrix();
      stars.setMatrixAt(i, dummy.matrix);
    }
    stars.instanceMatrix.needsUpdate = true;
    scene.add(stars);

    // Dynamic entity mesh registries (plain objects to avoid Map shadowing issues)
    const playerGroup = buildPlayerShipMesh();
    scene.add(playerGroup);

    const threatMeshes: Record<number, THREE.Group> = {};
    const projectileMeshes: Record<number, THREE.Mesh> = {};
    const coreMeshes: Record<number, THREE.Group> = {};

    const playerBulletGeo = new THREE.SphereGeometry(0.28, 10, 8);
    const playerBulletMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const enemyBulletMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });

    const input: DefenderInputState = {
      left: false,
      right: false,
      up: false,
      down: false,
      fireJustPressed: false,
      dashJustPressed: false,
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (stateRef.current.phase === 'title' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        startGame();
        return;
      }
      if (key === 'p' || e.key === 'Escape') {
        if (stateRef.current.phase === 'playing' || stateRef.current.phase === 'paused') {
          e.preventDefault();
          togglePause();
        }
        return;
      }
      if (key === 'm') {
        toggleMute();
        return;
      }
      if (key === 'r' && (stateRef.current.phase === 'gameover' || stateRef.current.phase === 'victory' || stateRef.current.phase === 'paused')) {
        startGame();
        return;
      }
      if (key === 'arrowleft' || key === 'a') input.left = true;
      if (key === 'arrowright' || key === 'd') input.right = true;
      if (key === 'arrowup' || key === 'w') input.up = true;
      if (key === 'arrowdown' || key === 's') input.down = true;
      if (e.key === ' ' || key === 'j' || key === 'f') {
        e.preventDefault();
        input.fireJustPressed = true;
      }
      if (e.key === 'Shift') input.dashJustPressed = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'arrowleft' || key === 'a') input.left = false;
      if (key === 'arrowright' || key === 'd') input.right = false;
      if (key === 'arrowup' || key === 'w') input.up = false;
      if (key === 'arrowdown' || key === 's') input.down = false;
    };

    const handlePointerDown = () => {
      if (stateRef.current.phase === 'playing') {
        input.fireJustPressed = true;
      }
    };

    const handleResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', handleResize);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    let disposed = false;
    let rafId = 0;
    let lastTime = performance.now();
    let hudAccumulator = 0;

    const syncSceneToState = (s: DefenderState, timeSec: number) => {
      // Player position + banking tilt
      playerGroup.position.set(s.playerX, Math.sin(timeSec * 4) * 0.08, s.playerZ);
      const yaw = Math.atan2(-s.playerFacingX, -s.playerFacingZ);
      playerGroup.rotation.y = yaw;
      playerGroup.rotation.z = -s.playerVx * 0.035;
      playerGroup.visible = s.invulnTimer <= 0 || Math.floor(timeSec * 18) % 2 === 0;

      // Sync threats
      const liveThreatIds: Record<number, boolean> = {};
      for (const t of s.threats) {
        liveThreatIds[t.id] = true;
        let mesh = threatMeshes[t.id];
        if (!mesh) {
          mesh = buildEnemyMesh(t.archetype);
          threatMeshes[t.id] = mesh;
          scene.add(mesh);
        }
        mesh.position.set(t.x, 0, t.z);
        if (t.koTimer > 0) {
          const shrink = Math.max(0.05, t.koTimer / 0.32);
          mesh.scale.setScalar(shrink);
          mesh.rotation.y += 0.25;
        } else {
          mesh.scale.setScalar(t.hitFlashTimer > 0 ? 1.18 : 1);
          mesh.rotation.y = Math.atan2(s.playerX - t.x, s.playerZ - t.z);
        }
        const tele = mesh.getObjectByName('telegraph') as THREE.Mesh | undefined;
        if (tele && tele.material instanceof THREE.MeshBasicMaterial) {
          tele.material.opacity = t.telegraphTimer > 0 ? 0.85 : 0;
        }
      }
      for (const idStr of Object.keys(threatMeshes)) {
        const id = Number(idStr);
        if (!liveThreatIds[id]) {
          scene.remove(threatMeshes[id]);
          delete threatMeshes[id];
        }
      }

      // Sync projectiles
      const liveProjIds: Record<number, boolean> = {};
      for (const p of s.projectiles) {
        liveProjIds[p.id] = true;
        let mesh = projectileMeshes[p.id];
        if (!mesh) {
          mesh = new THREE.Mesh(playerBulletGeo, p.fromPlayer ? playerBulletMat : enemyBulletMat);
          projectileMeshes[p.id] = mesh;
          scene.add(mesh);
        }
        mesh.position.set(p.x, 0.72, p.z);
      }
      for (const idStr of Object.keys(projectileMeshes)) {
        const id = Number(idStr);
        if (!liveProjIds[id]) {
          scene.remove(projectileMeshes[id]);
          delete projectileMeshes[id];
        }
      }

      // Sync mastery cores
      const liveCoreIds: Record<number, boolean> = {};
      for (const c of s.cores) {
        if (c.collected) continue;
        liveCoreIds[c.id] = true;
        let mesh = coreMeshes[c.id];
        if (!mesh) {
          mesh = buildCoreMesh();
          coreMeshes[c.id] = mesh;
          scene.add(mesh);
        }
        mesh.position.set(c.x, Math.sin(timeSec * 3.2 + c.id) * 0.16, c.z);
        mesh.rotation.y = timeSec * 2.1;
      }
      for (const idStr of Object.keys(coreMeshes)) {
        const id = Number(idStr);
        if (!liveCoreIds[id]) {
          scene.remove(coreMeshes[id]);
          delete coreMeshes[id];
        }
      }

      // Camera follow + trauma shake
      const shake = s.trauma * s.trauma * 0.55;
      camera.position.x = s.playerX * 0.42 + (Math.random() - 0.5) * shake;
      camera.position.z = s.playerZ * 0.35 + 16.8 + (Math.random() - 0.5) * shake;
      camera.lookAt(s.playerX * 0.3, 0, s.playerZ * 0.25);
    };

    const afterDraw = () => {
      if (disposed) return;
      if (isSoftwareGl) {
        setTimeout(() => {
          if (!disposed) rafId = requestAnimationFrame(tick);
        }, 0);
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };

    const tick = (now: number) => {
      if (disposed) return;
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const prevPhase = stateRef.current.phase;
      const nextState = stepDefenderSimulation(stateRef.current, input, dt);
      input.fireJustPressed = false;
      input.dashJustPressed = false;
      stateRef.current = nextState;

      // Audio reactions
      if (nextState.lastEvent === 'shoot') synthRef.current.playTone(680, 260, 0.08, 'square', 0.05);
      if (nextState.lastEvent === 'hit') synthRef.current.playTone(300, 140, 0.07, 'sawtooth', 0.06);
      if (nextState.lastEvent === 'kill') synthRef.current.playTone(220, 620, 0.16, 'triangle', 0.08);
      if (nextState.lastEvent === 'core') synthRef.current.playTone(520, 1040, 0.2, 'sine', 0.09);
      if (nextState.lastEvent === 'hurt') synthRef.current.playTone(150, 55, 0.22, 'sawtooth', 0.1);
      if (nextState.lastEvent === 'victory' && !rewardClaimedRef.current) {
        rewardClaimedRef.current = true;
        synthRef.current.playTone(440, 880, 0.32, 'triangle', 0.1);
        onWinRef.current(nextState.score);
      }

      if (nextState.phase !== prevPhase) {
        syncHudFromState();
      } else {
        hudAccumulator += dt;
        if (hudAccumulator >= 0.12) {
          hudAccumulator = 0;
          syncHudFromState();
        }
      }

      // Gentle starfield orbit even on title screen
      stars.rotation.y = now * 0.00004;
      syncSceneToState(nextState, now * 0.001);

      renderer.render(scene, camera);
      afterDraw();
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      pmrem.dispose();
      envTarget.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      renderer.dispose();
    };
  }, []);

  if (webglFallback) {
    return (
      <div className="fixed inset-0 z-50 bg-[#050814] text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <h2 className="font-display text-2xl font-bold">WebGL Context Unavailable</h2>
        <p className="text-sm text-slate-300 max-w-md">
          Your current browser environment does not expose a WebGL renderer for 3D Skill Defender. You can still play all 6 interactive Voragen puzzles in the Games Arcade.
        </p>
        <button
          type="button"
          onClick={() => onExitRef.current()}
          className="px-5 py-2.5 rounded-lg bg-blue-600 text-sm font-semibold text-white"
        >
          Back to Games Arcade
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#050814] text-white select-none overflow-hidden">
      {/* Live 3D WebGL Mount */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Minimal Floating Top-Edge HUD (<= 10% viewport height, zero backdrop-blur) */}
      <div className="relative z-10 flex items-center justify-between gap-4 px-5 py-3 pointer-events-none">
        <div className="flex items-center gap-4 bg-[#070B16]/85 border border-white/15 rounded-xl px-4 py-2 pointer-events-auto">
          <div className="text-xs font-mono">
            <span className="text-slate-400">WAVE </span>
            <strong className="text-amber-400 tabular-nums">
              {hud.wave}/{hud.maxWaves}
            </strong>
          </div>
          <div className="text-xs font-mono">
            <span className="text-slate-400">SCORE </span>
            <strong className="text-white tabular-nums">{hud.score.toLocaleString()}</strong>
          </div>
          <div className="text-xs font-mono">
            <span className="text-slate-400">COMBO </span>
            <strong className="text-pink-400 tabular-nums">×{hud.combo}</strong>
          </div>
          <div className="flex items-center gap-1" aria-label={`Hull integrity ${hud.hp} of ${hud.maxHp}`}>
            {Array.from({ length: hud.maxHp }).map((_, i) => (
              <span
                key={i}
                className={`w-3.5 h-2 rounded-xs ${
                  i < hud.hp ? 'bg-emerald-400' : 'bg-white/15'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            className="p-2 rounded-lg bg-[#070B16]/85 border border-white/15 text-slate-200 hover:text-white"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          {(hud.phase === 'playing' || hud.phase === 'paused') && (
            <button
              type="button"
              onClick={togglePause}
              aria-label={hud.phase === 'paused' ? 'Resume game' : 'Pause game'}
              className="p-2 rounded-lg bg-[#070B16]/85 border border-white/15 text-slate-200 hover:text-white"
            >
              {hud.phase === 'paused' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
          )}
          <button
            type="button"
            onClick={() => onExitRef.current()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#070B16]/85 border border-white/15 text-xs font-semibold text-slate-200 hover:text-white"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit Arena</span>
          </button>
        </div>
      </div>

      {/* Title Screen Overlay */}
      {hud.phase === 'title' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 pointer-events-none">
          <div className="max-w-md w-full text-center space-y-5 bg-[#070B16]/90 border border-white/15 rounded-2xl p-8 pointer-events-auto">
            {/* Custom SVG Title Emblem */}
            <svg viewBox="0 0 320 56" className="w-72 h-14 mx-auto" aria-hidden="true">
              <polygon points="22,8 38,28 22,48 6,28" fill="#2563EB" stroke="#FBBF24" strokeWidth="2" />
              <polygon points="22,16 30,28 22,40 14,28" fill="#67E8F9" />
              <text x="52" y="35" fill="#FFFFFF" fontSize="21" fontWeight="800" fontFamily="Outfit, sans-serif" letterSpacing="1.2">
                SKILL DEFENDER 3D
              </text>
            </svg>

            <p className="text-xs text-slate-300 leading-relaxed">
              Pilot your Vanguard craft, collect Skill Mastery Cores, and clear 3 waves of bug drones to earn Voragen streak points.
            </p>

            <div className="text-[11px] font-mono text-slate-400 space-y-1">
              <p>WASD / Arrows: Move · Space / Click: Pulse Fire · Shift: Dash</p>
              <p>P / Esc: Pause · M: Mute Audio</p>
            </div>

            <button
              type="button"
              data-start="true"
              onClick={startGame}
              className="w-full py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display text-sm font-bold tracking-wide transition-colors"
            >
              Launch Mission (Enter / Space)
            </button>
          </div>
        </div>
      )}

      {/* Pause Overlay */}
      {hud.phase === 'paused' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-6">
          <div className="max-w-sm w-full bg-[#070B16]/95 border border-white/15 rounded-2xl p-7 text-center space-y-4">
            <h2 className="font-display text-2xl font-bold text-white">Mission Paused</h2>
            <p className="text-xs text-slate-300">
              Wave {hud.wave}/{hud.maxWaves} · Score {hud.score.toLocaleString()}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={togglePause}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white"
              >
                Resume
              </button>
              <button
                type="button"
                onClick={startGame}
                className="flex-1 py-2.5 rounded-xl border border-white/20 text-xs font-bold text-slate-200 hover:bg-white/10"
              >
                Restart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Victory / Game Over Modal */}
      {(hud.phase === 'victory' || hud.phase === 'gameover') && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-6">
          <div className="max-w-sm w-full bg-[#070B16]/95 border border-white/15 rounded-2xl p-7 text-center space-y-4">
            <h2
              className={`font-display text-2xl font-bold ${
                hud.phase === 'victory' ? 'text-amber-400' : 'text-pink-400'
              }`}
            >
              {hud.phase === 'victory' ? 'Sector Cleared!' : 'Hull Breached'}
            </h2>
            <p className="text-xs text-slate-300">
              {hud.phase === 'victory'
                ? 'All 3 waves neutralized! Streak points credited to your Voragen profile.'
                : 'Regroup and watch enemy telegraph rings before dashing.'}
            </p>
            <div className="grid grid-cols-2 gap-3 text-left bg-white/5 rounded-xl p-3 text-xs font-mono">
              <div>
                <span className="text-slate-400 block">FINAL SCORE</span>
                <strong className="text-white text-sm">{hud.score.toLocaleString()}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">BEST SCORE</span>
                <strong className="text-amber-400 text-sm">{hud.bestScore.toLocaleString()}</strong>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={startGame}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-xs font-bold text-slate-950"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Play Again</span>
              </button>
              <button
                type="button"
                onClick={() => onExitRef.current()}
                className="flex-1 py-2.5 rounded-xl border border-white/20 text-xs font-bold text-slate-200 hover:bg-white/10"
              >
                Exit Arena
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

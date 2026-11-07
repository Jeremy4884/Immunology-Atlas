import { Billboard, PointerLockControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Cell } from '../data/cells';
import { rng } from '../data/pathogenicity';
import { sfx } from './sfx';
import { ENEMIES, type EnemyKind, type Weapon, weaponFor } from './weapons';
import './game.css';

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Constants ───────────────────────────────────────────────
const EYE = 1.7;
const ARENA = 40;
const MAX_TR = 32;
const MAX_P = 400;
const UP = new THREE.Vector3(0, 1, 0);

// ── Types ───────────────────────────────────────────────────
interface Enemy {
  id: number;
  kind: EnemyKind;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  hp: number;
  maxHp: number;
  radius: number;
  speed: number;
  flash: number;
  phase: number;
  revealed: boolean;
  spawnT: number;
  age: number;
}
interface Pillar { x: number; z: number; r: number; h: number; rot: number }
interface Tracer { from: THREE.Vector3; to: THREE.Vector3; life: number }
interface Particle { pos: THREE.Vector3; vel: THREE.Vector3; life: number; max: number; color: THREE.Color; size: number }
interface Feed { id: number; victim: string; crit: boolean; t: number; color: string }
type UiState = 'intro' | 'playing' | 'paused' | 'dead';
type Phase = 'spawning' | 'fighting' | 'between';

interface Game {
  state: UiState;
  phase: Phase;
  hp: number;
  exh: number;
  boost: number;
  charges: number;
  ammo: number;
  reserve: number;
  reloading: number;
  fireCd: number;
  trigger: boolean;
  firedThisPress: boolean;
  wave: number;
  toSpawn: EnemyKind[];
  spawnCd: number;
  betweenT: number;
  enemies: Enemy[];
  nextId: number;
  score: number;
  kills: number;
  crits: number;
  shots: number;
  hits: number;
  tracers: Tracer[];
  trIdx: number;
  particles: Particle[];
  feed: Feed[];
  msg: { text: string; t: number; tone: 'info' | 'warn' | 'good' } | null;
  hitT: number;
  critT: number;
  hurtT: number;
  recoil: number;
  bloom: number;
  flashT: number;
  vel: THREE.Vector3;
  vy: number;
  onGround: boolean;
  keys: Record<string, boolean>;
  touchMove: { x: number; y: number };
  touchLook: { dx: number; dy: number };
  isSprinting: boolean;
  requestJump: boolean;
  requestReload: boolean;
  requestBoost: boolean;
  time: number;
  hints: Set<string>;
  bob: number;
  started: boolean;
}

interface Hud {
  hp: number;
  exh: number;
  boost: number;
  charges: number;
  ammo: number;
  reserve: number;
  reloadP: number;
  wave: number;
  remaining: number;
  kills: number;
  score: number;
  feed: Feed[];
  msg: Game['msg'];
  hitAge: number;
  critAge: number;
  hurtAge: number;
  gap: number;
  radar: { x: number; y: number; k: EnemyKind }[];
  phase: Phase;
  betweenT: number;
  time: number;
}

function newGame(w: Weapon): Game {
  return {
    state: 'intro', phase: 'between', hp: 100, exh: 0, boost: 0, charges: 2,
    ammo: w.mag, reserve: w.reserve, reloading: 0, fireCd: 0, trigger: false, firedThisPress: false,
    wave: 0, toSpawn: [], spawnCd: 0, betweenT: 0, enemies: [], nextId: 1,
    score: 0, kills: 0, crits: 0, shots: 0, hits: 0,
    tracers: Array.from({ length: MAX_TR }, () => ({ from: new THREE.Vector3(), to: new THREE.Vector3(), life: 0 })),
    trIdx: 0, particles: [], feed: [], msg: null, hitT: -9, critT: -9, hurtT: -9,
    recoil: 0, bloom: 0, flashT: 0, vel: new THREE.Vector3(), vy: 0, onGround: true, keys: {},
    touchMove: { x: 0, y: 0 }, touchLook: { dx: 0, dy: 0 }, isSprinting: false,
    requestJump: false, requestReload: false, requestBoost: false,
    time: 0, hints: new Set(), bob: 0, started: false,
  };
}

// ── Procedural assets ───────────────────────────────────────
function lumpy(seed: number, detail = 4, amp = 0.18, freq = 2.2) {
  const r = rng(seed);
  const o = [r() * 10, r() * 10, r() * 10];
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const n =
      Math.sin(v.x * freq * 1.7 + o[0] + Math.sin(v.y * freq * 2.3)) *
      Math.cos(v.y * freq * 1.3 + o[1] + Math.sin(v.z * freq * 1.9)) *
      Math.sin(v.z * freq * 1.1 + o[2] + Math.cos(v.x * freq * 2.1));
    const s = 1 + amp * n;
    p.setXYZ(i, v.x * s, v.y * s, v.z * s);
  }
  g.computeVertexNormals();
  return g;
}

const GEOS: Record<EnemyKind, THREE.BufferGeometry> = {
  tumor: lumpy(11, 4, 0.24, 2.6),
  stealth: lumpy(23, 4, 0.14, 2.0),
  csc: lumpy(37, 5, 0.26, 1.8),
};
const NUC = lumpy(51, 3, 0.32, 2.6);

function pillarGeometry() {
  let g: THREE.BufferGeometry = new THREE.CylinderGeometry(1, 1.2, 1, 28, 14, false);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x);
    const k = 1 + 0.18 * Math.sin(a * 5 + y * 9) * Math.cos(a * 3 - y * 6) + 0.08 * Math.sin(y * 20 + a * 11);
    p.setXYZ(i, x * k, y, z * k);
  }
  g.computeVertexNormals();
  return g;
}

function tissueTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const x = c.getContext('2d')!;
  x.fillStyle = '#5e1a2e';
  x.fillRect(0, 0, 512, 512);
  const r = rng(99);
  for (let i = 0; i < 260; i++) {
    x.strokeStyle = `rgba(243,209,181,${0.05 + r() * 0.12})`;
    x.lineWidth = 1 + r() * 3;
    x.beginPath();
    const sx = r() * 512, sy = r() * 512;
    x.moveTo(sx, sy);
    x.bezierCurveTo(sx + r() * 120 - 60, sy + r() * 120 - 60, sx + r() * 200 - 100, sy + r() * 200 - 100, sx + r() * 260 - 130, sy + r() * 260 - 130);
    x.stroke();
  }
  for (let i = 0; i < 700; i++) {
    x.fillStyle = `rgba(${(160 + r() * 60) | 0},${(50 + r() * 30) | 0},${(80 + r() * 30) | 0},${0.25 + r() * 0.35})`;
    x.beginPath();
    x.ellipse(r() * 512, r() * 512, 6 + r() * 12, 5 + r() * 9, r() * Math.PI, 0, Math.PI * 2);
    x.fill();
  }
  for (let i = 0; i < 700; i++) {
    x.fillStyle = `rgba(${(50 + r() * 30) | 0},${(15 + r() * 15) | 0},${(60 + r() * 30) | 0},${0.5 + r() * 0.3})`;
    x.beginPath();
    x.ellipse(r() * 512, r() * 512, 2 + r() * 4, 2 + r() * 3, r() * Math.PI, 0, Math.PI * 2);
    x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(10, 10);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function makePillars(): Pillar[] {
  const r = rng(4242);
  const out: Pillar[] = [];
  let guard = 0;
  while (out.length < 16 && guard++ < 800) {
    const a = r() * Math.PI * 2;
    const d = 9 + r() * 27;
    const p = { x: Math.cos(a) * d, z: Math.sin(a) * d, r: 1.4 + r() * 1.8, h: 5 + r() * 8, rot: r() * 6 };
    if (out.every((q) => Math.hypot(q.x - p.x, q.z - p.z) > q.r + p.r + 4)) out.push(p);
  }
  return out;
}

// ── World ───────────────────────────────────────────────────
function Arena({ pillars }: { pillars: Pillar[] }) {
  const tex = useMemo(tissueTexture, []);
  const wallTex = useMemo(() => {
    const t = tissueTexture();
    t.repeat.set(16, 2);
    return t;
  }, []);
  const pg = useMemo(pillarGeometry, []);
  const fibers = useMemo(() => {
    const r = rng(777);
    return Array.from({ length: 36 }, () => {
      const a = r() * Math.PI * 2, d = r() * 36;
      return { p: [Math.cos(a) * d, 0.12 + r() * 0.3, Math.sin(a) * d] as [number, number, number], ry: r() * Math.PI, len: 4 + r() * 9, rad: 0.05 + r() * 0.08 };
    });
  }, []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[ARENA + 2, 64]} />
        <meshStandardMaterial map={tex} roughness={0.85} />
      </mesh>
      <mesh position={[0, 8, 0]}>
        <cylinderGeometry args={[ARENA + 2, ARENA + 2, 16, 64, 1, true]} />
        <meshStandardMaterial map={wallTex} side={THREE.BackSide} roughness={0.9} color="#c47a8c" />
      </mesh>
      {pillars.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]} rotation={[0, p.rot, 0]}>
          <mesh geometry={pg} position={[0, p.h / 2, 0]} scale={[p.r, p.h, p.r]} castShadow>
            <meshStandardMaterial color="#8a2443" roughness={0.55} emissive="#3d0716" emissiveIntensity={0.4} />
          </mesh>
          {[0, 1, 2].map((k) => (
            <mesh key={k} geometry={GEOS.tumor} position={[Math.cos(k * 2.1) * p.r * 0.7, p.h + 0.2 - k * 0.5, Math.sin(k * 2.1) * p.r * 0.7]} scale={p.r * 0.55}>
              <meshStandardMaterial color="#a8325a" roughness={0.5} />
            </mesh>
          ))}
        </group>
      ))}
      {fibers.map((f, i) => (
        <mesh key={i} position={f.p} rotation={[0, f.ry, Math.PI / 2]}>
          <cylinderGeometry args={[f.rad, f.rad, f.len, 6]} />
          <meshStandardMaterial color="#f0d2b0" roughness={0.6} emissive="#5c3a20" emissiveIntensity={0.2} />
        </mesh>
      ))}
    </group>
  );
}

function RBCs({ curve }: { curve: THREE.CatmullRomCurve3 }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const N = 36;
  const data = useMemo(() => {
    const r = rng(curve.points.length * 13);
    return Array.from({ length: N }, (_, i) => ({
      t: i / N + r() * 0.02,
      off: new THREE.Vector3((r() - 0.5) * 1.1, (r() - 0.5) * 1.1, (r() - 0.5) * 1.1),
      spin: r() * 6,
    }));
  }, [curve]);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const e = useMemo(() => new THREE.Euler(), []);
  const s = useMemo(() => new THREE.Vector3(0.38, 0.13, 0.38), []);
  useFrame((st, dt) => {
    const im = ref.current;
    if (!im) return;
    data.forEach((d, i) => {
      d.t = (d.t + dt * 0.035) % 1;
      const p = curve.getPointAt(d.t).add(d.off);
      e.set(d.spin + st.clock.elapsedTime, d.spin, 0);
      q.setFromEuler(e);
      m.compose(p, q, s);
      im.setMatrixAt(i, m);
    });
    im.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]}>
      <sphereGeometry args={[1, 14, 8]} />
      <meshStandardMaterial color="#dc2626" roughness={0.35} emissive="#450a0a" emissiveIntensity={0.5} />
    </instancedMesh>
  );
}

function Vessels() {
  const curves = useMemo(() => {
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    return [
      new THREE.CatmullRomCurve3([v(-46, 7, -22), v(-14, 9, -6), v(12, 7.5, -26), v(46, 8.5, -12)]),
      new THREE.CatmullRomCurve3([v(-40, 10, 30), v(-8, 8, 12), v(18, 10, 22), v(44, 9, 4)]),
      new THREE.CatmullRomCurve3([v(10, 11, -44), v(4, 9.5, -10), v(-6, 10.5, 16), v(-2, 9, 46)]),
    ];
  }, []);
  return (
    <>
      {curves.map((c, i) => (
        <group key={i}>
          <mesh>
            <tubeGeometry args={[c, 96, 1.15, 18, false]} />
            <meshPhysicalMaterial
              color="#c0263f" transparent opacity={0.38} roughness={0.15} emissive="#5c0a17"
              emissiveIntensity={0.5} side={THREE.DoubleSide} depthWrite={false}
            />
          </mesh>
          <RBCs curve={c} />
        </group>
      ))}
    </>
  );
}

function Cytokines() {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const r = rng(31);
    const pos = new Float32Array(600 * 3);
    for (let i = 0; i < 600; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * ARENA;
      pos.set([Math.cos(a) * d, 0.3 + r() * 12, Math.sin(a) * d], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.01;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.08} color="#ffd1dc" transparent opacity={0.55} depthWrite={false} />
    </points>
  );
}

// ── Enemies ─────────────────────────────────────────────────
function EnemyMesh({ e }: { e: Enemy }) {
  const g = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const bar = useRef<THREE.Mesh>(null);
  const def = ENEMIES[e.kind];
  useFrame((s) => {
    const grp = g.current;
    if (!grp) return;
    const t = s.clock.elapsedTime;
    grp.position.copy(e.pos);
    grp.rotation.y = t * 0.4 + e.phase;
    grp.rotation.z = Math.sin(t + e.phase) * 0.15;
    const pulse = e.kind === 'csc' ? 1 + Math.sin(t * 3) * 0.05 : 1 + Math.sin(t * 2 + e.phase) * 0.025;
    grp.scale.setScalar(e.radius * pulse * Math.min(1, e.age * 2.5 + 0.05));
    if (mat.current) {
      mat.current.emissiveIntensity = 0.3 + e.flash * 3;
      mat.current.opacity = e.kind === 'stealth' && !e.revealed ? 0.26 + Math.sin(t * 4 + e.phase) * 0.08 : 0.92;
    }
    if (bar.current) {
      const k = Math.max(0.001, e.hp / e.maxHp);
      bar.current.scale.x = k;
      bar.current.position.x = -(1 - k) * 0.6;
    }
  });
  return (
    <group ref={g}>
      <mesh geometry={GEOS[e.kind]}>
        <meshStandardMaterial
          ref={mat} color={def.color} emissive={def.emissive} emissiveIntensity={0.3}
          roughness={0.4} transparent opacity={0.92}
        />
      </mesh>
      <mesh geometry={NUC} scale={0.48}>
        <meshStandardMaterial color={def.nucleus} roughness={0.6} />
      </mesh>
      <Billboard position={[0, 1.45, 0]}>
        <mesh>
          <planeGeometry args={[1.2, 0.1]} />
          <meshBasicMaterial color="#000" transparent opacity={0.5} depthWrite={false} />
        </mesh>
        <mesh ref={bar} position={[0, 0, 0.001]}>
          <planeGeometry args={[1.2, 0.1]} />
          <meshBasicMaterial color={def.bar} depthWrite={false} />
        </mesh>
      </Billboard>
    </group>
  );
}

function EnemiesView({ game, version }: { game: Game; version: number }) {
  void version; // re-render trigger when enemies spawn/die
  return (
    <>
      {game.enemies.map((e) => (
        <EnemyMesh key={e.id} e={e} />
      ))}
    </>
  );
}

// ── FX: tracers + particles ────────────────────────────────
function Effects({ game, color }: { game: Game; color: string }) {
  const tr = useRef<(THREE.Mesh | null)[]>([]);
  const pRef = useRef<THREE.InstancedMesh>(null);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const mat4 = useMemo(() => new THREE.Matrix4(), []);
  const q0 = useMemo(() => new THREE.Quaternion(), []);
  const sc = useMemo(() => new THREE.Vector3(), []);

  useLayoutEffect(() => {
    const im = pRef.current;
    if (!im) return;
    const c = new THREE.Color('#fff');
    for (let i = 0; i < MAX_P; i++) im.setColorAt(i, c);
    im.count = 0;
  }, []);

  useFrame((_, dt) => {
    for (let i = 0; i < MAX_TR; i++) {
      const m = tr.current[i];
      const t = game.tracers[i];
      if (!m) continue;
      if (t.life <= 0) {
        m.visible = false;
        continue;
      }
      t.life -= dt;
      m.visible = true;
      tmp.subVectors(t.to, t.from);
      const len = tmp.length();
      m.position.copy(t.from).addScaledVector(tmp, 0.5);
      m.quaternion.setFromUnitVectors(UP, tmp.normalize());
      m.scale.set(1, len, 1);
      (m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, t.life / 0.09);
    }
    const im = pRef.current;
    if (!im) return;
    let n = 0;
    for (const p of game.particles) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.vel.y -= 5 * dt;
      p.vel.multiplyScalar(1 - dt * 1.5);
      p.pos.addScaledVector(p.vel, dt);
      if (p.pos.y < 0.05) {
        p.pos.y = 0.05;
        p.vel.y *= -0.3;
      }
      const s = p.size * Math.max(0, p.life / p.max);
      mat4.compose(p.pos, q0, sc.set(s, s, s));
      im.setMatrixAt(n, mat4);
      im.setColorAt(n, p.color);
      if (++n >= MAX_P) break;
    }
    if (game.particles.length > MAX_P * 1.5) game.particles = game.particles.filter((p) => p.life > 0);
    im.count = n;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  });

  return (
    <>
      {Array.from({ length: MAX_TR }).map((_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            tr.current[i] = m;
          }}
          visible={false}
        >
          <cylinderGeometry args={[0.014, 0.014, 1, 6]} />
          <meshBasicMaterial color={color} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
      <instancedMesh ref={pRef} args={[undefined, undefined, MAX_P]} frustumCulled={false}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial roughness={0.4} />
      </instancedMesh>
    </>
  );
}

// ── First-person viewmodel (the "gun") ──────────────────────
function ViewModel({ game, weapon, cellColor }: { game: Game; weapon: Weapon; cellColor: string }) {
  const root = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const tip = useRef<THREE.MeshStandardMaterial>(null);
  const flash = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const gran = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame((s) => {
    const r = root.current, i = inner.current;
    if (!r || !i) return;
    r.position.copy(camera.position);
    r.quaternion.copy(camera.quaternion);
    const sp = Math.min(1, game.vel.length() / 6);
    const bx = Math.sin(game.bob * 1.1) * 0.014 * sp;
    const by = Math.abs(Math.cos(game.bob * 1.1)) * 0.016 * sp;
    const rp = game.reloading > 0 ? 1 - game.reloading / weapon.reloadTime : 1;
    const dip = game.reloading > 0 ? Math.sin(rp * Math.PI) * 0.22 : 0;
    i.position.set(0.3 + bx, -0.3 + by - dip, -0.62 + game.recoil * 0.1);
    i.rotation.set(game.recoil * 0.22 - dip * 0.9, 0.07, dip * 0.6);
    if (tip.current) tip.current.emissiveIntensity = 1.3 + Math.sin(s.clock.elapsedTime * 6) * 0.4;
    if (gran.current) gran.current.rotation.z = s.clock.elapsedTime * 2;
    const f = Math.max(0, game.flashT);
    if (flash.current) {
      flash.current.visible = f > 0;
      flash.current.scale.setScalar(0.05 + f * 2.4);
      flash.current.rotation.z = Math.random() * 6;
    }
    if (light.current) light.current.intensity = f * 80;
  });

  const ts = weapon.tipSize;
  return (
    <group ref={root}>
      <group ref={inner}>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.18]} renderOrder={999}>
          <capsuleGeometry args={[0.075, 0.55, 8, 16]} />
          <meshStandardMaterial color={cellColor} roughness={0.3} depthTest={false} transparent opacity={0.96} />
        </mesh>
        <mesh position={[0, 0, -0.16]} renderOrder={999}>
          <sphereGeometry args={[0.095, 20, 20]} />
          <meshStandardMaterial color={cellColor} roughness={0.25} depthTest={false} transparent opacity={0.85} />
        </mesh>
        <mesh position={[0, 0, -0.24]} renderOrder={1000}>
          <sphereGeometry args={[ts, 24, 24]} />
          <meshStandardMaterial ref={tip} color={weapon.color} emissive={weapon.color} emissiveIntensity={1.3} depthTest={false} transparent />
        </mesh>
        <group ref={gran} position={[0, 0, -0.2]}>
          {Array.from({ length: 6 }).map((_, k) => (
            <mesh key={k} position={[Math.cos(k) * ts * 1.5, Math.sin(k) * ts * 1.5, 0]} renderOrder={1001}>
              <sphereGeometry args={[0.018, 8, 8]} />
              <meshBasicMaterial color={weapon.color} depthTest={false} transparent />
            </mesh>
          ))}
        </group>
        <mesh ref={flash} position={[0, 0, -0.36]} renderOrder={1002} visible={false}>
          <icosahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color={weapon.color} transparent opacity={0.85} blending={THREE.AdditiveBlending} depthTest={false} />
        </mesh>
        <pointLight ref={light} position={[0, 0, -0.45]} color={weapon.color} distance={8} intensity={0} />
      </group>
    </group>
  );
}

// ── Core game loop ──────────────────────────────────────────
interface LogicProps {
  game: Game;
  weapon: Weapon;
  cell: Cell;
  pillars: Pillar[];
  setHud: (h: Hud) => void;
  bump: () => void;
  onDead: () => void;
}

function Logic({ game: g, weapon, cell, pillars, setHud, bump, onDead }: LogicProps) {
  const { camera } = useThree();
  const tmp = useMemo(
    () => ({
      fwd: new THREE.Vector3(), right: new THREE.Vector3(), wish: new THREE.Vector3(), dir: new THREE.Vector3(),
      oc: new THREE.Vector3(), e: new THREE.Euler(0, 0, 0, 'YXZ'), muzzle: new THREE.Vector3(), hp: new THREE.Vector3(),
    }),
    [],
  );
  const hudT = useRef(0);
  const r = useMemo(() => rng(Date.now() & 0xffff), []);

  const say = useCallback((text: string, tone: 'info' | 'warn' | 'good' = 'info') => {
    g.msg = { text, t: g.time, tone };
  }, [g]);
  const hint = useCallback((key: string, text: string, tone: 'info' | 'warn' | 'good' = 'warn') => {
    if (g.hints.has(key)) return;
    g.hints.add(key);
    say(text, tone);
  }, [g, say]);

  const burst = useCallback((at: THREE.Vector3, color: string, n: number, speed: number, size: number) => {
    const c = new THREE.Color(color);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3(r() - 0.5, r() * 0.9, r() - 0.5).normalize().multiplyScalar(speed * (0.4 + r()));
      const life = 0.5 + r() * 0.9;
      g.particles.push({ pos: at.clone(), vel: v, life, max: life, color: c, size: size * (0.5 + r()) });
    }
  }, [g, r]);

  const spawn = useCallback((kind: EnemyKind, near?: THREE.Vector3) => {
    const def = ENEMIES[kind];
    const pos = new THREE.Vector3();
    for (let tries = 0; tries < 30; tries++) {
      if (near) {
        const a = r() * Math.PI * 2;
        pos.set(near.x + Math.cos(a) * 2.5, def.y, near.z + Math.sin(a) * 2.5);
      } else {
        const a = r() * Math.PI * 2, d = 26 + r() * 11;
        pos.set(Math.cos(a) * d, def.y, Math.sin(a) * d);
      }
      const free = pillars.every((p) => Math.hypot(p.x - pos.x, p.z - pos.z) > p.r + def.radius + 0.5);
      const far = near || Math.hypot(pos.x - camera.position.x, pos.z - camera.position.z) > 16;
      if (free && far) break;
    }
    const hpScale = 1 + Math.max(0, g.wave - 1) * 0.08;
    g.enemies.push({
      id: g.nextId++, kind, pos, vel: new THREE.Vector3(), hp: def.hp * hpScale, maxHp: def.hp * hpScale,
      radius: def.radius, speed: def.speed * (1 + Math.min(0.5, g.wave * 0.03)), flash: 0, phase: r() * 6,
      revealed: false, spawnT: 6, age: 0,
    });
    if (kind === 'csc') hint('csc', '⚠ CANCER STEM CELL — it self-renews and spawns new tumour cells!', 'warn');
    bump();
  }, [g, r, pillars, camera, hint, bump]);

  const startWave = useCallback((w: number) => {
    g.wave = w;
    const n = 4 + w * 3;
    const list: EnemyKind[] = [];
    const stealthP = w >= 2 ? Math.min(0.45, 0.15 + w * 0.06) : 0;
    for (let i = 0; i < n; i++) list.push(r() < stealthP ? 'stealth' : 'tumor');
    if (w % 3 === 0) for (let k = 0; k < Math.floor(w / 3); k++) list.push('csc');
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    g.toSpawn = list;
    g.spawnCd = 0.5;
    g.phase = 'spawning';
    g.charges = Math.min(3, g.charges + (w > 1 ? 1 : 0));
    if (w > 1) g.reserve += weapon.mag;
    say(`ROUND ${w} — ${list.length} tumour cells infiltrating`, 'warn');
    sfx.wave();
  }, [g, r, say, weapon.mag]);

  const startReload = useCallback(() => {
    if (g.reloading > 0 || g.ammo >= weapon.mag || g.reserve <= 0) return;
    g.reloading = weapon.reloadTime;
    sfx.reload();
  }, [g, weapon]);

  const useBoost = useCallback(() => {
    if (g.charges <= 0 || g.state !== 'playing') return;
    g.charges--;
    g.exh = 0;
    g.boost = 8;
    say('💉 ANTI-PD-1 — checkpoint released! Exhaustion immune for 8 s', 'good');
    sfx.boost();
  }, [g, say]);

  const kill = useCallback((e: Enemy, crit: boolean) => {
    const def = ENEMIES[e.kind];
    g.enemies = g.enemies.filter((x) => x !== e);
    g.kills++;
    g.score += Math.round(def.score * (crit ? 1.5 : 1));
    g.feed.push({ id: g.nextId++, victim: def.name, crit, t: g.time, color: def.bar });
    if (g.feed.length > 8) g.feed.shift();
    burst(e.pos, def.color, e.kind === 'csc' ? 60 : 24, 6, e.kind === 'csc' ? 0.22 : 0.13);
    burst(e.pos, def.nucleus, 8, 3, 0.1);
    sfx.kill();
    bump();
  }, [g, burst, bump]);

  const damage = useCallback((e: Enemy, base: number, crit: boolean) => {
    let mult = crit ? 2 : 1;
    if (g.exh >= 100 && g.boost <= 0) mult *= 0.5;
    if (e.kind === 'stealth' && !e.revealed) {
      if (weapon.revealsMhc) {
        e.revealed = true;
        hint('reveal', '🧬 IFN-γ up-regulated MHC-I — tumour is now visible to T cells!', 'good');
      } else if (weapon.missingSelf) {
        mult *= 1.5;
        hint('missing', '✅ MISSING-SELF detected — NK bonus ×1.5 vs MHC-I-low tumours', 'good');
      } else if (!weapon.mhcIndependent) {
        mult *= 0.25;
        hint('stealth', '⚠ MHC-I-LOW tumour — your TCR can’t see it (25 % damage). NK cells excel here!', 'warn');
      }
    }
    e.hp -= base * mult;
    e.flash = 1;
    if (e.hp <= 0) kill(e, crit);
  }, [g, weapon, hint, kill]);

  const fire = useCallback(() => {
    g.ammo--;
    g.shots++;
    g.flashT = 0.06;
    g.recoil = Math.min(1, g.recoil + (weapon.pellets > 1 || weapon.damage > 60 ? 0.9 : 0.35));
    sfx.shot(weapon.pellets > 1 || weapon.damage > 60);

    camera.getWorldDirection(tmp.fwd);
    tmp.right.crossVectors(tmp.fwd, UP).normalize();
    const camUp = new THREE.Vector3().crossVectors(tmp.right, tmp.fwd).normalize();
    tmp.muzzle.set(0.3, -0.28, -0.9);
    camera.localToWorld(tmp.muzzle);

    const moving = Math.min(1, g.vel.length() / 6);
    const spread = weapon.spread + moving * 0.03 + (g.onGround ? 0 : 0.06) + g.bloom;
    let anyHit = false;
    let anyCrit = false;

    for (let k = 0; k < weapon.pellets; k++) {
      const a = r() * Math.PI * 2, m = Math.sqrt(r()) * spread;
      tmp.dir.copy(tmp.fwd).addScaledVector(tmp.right, Math.cos(a) * m).addScaledVector(camUp, Math.sin(a) * m).normalize();
      const o = camera.position;
      let best: Enemy | null = null;
      let bestT = weapon.range;
      let crit = false;
      for (const e of g.enemies) {
        tmp.oc.subVectors(e.pos, o);
        const t = tmp.oc.dot(tmp.dir);
        if (t < 0 || t > bestT + e.radius) continue;
        const d2 = tmp.oc.lengthSq() - t * t;
        const rr = e.radius * 0.95;
        if (d2 > rr * rr) continue;
        const th = t - Math.sqrt(rr * rr - d2);
        if (th < bestT) {
          bestT = th;
          best = e;
          crit = d2 < (rr * 0.38) ** 2;
        }
      }
      // tumour nests (pillars) block shots
      for (const p of pillars) {
        const dx = o.x - p.x, dz = o.z - p.z;
        const a2 = tmp.dir.x ** 2 + tmp.dir.z ** 2;
        const b = 2 * (dx * tmp.dir.x + dz * tmp.dir.z);
        const c = dx * dx + dz * dz - p.r * p.r;
        const disc = b * b - 4 * a2 * c;
        if (disc < 0 || a2 < 1e-6) continue;
        const t = (-b - Math.sqrt(disc)) / (2 * a2);
        if (t > 0 && t < bestT && o.y + tmp.dir.y * t < p.h) {
          bestT = t;
          best = null;
        }
      }
      tmp.hp.copy(camera.position).addScaledVector(tmp.dir, bestT);
      const tr = g.tracers[g.trIdx];
      g.trIdx = (g.trIdx + 1) % MAX_TR;
      tr.from.copy(tmp.muzzle);
      tr.to.copy(tmp.hp);
      tr.life = 0.09;

      if (best) {
        anyHit = true;
        anyCrit ||= crit;
        burst(tmp.hp, crit ? '#fde047' : weapon.color, 4, 3, 0.06);
        if (weapon.aoe) {
          burst(tmp.hp, weapon.color, 30, 8, 0.14);
          for (const e of [...g.enemies]) {
            const d = e.pos.distanceTo(tmp.hp);
            if (d < weapon.aoe + e.radius) damage(e, weapon.damage * Math.max(0.3, 1 - d / (weapon.aoe + e.radius)), crit && e === best);
          }
        } else damage(best, weapon.damage, crit);
      } else if (bestT < weapon.range) {
        burst(tmp.hp, '#f0abfc', 3, 2, 0.05);
        if (weapon.aoe) {
          burst(tmp.hp, weapon.color, 24, 7, 0.12);
          for (const e of [...g.enemies]) {
            const d = e.pos.distanceTo(tmp.hp);
            if (d < weapon.aoe + e.radius) damage(e, weapon.damage * Math.max(0.3, 1 - d / (weapon.aoe + e.radius)), false);
          }
        }
      }
    }
    if (anyHit) {
      g.hits++;
      g.hitT = g.time;
      if (anyCrit) {
        g.critT = g.time;
        g.crits++;
        sfx.crit();
      } else sfx.hit();
    }
    g.bloom = Math.min(0.08, g.bloom + weapon.spread * 0.6 + 0.004);

    // camera kick
    tmp.e.setFromQuaternion(camera.quaternion);
    tmp.e.x = Math.min(Math.PI / 2 - 0.01, tmp.e.x + (weapon.damage > 60 || weapon.pellets > 1 ? 0.035 : 0.008));
    tmp.e.y += (r() - 0.5) * 0.006;
    camera.quaternion.setFromEuler(tmp.e);
  }, [g, weapon, camera, tmp, r, pillars, burst, damage]);

  // ── Input ──
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      g.keys[e.code] = true;
      if (g.state !== 'playing') return;
      if (e.code === 'KeyR') startReload();
      if (e.code === 'KeyQ') useBoost();
      if (e.code === 'Space') e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      g.keys[e.code] = false;
    };
    const md = (e: MouseEvent) => {
      if (e.button !== 0 || !document.pointerLockElement || g.state !== 'playing') return;
      g.trigger = true;
      g.firedThisPress = false;
    };
    const mu = (e: MouseEvent) => {
      if (e.button === 0) g.trigger = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    document.addEventListener('mousedown', md);
    document.addEventListener('mouseup', mu);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      document.removeEventListener('mousedown', md);
      document.removeEventListener('mouseup', mu);
    };
  }, [g, startReload, useBoost]);

  useEffect(() => {
    camera.position.set(0, EYE, 0);
    camera.rotation.set(0, 0, 0);
  }, [camera]);

  // ── Frame ──
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    g.time += dt;

    if (g.state === 'playing') {
      if (!g.started) {
        g.started = true;
        startWave(1);
      }

      // mobile actions
      if (g.requestReload) {
        g.requestReload = false;
        startReload();
      }
      if (g.requestBoost) {
        g.requestBoost = false;
        useBoost();
      }

      // touch look (aiming)
      if (g.touchLook && (g.touchLook.dx !== 0 || g.touchLook.dy !== 0)) {
        tmp.e.setFromQuaternion(camera.quaternion, 'YXZ');
        tmp.e.y -= g.touchLook.dx * 0.0035;
        tmp.e.x -= g.touchLook.dy * 0.0035;
        tmp.e.x = Math.max(-1.45, Math.min(1.45, tmp.e.x));
        tmp.e.z = 0;
        camera.quaternion.setFromEuler(tmp.e);
        g.touchLook.dx = 0;
        g.touchLook.dy = 0;
      }

      // movement
      const k = g.keys;
      camera.getWorldDirection(tmp.fwd);
      tmp.fwd.y = 0;
      tmp.fwd.normalize();
      tmp.right.crossVectors(tmp.fwd, UP).normalize();
      tmp.wish.set(0, 0, 0);
      if (k.KeyW || k.ArrowUp) tmp.wish.add(tmp.fwd);
      if (k.KeyS || k.ArrowDown) tmp.wish.sub(tmp.fwd);
      if (k.KeyD || k.ArrowRight) tmp.wish.add(tmp.right);
      if (k.KeyA || k.ArrowLeft) tmp.wish.sub(tmp.right);
      if (g.touchMove && (g.touchMove.x !== 0 || g.touchMove.y !== 0)) {
        tmp.wish.addScaledVector(tmp.fwd, g.touchMove.y);
        tmp.wish.addScaledVector(tmp.right, g.touchMove.x);
      }
      const isSprint = k.ShiftLeft || k.ShiftRight || g.isSprinting;
      const speed = isSprint ? 9.5 : 6.2;
      if (tmp.wish.lengthSq() > 0) {
        if (tmp.wish.lengthSq() > 1) tmp.wish.normalize();
        tmp.wish.multiplyScalar(speed);
      }
      g.vel.lerp(tmp.wish, 1 - Math.exp(-(g.onGround ? 12 : 3) * dt));
      camera.position.addScaledVector(g.vel, dt);
      g.bob += g.vel.length() * dt * 1.6;
      if ((k.Space || g.requestJump) && g.onGround) {
        g.requestJump = false;
        g.vy = 7.2;
        g.onGround = false;
        sfx.jump();
      }
      g.vy -= 22 * dt;
      camera.position.y += g.vy * dt;
      if (camera.position.y <= EYE) {
        camera.position.y = EYE;
        g.vy = 0;
        g.onGround = true;
      }
      // collisions
      const p = camera.position;
      const rd = Math.hypot(p.x, p.z);
      if (rd > ARENA - 1) {
        p.x *= (ARENA - 1) / rd;
        p.z *= (ARENA - 1) / rd;
      }
      for (const pl of pillars) {
        const dx = p.x - pl.x, dz = p.z - pl.z;
        const d = Math.hypot(dx, dz);
        const min = pl.r + 0.55;
        if (d < min && p.y < pl.h + EYE) {
          p.x = pl.x + (dx / d) * min;
          p.z = pl.z + (dz / d) * min;
        }
      }

      // weapon state
      g.fireCd -= dt;
      g.flashT -= dt;
      g.recoil = Math.max(0, g.recoil - dt * 5);
      g.bloom = Math.max(0, g.bloom - dt * 0.12);
      if (g.reloading > 0) {
        g.reloading -= dt;
        if (g.reloading <= 0) {
          const take = Math.min(weapon.mag - g.ammo, g.reserve);
          g.ammo += take;
          g.reserve -= take;
          g.reloading = 0;
        }
      }
      const exhausted = g.exh >= 100 && g.boost <= 0;
      if (g.trigger && (weapon.auto || !g.firedThisPress) && g.fireCd <= 0 && g.reloading <= 0) {
        if (g.ammo <= 0) {
          if (g.reserve > 0) startReload();
          else if (!g.firedThisPress) {
            sfx.empty();
            say('Out of granules — survive until next round for resupply', 'warn');
          }
          g.firedThisPress = true;
        } else {
          fire();
          g.firedThisPress = true;
          g.fireCd = 60 / (weapon.rpm * (exhausted ? 0.7 : 1));
          if (g.ammo === 0 && g.reserve > 0) startReload();
        }
      }

      // enemies
      let near = 0;
      const pp = camera.position;
      for (const e of [...g.enemies]) {
        e.age += dt;
        e.flash = Math.max(0, e.flash - dt * 5);
        const dx = pp.x - e.pos.x, dz = pp.z - e.pos.z;
        const dist = Math.hypot(dx, dz) || 1;
        tmp.wish.set((dx / dist) * e.speed, 0, (dz / dist) * e.speed);
        for (const o of g.enemies) {
          if (o === e) continue;
          const ox = e.pos.x - o.pos.x, oz = e.pos.z - o.pos.z;
          const od = Math.hypot(ox, oz);
          const min = e.radius + o.radius + 0.3;
          if (od < min && od > 0.001) {
            tmp.wish.x += (ox / od) * (min - od) * 4;
            tmp.wish.z += (oz / od) * (min - od) * 4;
          }
        }
        for (const pl of pillars) {
          const ox = e.pos.x - pl.x, oz = e.pos.z - pl.z;
          const od = Math.hypot(ox, oz);
          const min = pl.r + e.radius + 1.2;
          if (od < min) {
            tmp.wish.x += (ox / od) * (min - od) * 3 + (-oz / od) * 1.5;
            tmp.wish.z += (oz / od) * (min - od) * 3 + (ox / od) * 1.5;
          }
        }
        e.vel.lerp(tmp.wish, 1 - Math.exp(-3 * dt));
        if (dist < e.radius + 0.6) e.vel.multiplyScalar(0.2);
        e.pos.x += e.vel.x * dt;
        e.pos.z += e.vel.z * dt;
        for (const pl of pillars) {
          const ox = e.pos.x - pl.x, oz = e.pos.z - pl.z;
          const od = Math.hypot(ox, oz);
          const min = pl.r + e.radius;
          if (od < min) {
            e.pos.x = pl.x + (ox / od) * min;
            e.pos.z = pl.z + (oz / od) * min;
          }
        }
        e.pos.y = ENEMIES[e.kind].y + Math.sin(g.time * 2 + e.phase) * 0.18;

        if (dist < e.radius + 0.75) {
          g.hp -= ENEMIES[e.kind].dps * dt;
          if (g.time - g.hurtT > 0.35) {
            g.hurtT = g.time;
            sfx.hurt();
          }
        }
        if (dist < 7) near += e.kind === 'csc' ? 2 : 1;
        if (e.kind === 'csc') {
          e.spawnT -= dt;
          if (e.spawnT <= 0 && g.enemies.length < 40) {
            e.spawnT = 7;
            spawn('tumor', e.pos);
          }
        }
      }

      // PD-1 / PD-L1 exhaustion
      g.boost = Math.max(0, g.boost - dt);
      if (g.boost > 0) g.exh = 0;
      else if (near > 0) g.exh = Math.min(100, g.exh + near * 6 * dt);
      else g.exh = Math.max(0, g.exh - 7 * dt);
      if (g.exh >= 100) hint('exh', '😵 T-CELL EXHAUSTED (PD-1/PD-L1) — damage ×0.5. Press Q for anti-PD-1!', 'warn');

      // waves
      if (g.phase === 'spawning') {
        g.spawnCd -= dt;
        if (g.spawnCd <= 0 && g.toSpawn.length) {
          spawn(g.toSpawn.pop()!);
          g.spawnCd = 0.7;
        }
        if (!g.toSpawn.length) g.phase = 'fighting';
      } else if (g.phase === 'fighting' && g.enemies.length === 0) {
        g.phase = 'between';
        g.betweenT = 5;
        g.score += 250 * g.wave;
        g.hp = Math.min(100, g.hp + 25);
        say(`✔ ROUND ${g.wave} CLEARED — +${250 * g.wave} · Viability +25`, 'good');
      } else if (g.phase === 'between') {
        g.betweenT -= dt;
        if (g.betweenT <= 0) startWave(g.wave + 1);
      }

      if (g.hp <= 0) {
        g.hp = 0;
        g.state = 'dead';
        g.trigger = false;
        onDead();
      }
    }

    // HUD snapshot @ 20 Hz
    hudT.current -= rawDt;
    if (hudT.current <= 0) {
      hudT.current = 0.05;
      camera.getWorldDirection(tmp.fwd);
      tmp.fwd.y = 0;
      tmp.fwd.normalize();
      tmp.right.crossVectors(tmp.fwd, UP).normalize();
      const radar: Hud['radar'] = [];
      for (const e of g.enemies) {
        tmp.oc.subVectors(e.pos, camera.position);
        const lx = tmp.oc.dot(tmp.right), ly = tmp.oc.dot(tmp.fwd);
        if (Math.hypot(lx, ly) < 34) radar.push({ x: lx, y: ly, k: e.kind });
      }
      const moving = Math.min(1, g.vel.length() / 6);
      const spread = weapon.spread + moving * 0.03 + (g.onGround ? 0 : 0.06) + g.bloom;
      setHud({
        hp: g.hp, exh: g.exh, boost: g.boost, charges: g.charges, ammo: g.ammo, reserve: g.reserve,
        reloadP: g.reloading > 0 ? 1 - g.reloading / weapon.reloadTime : -1,
        wave: g.wave, remaining: g.enemies.length + g.toSpawn.length, kills: g.kills, score: g.score,
        feed: g.feed.filter((f) => g.time - f.t < 5), msg: g.msg && g.time - g.msg.t < 3 ? g.msg : null,
        hitAge: g.time - g.hitT, critAge: g.time - g.critT, hurtAge: g.time - g.hurtT,
        gap: 5 + spread * 520, radar, phase: g.phase, betweenT: g.betweenT, time: g.time,
      });
    }
  });

  void cell;
  return null;
}

// ── HUD ─────────────────────────────────────────────────────
function HudView({ hud, cell, weapon }: { hud: Hud; cell: Cell; weapon: Weapon }) {
  const R = 72;
  const exhausted = hud.exh >= 100 && hud.boost <= 0;
  return (
    <div className="hud">
      {/* vignettes */}
      <div className="vig-hurt" style={{ opacity: hud.hurtAge < 0.4 ? 0.9 - hud.hurtAge * 2 : hud.hp < 30 ? 0.35 : 0 }} />
      <div className="vig-exh" style={{ opacity: exhausted ? 0.75 : hud.exh / 220 }} />
      {hud.boost > 0 && <div className="vig-boost" />}

      {/* top-centre scoreboard */}
      <div className="hud-top">
        <div className="team ct">
          <span>IMMUNE</span>
          <b>{hud.kills}</b>
        </div>
        <div className="round">
          <span>ROUND {hud.wave}</span>
          <b>{hud.phase === 'between' ? `0:0${Math.max(0, Math.ceil(hud.betweenT))}` : `${hud.remaining}`}</b>
          <small>{hud.phase === 'between' ? 'next wave' : 'tumour left'}</small>
        </div>
        <div className="team t">
          <b>{hud.remaining}</b>
          <span>TUMOUR</span>
        </div>
      </div>

      {/* radar */}
      <div className="radar">
        <svg viewBox={`${-R} ${-R} ${R * 2} ${R * 2}`}>
          <circle r={R - 1} className="radar-bg" />
          <circle r={R * 0.5} className="radar-ring" />
          <path d={`M0,0 L${-R * 0.42},${-R} A${R},${R} 0 0 1 ${R * 0.42},${-R} Z`} className="radar-fov" />
          {hud.radar.map((p, i) => (
            <circle
              key={i}
              cx={(p.x / 34) * R}
              cy={(-p.y / 34) * R}
              r={p.k === 'csc' ? 5 : 3}
              className={'radar-dot ' + p.k}
            />
          ))}
          <path d="M0,-6 L4,4 L0,2 L-4,4 Z" fill="#fff" />
        </svg>
        <div className="score-tag">{hud.score.toLocaleString()} pts</div>
      </div>

      {/* kill feed */}
      <div className="killfeed">
        {hud.feed.map((f) => (
          <div key={f.id} className={'kf' + (f.crit ? ' crit' : '')}>
            <span className="kf-a">{cell.name}</span>
            <span className="kf-w" style={{ color: weapon.color }}>
              ⟶ {weapon.name}
            </span>
            {f.crit && <span className="kf-hs" title="Nucleus hit">◎</span>}
            <span className="kf-v" style={{ color: f.color }}>
              {f.victim}
            </span>
          </div>
        ))}
      </div>

      {/* crosshair */}
      <div className="xhair" style={{ ['--gap' as string]: `${hud.gap}px` }}>
        <i className="l" />
        <i className="r" />
        <i className="t" />
        <i className="b" />
        <span className="dot" />
        {hud.hitAge < 0.14 && <div className={'hitmark' + (hud.critAge < 0.14 ? ' crit' : '')} />}
      </div>

      {/* centre message */}
      {hud.msg && <div className={'center-msg ' + hud.msg.tone} key={hud.msg.t}>{hud.msg.text}</div>}
      {hud.reloadP >= 0 && (
        <div className="reload-ring">
          <svg viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="16" className="rr-bg" />
            <circle cx="20" cy="20" r="16" className="rr-fg" style={{ strokeDashoffset: 100.5 * (1 - hud.reloadP) }} />
          </svg>
          <span>Re-synthesising granules…</span>
        </div>
      )}

      {/* bottom-left: viability / exhaustion */}
      <div className="hud-bl">
        <div className="hp">
          <span className="cross">✚</span>
          <b className={hud.hp < 30 ? 'low' : ''}>{Math.ceil(hud.hp)}</b>
          <div className="bar"><div style={{ width: `${hud.hp}%` }} /></div>
          <small>VIABILITY</small>
        </div>
        <div className="exh">
          <span className="cross">⚡</span>
          <b className={exhausted ? 'low' : ''}>{Math.round(hud.exh)}</b>
          <div className="bar exhbar"><div style={{ width: `${hud.exh}%` }} /></div>
          <small>{hud.boost > 0 ? `ANTI-PD-1 ${hud.boost.toFixed(1)}s` : exhausted ? 'EXHAUSTED' : 'PD-1 EXHAUSTION'}</small>
        </div>
        <div className="charges">
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className={i < hud.charges ? 'on' : ''}>💉</span>
          ))}
          <small>Q · anti-PD-1</small>
        </div>
      </div>

      {/* bottom-right: ammo */}
      <div className="hud-br">
        <div className="ammo">
          <b className={hud.ammo <= weapon.mag * 0.2 ? 'low' : ''}>{hud.ammo}</b>
          <span>/ {hud.reserve}</span>
        </div>
        <div className="wname" style={{ color: weapon.color }}>{weapon.name}</div>
        <small>{weapon.mechanism}</small>
      </div>
    </div>
  );
}

// ── Mobile Touch Controls ──────────────────────────────────
function MobileControls({
  game,
  onPause,
}: {
  game: Game;
  onPause: () => void;
}) {
  const [knob, setKnob] = useState({ x: 0, y: 0, active: false });
  const [sprinting, setSprinting] = useState(false);
  const lookTouchId = useRef<number | null>(null);
  const lastLookPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const joyTouchId = useRef<number | null>(null);
  const joyCenter = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const joyRef = useRef<HTMLDivElement>(null);

  // Look zone handlers (aiming)
  const onLookStart = (e: React.TouchEvent) => {
    if (lookTouchId.current !== null) return;
    const t = e.changedTouches[0];
    lookTouchId.current = t.identifier;
    lastLookPos.current = { x: t.clientX, y: t.clientY };
  };

  const onLookMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === lookTouchId.current) {
        const dx = t.clientX - lastLookPos.current.x;
        const dy = t.clientY - lastLookPos.current.y;
        lastLookPos.current = { x: t.clientX, y: t.clientY };
        game.touchLook.dx += dx;
        game.touchLook.dy += dy;
        break;
      }
    }
  };

  const onLookEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchId.current) {
        lookTouchId.current = null;
        break;
      }
    }
  };

  // Virtual Joystick handlers (movement)
  const handleJoyMove = (cx: number, cy: number) => {
    const maxR = 46;
    let dx = cx - joyCenter.current.x;
    let dy = cy - joyCenter.current.y;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setKnob({ x: dx, y: dy, active: true });
    game.touchMove.x = dx / maxR;
    game.touchMove.y = -dy / maxR;
  };

  const onJoyStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (joyTouchId.current !== null) return;
    const t = e.changedTouches[0];
    joyTouchId.current = t.identifier;
    if (joyRef.current) {
      const rect = joyRef.current.getBoundingClientRect();
      joyCenter.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
    handleJoyMove(t.clientX, t.clientY);
  };

  const onJoyMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === joyTouchId.current) {
        handleJoyMove(t.clientX, t.clientY);
        break;
      }
    }
  };

  const onJoyEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joyTouchId.current) {
        joyTouchId.current = null;
        setKnob({ x: 0, y: 0, active: false });
        game.touchMove.x = 0;
        game.touchMove.y = 0;
        break;
      }
    }
  };

  return (
    <div className="touch-controls">
      {/* Background touch drag surface for looking around */}
      <div
        className="touch-look-zone"
        onTouchStart={onLookStart}
        onTouchMove={onLookMove}
        onTouchEnd={onLookEnd}
        onTouchCancel={onLookEnd}
      />

      {/* Top Pause button */}
      <button
        className="touch-pause-btn"
        onClick={onPause}
        onTouchStart={(e) => {
          e.stopPropagation();
          onPause();
        }}
      >
        ⏸️ Pause
      </button>

      {/* Virtual Joystick for movement */}
      <div
        ref={joyRef}
        className={`touch-joystick ${knob.active ? 'active' : ''}`}
        onTouchStart={onJoyStart}
        onTouchMove={onJoyMove}
        onTouchEnd={onJoyEnd}
        onTouchCancel={onJoyEnd}
      >
        <div className="joystick-base">
          <div className="joystick-arrow up">▲</div>
          <div className="joystick-arrow down">▼</div>
          <div className="joystick-arrow left">◀</div>
          <div className="joystick-arrow right">▶</div>
          <div
            className="joystick-knob"
            style={{
              transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
            }}
          />
        </div>
      </div>

      {/* Action buttons cluster */}
      <div className="touch-actions">
        {/* Fire button */}
        <button
          className="touch-btn fire-btn"
          onTouchStart={(e) => {
            e.stopPropagation();
            game.trigger = true;
            game.firedThisPress = false;
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            game.trigger = false;
          }}
          onTouchCancel={(e) => {
            e.stopPropagation();
            game.trigger = false;
          }}
        >
          🔥
          <span>FIRE</span>
        </button>

        {/* Jump button */}
        <button
          className="touch-btn jump-btn"
          onTouchStart={(e) => {
            e.stopPropagation();
            game.requestJump = true;
          }}
        >
          🦘
          <span>JUMP</span>
        </button>

        {/* Sprint toggle button */}
        <button
          className={`touch-btn sprint-btn ${sprinting ? 'active' : ''}`}
          onTouchStart={(e) => {
            e.stopPropagation();
            const next = !sprinting;
            setSprinting(next);
            game.isSprinting = next;
          }}
        >
          ⚡
          <span>{sprinting ? 'RUN' : 'WALK'}</span>
        </button>

        {/* Reload button */}
        <button
          className="touch-btn reload-btn"
          onTouchStart={(e) => {
            e.stopPropagation();
            game.requestReload = true;
          }}
        >
          🔄
          <span>RELOAD</span>
        </button>

        {/* Anti-PD-1 button */}
        <button
          className={`touch-btn boost-btn ${game.charges > 0 ? 'ready' : 'empty'}`}
          onTouchStart={(e) => {
            e.stopPropagation();
            game.requestBoost = true;
          }}
        >
          💉
          <span>Q ({game.charges})</span>
        </button>
      </div>
    </div>
  );
}

// ── Session (one life) ──────────────────────────────────────
function GameSession({ cell, onExit, onRestart }: { cell: Cell; onExit: () => void; onRestart: () => void }) {
  const weapon = useMemo(() => weaponFor(cell), [cell]);
  const game = useMemo(() => newGame(weapon), [weapon]);
  const pillars = useMemo(makePillars, []);
  const controls = useRef<any>(null);
  const [ui, setUi] = useState<UiState>('intro');
  const [hud, setHud] = useState<Hud | null>(null);
  const [ver, setVer] = useState(0);
  const bump = useCallback(() => setVer((v) => v + 1), []);

  const isTouch = useMemo(() => {
    return (
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 900)
    );
  }, []);

  const lock = () => {
    sfx.unlock();
    if (isTouch) {
      game.state = 'playing';
      setUi('playing');
    } else {
      try {
        controls.current?.lock();
      } catch {
        game.state = 'playing';
        setUi('playing');
      }
    }
  };

  const pauseGame = useCallback(() => {
    game.trigger = false;
    game.keys = {};
    game.touchMove = { x: 0, y: 0 };
    game.state = 'paused';
    setUi('paused');
    document.exitPointerLock?.();
  }, [game]);

  const onDead = useCallback(() => {
    setUi('dead');
    document.exitPointerLock?.();
  }, []);

  useEffect(() => () => document.exitPointerLock?.(), []);

  const acc = game.shots ? Math.round((game.hits / game.shots) * 100) : 0;

  return (
    <div className="game-root">
      <Canvas
        shadows={false}
        dpr={[1, 1.75]}
        camera={{ fov: 78, near: 0.05, far: 200, position: [0, EYE, 0] }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#1a0610']} />
        <fog attach="fog" args={['#2a0a16', 10, 70]} />
        <hemisphereLight args={['#ffc2d1', '#2a0a14', 0.85]} />
        <directionalLight position={[10, 25, 8]} intensity={0.9} color="#ffe4ec" />
        <pointLight position={[0, 9, 0]} intensity={60} distance={45} color="#ff7a9c" />
        <pointLight position={[-22, 6, 18]} intensity={40} distance={35} color="#a78bfa" />
        <pointLight position={[24, 6, -16]} intensity={40} distance={35} color="#fb923c" />

        <Arena pillars={pillars} />
        <Vessels />
        <Cytokines />
        <EnemiesView game={game} version={ver} />
        <Effects game={game} color={weapon.color} />
        <ViewModel game={game} weapon={weapon} cellColor={cell.shape.color} />
        <Logic game={game} weapon={weapon} cell={cell} pillars={pillars} setHud={setHud} bump={bump} onDead={onDead} />
        {!isTouch && (
          <PointerLockControls
            ref={controls}
            selector="#__tumor_no_autolock__"
            onLock={() => {
              if (game.state === 'dead') return;
              game.state = 'playing';
              setUi('playing');
            }}
            onUnlock={() => {
              game.trigger = false;
              game.keys = {};
              if (game.state === 'playing') {
                game.state = 'paused';
                setUi('paused');
              }
            }}
          />
        )}
      </Canvas>

      {hud && ui !== 'intro' && <HudView hud={hud} cell={cell} weapon={weapon} />}
      {ui === 'playing' && isTouch && <MobileControls game={game} onPause={pauseGame} />}

      {ui === 'intro' && (
        <div className="g-overlay">
          <div className="g-card">
            <span className="g-eyebrow">Tumour microenvironment · First-person</span>
            <h1>Operation: Immune Surveillance</h1>
            <p className="g-sub">
              You are a <b style={{ color: cell.shape.color }}>{cell.name}</b> infiltrating a solid tumour. Eliminate tumour cells before they
              overwhelm you.
            </p>
            <div className="g-grid">
              <div className="g-box">
                <span className="g-eyebrow">Your weapon</span>
                <h3 style={{ color: weapon.color }}>{weapon.name}</h3>
                <p>{weapon.mechanism}</p>
                <ul className="g-stats">
                  <li><span>Damage</span><b>{weapon.damage}{weapon.pellets > 1 ? ` ×${weapon.pellets}` : ''}</b></li>
                  <li><span>Fire rate</span><b>{weapon.rpm} rpm</b></li>
                  <li><span>Magazine</span><b>{weapon.mag}</b></li>
                  <li><span>Difficulty</span><b className={'diff ' + weapon.difficulty}>{weapon.difficulty}</b></li>
                </ul>
                <p className="g-note">{weapon.note}</p>
              </div>
              <div className="g-box">
                <span className="g-eyebrow">Hostiles</span>
                {(Object.keys(ENEMIES) as EnemyKind[]).map((k) => (
                  <div key={k} className="g-enemy">
                    <i style={{ background: ENEMIES[k].color }} />
                    <div>
                      <b>{ENEMIES[k].name}</b>
                      <p>{ENEMIES[k].blurb}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="g-box">
                <span className="g-eyebrow">Controls</span>
                {isTouch ? (
                  <ul className="g-keys">
                    <li>🕹️ <b>Left Joystick</b> move</li>
                    <li>🎯 <b>Right Drag</b> aim camera</li>
                    <li>🔥 <b>FIRE</b> shoot (hold / tap)</li>
                    <li>🦘 <b>JUMP</b> · ⚡ <b>SPRINT</b></li>
                    <li>🔄 <b>RELOAD</b> · 💉 <b>Anti-PD-1 (Q)</b></li>
                    <li>⏸️ <b>Pause button</b> top-right</li>
                  </ul>
                ) : (
                  <ul className="g-keys">
                    <li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move</li>
                    <li><kbd>Mouse</kbd> aim · <kbd>LMB</kbd> fire</li>
                    <li><kbd>Shift</kbd> sprint · <kbd>Space</kbd> jump</li>
                    <li><kbd>R</kbd> reload granules</li>
                    <li><kbd>Q</kbd> anti-PD-1 (resets exhaustion)</li>
                    <li><kbd>Esc</kbd> pause</li>
                  </ul>
                )}
                <p className="g-note">◎ Aim for the <b>nucleus</b> (centre) for ×2 critical damage.</p>
              </div>
            </div>
            <div className="g-actions">
              <button className="g-btn primary" onClick={lock}>
                {isTouch ? '▶ Deploy on Mobile' : '▶ Click to deploy'}
              </button>
              <button className="g-btn" onClick={onExit}>Back to Atlas</button>
            </div>
          </div>
        </div>
      )}

      {ui === 'paused' && (
        <div className="g-overlay">
          <div className="g-card small">
            <h1>Paused</h1>
            <p className="g-sub">Round {game.wave} · {game.kills} kills · {game.score.toLocaleString()} pts</p>
            <div className="g-actions">
              <button className="g-btn primary" onClick={lock}>▶ Resume</button>
              <button className="g-btn" onClick={onRestart}>↻ Restart</button>
              <button className="g-btn" onClick={onExit}>Back to Atlas</button>
            </div>
          </div>
        </div>
      )}

      {ui === 'dead' && (
        <div className="g-overlay dead">
          <div className="g-card small">
            <span className="g-eyebrow red">Viability lost</span>
            <h1>Tumour escaped immune surveillance</h1>
            <div className="g-final">
              <div><span>Rounds</span><b>{game.wave}</b></div>
              <div><span>Kills</span><b>{game.kills}</b></div>
              <div><span>Nucleus hits</span><b>{game.crits}</b></div>
              <div><span>Accuracy</span><b>{acc}%</b></div>
              <div className="wide"><span>Score</span><b>{game.score.toLocaleString()}</b></div>
            </div>
            <p className="g-note">
              In real tumours, immune escape happens through MHC-I loss, PD-L1 up-regulation, Treg recruitment and an
              immunosuppressive microenvironment — the same mechanics you just fought.
            </p>
            <div className="g-actions">
              <button className="g-btn primary" onClick={onRestart}>↻ Redeploy</button>
              <button className="g-btn" onClick={onExit}>Back to Atlas</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TumorGame({ cell, onClose }: { cell: Cell; onClose: () => void }) {
  const [run, setRun] = useState(0);
  return <GameSession key={run} cell={cell} onExit={onClose} onRestart={() => setRun((r) => r + 1)} />;
}

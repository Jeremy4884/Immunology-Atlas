// ─────────────────────────────────────────────────────────────
//  Tumor POV – weapon (killing mechanism) per immune cell and
//  enemy archetypes in the tumour microenvironment (TME).
// ─────────────────────────────────────────────────────────────
import type { Cell } from '../data/cells';

export interface Weapon {
  name: string; // CS-style weapon label
  mechanism: string; // biological killing mechanism
  damage: number;
  rpm: number;
  mag: number;
  reserve: number;
  pellets: number;
  spread: number; // radians
  auto: boolean;
  range: number;
  reloadTime: number;
  color: string;
  tipSize: number;
  aoe?: number; // splash radius (m)
  mhcIndependent?: boolean; // kills MHC-I-low tumours at full power
  missingSelf?: boolean; // NK bonus vs MHC-I-low
  revealsMhc?: boolean; // IFN-γ restores MHC-I on hit
  difficulty: 'Easy' | 'Normal' | 'Hard' | 'Nightmare';
  note: string;
}

const W = (w: Weapon) => w;

const WEAPONS: Record<string, Weapon> = {
  cd8: W({
    name: 'Perforin AR-30', mechanism: 'Perforin pores + granzyme B → apoptosis',
    damage: 34, rpm: 600, mag: 30, reserve: 120, pellets: 1, spread: 0.012, auto: true, range: 70,
    reloadTime: 2.2, color: '#60A5FA', tipSize: 0.1, difficulty: 'Normal',
    note: 'MHC-I-restricted: only 25 % damage against MHC-I-low tumour cells.',
  }),
  nk: W({
    name: 'Granzyme SMG', mechanism: 'Granzyme B / ADCC via CD16',
    damage: 22, rpm: 900, mag: 35, reserve: 140, pellets: 1, spread: 0.03, auto: true, range: 45,
    reloadTime: 1.8, color: '#A78BFA', tipSize: 0.1, mhcIndependent: true, missingSelf: true, difficulty: 'Easy',
    note: '“Missing-self” recognition: ×1.5 damage against MHC-I-low tumour cells.',
  }),
  macrophage: W({
    name: 'Phago-Shotgun', mechanism: 'Phagocytosis (engulfment of tumour fragments)',
    damage: 17, rpm: 70, mag: 7, reserve: 35, pellets: 8, spread: 0.085, auto: false, range: 16,
    reloadTime: 2.8, color: '#F6A965', tipSize: 0.17, mhcIndependent: true, difficulty: 'Normal',
    note: 'Devastating up close, useless at range. MHC-independent.',
  }),
  neutrophil: W({
    name: 'ROS Burst-50', mechanism: 'Reactive oxygen species + NETs',
    damage: 12, rpm: 1100, mag: 50, reserve: 200, pellets: 1, spread: 0.05, auto: true, range: 28,
    reloadTime: 2.0, color: '#FACC15', tipSize: 0.1, mhcIndependent: true, difficulty: 'Normal',
    note: 'Spray and pray. MHC-independent.',
  }),
  dendritic: W({
    name: 'Cross-Presenter P12', mechanism: 'Antigen cross-presentation (weak direct killing)',
    damage: 30, rpm: 320, mag: 12, reserve: 60, pellets: 1, spread: 0.008, auto: false, range: 55,
    reloadTime: 1.5, color: '#F59E8B', tipSize: 0.09, mhcIndependent: true, difficulty: 'Hard',
    note: 'DCs prime killers rather than kill — a sidearm only.',
  }),
  mast: W({
    name: 'Histamine Launcher', mechanism: 'Explosive degranulation (histamine, tryptase)',
    damage: 85, rpm: 60, mag: 4, reserve: 20, pellets: 1, spread: 0.004, auto: false, range: 50,
    reloadTime: 3.0, color: '#EC4899', tipSize: 0.15, aoe: 4, mhcIndependent: true, difficulty: 'Normal',
    note: 'Splash damage (4 m). MHC-independent.',
  }),
  th1: W({
    name: 'IFN-γ Blaster', mechanism: 'IFN-γ / TNF – activates macrophages, restores MHC-I',
    damage: 20, rpm: 450, mag: 25, reserve: 100, pellets: 1, spread: 0.02, auto: true, range: 50,
    reloadTime: 2.0, color: '#7DD3FC', tipSize: 0.1, revealsMhc: true, difficulty: 'Hard',
    note: 'Hits upregulate MHC-I: MHC-I-low tumour cells become fully vulnerable.',
  }),
  th2: W({
    name: 'IL-4 Pistol', mechanism: 'IL-4 / IL-13 (poorly anti-tumour)',
    damage: 14, rpm: 380, mag: 15, reserve: 75, pellets: 1, spread: 0.015, auto: false, range: 40,
    reloadTime: 1.6, color: '#93C5FD', tipSize: 0.09, difficulty: 'Hard',
    note: 'Type-2 immunity is weak against tumours. Good luck.',
  }),
  th17: W({
    name: 'IL-17 Carbine', mechanism: 'IL-17 – recruits neutrophils',
    damage: 18, rpm: 520, mag: 30, reserve: 120, pellets: 1, spread: 0.022, auto: true, range: 45,
    reloadTime: 2.0, color: '#67E8F9', tipSize: 0.1, difficulty: 'Hard',
    note: 'Indirect killer – role in cancer is context-dependent.',
  }),
  treg: W({
    name: 'TGF-β Suppressor', mechanism: 'IL-10 / TGF-β (suppresses anti-tumour immunity)',
    damage: 7, rpm: 400, mag: 20, reserve: 80, pellets: 1, spread: 0.02, auto: true, range: 40,
    reloadTime: 2.0, color: '#A5B4FC', tipSize: 0.09, difficulty: 'Nightmare',
    note: 'You are a Treg — tumours love you. Nightmare mode.',
  }),
  bcell: W({
    name: 'Antibody AWP', mechanism: 'Tumour-specific antibody → ADCC / complement',
    damage: 130, rpm: 45, mag: 5, reserve: 30, pellets: 1, spread: 0.0008, auto: false, range: 100,
    reloadTime: 3.2, color: '#34D399', tipSize: 0.08, mhcIndependent: true, difficulty: 'Normal',
    note: 'One-shot sniper. Antibodies bind surface antigen – MHC-independent.',
  }),
  plasma: W({
    name: 'IgG Minigun', mechanism: 'Mass antibody secretion (~1,000 Ab/s)',
    damage: 10, rpm: 1400, mag: 100, reserve: 300, pellets: 1, spread: 0.04, auto: true, range: 55,
    reloadTime: 4.0, color: '#86EFAC', tipSize: 0.12, mhcIndependent: true, difficulty: 'Easy',
    note: 'Antibody factory. MHC-independent.',
  }),
};

export const weaponFor = (cell: Cell): Weapon => WEAPONS[cell.id] ?? WEAPONS.cd8;

export type EnemyKind = 'tumor' | 'stealth' | 'csc';

export interface EnemyDef {
  name: string;
  hp: number;
  speed: number;
  radius: number;
  dps: number; // contact damage per second
  color: string;
  emissive: string;
  nucleus: string;
  bar: string;
  score: number;
  y: number;
  blurb: string;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  tumor: {
    name: 'Tumour cell', hp: 100, speed: 2.4, radius: 0.85, dps: 14, color: '#C2416B', emissive: '#7f1d3a',
    nucleus: '#3b0a1e', bar: '#ef4444', score: 100, y: 1.45,
    blurb: 'Expresses PD-L1 → drains your exhaustion meter when close.',
  },
  stealth: {
    name: 'MHC-I-low tumour', hp: 90, speed: 2.8, radius: 0.8, dps: 12, color: '#9F7AEA', emissive: '#4c1d95',
    nucleus: '#2e1065', bar: '#a855f7', score: 150,  y: 1.5,
    blurb: 'Down-regulated MHC-I: invisible to CD8⁺ T cells, prey for NK cells.',
  },
  csc: {
    name: 'Cancer stem cell', hp: 480, speed: 1.3, radius: 1.7, dps: 26, color: '#7F1D1D', emissive: '#450a0a',
    nucleus: '#1c0505', bar: '#f97316', score: 600, y: 1.9,
    blurb: 'Boss. Self-renews – spawns new tumour cells every few seconds.',
  },
};

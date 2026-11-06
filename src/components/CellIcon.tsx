import type { Cell } from '../data/cells';
import { rng, seedOf } from '../data/pathogenicity';

// ─────────────────────────────────────────────────────────────
//  Hand-tuned SVG glyphs – each cell type gets its own silhouette
//  (membrane outline, nucleus morphology, granules, receptors).
// ─────────────────────────────────────────────────────────────

type Pt = [number, number];

/** Closed Catmull-Rom spline → cubic Bézier path. */
function smoothPath(pts: Pt[]) {
  const n = pts.length;
  let d = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(2)},${c1[1].toFixed(2)} ${c2[0].toFixed(2)},${c2[1].toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return d + 'Z';
}

function blob(r: (th: number) => number, steps = 72, cx = 20, cy = 20, sx = 1, sy = 1) {
  const pts: Pt[] = [];
  for (let i = 0; i < steps; i++) {
    const th = (i / steps) * Math.PI * 2;
    const rr = r(th);
    pts.push([cx + Math.cos(th) * rr * sx, cy + Math.sin(th) * rr * sy]);
  }
  return smoothPath(pts);
}

const bump = (th: number, a: number, p: number) => Math.pow(Math.max(0, Math.cos(th - a)), p);

const MEMBRANE: Record<string, (th: number) => number> = {
  macrophage: (th) =>
    12.2 * (1 + 0.06 * Math.sin(3 * th + 1) + 0.05 * Math.sin(5 * th)) +
    5 * bump(th, 0.4, 10) + 4.2 * bump(th, 2.5, 12) + 4.6 * bump(th, 4.3, 10),
  neutrophil: (th) => 14 * (1 + 0.035 * Math.sin(9 * th)),
  dendritic: (th) => {
    let r = 7.2;
    [0.2, 1.25, 2.3, 3.2, 4.25, 5.3].forEach((a, i) => (r += (i % 2 ? 9.5 : 11) * bump(th, a, 26)));
    return r;
  },
  mast: (th) => 14 * (1 + 0.04 * Math.sin(7 * th + 0.5)),
  lymph: (th) => 13.5 * (1 + 0.03 * Math.sin(16 * th)),
  plasma: (th) => 13 * (1 + 0.025 * Math.sin(8 * th)),
};

const BADGE: Record<string, string> = { th1: '1', th2: '2', th17: '17', treg: 'R', cd8: '8' };

function granules(id: string, count: number, rMin: number, rMax: number, avoid?: (x: number, y: number) => boolean) {
  const r = rng(seedOf(id) + 11);
  const out: { x: number; y: number; s: number }[] = [];
  let guard = 0;
  while (out.length < count && guard++ < count * 20) {
    const th = r() * Math.PI * 2;
    const rad = rMin + Math.sqrt(r()) * (rMax - rMin);
    const x = 20 + Math.cos(th) * rad;
    const y = 20 + Math.sin(th) * rad;
    if (avoid && avoid(x, y)) continue;
    out.push({ x, y, s: 0.7 + r() * 0.7 });
  }
  return out;
}

export default function CellIcon({ cell, size = 34 }: { cell: Cell; size?: number }) {
  const { id, shape } = cell;
  const gid = `cg-${id}`;
  const nid = `ng-${id}`;
  const c = shape.color;
  const nc = shape.nucleusColor;
  const kind = MEMBRANE[id] ? id : id === 'plasma' ? 'plasma' : 'lymph';
  const isPlasma = id === 'plasma';
  const membrane = isPlasma ? blob(MEMBRANE.plasma, 72, 20, 20, 1.18, 0.9) : blob(MEMBRANE[kind] ?? MEMBRANE.lymph);

  // ── Nucleus ──
  let nucleus: React.ReactNode;
  let extras: React.ReactNode = null;
  switch (id) {
    case 'macrophage':
      nucleus = (
        <path
          d="M14.5,17.5 C14.5,13 21,12 23.5,14.5 C25,16 23,18 21.5,19.5 C20,21 22.5,23.5 21,25.5 C18.5,28 14.5,25 14.5,21Z"
          fill={`url(#${nid})`}
        />
      );
      extras = granules(id, 7, 6, 11, (x) => x < 24).map((g, i) => (
        <circle key={i} cx={g.x} cy={g.y} r={0.9 * g.s} fill="#E0782F" opacity={0.75} />
      ));
      break;
    case 'neutrophil':
      nucleus = (
        <g fill={`url(#${nid})`}>
          <circle cx={13.2} cy={17.5} r={3.6} />
          <circle cx={18.6} cy={22.6} r={3.8} />
          <circle cx={24.6} cy={19} r={3.6} />
          <path d="M14,18.5 L18,22 M19.5,22 L23.5,19.5" stroke={nc} strokeWidth={2} strokeLinecap="round" />
        </g>
      );
      extras = granules(id, 26, 3, 12, (x, y) => Math.hypot(x - 19, y - 20) < 7.5).map((g, i) => (
        <circle key={i} cx={g.x} cy={g.y} r={0.55 * g.s} fill="#D88A1F" opacity={0.8} />
      ));
      break;
    case 'dendritic':
      nucleus = <ellipse cx={20} cy={20} rx={4.8} ry={3.8} transform="rotate(-20 20 20)" fill={`url(#${nid})`} />;
      break;
    case 'mast':
      nucleus = <circle cx={20} cy={20} r={4.2} fill={`url(#${nid})`} />;
      extras = granules(id, 44, 5.4, 12.6).map((g, i) => (
        <circle key={i} cx={g.x} cy={g.y} r={0.85 * g.s} fill="#9D2A6A" opacity={0.85} />
      ));
      break;
    case 'plasma':
      nucleus = (
        <g>
          <circle cx={25.5} cy={20} r={6} fill={`url(#${nid})`} />
          {/* clock-face chromatin */}
          {Array.from({ length: 7 }).map((_, i) => {
            const a = (i / 7) * Math.PI * 2;
            return <circle key={i} cx={25.5 + Math.cos(a) * 3.8} cy={20 + Math.sin(a) * 3.8} r={0.9} fill="#fff" opacity={0.45} />;
          })}
          <circle cx={25.5} cy={20} r={1.1} fill="#fff" opacity={0.45} />
        </g>
      );
      extras = (
        <g fill="none" stroke={nc} strokeWidth={0.9} strokeLinecap="round" opacity={0.55}>
          <path d="M18,12.5 C12,14 10,18 10.5,21" />
          <path d="M17.5,15.5 C13.8,16.5 12.8,19 13,22.5" />
          <path d="M17.6,25.5 C13.5,26.5 11.5,24.5 10.8,22.5" />
          <path d="M18.5,27.5 C14.5,29 9.5,27 8.5,23" />
        </g>
      );
      break;
    default:
      // Lymphocytes: nucleus nearly fills the cell
      nucleus = <circle cx={19.5} cy={19.5} r={9.4} fill={`url(#${nid})`} />;
      if (shape.granules) {
        extras = [
          [29, 15], [30.2, 20.5], [28, 26], [11, 27.5], [26, 30],
        ].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={0.95} fill={shape.granules!.color} opacity={0.85} />);
      }
  }

  // ── B-cell receptor "Y"s ──
  const ys =
    id === 'bcell'
      ? [0.6, 2.2, 3.8, 5.3].map((a, i) => {
          const r0 = 13.8;
          const x = 20 + Math.cos(a) * r0;
          const y = 20 + Math.sin(a) * r0;
          const deg = (a * 180) / Math.PI + 90;
          return (
            <g key={i} transform={`translate(${x} ${y}) rotate(${deg})`} stroke="#15803D" strokeWidth={1.1} strokeLinecap="round" fill="none">
              <path d="M0,0 L0,-2.6 M0,-2.6 L-1.6,-4.4 M0,-2.6 L1.6,-4.4" />
            </g>
          );
        })
      : null;

  const badge = BADGE[id];

  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className="cell-icon" aria-hidden>
      <defs>
        <radialGradient id={gid} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor={c} stopOpacity={0.75} />
          <stop offset="100%" stopColor={c} />
        </radialGradient>
        <radialGradient id={nid} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor={nc} stopOpacity={0.55} />
          <stop offset="100%" stopColor={nc} stopOpacity={0.95} />
        </radialGradient>
      </defs>
      <path d={membrane} fill={`url(#${gid})`} stroke={c} strokeWidth={1.1} strokeLinejoin="round" style={{ filter: 'brightness(0.92)' }} />
      {extras}
      {nucleus}
      {ys}
      {badge && (
        <g>
          <circle cx={32.5} cy={32.5} r={6.6} fill="#fff" stroke={nc} strokeWidth={1} />
          <text
            x={32.5}
            y={32.5}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={badge.length > 1 ? 6.2 : 7.6}
            fontWeight={800}
            fill={nc}
            fontFamily="Inter, system-ui, sans-serif"
          >
            {badge}
          </text>
        </g>
      )}
    </svg>
  );
}

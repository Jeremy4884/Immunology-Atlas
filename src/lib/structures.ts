// AlphaFold DB structure loading + 3Dmol.js lazy loader
import { rng, seedOf } from '../data/pathogenicity';

/* eslint-disable @typescript-eslint/no-explicit-any */
let libPromise: Promise<any> | null = null;

/** Lazy-load 3Dmol (npm bundle first, CDN as fallback). */
export function load3Dmol(): Promise<any> {
  if (libPromise) return libPromise;
  libPromise = (async () => {
    try {
      const mod: any = await import('3dmol');
      const lib = mod?.createViewer ? mod : mod?.default?.createViewer ? mod.default : null;
      if (lib) return lib;
    } catch (e) {
      console.warn('3Dmol npm import failed, trying CDN', e);
    }
    return new Promise((resolve, reject) => {
      const w = window as any;
      if (w.$3Dmol) return resolve(w.$3Dmol);
      const s = document.createElement('script');
      s.src = 'https://3Dmol.org/build/3Dmol-min.js';
      s.onload = () => resolve(w.$3Dmol);
      s.onerror = reject;
      document.head.appendChild(s);
    });
  })();
  return libPromise;
}

export interface StructureResult {
  pdb: string;
  source: 'alphafold' | 'procedural';
  version?: number | string;
  length?: number;
  meanPlddt?: number;
}

const cache = new Map<string, Promise<StructureResult>>();

export function fetchStructure(uniprot: string): Promise<StructureResult> {
  if (!cache.has(uniprot)) cache.set(uniprot, doFetch(uniprot));
  return cache.get(uniprot)!;
}

async function doFetch(uniprot: string): Promise<StructureResult> {
  // 1) AlphaFold DB prediction API → current pdbUrl
  try {
    const r = await fetch(`https://alphafold.ebi.ac.uk/api/prediction/${uniprot}`);
    if (r.ok) {
      const j = await r.json();
      const list: any[] = Array.isArray(j) ? j : [j];
      const e = list.find((x) => x.uniprotAccession === uniprot) ?? list[0];
      if (e?.pdbUrl) {
        const p = await fetch(e.pdbUrl);
        if (p.ok) return withStats(await p.text(), 'alphafold', e.latestVersion);
      }
    }
  } catch {
    /* fall through */
  }
  // 2) Direct file URL (known model versions)
  for (const v of [6, 4, 5, 3]) {
    try {
      const p = await fetch(`https://alphafold.ebi.ac.uk/files/AF-${uniprot}-F1-model_v${v}.pdb`);
      if (p.ok) return withStats(await p.text(), 'alphafold', v);
    } catch {
      /* next */
    }
  }
  // 3) Offline fallback
  return withStats(proceduralPDB(uniprot), 'procedural');
}

function withStats(pdb: string, source: StructureResult['source'], version?: number | string): StructureResult {
  let n = 0;
  let sum = 0;
  for (const line of pdb.split('\n')) {
    if (line.startsWith('ATOM') && line.substring(12, 16).trim() === 'CA') {
      n++;
      sum += parseFloat(line.substring(60, 66)) || 0;
    }
  }
  return { pdb, source, version, length: n, meanPlddt: n ? sum / n : undefined };
}

/** Build a CA-trace helix bundle PDB as an offline stand-in. */
function proceduralPDB(id: string): string {
  const r = rng(seedOf(id));
  const lines: string[] = [];
  let serial = 1;
  let res = 1;
  const helices = 4 + Math.floor(r() * 3);
  for (let h = 0; h < helices; h++) {
    const ang = (h / helices) * Math.PI * 2;
    const cx = Math.cos(ang) * 9;
    const cz = Math.sin(ang) * 9;
    const len = 14 + Math.floor(r() * 10);
    const dir = h % 2 === 0 ? 1 : -1;
    const plddt = 55 + r() * 40;
    for (let i = 0; i < len; i++) {
      const th = i * ((100 * Math.PI) / 180);
      const x = cx + 2.3 * Math.cos(th);
      const z = cz + 2.3 * Math.sin(th);
      const y = dir * (i * 1.5 - (len * 1.5) / 2);
      lines.push(atom(serial++, res++, x, y, z, Math.min(98, plddt + (r() - 0.5) * 10)));
    }
    // short loop to next helix
    for (let k = 1; k <= 3; k++) {
      const a2 = ((h + k / 4) / helices) * Math.PI * 2;
      lines.push(atom(serial++, res++, Math.cos(a2) * 11, dir * 18 + dir * 2, Math.sin(a2) * 11, 35 + r() * 20));
    }
  }
  return lines.join('\n') + '\nEND\n';
}

function atom(serial: number, res: number, x: number, y: number, z: number, b: number) {
  const f = (v: number, w: number, d = 3) => v.toFixed(d).padStart(w);
  return (
    'ATOM  ' + String(serial).padStart(5) + '  CA  ALA A' + String(res).padStart(4) + '    ' +
    f(x, 8) + f(y, 8) + f(z, 8) + '  1.00' + f(b, 6, 2) + '           C'
  );
}

export const plddtColor = (b: number) =>
  b > 90 ? '#0053D6' : b > 70 ? '#65CBF3' : b > 50 ? '#FFDB13' : '#FF7D45';

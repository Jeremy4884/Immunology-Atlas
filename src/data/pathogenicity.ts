// ─────────────────────────────────────────────────────────────
//  Illustrative AlphaMissense-style pathogenicity data.
//  NOTE: These are DEMO values for UI purposes – not real
//  AlphaMissense predictions. Thresholds follow the published
//  AlphaMissense classes: <0.34 likely benign, >0.564 likely pathogenic.
// ─────────────────────────────────────────────────────────────

export const BENIGN_MAX = 0.34;
export const PATHOGENIC_MIN = 0.564;

interface PathoEntry {
  mean: number;
  disease?: string;
}

export const PATHO: Record<string, PathoEntry> = {
  CD3E: { mean: 0.62, disease: 'CD3ε deficiency (SCID)' },
  CD4: { mean: 0.38 },
  CD8A: { mean: 0.45, disease: 'Familial CD8 deficiency' },
  CD14: { mean: 0.28 },
  CD68: { mean: 0.22 },
  CD163: { mean: 0.25 },
  ITGAM: { mean: 0.41, disease: 'SLE susceptibility (R77H)' },
  FCGR3A: { mean: 0.36, disease: 'FCGR3A-associated NK-cell deficiency (IMD20)' },
  FCGR3B: { mean: 0.24 },
  FCGR1A: { mean: 0.27 },
  CEACAM8: { mean: 0.2 },
  CXCR2: { mean: 0.44, disease: 'Neutropenia with myelokathexis (WHIM syndrome 2, AR)' },
  ITGAX: { mean: 0.3 },
  'HLA-DRA': { mean: 0.33 },
  CD83: { mean: 0.27 },
  CD86: { mean: 0.35 },
  KIT: { mean: 0.71, disease: 'Systemic mastocytosis (somatic D816V); germline LOF → piebaldism' },
  FCER1A: { mean: 0.3 },
  ENPP3: { mean: 0.26 },
  NCAM1: { mean: 0.31 },
  NCR1: { mean: 0.34 },
  KLRK1: { mean: 0.32 },
  KLRB1: { mean: 0.25 },
  CXCR3: { mean: 0.29 },
  CCR5: { mean: 0.38, disease: 'CCR5-delta32 HIV-1 resistance; West Nile virus susceptibility' },
  CXCR4: { mean: 0.72, disease: 'WHIM syndrome 1 (AD, GOF C-terminal truncations)' },
  CCR4: { mean: 0.27 },
  PTGDR2: { mean: 0.3 },
  CCR6: { mean: 0.28 },
  IL23R: { mean: 0.4, disease: 'IBD/psoriasis risk modifier (R381Q protective); AR deficiency → MSMD' },
  IL7R: { mean: 0.6, disease: 'IL-7Rα deficiency (T⁻B⁺NK⁺ SCID)' },
  IL2RA: { mean: 0.58, disease: 'CD25 deficiency (IPEX-like)' },
  CTLA4: { mean: 0.6, disease: 'CTLA-4 haploinsufficiency' },
  CD27: { mean: 0.47, disease: 'CD27 deficiency (EBV-LPD)' },
  CD28: { mean: 0.38, disease: 'CD28 deficiency (severe cutaneous HPV)' },
  CD19: { mean: 0.52, disease: 'CVID type 3' },
  MS4A1: { mean: 0.41, disease: 'CVID type 5' },
  CD79A: { mean: 0.66, disease: 'Agammaglobulinemia 3' },
  SDC1: { mean: 0.24 },
  CD38: { mean: 0.27 },
  SPI1: { mean: 0.74, disease: 'PU.1 haploinsufficiency (agammaglobulinemia 10, AD)' },
  CEBPB: { mean: 0.55 },
  MAFB: { mean: 0.6, disease: 'Multicentric carpotarsal osteolysis' },
  CEBPE: { mean: 0.63, disease: 'Specific granule deficiency' },
  GFI1: { mean: 0.65, disease: 'Severe congenital neutropenia 2' },
  ZBTB46: { mean: 0.48 },
  IRF8: { mean: 0.7, disease: 'IRF8 deficiency (DC/monocyte loss)' },
  BATF3: { mean: 0.5 },
  IRF4: { mean: 0.68, disease: 'IRF4-associated immunodeficiency' },
  GATA2: { mean: 0.79, disease: 'GATA2 deficiency (MonoMAC)' },
  MITF: { mean: 0.69, disease: 'Waardenburg syndrome 2A' },
  EOMES: { mean: 0.55 },
  TBX21: { mean: 0.57, disease: 'MSMD (mycobacterial susceptibility)' },
  NFIL3: { mean: 0.45 },
  ID2: { mean: 0.52 },
  STAT4: { mean: 0.5, disease: 'SLE/RA susceptibility; GOF → disabling pansclerotic morphea' },
  GATA3: { mean: 0.72, disease: 'HDR syndrome' },
  STAT6: { mean: 0.58, disease: 'Early-onset allergic disease (GOF)' },
  MAF: { mean: 0.66, disease: 'Aymé–Gripp syndrome' },
  RORC: { mean: 0.64, disease: 'RORγt deficiency (CMC + MSMD)' },
  STAT3: { mean: 0.77, disease: 'Autosomal-dominant Hyper-IgE syndrome' },
  FOXP3: { mean: 0.82, disease: 'IPEX syndrome' },
  IKZF2: { mean: 0.56, disease: 'Helios deficiency (immune dysregulation / CID)' },
  RUNX3: { mean: 0.58 },
  PAX5: { mean: 0.7, disease: 'B-ALL predisposition' },
  EBF1: { mean: 0.62 },
  BACH2: { mean: 0.6, disease: 'BRIDA syndrome' },
  PRDM1: { mean: 0.57 },
  XBP1: { mean: 0.5 },
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export const seedOf = hash;

/** Per-region (N bins along the sequence) pathogenicity profile. */
export function profileFor(gene: string, bins = 40): number[] {
  const mean = PATHO[gene]?.mean ?? 0.4;
  const r = rng(hash(gene));
  const peaks = [r(), r(), r()].map((p) => ({ c: p * bins, w: 2 + r() * 4, h: 0.25 + r() * 0.35 }));
  const out: number[] = [];
  for (let i = 0; i < bins; i++) {
    let v = mean - 0.15 + (r() - 0.5) * 0.25;
    for (const p of peaks) v += p.h * Math.exp(-((i - p.c) ** 2) / (2 * p.w * p.w));
    out.push(Math.min(1, Math.max(0, v)));
  }
  return out;
}

// AlphaMissense classes are defined per VARIANT; applied here to a gene-level
// mean they indicate which range the average falls in, not a gene verdict.
export function classify(score: number) {
  if (score < BENIGN_MAX) return { label: 'Mean in benign range', short: 'Benign range', tone: 'benign' as const };
  if (score > PATHOGENIC_MIN) return { label: 'Mean in pathogenic range', short: 'Pathogenic range', tone: 'pathogenic' as const };
  return { label: 'Mean in ambiguous range', short: 'Ambiguous', tone: 'ambiguous' as const };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const BLUE = [59, 130, 246];
const GREY = [203, 213, 225];
const RED = [239, 68, 68];

export function scoreColor(s: number) {
  const [a, b, t] = s < 0.45 ? [BLUE, GREY, s / 0.45] : [GREY, RED, (s - 0.45) / 0.55];
  return `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], t))).join(',')})`;
}

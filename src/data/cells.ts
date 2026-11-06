// ─────────────────────────────────────────────────────────────
//  Immunology Atlas – cell & protein catalogue
//  UniProt accessions are human (Homo sapiens) canonical entries.
// ─────────────────────────────────────────────────────────────

export type ProteinKind = 'marker' | 'tf';

export interface Protein {
  symbol: string; // display label (e.g. "CD25")
  gene: string; // HGNC gene symbol
  uniprot: string; // UniProt accession used to pull AlphaFold models
  name: string; // full protein name
  kind: ProteinKind;
}

export type NucleusType = 'round' | 'lobed' | 'kidney' | 'eccentric';

export interface CellShape {
  color: string;
  nucleusColor: string;
  bumpFreq: number;
  bumpAmp: number;
  ruffleFreq?: number;
  ruffleAmp?: number;
  arms?: { count: number; length: number; width: number; sharp: number };
  nucleus: NucleusType;
  nucleusSize: number;
  granules?: { count: number; color: string };
  er?: boolean;
  receptors: number;
  scale: [number, number, number];
  displayScale: number;
}

export interface Cell {
  id: string;
  name: string;
  aka?: string;
  category: Category;
  role: string;
  size: string;
  info: string;
  functions: string[];
  markers: string[]; // keys into PROTEINS
  tfs: string[]; // keys into PROTEINS
  shape: CellShape;
}

export type Category =
  | 'Innate · Myeloid'
  | 'Innate · Lymphoid'
  | 'Adaptive · T Cells'
  | 'Adaptive · B Cells';

export const CATEGORY_COLORS: Record<Category, string> = {
  'Innate · Myeloid': '#F59E0B',
  'Innate · Lymphoid': '#8B5CF6',
  'Adaptive · T Cells': '#0EA5E9',
  'Adaptive · B Cells': '#10B981',
};

const m = (symbol: string, gene: string, uniprot: string, name: string): Protein => ({
  symbol, gene, uniprot, name, kind: 'marker',
});
const t = (symbol: string, gene: string, uniprot: string, name: string): Protein => ({
  symbol, gene, uniprot, name, kind: 'tf',
});

export const PROTEINS: Record<string, Protein> = {
  // ── Surface markers ──
  CD3: m('CD3ε', 'CD3E', 'P07766', 'T-cell surface glycoprotein CD3 epsilon chain'),
  CD4: m('CD4', 'CD4', 'P01730', 'T-cell surface glycoprotein CD4'),
  CD8: m('CD8α', 'CD8A', 'P01732', 'T-cell surface glycoprotein CD8 alpha chain'),
  CD14: m('CD14', 'CD14', 'P08571', 'Monocyte differentiation antigen CD14'),
  CD68: m('CD68', 'CD68', 'P34810', 'Macrosialin (mainly lysosomal – intracellular stain)'),
  CD64: m('CD64', 'FCGR1A', 'P12314', 'High affinity immunoglobulin gamma Fc receptor I'),
  CD163: m('CD163', 'CD163', 'Q86VB7', 'Scavenger receptor cysteine-rich type 1 protein M130'),
  CD11b: m('CD11b', 'ITGAM', 'P11215', 'Integrin alpha-M'),
  CD16: m('CD16a', 'FCGR3A', 'P08637', 'Low affinity immunoglobulin gamma Fc region receptor III-A'),
  CD16b: m('CD16b', 'FCGR3B', 'O75015', 'Low affinity immunoglobulin gamma Fc region receptor III-B (GPI-anchored)'),
  CD66b: m('CD66b', 'CEACAM8', 'P31997', 'Carcinoembryonic antigen-related cell adhesion molecule 8'),
  CXCR2: m('CXCR2', 'CXCR2', 'P25025', 'C-X-C chemokine receptor type 2'),
  CD11c: m('CD11c', 'ITGAX', 'P20702', 'Integrin alpha-X'),
  HLADR: m('HLA-DR', 'HLA-DRA', 'P01903', 'HLA class II histocompatibility antigen, DR alpha chain'),
  CD83: m('CD83', 'CD83', 'Q01151', 'CD83 antigen'),
  CD86: m('CD86', 'CD86', 'P42081', 'T-lymphocyte activation antigen CD86'),
  CD117: m('CD117', 'KIT', 'P10721', 'Mast/stem cell growth factor receptor Kit'),
  FCER1A: m('FcεRIα', 'FCER1A', 'P12319', 'High affinity IgE receptor subunit alpha'),
  CD203c: m('CD203c', 'ENPP3', 'O14638', 'Ectonucleotide pyrophosphatase/phosphodiesterase family member 3'),
  CD56: m('CD56', 'NCAM1', 'P13591', 'Neural cell adhesion molecule 1'),
  NKp46: m('NKp46', 'NCR1', 'O76036', 'Natural cytotoxicity triggering receptor 1'),
  NKG2D: m('NKG2D', 'KLRK1', 'P26718', 'NKG2-D type II integral membrane protein'),
  CXCR3: m('CXCR3', 'CXCR3', 'P49682', 'C-X-C chemokine receptor type 3'),
  CCR5: m('CCR5', 'CCR5', 'P51681', 'C-C chemokine receptor type 5 (CD195; HIV-1 coreceptor)'),
  CXCR4: m('CXCR4', 'CXCR4', 'P61073', 'C-X-C chemokine receptor type 4 (CD184; Fusin)'),
  CCR4: m('CCR4', 'CCR4', 'P51679', 'C-C chemokine receptor type 4'),
  CRTH2: m('CRTH2', 'PTGDR2', 'Q9Y5Y4', 'Prostaglandin D2 receptor 2'),
  CCR6: m('CCR6', 'CCR6', 'P51684', 'C-C chemokine receptor type 6'),
  IL23R: m('IL-23R', 'IL23R', 'Q5VWK5', 'Interleukin-23 receptor'),
  CD161: m('CD161', 'KLRB1', 'Q12918', 'Killer cell lectin-like receptor subfamily B member 1'),
  CD127: m('CD127 (low)', 'IL7R', 'P16871', 'Interleukin-7 receptor subunit alpha'),
  CD25: m('CD25', 'IL2RA', 'P01589', 'Interleukin-2 receptor subunit alpha'),
  CTLA4: m('CTLA-4', 'CTLA4', 'P16410', 'Cytotoxic T-lymphocyte protein 4'),
  CD27: m('CD27', 'CD27', 'P26842', 'CD27 antigen'),
  CD28: m('CD28', 'CD28', 'P10747', 'T-cell-specific surface glycoprotein CD28'),
  CD19: m('CD19', 'CD19', 'P15391', 'B-lymphocyte antigen CD19'),
  CD20: m('CD20', 'MS4A1', 'P11836', 'B-lymphocyte antigen CD20'),
  CD79a: m('CD79a', 'CD79A', 'P11912', 'B-cell antigen receptor complex-associated protein alpha chain'),
  CD138: m('CD138', 'SDC1', 'P18827', 'Syndecan-1'),
  CD38: m('CD38', 'CD38', 'P28907', 'ADP-ribosyl cyclase/cyclic ADP-ribose hydrolase 1'),

  // ── Transcription factors ──
  PU1: t('PU.1', 'SPI1', 'P17947', 'Transcription factor PU.1'),
  CEBPB: t('C/EBPβ', 'CEBPB', 'P17676', 'CCAAT/enhancer-binding protein beta'),
  MAFB: t('MAFB', 'MAFB', 'Q9Y5Q3', 'Transcription factor MafB'),
  CEBPE: t('C/EBPε', 'CEBPE', 'Q15744', 'CCAAT/enhancer-binding protein epsilon'),
  GFI1: t('GFI1', 'GFI1', 'Q99684', 'Zinc finger protein Gfi-1'),
  ZBTB46: t('ZBTB46', 'ZBTB46', 'Q86UZ6', 'Zinc finger and BTB domain-containing protein 46'),
  IRF8: t('IRF8', 'IRF8', 'Q02556', 'Interferon regulatory factor 8'),
  BATF3: t('BATF3', 'BATF3', 'Q9NR55', 'Basic leucine zipper transcriptional factor ATF-like 3'),
  IRF4: t('IRF4', 'IRF4', 'Q15306', 'Interferon regulatory factor 4'),
  GATA2: t('GATA2', 'GATA2', 'P23769', 'Endothelial transcription factor GATA-2'),
  MITF: t('MITF', 'MITF', 'O75030', 'Microphthalmia-associated transcription factor'),
  EOMES: t('Eomes', 'EOMES', 'O95936', 'Eomesodermin homolog'),
  TBET: t('T-bet', 'TBX21', 'Q9UL17', 'T-box transcription factor TBX21'),
  NFIL3: t('NFIL3', 'NFIL3', 'Q16649', 'Nuclear factor interleukin-3-regulated protein'),
  ID2: t('ID2', 'ID2', 'Q02363', 'DNA-binding protein inhibitor ID-2'),
  STAT4: t('STAT4', 'STAT4', 'Q14765', 'Signal transducer and activator of transcription 4'),
  GATA3: t('GATA3', 'GATA3', 'P23771', 'Trans-acting T-cell-specific transcription factor GATA-3'),
  STAT6: t('STAT6', 'STAT6', 'P42226', 'Signal transducer and activator of transcription 6'),
  CMAF: t('c-Maf', 'MAF', 'O75444', 'Transcription factor Maf'),
  RORGT: t('RORγt', 'RORC', 'P51449', 'Nuclear receptor ROR-gamma (RORγt = isoform 2; model shows canonical RORγ)'),
  STAT3: t('STAT3', 'STAT3', 'P40763', 'Signal transducer and activator of transcription 3'),
  FOXP3: t('FOXP3', 'FOXP3', 'Q9BZS1', 'Forkhead box protein P3'),
  HELIOS: t('Helios', 'IKZF2', 'Q9UKS7', 'Zinc finger protein Helios'),
  RUNX3: t('RUNX3', 'RUNX3', 'Q13761', 'Runt-related transcription factor 3'),
  PAX5: t('PAX5', 'PAX5', 'Q02548', 'Paired box protein Pax-5'),
  EBF1: t('EBF1', 'EBF1', 'Q9UH73', 'Transcription factor COE1'),
  BACH2: t('BACH2', 'BACH2', 'Q9BYV9', 'Transcription regulator protein BACH2'),
  BLIMP1: t('BLIMP-1', 'PRDM1', 'O75626', 'PR domain zinc finger protein 1'),
  XBP1: t('XBP1', 'XBP1', 'P17861', 'X-box-binding protein 1'),
};

// ── Shape presets ──
const lymphocyte = (color: string, extra: Partial<CellShape> = {}): CellShape => ({
  color,
  nucleusColor: '#4C3D8F',
  bumpFreq: 13,
  bumpAmp: 0.022,
  nucleus: 'round',
  nucleusSize: 0.7,
  receptors: 70,
  scale: [1, 1, 1],
  displayScale: 1.05,
  ...extra,
});

export const CELLS: Cell[] = [
  // ───────── Innate · Myeloid ─────────
  {
    id: 'macrophage',
    name: 'Macrophage',
    aka: 'Mφ · Tissue-resident phagocyte',
    category: 'Innate · Myeloid',
    role: 'Phagocyte',
    size: '15–25 µm',
    info:
      'Large, long-lived phagocytes derived from embryonic progenitors or circulating monocytes. They patrol tissues, engulf pathogens, apoptotic cells and debris, and orchestrate inflammation and tissue repair through cytokine secretion and antigen presentation.',
    functions: ['Phagocytosis', 'Antigen presentation (MHC-II)', 'Cytokine release (IL-1β, TNF, IL-6)', 'Tissue remodelling'],
    markers: ['CD14', 'CD64', 'CD163', 'CD11b', 'CD68', 'CCR5', 'CXCR4'],
    tfs: ['PU1', 'CEBPB', 'MAFB'],
    shape: {
      color: '#F6A965',
      nucleusColor: '#7A3E1D',
      bumpFreq: 4,
      bumpAmp: 0.06,
      ruffleFreq: 11,
      ruffleAmp: 0.035,
      arms: { count: 6, length: 0.38, width: 0.55, sharp: 1.6 },
      nucleus: 'kidney',
      nucleusSize: 0.5,
      granules: { count: 40, color: '#E0782F' },
      receptors: 60,
      scale: [1.1, 0.95, 1],
      displayScale: 0.95,
    },
  },
  {
    id: 'neutrophil',
    name: 'Neutrophil',
    aka: 'Polymorphonuclear leukocyte (PMN)',
    category: 'Innate · Myeloid',
    role: 'Granulocyte',
    size: '12–15 µm',
    info:
      'The most abundant circulating leukocyte and first responder to acute infection. Neutrophils extravasate rapidly to inflamed sites, kill microbes via phagocytosis, reactive oxygen species, granule proteases and neutrophil extracellular traps (NETs).',
    functions: ['Rapid chemotaxis (CXCL8)', 'Oxidative burst', 'Degranulation', 'NETosis'],
    markers: ['CD66b', 'CD16b', 'CD11b', 'CXCR2'],
    tfs: ['CEBPE', 'PU1', 'GFI1'],
    shape: {
      color: '#F7C873',
      nucleusColor: '#6D3FA6',
      bumpFreq: 9,
      bumpAmp: 0.04,
      nucleus: 'lobed',
      nucleusSize: 0.3,
      granules: { count: 120, color: '#E9A23B' },
      receptors: 50,
      scale: [1, 1, 1],
      displayScale: 1.1,
    },
  },
  {
    id: 'dendritic',
    name: 'Dendritic Cell',
    aka: 'Conventional DC (cDC)',
    category: 'Innate · Myeloid',
    role: 'Professional APC',
    size: '10–15 µm (body)',
    info:
      'Sentinel antigen-presenting cells with long membrane processes. Immature DCs sample antigen in peripheral tissues; upon activation they upregulate MHC-II and co-stimulatory molecules, migrate to lymph nodes and prime naïve T cells — bridging innate and adaptive immunity. ZBTB46 marks all cDCs; IRF8/BATF3 specify cDC1 and IRF4 specifies cDC2.',
    functions: ['Antigen capture & processing', 'Naïve T-cell priming', 'Cross-presentation (cDC1)', 'Migration via CCR7'],
    markers: ['CD11c', 'HLADR', 'CD83', 'CD86'],
    tfs: ['ZBTB46', 'IRF8', 'BATF3', 'IRF4'],
    shape: {
      color: '#F59E8B',
      nucleusColor: '#7C2D3A',
      bumpFreq: 6,
      bumpAmp: 0.03,
      arms: { count: 9, length: 1.0, width: 0.32, sharp: 2.4 },
      nucleus: 'kidney',
      nucleusSize: 0.42,
      receptors: 55,
      scale: [1, 1, 1],
      displayScale: 0.72,
    },
  },
  {
    id: 'mast',
    name: 'Mast Cell',
    aka: 'Tissue-resident granulated effector cell',
    category: 'Innate · Myeloid',
    role: 'Granulated effector',
    size: '8–20 µm',
    info:
      'Tissue-resident cells, arising from a distinct progenitor, densely packed with metachromatic granules containing histamine, heparin and tryptase (plus chymase in the MC_TC subset). Cross-linking of IgE bound to FcεRI triggers rapid degranulation, driving allergic and anaphylactic responses and defence against helminths.',
    functions: ['IgE-mediated degranulation', 'Histamine & tryptase release', 'Lipid mediator synthesis', 'Anti-helminth defence'],
    markers: ['CD117', 'FCER1A', 'CD203c'],
    tfs: ['GATA2', 'MITF'],
    shape: {
      color: '#EFA0C0',
      nucleusColor: '#6B2149',
      bumpFreq: 5,
      bumpAmp: 0.05,
      nucleus: 'round',
      nucleusSize: 0.38,
      granules: { count: 260, color: '#9D2A6A' },
      receptors: 40,
      scale: [1.05, 0.95, 1],
      displayScale: 1.05,
    },
  },

  // ───────── Innate · Lymphoid ─────────
  {
    id: 'nk',
    name: 'NK Cell',
    aka: 'Natural killer cell (ILC1-related)',
    category: 'Innate · Lymphoid',
    role: 'Cytotoxic ILC',
    size: '10–12 µm',
    info:
      'Large granular lymphocytes (human phenotype CD3⁻CD56⁺) that kill virus-infected and transformed cells without prior sensitisation. Their activity is set by a balance of activating (NKG2D, NKp46) and inhibitory (KIR, NKG2A) receptors that detect stress ligands and missing self-MHC-I; CD16 mediates ADCC.',
    functions: ['“Missing-self” recognition', 'Perforin/granzyme killing', 'ADCC via CD16', 'IFN-γ production'],
    markers: ['CD56', 'CD16', 'NKp46', 'NKG2D'],
    tfs: ['EOMES', 'TBET', 'NFIL3', 'ID2'],
    shape: lymphocyte('#B9A3F5', {
      nucleusColor: '#3F2A86',
      bumpFreq: 11,
      bumpAmp: 0.03,
      nucleusSize: 0.58,
      granules: { count: 45, color: '#7C3AED' },
    }),
  },

  // ───────── Adaptive · T Cells ─────────
  {
    id: 'th1',
    name: 'CD4⁺ Th1 Cell',
    aka: 'Type 1 helper T cell',
    category: 'Adaptive · T Cells',
    role: 'Helper T cell',
    size: '7–10 µm',
    info:
      'Helper T cells polarised by IL-12 and IFN-γ. Th1 cells secrete IFN-γ, TNF and IL-2 to activate macrophages and support cytotoxic T-cell responses, providing immunity against intracellular bacteria (e.g. Mycobacteria) and viruses.',
    functions: ['IFN-γ secretion', 'Classical macrophage activation', 'CTL help', 'Cell-mediated immunity'],
    markers: ['CD3', 'CD4', 'CXCR3', 'CCR5'],
    tfs: ['TBET', 'STAT4'],
    shape: lymphocyte('#7DD3FC'),
  },
  {
    id: 'th2',
    name: 'CD4⁺ Th2 Cell',
    aka: 'Type 2 helper T cell',
    category: 'Adaptive · T Cells',
    role: 'Helper T cell',
    size: '7–10 µm',
    info:
      'Helper T cells induced by IL-4. Th2 cells produce IL-4, IL-5 and IL-13, promoting IgE class switching, eosinophil recruitment and mucus production. They mediate defence against helminths and drive allergic inflammation and asthma.',
    functions: ['IL-4 / IL-5 / IL-13 secretion', 'IgE class-switch help', 'Eosinophil activation', 'Alternative macrophage activation'],
    markers: ['CD3', 'CD4', 'CCR4', 'CRTH2'],
    tfs: ['GATA3', 'STAT6', 'CMAF'],
    shape: lymphocyte('#93C5FD'),
  },
  {
    id: 'th17',
    name: 'CD4⁺ Th17 Cell',
    aka: 'IL-17-producing helper T cell',
    category: 'Adaptive · T Cells',
    role: 'Helper T cell',
    size: '7–10 µm',
    info:
      'Helper T cells differentiated under IL-6 and TGF-β (plus IL-1β in humans), with IL-23 stabilising and expanding the lineage. Th17 cells secrete IL-17A, IL-17F and IL-22, recruiting neutrophils and strengthening epithelial barriers against extracellular bacteria and fungi; dysregulation drives autoimmunity (psoriasis, IBD, MS).',
    functions: ['IL-17A/F & IL-22 secretion', 'Neutrophil recruitment', 'Barrier immunity', 'Anti-fungal defence'],
    markers: ['CD3', 'CD4', 'CCR6', 'IL23R', 'CD161'],
    tfs: ['RORGT', 'STAT3'],
    shape: lymphocyte('#67E8F9'),
  },
  {
    id: 'treg',
    name: 'Regulatory T Cell',
    aka: 'Treg · CD4⁺CD25⁺FOXP3⁺',
    category: 'Adaptive · T Cells',
    role: 'Suppressor T cell',
    size: '7–10 µm',
    info:
      'Suppressive CD4⁺ T cells (human phenotype CD25^high CD127^low FOXP3⁺) that maintain peripheral tolerance and prevent autoimmunity. Tregs act via IL-2 consumption (high CD25), CTLA-4-mediated removal of CD80/86 from APCs, and secretion of IL-10 and TGF-β (IL-35 shown mainly in mice). Loss of FOXP3 causes IPEX syndrome.',
    functions: ['Self-tolerance', 'IL-2 sequestration', 'CTLA-4 trans-endocytosis', 'IL-10 / TGF-β secretion'],
    markers: ['CD3', 'CD4', 'CD25', 'CD127', 'CTLA4'],
    tfs: ['FOXP3', 'HELIOS'],
    shape: lymphocyte('#A5B4FC'),
  },
  {
    id: 'cd8',
    name: 'CD8⁺ Cytotoxic T Cell',
    aka: 'CTL · Killer T cell',
    category: 'Adaptive · T Cells',
    role: 'Cytotoxic T cell',
    size: '7–10 µm',
    info:
      'MHC class I-restricted T cells that recognise peptide antigens on infected or malignant cells. Upon activation they form an immunological synapse and release perforin and granzymes, or engage Fas–FasL, to induce target apoptosis; they also secrete IFN-γ and TNF. CD27 and CD28 mark naïve/early-memory CTLs and are lost on terminally differentiated effectors.',
    functions: ['MHC-I antigen recognition', 'Perforin/granzyme release', 'Fas–FasL killing', 'Memory formation'],
    markers: ['CD3', 'CD8', 'CD27', 'CD28'],
    tfs: ['RUNX3', 'TBET', 'EOMES'],
    shape: lymphocyte('#60A5FA', { granules: { count: 30, color: '#1D4ED8' } }),
  },

  // ───────── Adaptive · B Cells ─────────
  {
    id: 'bcell',
    name: 'B Cell',
    aka: 'Naïve / mature B lymphocyte',
    category: 'Adaptive · B Cells',
    role: 'Humoral lymphocyte',
    size: '7–10 µm',
    info:
      'Lymphocytes bearing a membrane immunoglobulin B-cell receptor (BCR). B cells bind native antigen, internalise and present it to T follicular helper cells, and undergo class switching (largely before germinal-centre entry) and germinal-centre reactions — somatic hypermutation and affinity selection — to become plasma or memory B cells.',
    functions: ['BCR antigen recognition', 'Antigen presentation to Tfh', 'Germinal-centre reaction', 'Memory B-cell formation'],
    markers: ['CD19', 'CD20', 'CD79a', 'HLADR'],
    tfs: ['PAX5', 'EBF1', 'BACH2'],
    shape: lymphocyte('#6EE7B7', { nucleusColor: '#14532D' }),
  },
  {
    id: 'plasma',
    name: 'Plasma Cell',
    aka: 'Antibody-secreting cell (ASC)',
    category: 'Adaptive · B Cells',
    role: 'Antibody factory',
    size: '9–20 µm',
    info:
      'Terminally differentiated B cells specialised for high-rate antibody secretion (thousands of molecules per second). They have an eccentric “clock-face” nucleus and an expanded rough endoplasmic reticulum; long-lived plasma cells reside in bone-marrow niches for decades.',
    functions: ['Immunoglobulin secretion', 'Unfolded protein response', 'Long-term serological memory'],
    markers: ['CD138', 'CD38', 'CD27'],
    tfs: ['BLIMP1', 'IRF4', 'XBP1'],
    shape: {
      color: '#86EFAC',
      nucleusColor: '#166534',
      bumpFreq: 7,
      bumpAmp: 0.025,
      nucleus: 'eccentric',
      nucleusSize: 0.42,
      er: true,
      receptors: 45,
      scale: [1.18, 0.92, 0.95],
      displayScale: 1.0,
    },
  },
];

export const CATEGORIES: Category[] = [
  'Innate · Myeloid',
  'Innate · Lymphoid',
  'Adaptive · T Cells',
  'Adaptive · B Cells',
];

export const dexNumber = (cell: Cell) =>
  '#' + String(CELLS.findIndex((c) => c.id === cell.id) + 1).padStart(3, '0');

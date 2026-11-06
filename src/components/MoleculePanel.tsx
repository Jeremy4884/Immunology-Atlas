import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Protein } from '../data/cells';
import { PATHO, classify } from '../data/pathogenicity';
import { type StructureResult, fetchStructure, load3Dmol, plddtColor } from '../lib/structures';
import { HeatStrip, ScoreBar } from './PathogenicityPanel';
import HelpTip, { GeneProfileHelp } from './HelpTip';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Style = 'cartoon' | 'surface' | 'stick' | 'sphere';
type ColorMode = 'plddt' | 'spectrum';

interface Props {
  protein: Protein;
  accent: string;
  onClose: () => void;
}

export default function MoleculePanel({ protein, accent, onClose }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const libRef = useRef<any>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [result, setResult] = useState<StructureResult | null>(null);
  const [style, setStyle] = useState<Style>('cartoon');
  const [color, setColor] = useState<ColorMode>('plddt');
  const [spin, setSpin] = useState(true);

  const applyStyle = useCallback(() => {
    const v = viewerRef.current;
    const lib = libRef.current;
    if (!v || !lib) return;
    const colorSpec = color === 'plddt' ? { colorfunc: (a: any) => plddtColor(a.b) } : { color: 'spectrum' };
    v.removeAllSurfaces();
    if (style === 'cartoon') v.setStyle({}, { cartoon: { ...colorSpec, thickness: 0.4 } });
    if (style === 'stick') v.setStyle({}, { stick: { radius: 0.18, ...colorSpec }, cartoon: { opacity: 0.25, color: '#cbd5e1' } });
    if (style === 'sphere') v.setStyle({}, { sphere: { scale: 0.9, ...colorSpec } });
    if (style === 'surface') {
      v.setStyle({}, { cartoon: { ...colorSpec } });
      v.addSurface(lib.SurfaceType?.VDW ?? 1, { opacity: 0.72, color: '#e2e8f0' });
    }
    v.render();
  }, [style, color]);

  // Load + render structure whenever protein changes
  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setResult(null);
    (async () => {
      try {
        const [lib, res] = await Promise.all([load3Dmol(), fetchStructure(protein.uniprot)]);
        if (cancelled || !hostRef.current) return;
        libRef.current = lib;
        if (!viewerRef.current) {
          viewerRef.current = lib.createViewer(hostRef.current, { backgroundColor: 'white', antialias: true });
        }
        const v = viewerRef.current;
        v.clear();
        v.addModel(res.pdb, 'pdb');
        setResult(res);
        applyStyle();
        v.zoomTo();
        v.zoom(0.95);
        v.render();
        setStatus('ready');
      } catch (e) {
        console.error(e);
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [protein.uniprot]);

  useEffect(() => {
    if (status === 'ready') applyStyle();
  }, [applyStyle, status]);

  useEffect(() => {
    const v = viewerRef.current;
    if (!v || status !== 'ready') return;
    if (spin) v.spin('y', 0.6);
    else v.spin(false);
  }, [spin, status]);

  useEffect(() => {
    const onResize = () => viewerRef.current?.resize();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
      viewerRef.current?.spin(false);
    };
  }, [onClose]);

  const zoom = (f: number) => {
    viewerRef.current?.zoom(f, 250);
  };
  const reset = () => {
    const v = viewerRef.current;
    if (!v) return;
    v.zoomTo();
    v.zoom(0.95);
    v.render();
  };

  const patho = PATHO[protein.gene];
  const cls = classify(patho?.mean ?? 0);

  return (
    <>
      <motion.div
        className="scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.aside
        className="molecule-panel"
        initial={{ x: '105%' }}
        animate={{ x: 0 }}
        exit={{ x: '105%' }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      >
        <header>
          <div>
            <span className="eyebrow" style={{ color: accent }}>
              {protein.kind === 'marker' ? 'Immune Marker' : 'Transcription Factor'} · Molecular Zoom
            </span>
            <h2>{protein.symbol}</h2>
            <p className="aka">{protein.name}</p>
            <div className="meta">
              <span className="chip ghost mono">Gene {protein.gene}</span>
              <a
                className="chip ghost mono link"
                href={`https://www.uniprot.org/uniprotkb/${protein.uniprot}`}
                target="_blank"
                rel="noreferrer"
              >
                UniProt {protein.uniprot} ↗
              </a>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="mol-stage">
          <div ref={hostRef} className="mol-host" />
          {status === 'loading' && (
            <div className="mol-overlay">
              <div className="spinner" />
              <span>Fetching AlphaFold model…</span>
            </div>
          )}
          {status === 'error' && <div className="mol-overlay">Unable to render structure.</div>}

          <div className="mol-toolbar">
            <button className={spin ? 'on' : ''} onClick={() => setSpin((s) => !s)} title="Auto-rotate">
              ⟳
            </button>
            <button onClick={() => zoom(1.3)} title="Zoom in">
              ＋
            </button>
            <button onClick={() => zoom(0.77)} title="Zoom out">
              －
            </button>
            <button onClick={reset} title="Reset view">
              ⌖
            </button>
          </div>

          {result && (
            <div className={'source-badge ' + result.source}>
              {result.source === 'alphafold'
                ? `AlphaFold DB${result.version ? ` · v${result.version}` : ''}`
                : 'Offline · procedural model'}
            </div>
          )}
        </div>

        <div className="mol-controls">
          <div className="segmented">
            {(['cartoon', 'surface', 'stick', 'sphere'] as Style[]).map((s) => (
              <button key={s} className={style === s ? 'active' : ''} onClick={() => setStyle(s)}>
                {s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <div className="segmented small">
            <button className={color === 'plddt' ? 'active' : ''} onClick={() => setColor('plddt')}>
              pLDDT
            </button>
            <button className={color === 'spectrum' ? 'active' : ''} onClick={() => setColor('spectrum')}>
              N→C
            </button>
          </div>
        </div>

        {color === 'plddt' ? (
          <div className="plddt-legend">
            <span><i style={{ background: '#0053D6' }} />Very high &gt;90</span>
            <span><i style={{ background: '#65CBF3' }} />Confident 70–90</span>
            <span><i style={{ background: '#FFDB13' }} />Low 50–70</span>
            <span><i style={{ background: '#FF7D45' }} />Very low &lt;50</span>
          </div>
        ) : (
          <div className="spectrum-legend">
            <span>N-term</span>
            <div />
            <span>C-term</span>
          </div>
        )}

        <div className="stats">
          <div>
            <span className="eyebrow">Residues</span>
            <strong>{result?.length ?? '—'}</strong>
          </div>
          <div>
            <span className="eyebrow">Mean pLDDT</span>
            <strong style={{ color: result?.meanPlddt ? plddtColor(result.meanPlddt) : undefined }}>
              {result?.meanPlddt ? result.meanPlddt.toFixed(1) : '—'}
            </strong>
          </div>
          <div>
            <span className="eyebrow">Missense impact</span>
            <strong className={'tone-' + cls.tone}>{(patho?.mean ?? 0).toFixed(2)}</strong>
          </div>
        </div>

        <div className="card flat">
          <div className="card-label with-help">
            Genetic Pathogenicity <span className="hint">per-region · {cls.label}</span>
            <HelpTip title="Per-protein pathogenicity profile">
              <GeneProfileHelp />
            </HelpTip>
          </div>
          <HeatStrip gene={protein.gene} bins={60} height={18} />
          <div className="axis">
            <span>N</span>
            <span>Sequence position →</span>
            <span>C</span>
          </div>
          <ScoreBar score={patho?.mean ?? 0} />
          <div className="legend">
            <span>Benign</span>
            <span>Ambiguous</span>
            <span>Pathogenic</span>
          </div>
          {patho?.disease && <p className="disease">Associated phenotype: {patho.disease}</p>}
        </div>

        <div className="external-links">
          <a
            className="af-link"
            href={`https://alphafold.ebi.ac.uk/entry/${protein.uniprot}`}
            target="_blank"
            rel="noreferrer"
          >
            Open in AlphaFold Protein Structure Database ↗
          </a>
          <a
            className="allen-link"
            href={`https://apps.allenimmunology.org/aifi/resources/imm-health-atlas/vis/reference/108-1/?gene=${encodeURIComponent(protein.gene)}`}
            target="_blank"
            rel="noreferrer"
            title="View single-cell RNA expression in healthy human PBMC subsets"
          >
            <span className="allen-icon">🔬</span>
            <span>View <b>{protein.gene}</b> in Allen Immune Health Atlas (1.8M PBMCs) ↗</span>
          </a>
        </div>
      </motion.aside>
    </>
  );
}

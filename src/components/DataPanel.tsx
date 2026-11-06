import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { CATEGORY_COLORS, PROTEINS, type Cell, type Protein, dexNumber } from '../data/cells';
import CellIcon from './CellIcon';
import HelpTip, { PathogenicityHelp } from './HelpTip';
import PathogenicityPanel from './PathogenicityPanel';

interface Props {
  cell: Cell;
  onOpenProtein: (p: Protein) => void;
}

const card = {
  initial: { opacity: 0, y: 12 },
  animate: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.35, ease: [0.2, 0.8, 0.2, 1] } }),
  exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
};

const MoleculeIcon = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden>
    <circle cx="6" cy="7" r="2.6" fill="currentColor" />
    <circle cx="18" cy="8" r="2.2" fill="currentColor" opacity=".7" />
    <circle cx="11" cy="17" r="2.8" fill="currentColor" opacity=".85" />
    <path d="M6 7l12 1M6 7l5 10M18 8l-7 9" stroke="currentColor" strokeWidth="1.4" opacity=".5" />
  </svg>
);

export default function DataPanel({ cell, onOpenProtein }: Props) {
  const [showPatho, setShowPatho] = useState(true);
  const [pathoScope, setPathoScope] = useState<'all' | 'markers' | 'tfs'>('all');
  const accent = CATEGORY_COLORS[cell.category];
  const pathoKeys =
    pathoScope === 'markers' ? cell.markers : pathoScope === 'tfs' ? cell.tfs : [...cell.markers, ...cell.tfs];

  return (
    <aside className="data-panel">
      <AnimatePresence mode="wait">
        <motion.div key={cell.id} className="cards">
          {/* Name */}
          <motion.section className="card name-card" variants={card} initial="initial" animate="animate" exit="exit" custom={0}>
            <div className="card-label">Name</div>
            <div className="name-row">
              <div className="name-with-icon">
                <CellIcon cell={cell} size={52} />
                <div>
                  <h2>{cell.name}</h2>
                  {cell.aka && <p className="aka">{cell.aka}</p>}
                </div>
              </div>
              <span className="dex big">{dexNumber(cell)}</span>
            </div>
            <div className="meta">
              <span className="chip" style={{ color: accent, background: accent + '14', borderColor: accent + '33' }}>
                {cell.category}
              </span>
              <span className="chip ghost">{cell.role}</span>
              <span className="chip ghost">⌀ {cell.size}</span>
              <a
                className="chip allen-chip"
                href={`https://apps.allenimmunology.org/aifi/resources/imm-health-atlas/vis/reference/108-1/?gene=${encodeURIComponent(PROTEINS[cell.markers[0]]?.gene || 'CD4')}`}
                target="_blank"
                rel="noreferrer"
                title={`Explore ${cell.name} reference gene expression in Allen Immune Health Atlas (v1.0.8)`}
              >
                🔬 Allen Atlas (1.8M PBMCs) ↗
              </a>
            </div>
          </motion.section>

          {/* Information */}
          <motion.section className="card" variants={card} initial="initial" animate="animate" exit="exit" custom={1}>
            <div className="card-label">Information</div>
            <p className="info">{cell.info}</p>
            <ul className="functions">
              {cell.functions.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </motion.section>

          {/* Immune markers */}
          <motion.section className="card" variants={card} initial="initial" animate="animate" exit="exit" custom={2}>
            <div className="card-label">
              Immune Marker <span className="hint">tap for AlphaFold structure</span>
            </div>
            <div className="tags">
              {cell.markers.map((k) => {
                const p = PROTEINS[k];
                return (
                  <motion.button
                    key={k}
                    className="tag marker"
                    style={{ ['--tc' as string]: cell.shape.color }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onOpenProtein(p)}
                    title={`${p.name} · ${p.uniprot}`}
                  >
                    <MoleculeIcon />
                    {p.symbol}
                  </motion.button>
                );
              })}
            </div>
          </motion.section>

          {/* Transcription factors */}
          <motion.section className="card" variants={card} initial="initial" animate="animate" exit="exit" custom={3}>
            <div className="card-label">
              Transcription Factor <span className="hint">nuclear regulators</span>
            </div>
            <div className="tags">
              {cell.tfs.map((k) => {
                const p = PROTEINS[k];
                return (
                  <motion.button
                    key={k}
                    className="tag tf"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onOpenProtein(p)}
                    title={`${p.name} · ${p.uniprot}`}
                  >
                    <span className="tf-dot" />
                    {p.symbol}
                  </motion.button>
                );
              })}
            </div>
          </motion.section>

          {/* Genetic pathogenicity */}
          <motion.section className="card" variants={card} initial="initial" animate="animate" exit="exit" custom={4}>
            <div className="card-label row">
              <span className="with-help">
                Genetic Pathogenicity <span className="hint">AlphaMissense</span>
                <HelpTip title="Genetic Pathogenicity">
                  <PathogenicityHelp />
                </HelpTip>
              </span>
              <button
                className={'switch' + (showPatho ? ' on' : '')}
                onClick={() => setShowPatho((s) => !s)}
                aria-label="Toggle genetic pathogenicity"
              >
                <span />
              </button>
            </div>
            <AnimatePresence initial={false}>
              {showPatho && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="segmented">
                    {(['all', 'markers', 'tfs'] as const).map((s) => (
                      <button key={s} className={pathoScope === s ? 'active' : ''} onClick={() => setPathoScope(s)}>
                        {s === 'all' ? 'All' : s === 'markers' ? 'Markers' : 'TFs'}
                      </button>
                    ))}
                  </div>
                  <PathogenicityPanel keys={pathoKeys} onOpen={onOpenProtein} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        </motion.div>
      </AnimatePresence>
    </aside>
  );
}

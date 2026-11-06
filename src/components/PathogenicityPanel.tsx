import { motion } from 'framer-motion';
import { PROTEINS, type Protein } from '../data/cells';
import { BENIGN_MAX, PATHO, PATHOGENIC_MIN, classify, profileFor, scoreColor } from '../data/pathogenicity';
import HelpTip, { VulnerabilityHelp } from './HelpTip';

export function HeatStrip({ gene, bins = 40, height = 10 }: { gene: string; bins?: number; height?: number }) {
  const prof = profileFor(gene, bins);
  return (
    <div className="heat-strip" style={{ height }}>
      {prof.map((v, i) => (
        <motion.span
          key={i}
          title={`Region ${i + 1}: ${v.toFixed(2)}`}
          initial={{ opacity: 0, scaleY: 0.3 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ delay: i * 0.006 }}
          style={{ background: scoreColor(v) }}
        />
      ))}
    </div>
  );
}

export function ScoreBar({ score }: { score: number }) {
  return (
    <div className="score-bar">
      <div className="gradient" />
      <span className="tick" style={{ left: `${BENIGN_MAX * 100}%` }} />
      <span className="tick" style={{ left: `${PATHOGENIC_MIN * 100}%` }} />
      <motion.span
        className="pointer"
        initial={{ left: '0%' }}
        animate={{ left: `${score * 100}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
      />
    </div>
  );
}

interface Props {
  keys: string[];
  onOpen: (p: Protein) => void;
}

export default function PathogenicityPanel({ keys, onOpen }: Props) {
  const proteins = keys.map((k) => PROTEINS[k]);
  const ranked = [...proteins].sort((a, b) => (PATHO[b.gene]?.mean ?? 0) - (PATHO[a.gene]?.mean ?? 0));
  const top = ranked[0];
  const topScore = PATHO[top.gene]?.mean ?? 0;
  const vulnerability = proteins.reduce((s, p) => s + (PATHO[p.gene]?.mean ?? 0), 0) / proteins.length;

  return (
    <div className="patho">
      <div className="patho-summary">
        <div>
          <span className="eyebrow with-help">
            Cell-function vulnerability
            <HelpTip title="Cell-function vulnerability">
              <VulnerabilityHelp />
            </HelpTip>
          </span>
          <strong style={{ color: scoreColor(vulnerability) }}>{vulnerability.toFixed(2)}</strong>
        </div>
        <ScoreBar score={vulnerability} />
        <div className="legend">
          <span>Benign</span>
          <span>Ambiguous</span>
          <span>Pathogenic</span>
        </div>
      </div>

      <ul className="patho-list">
        {ranked.map((p) => {
          const e = PATHO[p.gene];
          const c = classify(e?.mean ?? 0);
          return (
            <li key={p.gene} onClick={() => onOpen(p)}>
              <div className="patho-row-head">
                <span className={'gene ' + p.kind}>{p.symbol}</span>
                <span className={'class-pill ' + c.tone} title={c.label}>{c.short}</span>
                <span className="score">{(e?.mean ?? 0).toFixed(2)}</span>
              </div>
              <HeatStrip gene={p.gene} />
              {e?.disease && <span className="disease">↳ {e.disease}</span>}
            </li>
          );
        })}
      </ul>

      {topScore > PATHOGENIC_MIN && (
        <p className="patho-note">
          Missense variants in <b>{top.symbol}</b> carry the highest predicted impact for this cell type
          {PATHO[top.gene]?.disease ? ` and are linked to ${PATHO[top.gene]!.disease}.` : '.'}
        </p>
      )}
      <p className="demo-flag">Illustrative AlphaMissense-style scores · demo data, not for clinical use</p>
    </div>
  );
}

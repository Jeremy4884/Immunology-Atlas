import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  title: string;
  children: React.ReactNode;
  width?: number;
}

/** "?" button that opens a floating explanation card (portal → never clipped). */
export default function HelpTip({ title, children, width = 320 }: Props) {
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<React.CSSProperties>({});

  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    const left = Math.min(Math.max(8, r.left - 24), window.innerWidth - width - 8);
    const below = r.bottom < window.innerHeight * 0.55;
    setPos(below ? { left, top: r.bottom + 8 } : { left, bottom: window.innerHeight - r.top + 8 });
  }, [open, width]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (pop.current?.contains(e.target as Node) || btn.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const close = () => setOpen(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    document.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
      document.removeEventListener('scroll', close, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btn}
        className={'help-btn' + (open ? ' on' : '')}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-label={`How to read: ${title}`}
        title="How to read this"
      >
        ?
      </button>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={pop}
              className="help-pop"
              style={{ ...pos, width }}
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.16 }}
            >
              <div className="help-head">
                <span className="eyebrow">How to read</span>
                <strong>{title}</strong>
              </div>
              <div className="help-body">{children}</div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

/* ── Shared help content ───────────────────────────────────── */

const MiniStrip = () => (
  <div className="help-strip">
    {[0.15, 0.2, 0.3, 0.42, 0.5, 0.62, 0.8, 0.9, 0.7, 0.45, 0.3, 0.22].map((v, i) => (
      <span
        key={i}
        style={{
          background:
            v < 0.45
              ? `color-mix(in srgb, #3b82f6 ${Math.round((1 - v / 0.45) * 100)}%, #cbd5e1)`
              : `color-mix(in srgb, #ef4444 ${Math.round(((v - 0.45) / 0.55) * 100)}%, #cbd5e1)`,
        }}
      />
    ))}
  </div>
);

export function PathogenicityHelp() {
  return (
    <>
      <p>
        Predicts how likely a <b>single amino-acid change (missense variant)</b> in each gene is to disrupt protein
        function, on a <b>0 → 1</b> scale (AlphaMissense-style).
      </p>
      <MiniStrip />
      <div className="help-axis">
        <span>N-terminus</span>
        <span>C-terminus</span>
      </div>
      <ul>
        <li>
          <b>Heat strip</b> – the protein sequence left → right. Each block is a region; its colour is the average
          predicted impact of mutations there. <b>Red clusters</b> mark functionally critical regions (e.g. DNA-binding
          or ligand-binding domains).
        </li>
        <li>
          <b>Number</b> – mean score over the whole protein.
        </li>
        <li>
          <b>Class pill</b> – which AlphaMissense range the gene's <i>mean</i> falls in. (Officially these classes
          apply to individual variants; a gene in the benign range can still carry single damaging variants.)
          <div className="help-classes">
            <span className="class-pill benign">Benign &lt; 0.34</span>
            <span className="class-pill ambiguous">Ambiguous 0.34–0.564</span>
            <span className="class-pill pathogenic">Pathogenic &gt; 0.564</span>
          </div>
        </li>
        <li>
          <b>↳ line</b> – known inherited disease linked to that gene.
        </li>
        <li>Click any row to open its 3D AlphaFold structure.</li>
      </ul>
      <p className="help-warn">Demo values for illustration — not real AlphaMissense output, not for clinical use.</p>
    </>
  );
}

export function VulnerabilityHelp() {
  return (
    <>
      <p>
        A single summary of how <b>sensitive this cell's identity programme</b> is to missense mutations: the{' '}
        <b>average</b> of the mean pathogenicity scores of the genes shown (all, markers only, or TFs only, depending on
        the filter).
      </p>
      <div className="help-bar">
        <div />
        <i style={{ left: '34%' }} />
        <i style={{ left: '56.4%' }} />
      </div>
      <div className="help-axis">
        <span>0 · tolerant</span>
        <span>1 · intolerant</span>
      </div>
      <ul>
        <li>
          <b>White pointer</b> = the cell's score. The two thin ticks mark the 0.34 and 0.564 class boundaries.
        </li>
        <li>
          <b>Blue / low</b> – the cell's key genes generally tolerate amino-acid changes; mutations rarely abolish this
          cell type.
        </li>
        <li>
          <b>Red / high</b> – the cell depends on mutation-intolerant genes (often master transcription factors such as
          FOXP3 or GATA2); damaging variants are more likely to cause loss of the cell or its function
          (immunodeficiency / autoimmunity).
        </li>
        <li>Switching to <b>TFs</b> usually raises the score — nuclear regulators are typically less tolerant than surface receptors.</li>
      </ul>
      <p className="help-warn">Relative, illustrative index — not a patient risk score.</p>
    </>
  );
}

export function GeneProfileHelp() {
  return (
    <>
      <p>
        Predicted impact of missense variants along <b>this protein's sequence</b> (N → C). Blue = likely benign, grey =
        ambiguous, red = likely pathogenic.
      </p>
      <ul>
        <li>Compare red regions with the 3D structure: they usually sit in well-folded, high-pLDDT (dark blue) domains.</li>
        <li>Low-confidence (orange) disordered regions typically tolerate mutation (blue in the strip).</li>
        <li>The bar below shows the protein's mean score against the 0.34 / 0.564 class cut-offs.</li>
      </ul>
      <p className="help-warn">Demo values — not real AlphaMissense output.</p>
    </>
  );
}

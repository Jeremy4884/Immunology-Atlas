import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import CellViewer from './components/CellViewer';
import DataPanel from './components/DataPanel';
import Sidebar from './components/Sidebar';
import MoleculePanel from './components/MoleculePanel';
import TumorGame from './game/TumorGame';
import { CATEGORY_COLORS, CELLS, type Cell, type Protein, dexNumber } from './data/cells';

export default function App() {
  const [cell, setCell] = useState<Cell>(CELLS[0]);
  const [protein, setProtein] = useState<Protein | null>(null);
  const [pov, setPov] = useState(false);
  const accent = CATEGORY_COLORS[cell.category];

  // ↑ / ↓ keyboard navigation between entries
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (pov || protein || (e.target as HTMLElement).tagName === 'INPUT') return;
      const i = CELLS.findIndex((c) => c.id === cell.id);
      if (e.key === 'ArrowDown') setCell(CELLS[(i + 1) % CELLS.length]);
      if (e.key === 'ArrowUp') setCell(CELLS[(i - 1 + CELLS.length) % CELLS.length]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cell, protein, pov]);

  const close = useCallback(() => setProtein(null), []);

  return (
    <div className="app" style={{ ['--accent' as string]: accent, ['--cell' as string]: cell.shape.color }}>
      <Sidebar selected={cell} onSelect={setCell} />

      <main className="stage">
        <header className="stage-head">
          <AnimatePresence mode="wait">
            <motion.div
              key={cell.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.25 }}
            >
              <span className="eyebrow">
                {dexNumber(cell)} · {cell.category}
              </span>
              <h2 className="stage-title">{cell.name}</h2>
            </motion.div>
          </AnimatePresence>
          <div className="stage-badges">
            <span className="chip ghost">3D · Procedural model</span>
            <button className="pov-btn" onClick={() => setPov(true)} title="Play as this cell inside a tumour">
              🎮 Tumor POV
            </button>
          </div>
        </header>

        <div className="viewer">
          <div className="platform" />
          <div className="rings">
            <span />
            <span />
          </div>
          {!pov && <CellViewer cell={cell} />}
        </div>

        <footer className="stage-foot">
          <div className="hint-row">
            <span>
              <kbd>Drag</kbd> rotate
            </span>
            <span>
              <kbd>Scroll</kbd> zoom
            </span>
            <span>
              <kbd>↑</kbd>
              <kbd>↓</kbd> browse
            </span>
          </div>
          <div className="mini-stats">
            <div>
              <span className="eyebrow">Diameter</span>
              <strong>{cell.size}</strong>
            </div>
            <div>
              <span className="eyebrow">Markers</span>
              <strong>{cell.markers.length}</strong>
            </div>
            <div>
              <span className="eyebrow">TFs</span>
              <strong>{cell.tfs.length}</strong>
            </div>
          </div>
        </footer>
      </main>

      <DataPanel cell={cell} onOpenProtein={setProtein} />

      <AnimatePresence>
        {protein && (
          <MoleculePanel key="mol" protein={protein} accent={accent} onClose={close} />
        )}
      </AnimatePresence>

      {pov && <TumorGame cell={cell} onClose={() => setPov(false)} />}
    </div>
  );
}

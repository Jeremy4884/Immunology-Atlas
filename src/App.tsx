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
  const [mobileTab, setMobileTab] = useState<'viewer' | 'data' | 'list'>('viewer');
  const accent = CATEGORY_COLORS[cell.category];

  const prevCell = useCallback(() => {
    const i = CELLS.findIndex((c) => c.id === cell.id);
    setCell(CELLS[(i - 1 + CELLS.length) % CELLS.length]);
  }, [cell.id]);

  const nextCell = useCallback(() => {
    const i = CELLS.findIndex((c) => c.id === cell.id);
    setCell(CELLS[(i + 1) % CELLS.length]);
  }, [cell.id]);

  // ↑ / ↓ keyboard navigation between entries
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (pov || protein || (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'ArrowDown') nextCell();
      if (e.key === 'ArrowUp') prevCell();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prevCell, nextCell, protein, pov]);

  const close = useCallback(() => setProtein(null), []);

  const handleSelectFromList = useCallback((c: Cell) => {
    setCell(c);
    setMobileTab('viewer');
  }, []);

  return (
    <div
      className="app"
      data-tab={mobileTab}
      style={{ ['--accent' as string]: accent, ['--cell' as string]: cell.shape.color }}
    >
      {/* Mobile Top Header */}
      <header className="mobile-header">
        <div className="mobile-brand">
          <div className="mobile-lens">
            <span />
          </div>
          <div className="mobile-title-wrap">
            <span className="eyebrow">{dexNumber(cell)} · {cell.category}</span>
            <div className="mobile-name">{cell.name}</div>
          </div>
        </div>

        <div className="mobile-actions">
          <div className="mobile-arrows">
            <button className="arrow-btn" onClick={prevCell} title="Previous cell" aria-label="Previous cell">
              ◀
            </button>
            <button className="arrow-btn" onClick={nextCell} title="Next cell" aria-label="Next cell">
              ▶
            </button>
          </div>
          <button className="pov-btn mobile-pov" onClick={() => setPov(true)} title="Play as this cell inside a tumour">
            🎮 POV
          </button>
        </div>
      </header>

      {/* Sidebar: Cell Dex List */}
      <Sidebar selected={cell} onSelect={handleSelectFromList} />

      {/* Main 3D Stage */}
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

      {/* Data Panel */}
      <DataPanel cell={cell} onOpenProtein={setProtein} />

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-nav" aria-label="Mobile Navigation">
        <button
          className={`mobile-nav-btn ${mobileTab === 'viewer' ? 'active' : ''}`}
          onClick={() => setMobileTab('viewer')}
        >
          <span className="icon">🧬</span>
          <span>3D Cell</span>
        </button>
        <button
          className={`mobile-nav-btn ${mobileTab === 'data' ? 'active' : ''}`}
          onClick={() => setMobileTab('data')}
        >
          <span className="icon">📋</span>
          <span>Bio Data</span>
        </button>
        <button
          className={`mobile-nav-btn ${mobileTab === 'list' ? 'active' : ''}`}
          onClick={() => setMobileTab('list')}
        >
          <span className="icon">📑</span>
          <span>Dex ({CELLS.length})</span>
        </button>
      </nav>

      {/* AlphaFold Molecular Zoom Modal */}
      <AnimatePresence>
        {protein && (
          <MoleculePanel key="mol" protein={protein} accent={accent} onClose={close} />
        )}
      </AnimatePresence>

      {/* Tumor POV Game Overlay */}
      {pov && <TumorGame cell={cell} onClose={() => setPov(false)} />}
    </div>
  );
}

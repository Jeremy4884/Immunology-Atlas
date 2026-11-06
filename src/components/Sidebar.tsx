import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { CATEGORIES, CATEGORY_COLORS, CELLS, type Cell, dexNumber } from '../data/cells';
import CellIcon from './CellIcon';

interface Props {
  selected: Cell;
  onSelect: (c: Cell) => void;
}

export default function Sidebar({ selected, onSelect }: Props) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return CELLS;
    return CELLS.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.role.toLowerCase().includes(s) ||
        c.markers.some((m) => m.toLowerCase().includes(s)) ||
        c.tfs.some((t) => t.toLowerCase().includes(s)),
    );
  }, [q]);

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="lens">
          <span />
        </div>
        <div>
          <h1>Immunology Atlas</h1>
          <p>Cellular Index · {CELLS.length} entries</p>
        </div>
      </div>

      <div className="search">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input placeholder="Search cell, marker, TF…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <nav className="cell-list">
        {CATEGORIES.map((cat) => {
          const items = filtered.filter((c) => c.category === cat);
          if (!items.length) return null;
          return (
            <section key={cat}>
              <h3>
                <i style={{ background: CATEGORY_COLORS[cat] }} />
                {cat}
                <span>{items.length}</span>
              </h3>
              {items.map((c) => {
                const active = c.id === selected.id;
                return (
                  <button
                    key={c.id}
                    className={'cell-tab' + (active ? ' active' : '')}
                    onClick={() => onSelect(c)}
                  >
                    {active && (
                      <motion.div
                        layoutId="tab-bg"
                        className="tab-bg"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className="avatar">
                      <CellIcon cell={c} size={36} />
                    </span>
                    <span className="tab-text">
                      <span className="tab-name">{c.name}</span>
                      <span className="tab-role">{c.role}</span>
                    </span>
                    <span className="dex">{dexNumber(c)}</span>
                  </button>
                );
              })}
            </section>
          );
        })}
        {!filtered.length && <p className="empty">No cells match “{q}”.</p>}
      </nav>
    </aside>
  );
}

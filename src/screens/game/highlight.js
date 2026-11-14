import { create } from 'zustand';

/**
 * Board cells to spotlight (e.g. a word hovered in the history).
 * `cells` are ordered along the word so the board can stagger the effect.
 */
export const useHighlight = create((set) => ({
  cells: null,
  source: null, // what asked for it, so a stale "clear" from elsewhere does not wipe it
  show: (cells, source) => set({ cells: cells?.length ? cells : null, source }),
  clear: (source) => set((s) => (source == null || s.source === source ? { cells: null, source: null } : s)),
}));

let flashTimer = null;
/** Spotlight for a moment (touch: there is no hover to end it). */
export function flashHighlight(cells, ms = 2600) {
  clearTimeout(flashTimer);
  useHighlight.getState().show(cells, 'flash');
  flashTimer = setTimeout(() => useHighlight.getState().clear('flash'), ms);
}

/** Cells of a logged move: every word's cells (deduplicated), falling back to the placed tiles. */
export function moveCells(move) {
  const seen = new Set();
  const out = [];
  const add = ({ x, y }) => {
    const k = `${x},${y}`;
    if (!seen.has(k)) { seen.add(k); out.push({ x, y }); }
  };
  for (const w of move.words ?? []) for (const c of w.cells ?? []) add(c);
  if (!out.length) for (const t of move.tiles ?? []) add(t);
  return out;
}

import { create } from 'zustand';
import { BOARD_SIZE, shuffle } from '../../engine/index.js';

/**
 * The move being composed locally: tiles placed on the board but not played yet,
 * rack order, selection and keyboard cursor. Players may compose while waiting
 * for their turn.
 */
export const useDraft = create((set, get) => ({
  placements: [], // { tileId, x, y, letter? } — letter only for jokers
  order: [], // rack order (tile ids)
  selectedId: null,
  cursor: null, // { x, y, dir: 'H' | 'V' }
  landingId: null,
  shake: 0,

  reset: () => set({ placements: [], order: [], selectedId: null, cursor: null, landingId: null }),

  /** Reconciles with the server: new rack, and the board may now cover drafted cells. */
  sync(rack, board) {
    const s = get();
    const ids = rack.map((t) => t.id);
    const known = new Set(ids);
    const order = s.order.filter((id) => known.has(id));
    for (const id of ids) if (!order.includes(id)) order.push(id);
    const placements = s.placements.filter((p) => known.has(p.tileId) && !board[p.y][p.x]);
    const selectedId = known.has(s.selectedId) && !placements.some((p) => p.tileId === s.selectedId) ? s.selectedId : null;
    set({ order, placements, selectedId });
  },

  place(tileId, x, y, letter) {
    set((s) => ({
      // A tile already on that cell goes back to the rack.
      placements: [...s.placements.filter((p) => p.tileId !== tileId && !(p.x === x && p.y === y)), { tileId, x, y, letter }],
      selectedId: null,
      landingId: tileId,
    }));
  },

  unplace(tileId, rackIndex) {
    set((s) => {
      const placements = s.placements.filter((p) => p.tileId !== tileId);
      const order = rackIndex == null ? s.order : moveInOrder(s.order, placements, tileId, rackIndex);
      return { placements, order };
    });
  },

  moveInRack(tileId, rackIndex) {
    set((s) => ({ order: moveInOrder(s.order, s.placements, tileId, rackIndex) }));
  },

  recall: () => set({ placements: [], selectedId: null }),
  select: (id) => set((s) => ({ selectedId: s.selectedId === id ? null : id })),
  shuffle: () => set((s) => ({ order: shuffle([...s.order]), selectedId: null })),
  setCursor: (cursor) => set({ cursor }),
  bumpShake: () => set((s) => ({ shake: s.shake + 1 })),
}));

/** Moves a tile to `rackIndex` among the tiles currently visible in the rack. */
function moveInOrder(order, placements, tileId, rackIndex) {
  const placed = new Set(placements.map((p) => p.tileId));
  const rest = order.filter((id) => id !== tileId);
  const visible = rest.filter((id) => !placed.has(id));
  const before = visible[rackIndex];
  const at = before == null ? rest.length : rest.indexOf(before);
  rest.splice(at, 0, tileId);
  return rest;
}

const draftKey = (roomId) => `scrabbleio:draft:${roomId}`;

export function readSavedDraft(roomId) {
  try {
    const d = JSON.parse(sessionStorage.getItem(draftKey(roomId)) || 'null');
    return d && Array.isArray(d.placements) && Array.isArray(d.order) ? { placements: d.placements, order: d.order } : null;
  } catch {
    return null;
  }
}

export function saveDraft(roomId, { placements, order }) {
  try { sessionStorage.setItem(draftKey(roomId), JSON.stringify({ placements, order })); } catch { /* storage unavailable */ }
}

/** Next free cell from (x, y) going in `dir`, skipping board and drafted tiles. */
export function nextFreeCell(board, placements, x, y, dir) {
  const [dx, dy] = dir === 'H' ? [1, 0] : [0, 1];
  let cx = x;
  let cy = y;
  const taken = (a, b) => board[b][a] || placements.some((p) => p.x === a && p.y === b);
  while (cx < BOARD_SIZE && cy < BOARD_SIZE && taken(cx, cy)) { cx += dx; cy += dy; }
  return cx < BOARD_SIZE && cy < BOARD_SIZE ? { x: cx, y: cy, dir } : null;
}

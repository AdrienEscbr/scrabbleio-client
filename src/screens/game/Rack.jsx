import { motion } from 'motion/react';
import { RACK_SIZE } from '../../engine/index.js';
import Tile from '../../components/Tile.jsx';

/**
 * @param gapId tile shown as an empty landing slot (the tile being dragged, or '__gap'
 *              for a placeholder when a board tile is dragged back) — the feedforward
 *              of where the dragged tile will land.
 */
export default function Rack({ tiles, selectedId, onTileDown, hint, chosen, onToggleChosen, mode = 'play', gapId }) {
  const sockets = Math.max(0, RACK_SIZE - tiles.length);
  return (
    <div className={`rack ${hint ? 'is-hint' : ''}`} data-rack={mode === 'play' || undefined} role="listbox" aria-label="Votre chevalet">
      {tiles.map((t) => (t.gap ? (
        <motion.div
          key={t.id}
          layout
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
          className="rack__slot is-gap"
          data-rack-slot
          data-gap
          aria-hidden
        />
      ) : (
        <motion.div
          key={t.id}
          layout
          transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
          className={`rack__slot ${gapId === t.id ? 'is-gap' : ''}`}
          data-rack-slot
        >
          <Tile
            letter={t.letter}
            value={t.value}
            joker={t.joker}
            role="option"
            aria-selected={mode === 'play' ? selectedId === t.id : chosen?.has(t.id)}
            aria-label={t.joker ? 'Joker' : `${t.letter}, ${t.value} point${t.value > 1 ? 's' : ''}`}
            tabIndex={0}
            state={mode === 'exchange' ? (chosen?.has(t.id) ? 'chosen' : undefined) : (selectedId === t.id ? 'selected' : undefined)}
            className="tile--draggable"
            onPointerDown={mode === 'play' ? (e) => onTileDown(e, t.id) : undefined}
            onClick={mode === 'exchange' ? () => onToggleChosen(t.id) : undefined}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              e.preventDefault();
              e.stopPropagation();
              if (mode === 'exchange') onToggleChosen(t.id); else onTileDown(null, t.id);
            }}
          />
        </motion.div>
      )))}
      {Array.from({ length: sockets }, (_, i) => <div key={`s${i}`} className="rack__socket" aria-hidden />)}
    </div>
  );
}

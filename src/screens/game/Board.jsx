import { memo, useLayoutEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BOARD_SIZE, CENTER, PREMIUMS } from '../../engine/index.js';
import { cellName, PREMIUM_LABELS } from '../../lib/i18n.js';
import Tile from '../../components/Tile.jsx';
import { useHighlight } from './highlight.js';

const Cell = memo(function Cell({
  x, y, tile, pending, isLast, dropIndex, landing, shake, hl, onTap, onPendingDown,
}) {
  const premium = PREMIUMS[y][x];
  const isCenter = x === CENTER && y === CENTER;
  const label = PREMIUM_LABELS[premium];
  const shown = tile || pending;
  const aria = shown
    ? `${cellName(x, y)} : ${shown.letter}${pending ? ' (à valider)' : ''}`
    : `${cellName(x, y)}${label ? `, ${label.aria}` : ''}`;

  return (
    <div
      className={`cell ${premium ? `prem-${premium}` : ''} ${isCenter ? 'is-center' : ''} ${hl != null ? 'is-hl' : ''}`}
      data-cell={`${x},${y}`}
      role="gridcell"
      aria-label={aria}
      style={{ gridArea: `${y + 1} / ${x + 1}`, '--hl-i': hl ?? undefined }}
      onClick={() => onTap(x, y)}
    >
      {!shown && premium && (
        <span className="cell__label" aria-hidden>
          {isCenter ? <span className="cell__star">★</span> : (
            <>
              <span className="cell__mult">{label.short}</span>
              <span className="cell__kind">{label.word}</span>
            </>
          )}
        </span>
      )}
      {tile && (
        <Tile
          letter={tile.letter}
          value={tile.value}
          joker={tile.joker}
          state={isLast ? 'last' : undefined}
          className={dropIndex != null ? 'tile--dropping' : ''}
          style={dropIndex != null ? { '--i': dropIndex } : undefined}
        />
      )}
      {pending && (
        <Tile
          key={`p${shake}`}
          letter={pending.letter}
          value={pending.value}
          joker={pending.joker}
          state="pending"
          className={`tile--draggable ${landing ? 'tile--landing' : ''} ${shake ? 'tile--shake' : ''}`}
          onPointerDown={(e) => onPendingDown(e, pending.tileId)}
        />
      )}
    </div>
  );
});

/**
 * @param board server board
 * @param pending resolved draft placements: { tileId, x, y, letter, value, joker }
 * @param analysis analyzeMove() result for the draft (score preview)
 */
export default function Board({
  board, pending, analysis, previewing, lastMove, dropTurn, cursor, zoom, focus, landingId, shake, onCellTap, onPendingDown,
}) {
  const viewportRef = useRef(null);
  const highlight = useHighlight((s) => s.cells);
  const hlIndex = new Map((highlight ?? []).map((c, i) => [`${c.x},${c.y}`, i]));
  const pendingAt = new Map(pending.map((p) => [`${p.x},${p.y}`, p]));
  const lastTurn = lastMove?.type === 'play' ? lastMove.turn : null;
  const dropOrder = new Map(
    lastMove?.type === 'play' && dropTurn === lastMove.turn ? lastMove.tiles.map((t, i) => [`${t.x},${t.y}`, i]) : [],
  );

  // Keep the area of interest in view when zooming in.
  useLayoutEffect(() => {
    const vp = viewportRef.current;
    if (!vp || zoom === 1) return;
    const cell = vp.scrollWidth / BOARD_SIZE;
    const fx = focus?.x ?? CENTER;
    const fy = focus?.y ?? CENTER;
    vp.scrollTo({ left: (fx + 0.5) * cell - vp.clientWidth / 2, top: (fy + 0.5) * cell - vp.clientHeight / 2 });
  }, [zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  const main = analysis?.ok ? analysis.words[0] : null;
  const badgeCell = main?.cells[main.cells.length - 1];

  return (
    <div className="board-viewport" ref={viewportRef} data-zoomed={zoom > 1 || undefined}>
      <div className="board" role="grid" aria-label="Plateau" style={{ '--zoom': zoom }} data-highlighting={highlight ? '' : undefined}>
        {board.map((row, y) => row.map((cell, x) => {
          const k = `${x},${y}`;
          return (
            <Cell
              key={k}
              x={x}
              y={y}
              tile={cell}
              pending={pendingAt.get(k)}
              isLast={!!cell && cell.turn === lastTurn}
              dropIndex={cell ? dropOrder.get(k) : undefined}
              landing={pendingAt.get(k)?.tileId === landingId}
              shake={pendingAt.has(k) ? shake : 0}
              hl={hlIndex.get(k)}
              onTap={onCellTap}
              onPendingDown={onPendingDown}
            />
          );
        }))}

        {cursor && (
          <div className={`board__cursor is-${cursor.dir}`} style={{ gridColumn: cursor.x + 1, gridRow: cursor.y + 1 }} aria-hidden>
            <span className="board__cursor-arrow">{cursor.dir === 'H' ? '▶' : '▼'}</span>
          </div>
        )}

        <AnimatePresence>
          {badgeCell && !previewing && (
            <motion.div
              key="badge"
              className={`score-badge ${analysis.bingo ? 'is-bingo' : ''} ${previewing ? 'is-preview' : ''}`}
              style={{ gridColumn: badgeCell.x + 1, gridRow: badgeCell.y + 1 }}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.12 } }}
              transition={{ type: 'spring', bounce: 0.4, duration: 0.4 }}
              aria-hidden
            >
              <motion.span key={analysis.score} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="tabular">
                {analysis.score}
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

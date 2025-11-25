import React from 'react';

// Placement: { x, y, letter, points, tileId }
export default function Board({ board, placements, onPlace, onRemovePlacement, onDropFromRack }) {
  const placedMap = new Map();
  for (const p of placements) placedMap.set(`${p.x},${p.y}`, p);

  return (
    <div className="board">
      {board.map((row, y) => (
        <div key={y} className="board-row">
          {row.map((cell, x) => {
            const key = `${x},${y}`;
            const placed = placedMap.get(key);
            const raw = placed ? placed.letter : cell.letter;
            const letter = raw === '' ? '?' : (raw ?? '');
            const value = placed ? placed.points : (cell.points ?? undefined);
            const bonusClass = cell.bonus ? `bonus-${cell.bonus}` : '';
            return (
              <div
                key={key}
                className={`board-cell ${bonusClass} ${placed ? 'placement-local' : ''}`}
                onClick={() => onPlace && onPlace(x, y)}
                onContextMenu={(e) => {
                  if (placed && onRemovePlacement) { e.preventDefault(); onRemovePlacement(x, y); }
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const tileId = e.dataTransfer?.getData('text/plain');
                  if (tileId && onDropFromRack) onDropFromRack(x, y, tileId);
                }}
                title={cell.bonus || ''}
              >
                {letter}
                {letter && letter !== '?' && value != null ? (
                  <span className="tile-points">{value}</span>
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}


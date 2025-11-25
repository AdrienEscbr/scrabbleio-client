import React, { useRef, useState } from 'react';

export default function Rack({ tiles, selectedTileId, onSelect, disabled, onReorder }) {
  const dragSrc = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  const handleDragStart = (tileId) => { dragSrc.current = tileId; };
  const handleDrop = (targetId) => {
    const sourceId = dragSrc.current;
    dragSrc.current = null;
    setDragOver(null);
    if (!sourceId || sourceId === targetId || !onReorder) return;
    const ids = tiles.map((t) => t.tileId);
    const from = ids.indexOf(sourceId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder(next);
  };

  return (
    <div className="rack">
      {tiles.map((t) => (
        <span
          key={t.tileId}
          className={`rack-tile ${selectedTileId === t.tileId ? 'selected' : ''}`}
          onClick={() => !disabled && onSelect && onSelect(t.tileId)}
          role="button"
          draggable={true}
          onDragStart={(e) => { handleDragStart(t.tileId); try { e.dataTransfer.setData('text/plain', t.tileId); } catch {} }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(t.tileId); }}
          onDragLeave={() => setDragOver(null)}
          onDrop={() => handleDrop(t.tileId)}
          style={{ outline: dragOver === t.tileId ? '2px dashed #6c757d' : undefined }}
        >
          {t.letter || '?'}
          {t.letter ? <span className="tile-points">{t.points}</span> : null}
        </span>
      ))}
    </div>
  );
}


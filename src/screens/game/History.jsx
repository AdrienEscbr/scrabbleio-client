import { AnimatePresence, motion } from 'motion/react';
import { flashHighlight, moveCells, useHighlight } from './highlight.js';

function describe(m) {
  switch (m.type) {
    case 'play': return null;
    case 'exchange': return `a échangé ${m.count} lettre${m.count > 1 ? 's' : ''}`;
    case 'timeout': return 'temps écoulé';
    default: return 'a passé son tour';
  }
}

/**
 * Move log. Hovering (mouse) or focusing an entry spotlights its words on the
 * board; hovering a single word spotlights just that word. On touch, a tap
 * spotlights for a moment and `onLocate` lets the caller reveal the board.
 */
export default function History({ room, me, onLocate }) {
  const game = room.game;
  const order = game.players.map((p) => p.id);
  const name = (id) => (id === me ? 'Vous' : room.players.find((p) => p.id === id)?.nickname ?? game.players.find((p) => p.id === id)?.nickname ?? '—');
  const entries = [...game.log].reverse();
  const { show, clear } = useHighlight.getState();

  if (entries.length === 0) {
    return <p className="history__empty">Aucun coup pour l’instant. Le premier mot passe par l’étoile ★</p>;
  }

  const hoverProps = (cells, source) => ({
    onPointerEnter: (e) => { if (e.pointerType === 'mouse') show(cells, source); },
    onPointerLeave: (e) => { if (e.pointerType === 'mouse') clear(source); },
  });

  return (
    <ol className="history">
      <AnimatePresence initial={false}>
        {entries.map((m) => {
          const id = `${m.turn}-${m.playerId}`;
          const playable = m.type === 'play';
          const cells = playable ? moveCells(m) : null;
          return (
            <motion.li
              key={id}
              layout="position"
              className={`history__item ${playable ? 'is-locatable' : 'is-muted'}`}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              {...(playable ? {
                ...hoverProps(cells, id),
                tabIndex: 0,
                role: 'button',
                'aria-label': `${name(m.playerId)} : ${m.words.map((w) => w.word).join(', ')}, ${m.score} points. Afficher sur le plateau`,
                onFocus: () => show(cells, id),
                onBlur: () => clear(id),
                onClick: (e) => {
                  if (e.nativeEvent.pointerType === 'mouse') return;
                  flashHighlight(cells);
                  onLocate?.();
                },
              } : {})}
            >
              <span className="history__dot" style={{ background: `var(--p${order.indexOf(m.playerId) % 4})` }} />
              <span className="history__body">
                <span className="history__who">{name(m.playerId)}</span>
                {playable ? (
                  <span className="history__words">
                    {m.words.map((w, i) => (
                      <span
                        key={i}
                        className={`history__word ${i === 0 ? 'is-main' : ''}`}
                        {...(w.cells ? hoverProps(w.cells, `${id}:${i}`) : {})}
                        onPointerLeave={(e) => { if (e.pointerType === 'mouse' && w.cells) show(cells, id); }}
                      >
                        {w.word}
                      </span>
                    ))}
                    {m.bingo && <span className="history__bingo">Scrabble</span>}
                  </span>
                ) : (
                  <span className="history__words">{describe(m)}</span>
                )}
              </span>
              <span className="history__score tabular">{playable ? `+${m.score}` : ''}</span>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ol>
  );
}

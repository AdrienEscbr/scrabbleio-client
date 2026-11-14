import { AnimatePresence, motion } from 'motion/react';
import { IconButton } from '../../components/ui.jsx';
import { formatClock, useRemaining } from './Players.jsx';

function lastMoveText(m, nameOf) {
  if (!m) return 'Premier mot : passez par l’étoile ★';
  const who = nameOf(m.playerId);
  if (m.type === 'play') return `${who} · ${m.words[0].word} +${m.score}`;
  if (m.type === 'exchange') return `${who} · échange de ${m.count} lettre${m.count > 1 ? 's' : ''}`;
  if (m.type === 'timeout') return `${who} · temps écoulé`;
  return `${who} · passe`;
}

/** Phone-only band between the board and the rack: whose turn, clock, last move, zoom. */
export default function TurnStrip({ game, myTurn, nameOf, zoom, onZoom }) {
  const remaining = useRemaining(game.turnEndsAt);
  const urgent = remaining != null && remaining <= 10_000;
  const title = game.status !== 'playing' ? 'Partie terminée' : myTurn ? 'À vous de jouer' : `Tour de ${nameOf(game.currentPlayerId)}`;
  return (
    <div className={`turn-strip material ${myTurn ? 'is-mine' : ''}`}>
      <div className="turn-strip__main">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={title}
            className="turn-strip__title"
            initial={{ opacity: 0, y: 8, filter: 'blur(2px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          >
            {title}
          </motion.span>
        </AnimatePresence>
        <span className="turn-strip__last">{lastMoveText(game.lastMove, nameOf)}</span>
      </div>
      {game.status === 'playing' && (
        <span className={`turn-strip__clock tabular ${urgent ? 'is-urgent' : ''}`}>
          {game.paused ? '⏸' : formatClock(remaining)}
        </span>
      )}
      <IconButton icon={zoom > 1 ? 'zoomOut' : 'zoomIn'} label={zoom > 1 ? 'Dézoomer' : 'Zoomer'} onClick={onZoom} />
    </div>
  );
}

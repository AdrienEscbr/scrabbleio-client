import { AnimatePresence, motion } from 'motion/react';
import { Avatar, IconButton } from '../../components/ui.jsx';
import { formatClock, useRemaining } from './Players.jsx';

function lastMoveText(m, nameOf) {
  if (!m) return 'Premier mot : passez par l’étoile ★';
  const who = nameOf(m.playerId);
  if (m.type === 'play') return `${who} · ${m.words[0].word} +${m.score}`;
  if (m.type === 'exchange') return `${who} · échange de ${m.count} lettre${m.count > 1 ? 's' : ''}`;
  if (m.type === 'timeout') return `${who} · temps écoulé`;
  return `${who} · passe`;
}

/**
 * Whose turn it is, the clock and the last move.
 * Phone: band between board and rack (with zoom). Desktop (`wide`): banner above the board.
 */
export default function TurnStrip({ game, myTurn, nameOf, avatarName, zoom, onZoom, wide = false }) {
  const remaining = useRemaining(game.turnEndsAt);
  const urgent = remaining != null && remaining <= 10_000;
  const playing = game.status === 'playing';
  const title = !playing ? 'Partie terminée' : myTurn ? 'À vous de jouer !' : `Au tour de ${nameOf(game.currentPlayerId)}`;
  const index = game.players.findIndex((p) => p.id === game.currentPlayerId);
  return (
    <div className={`turn-strip material ${myTurn ? 'is-mine' : ''} ${wide ? 'turn-strip--wide' : ''}`}>
      {playing && (
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={game.currentPlayerId}
            className="turn-strip__avatar"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ type: 'spring', bounce: 0.35, duration: 0.45 }}
          >
            <Avatar name={avatarName} index={index} size={wide ? 40 : 36} />
          </motion.span>
        </AnimatePresence>
      )}
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
      {!wide && <IconButton icon={zoom > 1 ? 'zoomOut' : 'zoomIn'} label={zoom > 1 ? 'Dézoomer' : 'Zoomer'} onClick={onZoom} />}
    </div>
  );
}

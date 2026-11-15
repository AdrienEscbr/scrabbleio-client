import { useEffect, useRef, useState } from 'react';
import { animate, AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { serverNow } from '../../lib/store.js';
import { sound } from '../../lib/feedback.js';
import { Avatar } from '../../components/ui.jsx';

/** Remaining ms until `endsAt` (server clock), refreshed a few times per second. */
export function useRemaining(endsAt) {
  const [left, setLeft] = useState(() => (endsAt ? Math.max(0, endsAt - serverNow()) : null));
  useEffect(() => {
    if (!endsAt) { setLeft(null); return undefined; }
    const tick = () => setLeft(Math.max(0, endsAt - serverNow()));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt]);
  return left;
}

export function formatClock(ms) {
  if (ms == null) return '—';
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function AnimatedScore({ value }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (reduce || from === value) { setShown(value); return undefined; }
    const c = animate(from, value, { duration: 0.8, ease: [0.23, 1, 0.32, 1], onUpdate: (v) => setShown(Math.round(v)) });
    return () => c.stop();
  }, [value, reduce]);
  return <span className="tabular">{shown}</span>;
}

/**
 * Ring that empties over the turn. Pure CSS animation, mounted once per turn
 * (keyed by endsAt). The start offset is computed once: changing animation-delay
 * on a running animation shifts it again, which used to make the ring run twice as fast.
 */
function TurnRing({ endsAt, durationMs, urgent }) {
  const [elapsed] = useState(() => Math.max(0, durationMs - Math.max(0, endsAt - serverNow())));
  if (!endsAt || !durationMs) return null;
  return (
    <svg className={`turn-ring ${urgent ? 'is-urgent' : ''}`} viewBox="0 0 52 52" aria-hidden>
      <circle className="turn-ring__track" cx="26" cy="26" r="24" />
      <circle
        className="turn-ring__bar"
        cx="26"
        cy="26"
        r="24"
        pathLength="100"
        style={{ animationDuration: `${durationMs}ms`, animationDelay: `-${elapsed}ms` }}
      />
    </svg>
  );
}

export default function Players({ room, me, compact }) {
  const game = room.game;
  const remaining = useRemaining(game.turnEndsAt);
  const urgent = remaining != null && remaining <= 10_000;
  const myTurn = game.currentPlayerId === me;

  // Last-seconds tick on my own turn.
  const lastTick = useRef(null);
  useEffect(() => {
    if (!myTurn || remaining == null || remaining > 10_000) return;
    const s = Math.ceil(remaining / 1000);
    if (s !== lastTick.current && s > 0) { lastTick.current = s; sound('tick'); }
  }, [remaining, myTurn]);

  // Floating "+N" when a score goes up.
  const [gains, setGains] = useState({});
  const prevScores = useRef(Object.fromEntries(game.players.map((p) => [p.id, p.score])));
  useEffect(() => {
    const next = {};
    for (const p of game.players) {
      const before = prevScores.current[p.id];
      if (before != null && p.score > before) next[p.id] = { n: p.score - before, key: `${p.id}-${game.turnNumber}` };
      prevScores.current[p.id] = p.score;
    }
    if (Object.keys(next).length) {
      setGains(next);
      const t = setTimeout(() => setGains({}), 1600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [game.players, game.turnNumber]);

  return (
    <ol className={`players ${compact ? 'players--compact' : ''}`} aria-label="Scores">
      {game.players.map((gp, i) => {
        const p = room.players.find((rp) => rp.id === gp.id);
        const active = game.currentPlayerId === gp.id;
        return (
          <li key={gp.id} className={`player ${active ? 'is-active' : ''} ${gp.id === me ? 'is-me' : ''}`} aria-current={active || undefined}>
            <span className="player__avatar">
              <Avatar name={p?.nickname ?? gp.nickname} index={i} size={compact ? 30 : 40} online={p?.connected !== false} />
              {active && !game.paused && <TurnRing key={game.turnEndsAt} endsAt={game.turnEndsAt} durationMs={game.turnDurationMs} urgent={urgent} />}
            </span>
            <span className="player__info">
              <span className="player__name">{gp.id === me ? 'Vous' : (p?.nickname ?? gp.nickname)}</span>
              {!compact && (
                <span className="player__sub">
                  {active ? (
                    <span className={`player__clock tabular ${urgent ? 'is-urgent' : ''}`}>{game.paused ? 'En pause' : formatClock(remaining)}</span>
                  ) : p?.connected === false ? 'Absent' : `${gp.rackCount} lettres`}
                </span>
              )}
            </span>
            <span className="player__score">
              <AnimatedScore value={gp.score} />
              <AnimatePresence>
                {gains[gp.id] && (
                  <motion.span
                    key={gains[gp.id].key}
                    className="player__gain"
                    initial={{ opacity: 0, y: 6, scale: 0.8 }}
                    animate={{ opacity: 1, y: -14, scale: 1 }}
                    exit={{ opacity: 0, y: -24 }}
                    transition={{ type: 'spring', bounce: 0.3, duration: 0.6 }}
                  >
                    +{gains[gp.id].n}
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

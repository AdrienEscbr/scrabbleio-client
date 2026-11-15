import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { animate, motion, useReducedMotion } from 'motion/react';
import { useApp } from '../../lib/store.js';
import { call } from '../../lib/socket.js';
import { END_REASONS, errorMessage } from '../../lib/i18n.js';
import { sound, haptic } from '../../lib/feedback.js';
import { Avatar, Button } from '../../components/ui.jsx';
import Icon from '../../components/Icon.jsx';
import { toast } from '../../components/Toaster.jsx';
import Confetti from '../../components/Confetti.jsx';

function CountUp({ value, delay = 0 }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  useEffect(() => {
    if (reduce) { setShown(value); return undefined; }
    const c = animate(0, value, { duration: 1.1, delay, ease: [0.23, 1, 0.32, 1], onUpdate: (v) => setShown(Math.round(v)) });
    return () => c.stop();
  }, [value, delay, reduce]);
  return <span className="tabular">{shown}</span>;
}

export default function Results({ room, onViewBoard }) {
  const navigate = useNavigate();
  const me = useApp((s) => s.session?.playerId);
  const [starting, setStarting] = useState(false);
  const results = room.game?.results;
  const players = room.players;
  const indexOf = (id) => room.game.players.findIndex((p) => p.id === id);
  // Game players keep their nickname even after leaving the room.
  const nameOf = (id) => players.find((p) => p.id === id)?.nickname ?? room.game.players.find((p) => p.id === id)?.nickname ?? '—';
  const iWon = results?.winnerIds.includes(me);
  const isHost = room.hostId === me;
  const present = players.filter((p) => p.connected).length;

  useEffect(() => {
    if (iWon) { sound('bingo'); haptic('success'); } else sound('success');
  }, [iWon]);

  const rematch = async () => {
    setStarting(true);
    try { await call('room:start', { roomId: room.id }); } catch (e) {
      toast({ title: errorMessage(e.code), tone: 'error' });
      setStarting(false);
    }
  };

  if (!results) return null;
  const tie = results.winnerIds.length > 1;
  const title = iWon ? (tie ? 'Égalité !' : 'Victoire !') : `${results.winnerIds.map(nameOf).join(' & ')} ${tie ? 'gagnent' : 'gagne'}`;

  return (
    <div className="results">
      {iWon && <Confetti />}
      <div className="results__head">
        <motion.div
          className="results__trophy"
          initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.45, duration: 0.8 }}
        >
          <Icon name="trophy" size={36} />
        </motion.div>
        <h1>{title}</h1>
        <p>{END_REASONS[results.reason] ?? 'Partie terminée.'}</p>
      </div>

      <ol className="ranking">
        {results.ranking.map((r, rank) => {
          const best = r.stats.bestMove;
          // Competition ranking: tied players share the same position (1, 1, 3…).
          const position = 1 + results.ranking.filter((o) => o.score > r.score).length;
          return (
            <motion.li
              key={r.playerId}
              className={`rank card ${position === 1 ? 'is-first' : ''} ${r.playerId === me ? 'is-me' : ''}`}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.6, delay: 0.15 + rank * 0.08 }}
            >
              <span className="rank__pos tabular" aria-label={`Position ${position}${tie && position === 1 ? ', ex æquo' : ''}`}>{position}</span>
              <Avatar name={nameOf(r.playerId)} index={indexOf(r.playerId)} size={44} />
              <div className="rank__who">
                <span className="rank__name">{nameOf(r.playerId)}{r.playerId === me && <em> · vous</em>}</span>
                <span className="rank__stats">
                  {best ? <>Meilleur coup <strong>{best.word}</strong> ({best.score})</> : 'Aucun mot posé'}
                  {r.stats.bingos > 0 && <> · {r.stats.bingos} scrabble{r.stats.bingos > 1 ? 's' : ''}</>}
                </span>
              </div>
              <div className="rank__score">
                <CountUp value={r.score} delay={0.25 + rank * 0.08} />
                {r.adjustment !== 0 && (
                  <span className={`rank__adj ${r.adjustment > 0 ? 'is-plus' : ''}`}>{r.adjustment > 0 ? '+' : ''}{r.adjustment}</span>
                )}
              </div>
            </motion.li>
          );
        })}
      </ol>

      <footer className="results__cta">
        <div className="results__actions">
          {isHost ? (
            <Button variant="primary" size="lg" className="btn--block" icon="play" onClick={rematch} loading={starting} disabled={present < 2}>
              {present < 2 ? 'Revanche : en attente des joueurs' : 'Revanche'}
            </Button>
          ) : (
            <div className="waiting-host"><span className="dots" aria-hidden><i /><i /><i /></span>L’hôte peut lancer une revanche</div>
          )}
          <div className="results__secondary">
            <Button variant="secondary" size="lg" className="btn--block" onClick={onViewBoard}>Voir le plateau</Button>
            <Button variant="secondary" size="lg" className="btn--block" onClick={() => navigate('/')}>Accueil</Button>
          </div>
        </div>
      </footer>
    </div>
  );
}

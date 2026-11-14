import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../../lib/store.js';
import { call } from '../../lib/socket.js';
import { errorMessage, formatTurnSeconds, LANG_LABELS } from '../../lib/i18n.js';
import { haptic, sound } from '../../lib/feedback.js';
import { Avatar, Button, IconButton, Segmented } from '../../components/ui.jsx';
import Icon from '../../components/Icon.jsx';
import Tile from '../../components/Tile.jsx';
import { toast } from '../../components/Toaster.jsx';
import NicknameSheet from '../shared/NicknameSheet.jsx';

const TURN_OPTIONS = [60, 120, 180, 300];

export default function Lobby({ room }) {
  const navigate = useNavigate();
  const me = useApp((s) => s.session?.playerId);
  const [editingName, setEditingName] = useState(false);
  const [starting, setStarting] = useState(false);
  const isHost = room.hostId === me;
  const slots = Array.from({ length: room.settings.maxPlayers }, (_, i) => room.players[i] ?? null);
  const canStart = isHost && room.players.length >= 2;
  const link = `${location.origin}${location.pathname}#/room/${room.id}`;

  // Chime when someone joins.
  const count = useRef(room.players.length);
  useEffect(() => {
    if (room.players.length > count.current) { sound('join'); haptic('light'); }
    count.current = room.players.length;
  }, [room.players.length]);

  const update = async (settings) => {
    try {
      await call('room:updateSettings', { roomId: room.id, settings });
    } catch (e) {
      toast({ title: errorMessage(e.code), tone: 'error' });
    }
  };

  const start = async () => {
    setStarting(true);
    try {
      await call('room:start', { roomId: room.id });
    } catch (e) {
      toast({ title: errorMessage(e.code), tone: 'error' });
      setStarting(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      haptic('light');
      toast({ title: 'Lien d’invitation copié', tone: 'success' });
    } catch {
      toast({ title: `Code : ${room.id}` });
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: 'ScrabbleIO', text: `Rejoins ma partie de ScrabbleIO ! Code : ${room.id}`, url: link });
    } catch { /* dismissed */ }
  };

  return (
    <div className="lobby">
      <header className="room-header">
        <IconButton icon="back" label="Quitter le salon" onClick={() => navigate('/')} />
        <h1 className="room-header__title">Salon</h1>
        <span className="room-header__spacer" />
      </header>

      <div className="lobby__body">
        <section className="invite card">
          <span className="eyebrow">Code du salon</span>
          <div className="invite__code" aria-label={`Code ${room.id.split('').join(' ')}`}>
            {room.id.split('').map((ch, i) => (
              <motion.div
                key={ch + i}
                className="invite__tile"
                initial={{ opacity: 0, y: -16, rotate: -8 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ type: 'spring', bounce: 0.35, duration: 0.6, delay: 0.05 * i }}
              >
                <Tile letter={ch} />
              </motion.div>
            ))}
          </div>
          <div className="invite__actions">
            <Button icon="copy" onClick={copy}>Copier le lien</Button>
            {typeof navigator.share === 'function' && <Button icon="share" onClick={share}>Partager</Button>}
          </div>
        </section>

        <section className="players-section">
          <div className="section-title">
            <h2>Joueurs</h2>
            <span className="tabular">{room.players.length}/{room.settings.maxPlayers}</span>
          </div>
          <ul className="slots">
            <AnimatePresence initial={false}>
              {slots.map((p, i) => (
                <motion.li
                  key={p ? p.id : `empty-${i}`}
                  layout
                  className={`slot ${p ? 'is-filled' : ''} ${p?.id === me ? 'is-me' : ''}`}
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.45 }}
                >
                  {p ? (
                    <button
                      type="button"
                      className="slot__inner"
                      onClick={() => p.id === me && setEditingName(true)}
                      disabled={p.id !== me}
                      aria-label={p.id === me ? `${p.nickname} (vous) — modifier le pseudo` : p.nickname}
                    >
                      <Avatar name={p.nickname} index={i} size={48} online={p.connected} />
                      <span className="slot__name">{p.nickname}</span>
                      <span className="slot__meta">
                        {p.isHost && <span className="chip chip--accent"><Icon name="crown" size={12} /> Hôte</span>}
                        {p.id === me && <span className="chip">Vous <Icon name="edit" size={11} /></span>}
                        {!p.connected && <span className="chip">Hors ligne</span>}
                      </span>
                    </button>
                  ) : (
                    <div className="slot__inner slot__inner--empty">
                      <span className="slot__ghost" aria-hidden />
                      <span className="slot__name">En attente…</span>
                    </div>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>

        <section className="lobby-settings card">
          <div className="section-title">
            <h2>Réglages</h2>
            {!isHost && <span className="hint">Choisis par l’hôte</span>}
          </div>
          <div className="setting">
            <span className="setting__label">Dictionnaire</span>
            <Segmented
              label="Langue du dictionnaire"
              value={room.settings.lang}
              disabled={!isHost}
              onChange={(lang) => update({ lang })}
              options={Object.entries(LANG_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </div>
          <div className="setting">
            <span className="setting__label">Temps par tour</span>
            <Segmented
              label="Temps par tour"
              value={room.settings.turnSeconds}
              disabled={!isHost}
              onChange={(turnSeconds) => update({ turnSeconds })}
              options={TURN_OPTIONS.map((s) => ({ value: s, label: formatTurnSeconds(s) }))}
            />
          </div>
          <div className="setting">
            <span className="setting__label">Joueurs max.</span>
            <Segmented
              label="Nombre de joueurs maximum"
              value={room.settings.maxPlayers}
              disabled={!isHost}
              onChange={(maxPlayers) => update({ maxPlayers })}
              options={[2, 3, 4].map((n) => ({ value: n, label: String(n) }))}
            />
          </div>
        </section>
      </div>

      <footer className="lobby__cta">
        {isHost ? (
          <Button variant="primary" size="lg" className="btn--block" icon="play" onClick={start} disabled={!canStart} loading={starting}>
            {canStart ? 'Lancer la partie' : 'En attente d’un autre joueur…'}
          </Button>
        ) : (
          <div className="waiting-host">
            <span className="dots" aria-hidden><i /><i /><i /></span>
            L’hôte va lancer la partie
          </div>
        )}
      </footer>

      <NicknameSheet open={editingName} onClose={() => setEditingName(false)} />
    </div>
  );
}

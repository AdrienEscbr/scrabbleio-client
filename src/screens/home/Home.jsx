import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../../lib/store.js';
import { call } from '../../lib/socket.js';
import { errorMessage } from '../../lib/i18n.js';
import { sound, haptic } from '../../lib/feedback.js';
import { Avatar, Button, IconButton, Spinner } from '../../components/ui.jsx';
import Icon from '../../components/Icon.jsx';
import { toast } from '../../components/Toaster.jsx';
import SettingsSheet from '../shared/SettingsSheet.jsx';
import RulesSheet from '../shared/RulesSheet.jsx';
import NicknameSheet from '../shared/NicknameSheet.jsx';
import './home.css';

const Hero3D = lazy(() => import('./Hero3D.jsx'));
const CODE_LENGTH = 5;
const CODE_CHARS = /[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/;

function extractCode(text) {
  const fromLink = /room\/([a-z0-9]{5})/i.exec(text);
  const raw = (fromLink ? fromLink[1] : text).toUpperCase();
  return [...raw].filter((c) => CODE_CHARS.test(c)).join('').slice(0, CODE_LENGTH);
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const rise = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', bounce: 0, duration: 0.6 } },
};

export default function Home() {
  const navigate = useNavigate();
  const session = useApp((s) => s.session);
  const connection = useApp((s) => s.connection);
  const [activeGames, setActiveGames] = useState([]);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(null); // 'create' | 'join'
  const [sheet, setSheet] = useState(null); // 'settings' | 'rules' | 'nickname'
  const [slowServer, setSlowServer] = useState(false);
  const codeRef = useRef(null);

  useEffect(() => {
    useApp.getState().setRoom(null);
    let alive = true;
    call('session:get').then(({ session: s }) => alive && setActiveGames(s.activeGames || [])).catch(() => {});
    return () => { alive = false; };
  }, [connection]);

  // Render's free tier sleeps: explain the wait instead of looking broken.
  useEffect(() => {
    if (connection === 'online') { setSlowServer(false); return undefined; }
    const t = setTimeout(() => setSlowServer(true), 2500);
    return () => clearTimeout(t);
  }, [connection]);

  const create = async () => {
    setBusy('create');
    try {
      const { room } = await call('room:create');
      sound('join');
      navigate(`/room/${room.id}`);
    } catch (e) {
      toast({ title: errorMessage(e.code), tone: 'error' });
      setBusy(null);
    }
  };

  const join = async (e) => {
    e?.preventDefault();
    if (code.length !== CODE_LENGTH) { codeRef.current?.focus(); return; }
    setBusy('join');
    try {
      await call('room:join', { roomId: code });
      sound('join');
      navigate(`/room/${code}`);
    } catch (err) {
      sound('error');
      haptic('error');
      toast({ title: errorMessage(err.code), tone: 'error' });
      setBusy(null);
    }
  };

  return (
    <main className="home">
      <div className="home__hero" aria-hidden>
        <Suspense fallback={null}>
          <Hero3D />
        </Suspense>
      </div>

      <header className="home__topbar">
        <IconButton icon="book" label="Règles du jeu" onClick={() => setSheet('rules')} />
        <IconButton icon="settings" label="Réglages" onClick={() => setSheet('settings')} />
      </header>

      <motion.div className="home__content" variants={stagger} initial="hidden" animate="show">
        <motion.div variants={rise} className="home__brand">
          <h1 className="home__title">Scrabble<span>IO</span></h1>
          <p className="home__tagline">Le jeu de lettres, entre amis, partout.</p>
        </motion.div>

        <AnimatePresence>
          {activeGames.length > 0 && (
            <motion.button
              type="button"
              className="resume material"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              onClick={() => navigate(`/room/${activeGames[0]}`)}
            >
              <span className="resume__pulse" aria-hidden />
              <span className="resume__text">
                <strong>Partie en cours</strong>
                <span>Salon {activeGames[0]} · reprendre où vous en étiez</span>
              </span>
              <Icon name="play" size={18} />
            </motion.button>
          )}
        </AnimatePresence>

        <motion.section variants={rise} className="home__panel card">
          <button type="button" className="identity" onClick={() => setSheet('nickname')} disabled={!session}>
            <Avatar name={session?.nickname} size={44} />
            <span className="identity__text">
              <span className="eyebrow">Votre pseudo</span>
              <span className="identity__name">{session?.nickname ?? '…'}</span>
            </span>
            <Icon name="edit" size={18} className="identity__edit" />
          </button>

          <Button variant="primary" size="lg" className="btn--block" icon="plus" onClick={create} loading={busy === 'create'} disabled={!!busy}>
            Créer une partie
          </Button>

          <div className="divider"><span>ou rejoindre avec un code</span></div>

          <form className="join" onSubmit={join}>
            <label className="code-input" onClick={() => codeRef.current?.focus()}>
              <span className="sr-only">Code du salon</span>
              <input
                ref={codeRef}
                className="code-input__field"
                value={code}
                onChange={(e) => setCode(extractCode(e.target.value))}
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                maxLength={64}
                aria-label="Code du salon (5 caractères)"
              />
              {Array.from({ length: CODE_LENGTH }, (_, i) => (
                <span key={i} className={`code-input__slot ${i === code.length ? 'is-caret' : ''} ${code[i] ? 'is-filled' : ''}`} aria-hidden>
                  {code[i] ?? ''}
                </span>
              ))}
            </label>
            <Button type="submit" variant="secondary" size="lg" icon="enter" loading={busy === 'join'} disabled={!!busy || code.length !== CODE_LENGTH}>
              Rejoindre
            </Button>
          </form>
        </motion.section>

        <AnimatePresence>
          {slowServer && connection !== 'online' && (
            <motion.p className="home__status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Spinner size={14} /> Le serveur se réveille, cela peut prendre jusqu’à une minute…
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      <SettingsSheet open={sheet === 'settings'} onClose={() => setSheet(null)} />
      <RulesSheet open={sheet === 'rules'} onClose={() => setSheet(null)} />
      <NicknameSheet open={sheet === 'nickname'} onClose={() => setSheet(null)} />
    </main>
  );
}

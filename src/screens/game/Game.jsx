import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ALPHABET, analyzeMove } from '../../engine/index.js';
import { useApp } from '../../lib/store.js';
import { call } from '../../lib/socket.js';
import { ERRORS, errorMessage } from '../../lib/i18n.js';
import { haptic, sound } from '../../lib/feedback.js';
import { useMediaQuery } from '../../lib/useMediaQuery.js';
import { Button, IconButton, Sheet } from '../../components/ui.jsx';
import Icon from '../../components/Icon.jsx';
import { toast } from '../../components/Toaster.jsx';
import Confetti from '../../components/Confetti.jsx';
import SettingsSheet from '../shared/SettingsSheet.jsx';
import RulesSheet from '../shared/RulesSheet.jsx';
import Board from './Board.jsx';
import Rack from './Rack.jsx';
import Players from './Players.jsx';
import History from './History.jsx';
import { ConfirmSheet, ExchangeSheet, JokerPicker } from './GameSheets.jsx';
import TurnStrip from './TurnStrip.jsx';
import { nextFreeCell, readSavedDraft, saveDraft, useDraft } from './draft.js';
import { setDragBadge, startTileGesture } from './dnd.js';
import './game.css';

const ARROWS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

export default function Game({ room, readOnly = false, onExitBoard }) {
  const navigate = useNavigate();
  const me = useApp((s) => s.session?.playerId);
  const game = room.game;
  const rack = useMemo(() => game.myRack ?? [], [game.myRack]);
  const myTurn = !readOnly && game.status === 'playing' && game.currentPlayerId === me;
  const wide = useMediaQuery('(min-width: 1024px)');
  const finePointer = useMediaQuery('(pointer: fine)');

  const placements = useDraft((s) => s.placements);
  const order = useDraft((s) => s.order);
  const selectedId = useDraft((s) => s.selectedId);
  const cursor = useDraft((s) => s.cursor);
  const landingId = useDraft((s) => s.landingId);

  const [sheet, setSheet] = useState(null);
  const [jokerTarget, setJokerTarget] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [shake, setShake] = useState(0);
  const [dropTurn, setDropTurn] = useState(null);
  const [celebration, setCelebration] = useState(null);
  const [rackHint, setRackHint] = useState(false);
  const [drag, setDrag] = useState(null);
  const [announce, setAnnounce] = useState(0); // key of the "your turn" announcement, 0 = hidden // { tileId, from: 'rack' | 'board', target } while dragging

  const nicknameOf = (id) => room.players.find((p) => p.id === id)?.nickname;
  const nameOf = useCallback((id) => (id === me ? 'Vous' : room.players.find((p) => p.id === id)?.nickname ?? '—'), [room.players, me]);

  // ---- draft <-> server ----------------------------------------------------
  // Restore a draft from this tab (page reload) before reconciling with the server.
  useEffect(() => {
    if (readOnly) return undefined;
    const saved = readSavedDraft(room.id);
    if (saved) useDraft.setState(saved);
    return () => useDraft.getState().reset();
  }, [room.id, readOnly]);
  useEffect(() => { useDraft.getState().sync(rack, game.board); }, [rack, game.board]);
  // Only persist once the rack has been reconciled (order filled), never the initial empty state.
  useEffect(() => { if (!readOnly && order.length) saveDraft(room.id, { placements, order }); }, [room.id, placements, order, readOnly]);
  useEffect(() => {
    if (!landingId) return undefined;
    const t = setTimeout(() => useDraft.setState({ landingId: null }), 320);
    return () => clearTimeout(t);
  }, [landingId, placements]);

  const rackById = useMemo(() => new Map(rack.map((t) => [t.id, t])), [rack]);
  const pending = useMemo(() => placements.map((p) => {
    const t = rackById.get(p.tileId);
    return t && { tileId: p.tileId, x: p.x, y: p.y, letter: t.joker ? p.letter : t.letter, value: t.value, joker: t.joker };
  }).filter(Boolean), [placements, rackById]);
  // Feedforward while dragging over a cell: the move as it would be if the tile were dropped there.
  const previewPending = useMemo(() => {
    if (drag?.target?.type !== 'cell') return null;
    const t = rackById.get(drag.tileId);
    if (!t) return null;
    const { x, y } = drag.target;
    const letter = t.joker ? (placements.find((p) => p.tileId === t.id)?.letter ?? '?') : t.letter;
    return [
      ...pending.filter((p) => p.tileId !== t.id && !(p.x === x && p.y === y)),
      { tileId: t.id, x, y, letter, value: t.value, joker: t.joker },
    ];
  }, [drag, rackById, placements, pending]);
  // Score preview with the server's own rules. Words are NOT checked against the dictionary here.
  const analysis = useMemo(() => {
    const src = previewPending ?? pending;
    return src.length ? analyzeMove(game.board, src) : null;
  }, [previewPending, pending, game.board]);
  useEffect(() => { setDragBadge(previewPending && analysis?.ok ? analysis.score : null); }, [previewPending, analysis]);

  const rackTiles = useMemo(() => {
    const placed = new Set(placements.map((p) => p.tileId));
    return order.map((id) => rackById.get(id)).filter((t) => t && !placed.has(t.id));
  }, [order, placements, rackById]);
  // Feedforward in the rack: neighbours slide apart where the dragged tile would land.
  const rackDisplay = useMemo(() => {
    if (drag?.target?.type !== 'rack') return rackTiles;
    const { index } = drag.target;
    if (drag.from === 'rack') {
      const dragged = rackTiles.find((t) => t.id === drag.tileId);
      if (!dragged) return rackTiles;
      const others = rackTiles.filter((t) => t.id !== drag.tileId);
      others.splice(index, 0, dragged);
      return others;
    }
    const list = [...rackTiles];
    list.splice(index, 0, { id: '__gap', gap: true });
    return list;
  }, [rackTiles, drag]);

  // ---- reacting to the server ---------------------------------------------
  const prevMove = useRef(game.lastMove);
  const prevCurrent = useRef(game.currentPlayerId);
  useEffect(() => {
    const m = game.lastMove;
    const before = prevMove.current;
    prevMove.current = m;
    if (m && (!before || before.turn !== m.turn)) {
      const mine = m.playerId === me;
      if (m.type === 'play') {
        if (mine) {
          sound(m.bingo ? 'bingo' : 'success');
          haptic('success');
        } else {
          setDropTurn(m.turn);
          m.tiles.forEach((_, i) => sound('place', 0.12 + i * 0.07));
          toast({ title: `${nameOf(m.playerId)} · ${m.words[0].word}`, description: `+${m.score} points${m.words.length > 1 ? ` (${m.words.map((w) => w.word).join(', ')})` : ''}` });
        }
        if (m.bingo) setCelebration({ who: nameOf(m.playerId), score: m.score, key: m.turn });
      } else if (!mine) {
        const what = m.type === 'exchange' ? `a échangé ${m.count} lettre${m.count > 1 ? 's' : ''}` : m.type === 'timeout' ? 'n’a pas joué à temps' : 'passe son tour';
        toast({ title: `${nameOf(m.playerId)} ${what}` });
      }
    }
    if (game.currentPlayerId === me && prevCurrent.current !== me && !readOnly) {
      sound('turn');
      haptic('turn');
      setAnnounce(game.turnNumber);
    }
    prevCurrent.current = game.currentPlayerId;
  }, [game.lastMove, game.currentPlayerId, me, nameOf, readOnly]);

  // The game opens on my turn: announce it too.
  useEffect(() => {
    if (!readOnly && game.status === 'playing' && game.currentPlayerId === me && game.turnNumber === 1) setAnnounce(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!announce) return undefined;
    const t = setTimeout(() => setAnnounce(0), 1400);
    return () => clearTimeout(t);
  }, [announce]);

  useEffect(() => {
    if (!celebration) return undefined;
    const t = setTimeout(() => setCelebration(null), 2600);
    return () => clearTimeout(t);
  }, [celebration]);

  // Tab title tells you when it's your turn while you're elsewhere.
  useEffect(() => {
    const base = 'ScrabbleIO';
    document.title = myTurn ? `● À vous — ${base}` : `${base} · ${room.id}`;
    return () => { document.title = base; };
  }, [myTurn, room.id]);

  // ---- interactions ---------------------------------------------------------
  const ctx = useRef({});
  ctx.current = { game, rackById, readOnly, finePointer, rackTiles };

  const flashRackHint = useCallback(() => {
    setRackHint(true);
    setTimeout(() => setRackHint(false), 600);
  }, []);

  const placeTile = useCallback((tileId, x, y, letter) => {
    const { rackById: byId, game: g } = ctx.current;
    const t = byId.get(tileId);
    if (!t || g.board[y][x]) return false;
    if (t.joker && !letter) {
      setJokerTarget({ tileId, x, y });
      setSheet('joker');
      return true;
    }
    useDraft.getState().place(tileId, x, y, t.joker ? letter : undefined);
    sound('place');
    haptic('light');
    return true;
  }, []);

  const typeLetter = useCallback((letter) => {
    const d = useDraft.getState();
    const { rackTiles: tiles, game: g } = ctx.current;
    if (!d.cursor) return;
    const tile = tiles.find((t) => !t.joker && t.letter === letter) ?? tiles.find((t) => t.joker);
    if (!tile) { sound('error'); return; }
    const at = nextFreeCell(g.board, d.placements, d.cursor.x, d.cursor.y, d.cursor.dir);
    if (!at) return;
    placeTile(tile.id, at.x, at.y, tile.joker ? letter : undefined);
    const after = useDraft.getState();
    const [dx, dy] = at.dir === 'H' ? [1, 0] : [0, 1];
    after.setCursor(nextFreeCell(g.board, after.placements, at.x + dx, at.y + dy, at.dir) ?? null);
  }, [placeTile]);

  const tapRack = useCallback((tileId) => {
    if (ctx.current.readOnly) return;
    const d = useDraft.getState();
    if (d.cursor && ctx.current.finePointer) {
      const t = ctx.current.rackById.get(tileId);
      if (t && !t.joker) { typeLetter(t.letter); return; }
    }
    d.select(tileId);
    sound('pick');
  }, [typeLetter]);

  const onCellTap = useCallback((x, y) => {
    const { game: g, readOnly: ro, finePointer: fine } = ctx.current;
    if (ro || g.board[y][x]) return;
    const d = useDraft.getState();
    if (d.placements.some((p) => p.x === x && p.y === y)) return; // handled by the tile gesture
    if (d.selectedId) { placeTile(d.selectedId, x, y); return; }
    if (fine) {
      const same = d.cursor && d.cursor.x === x && d.cursor.y === y;
      d.setCursor({ x, y, dir: same ? (d.cursor.dir === 'H' ? 'V' : 'H') : (d.cursor?.dir ?? 'H') });
    } else {
      flashRackHint();
    }
  }, [placeTile, flashRackHint]);

  const canDropOnCell = (t) => t.type === 'rack' || !ctx.current.game.board[t.y][t.x];

  const dragCallbacks = (tileId, from) => ({
    onStart: () => setDrag({ tileId, from, target: null }),
    onHover: (target) => setDrag((d) => (d ? { ...d, target } : d)),
    onEnd: () => setDrag(null),
  });

  const onRackTileDown = useCallback((e, tileId) => {
    if (!e) { tapRack(tileId); return; }
    if (ctx.current.readOnly) return;
    startTileGesture(e, {
      ...dragCallbacks(tileId, 'rack'),
      el: e.currentTarget,
      onTap: () => tapRack(tileId),
      canDrop: canDropOnCell,
      onDrop: (target) => {
        if (target.type === 'rack') { useDraft.getState().moveInRack(tileId, target.index); sound('back'); return true; }
        return placeTile(tileId, target.x, target.y);
      },
    });
  }, [tapRack, placeTile]);

  const onPendingDown = useCallback((e, tileId) => {
    if (ctx.current.readOnly) return;
    startTileGesture(e, {
      ...dragCallbacks(tileId, 'board'),
      el: e.currentTarget,
      onTap: () => { useDraft.getState().unplace(tileId); sound('back'); },
      canDrop: canDropOnCell,
      onDrop: (target) => {
        const d = useDraft.getState();
        if (target.type === 'rack') { d.unplace(tileId, target.index); sound('back'); return true; }
        const letter = d.placements.find((p) => p.tileId === tileId)?.letter;
        return placeTile(tileId, target.x, target.y, letter);
      },
    });
  }, [placeTile]);

  // ---- commands ---------------------------------------------------------------
  const canPlay = myTurn && analysis?.ok && !playing;

  const play = useCallback(async () => {
    if (!canPlay) return;
    setPlaying(true);
    try {
      await call('game:play', {
        roomId: room.id,
        placements: useDraft.getState().placements.map(({ tileId, x, y, letter }) => ({ tileId, x, y, letter })),
      });
      useDraft.getState().setCursor(null);
    } catch (e) {
      sound('error');
      haptic('error');
      setShake(Date.now());
      setTimeout(() => setShake(0), 450);
      toast({ title: errorMessage(e.code, e.details), tone: 'error' });
    } finally {
      setPlaying(false);
    }
  }, [canPlay, room.id]);

  const run = async (event, payload, success) => {
    try {
      await call(event, { roomId: room.id, ...payload });
      if (success) toast({ title: success, tone: 'success' });
      setSheet(null);
      return true;
    } catch (e) {
      toast({ title: errorMessage(e.code, e.details), tone: 'error' });
      return false;
    }
  };

  const toggleZoom = () => setZoom((z) => (z > 1 ? 1 : 1.7));

  const recallOrShuffle = () => {
    const d = useDraft.getState();
    if (d.placements.length) { d.recall(); sound('back'); } else { d.shuffle(); sound('shuffle'); haptic('light'); }
  };

  // ---- keyboard (desktop) -------------------------------------------------------
  const playRef = useRef(play);
  playRef.current = play;
  useEffect(() => {
    if (readOnly) return undefined;
    const onKey = (e) => {
      if (sheet || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, [contenteditable]')) return;
      const d = useDraft.getState();
      const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      if (ALPHABET.includes(key) && key.length === 1) {
        if (d.cursor) { e.preventDefault(); typeLetter(key); }
        return;
      }
      if (key === 'Enter') { if (e.target instanceof HTMLButtonElement) return; e.preventDefault(); playRef.current(); return; }
      if (key === 'Escape') { d.recall(); d.setCursor(null); return; }
      if (key === 'Backspace') {
        const last = d.placements[d.placements.length - 1];
        if (!last) return;
        e.preventDefault();
        d.unplace(last.tileId);
        d.setCursor({ x: last.x, y: last.y, dir: d.cursor?.dir ?? 'H' });
        sound('back');
        return;
      }
      if (key === ' ' && d.cursor) { e.preventDefault(); d.setCursor({ ...d.cursor, dir: d.cursor.dir === 'H' ? 'V' : 'H' }); return; }
      if (ARROWS[key] && d.cursor) {
        e.preventDefault();
        const [dx, dy] = ARROWS[key];
        d.setCursor({ x: Math.min(14, Math.max(0, d.cursor.x + dx)), y: Math.min(14, Math.max(0, d.cursor.y + dy)), dir: dx ? 'H' : 'V' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [readOnly, sheet, typeLetter]);

  // ---- derived UI ---------------------------------------------------------------
  const currentName = nameOf(game.currentPlayerId);
  let status;
  if (readOnly) status = { text: 'Plateau final' };
  else if (!(previewPending ?? pending).length) {
    status = myTurn
      ? { text: finePointer ? 'À vous ! Glissez des lettres, ou cliquez une case et tapez.' : 'À vous ! Glissez des lettres sur le plateau.', tone: 'accent' }
      : { text: `${currentName} réfléchit… Préparez votre coup en attendant.` };
  } else if (analysis && !analysis.ok) {
    status = { text: ERRORS[analysis.error] ?? '', tone: 'warn' };
  } else if (analysis?.ok) {
    status = {
      text: (
        <>
          {analysis.words.map((w, i) => <span key={i} className={`status__word ${i === 0 ? 'is-main' : ''}`}>{w.word} <em>{w.score}</em></span>)}
          {analysis.bingo && <span className="status__bingo">+50 Scrabble</span>}
        </>
      ),
    };
  }

  const focus = cursor ?? pending[pending.length - 1] ?? (game.lastMove?.type === 'play' ? game.lastMove.tiles[0] : null);

  const playLabel = myTurn
    ? (analysis?.ok ? <>Jouer <span className="play-btn__score tabular">{analysis.score}</span></> : 'Jouer')
    : `Tour de ${currentName}`;

  return (
    <div className={`game ${wide ? 'game--wide' : 'game--compact'} ${myTurn ? 'is-my-turn' : ''}`}>
      {wide ? (
        <aside className="game__side game__side--left">
          <div className="side-head">
            <IconButton icon="settings" label="Réglages" onClick={() => setSheet('menu')} />
            <span className="side-head__title">Salon <strong>{room.id}</strong></span>
          </div>
          <Players room={room} me={me} />
          <div className="bag-card">
            <Icon name="bag" size={18} />
            <span><strong className="tabular">{game.bagCount}</strong> lettres dans le sac</span>
          </div>
          <div className="side-foot">
            <span className="kbd-hint"><Icon name="keyboard" size={14} /> Cliquez une case puis tapez · Entrée pour jouer</span>
          </div>
        </aside>
      ) : (
        <header className="game__top">
          <Players room={room} me={me} compact />
          <IconButton icon="settings" label="Réglages" onClick={() => setSheet('menu')} />
        </header>
      )}

      <main className="game__center">
        {wide && !readOnly && <TurnStrip wide game={game} myTurn={myTurn} nameOf={nameOf} avatarName={nicknameOf(game.currentPlayerId)} />}
        <div className="board-area">
          <div className="board-stage">
          <Board
            board={game.board}
            pending={pending}
            analysis={analysis}
            previewing={!!previewPending}
            lastMove={game.lastMove}
            dropTurn={dropTurn}
            cursor={readOnly ? null : cursor}
            zoom={zoom}
            focus={focus}
            landingId={landingId}
            shake={shake}
            onCellTap={onCellTap}
            onPendingDown={onPendingDown}
          />
          {!wide && (
            <TurnStrip game={game} myTurn={myTurn} nameOf={nameOf} avatarName={nicknameOf(game.currentPlayerId)} zoom={zoom} onZoom={toggleZoom} />
          )}
          </div>
          {!wide && (
            <IconButton
              className="zoom-btn material"
              icon={zoom > 1 ? 'zoomOut' : 'zoomIn'}
              label={zoom > 1 ? 'Dézoomer' : 'Zoomer'}
              onClick={toggleZoom}
            />
          )}
        </div>

        <div className="game__dock">
          <div className={`status ${status?.tone ? `status--${status.tone}` : ''}`} aria-live="polite">
            <span className="status__text">{status?.text}</span>
            {!wide && <span className="status__bag"><Icon name="bag" size={14} /><span className="tabular">{game.bagCount}</span></span>}
          </div>

          {readOnly ? (
            <div className="dock-row">
              <Button variant="primary" size="lg" className="btn--block" icon="back" onClick={onExitBoard}>Retour aux résultats</Button>
            </div>
          ) : (
            <>
              <Rack
                tiles={rackDisplay}
                selectedId={selectedId}
                onTileDown={onRackTileDown}
                hint={rackHint}
                gapId={drag?.from === 'rack' ? drag.tileId : undefined}
              />
              <div className="actions">
                {!wide && <IconButton icon="history" label="Historique" onClick={() => setSheet('history')} />}
                <IconButton icon="swap" label="Échanger des lettres" disabled={!myTurn} onClick={() => setSheet('exchange')} />
                <IconButton icon="skip" label="Passer son tour" disabled={!myTurn} onClick={() => setSheet('pass')} />
                <IconButton
                  icon={placements.length ? 'recall' : 'shuffle'}
                  label={placements.length ? 'Reprendre les lettres' : 'Mélanger le chevalet'}
                  onClick={recallOrShuffle}
                />
                <Button
                  variant={myTurn ? 'primary' : 'secondary'}
                  size="lg"
                  className={`play-btn ${canPlay ? 'is-ready' : ''}`}
                  onClick={play}
                  disabled={!canPlay}
                  loading={playing}
                >
                  {playLabel}
                </Button>
              </div>
            </>
          )}
        </div>
      </main>

      {wide && (
        <aside className="game__side game__side--right">
          <h2 className="side-title">Historique</h2>
          <div className="side-scroll"><History room={room} me={me} /></div>
        </aside>
      )}

      <AnimatePresence>
        {announce > 0 && (
          <motion.div
            key={`turn-${announce}`}
            className="turn-announce"
            initial={{ opacity: 0, scale: 0.85, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', bounce: 0.4, duration: 0.5 }}
            role="status"
          >
            À vous de jouer !
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {celebration && (
          <motion.div
            key={celebration.key}
            className="celebration"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-live="assertive"
          >
            <Confetti duration={2400} count={110} />
            <motion.div
              className="celebration__card"
              initial={{ scale: 0.7, y: 20, rotate: -4 }}
              animate={{ scale: 1, y: 0, rotate: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.45, duration: 0.7 }}
            >
              <span className="celebration__title">Scrabble !</span>
              <span className="celebration__sub">{celebration.who} · +{celebration.score} points</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <JokerPicker
        open={sheet === 'joker'}
        onClose={() => { setSheet(null); setJokerTarget(null); }}
        onPick={(letter) => {
          if (jokerTarget) placeTile(jokerTarget.tileId, jokerTarget.x, jokerTarget.y, letter);
          setJokerTarget(null);
          setSheet(null);
        }}
      />
      <ExchangeSheet
        open={sheet === 'exchange'}
        onClose={() => setSheet(null)}
        rack={rack}
        bagCount={game.bagCount}
        onConfirm={(tileIds) => { useDraft.getState().recall(); return run('game:exchange', { tileIds }, `${tileIds.length} lettre${tileIds.length > 1 ? 's' : ''} échangée${tileIds.length > 1 ? 's' : ''}`); }}
      />
      <ConfirmSheet
        open={sheet === 'pass'}
        onClose={() => setSheet(null)}
        title="Passer votre tour ?"
        body="Vous ne marquerez aucun point ce tour-ci. Si chacun passe deux fois de suite, la partie s’arrête."
        confirmLabel="Passer"
        onConfirm={() => run('game:pass')}
      />
      <ConfirmSheet
        open={sheet === 'leave'}
        onClose={() => setSheet(null)}
        title="Quitter la partie ?"
        body="Votre place est gardée : vous pourrez revenir depuis l’accueil tant que la partie n’est pas terminée. En votre absence, vos tours seront passés."
        confirmLabel="Quitter"
        tone="danger"
        onConfirm={() => { navigate('/'); return true; }}
      />
      <Sheet open={sheet === 'history'} onClose={() => setSheet(null)} title="Historique">
        <History room={room} me={me} onLocate={() => setSheet(null)} />
      </Sheet>
      <SettingsSheet open={sheet === 'menu'} onClose={() => setSheet(null)}>
        <div className="settings__group">
          <span className="eyebrow">Partie · salon {room.id}</span>
          <Button variant="secondary" icon="book" onClick={() => setSheet('rules')}>Règles du jeu</Button>
          {readOnly
            ? <Button variant="secondary" icon="back" onClick={() => { setSheet(null); onExitBoard?.(); }}>Retour aux résultats</Button>
            : <Button variant="danger" icon="logout" onClick={() => setSheet('leave')}>Quitter la partie</Button>}
        </div>
      </SettingsSheet>
      <RulesSheet open={sheet === 'rules'} onClose={() => setSheet('menu')} />
    </div>
  );
}

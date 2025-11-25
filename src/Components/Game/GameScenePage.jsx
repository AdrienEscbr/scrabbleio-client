// GameScenePage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from 'react-router-dom';
import Board from "../Scrabble/Board";
import Rack from "../Scrabble/Rack";
import Timer from "../Scrabble/Timer";
import ActionButtons from "../Scrabble/ActionButtons";
import "../../Styles/ComponentStyles/Scrabble.css";

function GameScenePage({ socket }) {
  const { roomId } = useParams();
  const [gameState, setGameState] = useState(null);
  const [mySocketId, setMySocketId] = useState(null);
  const gameStateRef = useRef(gameState);
  const mySocketIdRef = useRef(mySocketId);

  const navigate = useNavigate();

  useEffect(() => { setMySocketId(socket.id); }, [socket]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { mySocketIdRef.current = mySocketId; }, [mySocketId]);

  // Rejoindre la room et initialiser l'état
  useEffect(() => {
    if (socket && !socket.connected) socket.connect();
    socket.emit("joinRoom", roomId, (response) => {
      if (response.success) {
        socket.emit('game:getState', roomId);
      } else {
        alert(response.message);
      }
    });
  }, [roomId, socket]);

  // Gestion des mises à jour de jeu
  useEffect(() => {
    const onState = (payload) => {
      if (!payload || payload.roomId !== roomId) return;
      setGameState(payload.gameState);
    };
    const onEnded = (payload) => {
      if (!payload || payload.roomId !== roomId) return;
      const { scores, winnerIds, statsByPlayer, players } = payload;
      const isWinner = winnerIds.includes(mySocketIdRef.current);
      navigate(`/game/${roomId}/results`, { state: { scores, winnerIds, statsByPlayer, isWinner, players } });
    };
    const onError = (payload) => { if (payload?.reason) alert(`Coup invalide: ${payload.reason}`); };
    socket.on('game:state', onState);
    socket.on('game:ended', onEnded);
    socket.on('game:error', onError);
    return () => {
      socket.off('game:state', onState);
      socket.off('game:ended', onEnded);
      socket.off('game:error', onError);
    };
  }, [socket, navigate, roomId]);

  // Local state for placements and rack
  const isMyTurn = gameState?.activePlayerId === mySocketId;
  const [selectedTileId, setSelectedTileId] = useState(undefined);
  const [placements, setPlacements] = useState([]);
  const [exchangeMode, setExchangeMode] = useState(false);
  const [exchangeSet, setExchangeSet] = useState(new Set());
  const [rackOrder, setRackOrder] = useState([]);

  const rackTiles = useMemo(() => {
    const used = new Set(placements.map((p) => p.tileId));
    const available = (gameState?.myRack ?? []).filter((t) => !used.has(t.tileId));
    const orderMap = new Map(rackOrder.map((id, idx) => [id, idx]));
    return available.slice().sort((a, b) => (orderMap.get(a.tileId) ?? Number.MAX_SAFE_INTEGER) - (orderMap.get(b.tileId) ?? Number.MAX_SAFE_INTEGER));
  }, [gameState?.myRack, placements, rackOrder]);

  useEffect(() => {
    const ids = (gameState?.myRack ?? []).map((t) => t.tileId);
    setRackOrder((prev) => {
      if (prev.length === 0) return ids;
      const setIds = new Set(ids);
      const filtered = prev.filter((id) => setIds.has(id));
      for (const id of ids) if (!filtered.includes(id)) filtered.push(id);
      return filtered;
    });
  }, [gameState?.myRack]);

  useEffect(() => { const first = rackTiles[0]?.tileId; setSelectedTileId(first); }, [rackTiles]);

  const onPlace = (x, y) => {
    if (!isMyTurn || exchangeMode) return;
    const cell = gameState?.board?.[y]?.[x];
    if (!cell || cell.letter) return;
    const tile = rackTiles.find((t) => t.tileId === selectedTileId);
    if (!tile) return;
    setPlacements((prev) => [...prev.filter((p) => !(p.x === x && p.y === y)), { x, y, letter: tile.letter, points: tile.points, tileId: tile.tileId }]);
  };

  const onValidate = () => {
    if (!isMyTurn || placements.length === 0) return;
    const payload = placements.map((p) => ({ x: p.x, y: p.y, tileId: p.tileId }));
    socket.emit('game:playMove', { roomId, placements: payload });
    setPlacements([]);
    setSelectedTileId(undefined);
  };

  const onPass = () => { if (!isMyTurn) return; socket.emit('game:pass', roomId); };

  const onExchange = () => {
    if (!isMyTurn) return;
    if (!exchangeMode) { setExchangeMode(true); setExchangeSet(new Set()); setPlacements([]); setSelectedTileId(undefined); return; }
    const ids = [...exchangeSet];
    if (ids.length > 0) socket.emit('game:exchange', { roomId, tileIds: ids });
    setExchangeMode(false); setExchangeSet(new Set());
  };

  const onCancel = () => { setPlacements([]); setExchangeMode(false); setExchangeSet(new Set()); setSelectedTileId(undefined); };

  const canValidate = placements.length > 0 && isMyTurn && !exchangeMode;

  if (!gameState) return <div>Chargement...</div>;

  return (
    <div className="container py-3 h-100">
      <div className="d-flex flex-row justify-content-center align-items-start gap-4">
        <div className="d-flex flex-column justify-content-center align-items-center">
          <Board
            board={gameState.board}
            placements={placements}
            onPlace={onPlace}
            onRemovePlacement={(x, y) => { if (!isMyTurn) return; setPlacements((prev) => prev.filter((p) => !(p.x === x && p.y === y))); }}
            onDropFromRack={(x, y, tileId) => {
              const cell = gameState?.board?.[y]?.[x];
              if (!cell || cell.letter) return;
              const tile = (gameState?.myRack ?? []).find((t) => t.tileId === tileId);
              if (!tile) return;
              setPlacements((prev) => [ ...prev.filter((p) => !(p.x === x && p.y === y)), { x, y, letter: tile.letter, points: tile.points, tileId: tile.tileId } ]);
            }}
          />
        </div>
        <div style={{ minWidth: 280 }}>
          {/* <h6>Tour</h6> */}
          <div className={isMyTurn ? 'text-success' : 'infos'} style={{ fontSize: 30 }}>
            {isMyTurn ? 'A vous de jouer' : `Tour de : ${(gameState.players||[]).find(p=>p.id===gameState.activePlayerId)?.nickname || gameState.activePlayerId}`}
          </div>
          <Timer turnEndsAt={gameState.turnEndsAt} />
          <div className="small mt-2 infos">Lettres restantes: <strong>{gameState.bagCount ?? '-'}</strong></div>
          <div className="mt-3">
            <h6>Scores</h6>
            <ul className="list-group">
              {Object.entries(gameState.scoresByPlayer).sort((a,b)=>b[1]-a[1]).map(([pid, score]) => (
                <li key={pid} className="list-group-item d-flex justify-content-between">
                  <span>{pid === mySocketId ? 'Vous' : ((gameState.players||[]).find(p=>p.id===pid)?.nickname || pid.slice(0,6))}</span>
                  <strong>{score}</strong>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-3 ">
            <h6>Historique</h6>
            <ul className="small ps-3 log-panel mb-0">
              {[...(gameState.log||[])].slice().reverse().map((l, i) => (
                <li key={`${i}-${l.playerId}-${l.summary}`}>{l.summary}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="mt-5">
        {/* <h6>Rack</h6> */}
        <Rack
          tiles={rackTiles}
          selectedTileId={selectedTileId}
          onSelect={(tileId) => {
            if (exchangeMode) {
              setExchangeSet((prev) => { const next = new Set(prev); if (next.has(tileId)) next.delete(tileId); else next.add(tileId); return next; });
              return;
            }
            setRackOrder((prev) => { const rest = prev.filter((id) => id !== tileId); return [tileId, ...rest]; });
          }}
          disabled={!isMyTurn}
          onReorder={(ids) => setRackOrder(ids)}
        />
        {exchangeMode ? (<div className="mt-2 text-muted">Sélectionnez les tuiles à échanger puis cliquez sur Échanger.</div>) : null}
        <ActionButtons
          isMyTurn={!!isMyTurn}
          canValidate={canValidate}
          onValidate={onValidate}
          onPass={onPass}
          onExchange={onExchange}
          onCancel={() => onCancel()}
        />
      </div>
    </div>
  );
}

export default GameScenePage;

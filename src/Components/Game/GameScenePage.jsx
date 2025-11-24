// GameScenePage.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { useParams } from "react-router-dom";

function GameScenePage({ socket }) {
  const { roomId } = useParams();
  const [gameState, setGameState] = useState(null);
  const [mySocketId, setMySocketId] = useState(null);
  const gameStateRef = useRef(gameState);
  const mySocketIdRef = useRef(mySocketId);

  const navigate = useNavigate();
  
  const goTo = (path) => {
    navigate(path);
  };

  useEffect(() => {
    setMySocketId(socket.id);
  }, [socket]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    mySocketIdRef.current = mySocketId;
  }, [mySocketId]);

  // Rejoindre la room et ecouter les mises a jour d'etat
  useEffect(() => {
    if (socket && !socket.connected) {
      socket.connect();
    }
    socket.emit("joinRoom", roomId, (response) => {
      if (response.success) {
        setGameState(response.state);
      } else {
        alert(response.message);
      }
    });
  }, [roomId, socket]);

  useEffect(() => {
    socket.on("gameOver", (data) => {
      const { gameState, winner } = data;
      console.log("Partie terminee");
      console.log("mon id vs winner", mySocketIdRef.current, winner.socketId)
      const isWinner = mySocketIdRef.current === winner.socketId;
      navigate(`/game/${roomId}/results`, {
        state: {
          gameState,
          isWinner,
        },
      });
    });
    return () => {
      socket.off("gameOver");
    };
  }, [socket, navigate]);
  
  if (!gameState) return <div>Chargement...</div>;

  return (
    <div>
      <div className="d-flex flex-row justify-content-center align-items-center gap-4">
        <div className="game_grid  h-100 d-flex flex-column justify-content-center align-items-center">
          <h2>Plateau de jeu :</h2>
        </div>
      </div>
    </div>
  );
}

export default GameScenePage;

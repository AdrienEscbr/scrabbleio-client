import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import Modal from "../Modal/Modal";

import Copy from "../../Assets/SVG/copy.svg";
import Edit from "../../Assets/SVG/edit.svg";

function RoomComponent({ socket }) {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [players, setPlayers] = useState([]);
  const [pseudo, setPseudo] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);

  const showModal = () => {
    setIsModalVisible(true);
  };

  const hideModal = () => {
    setIsModalVisible(false);
  };

  let goTo = (path) => {
    // Notifier le serveur pour quitter la room avant de naviguer
    socket.emit("leaveRoom", roomId, () => {
      navigate(path);
    });
  };

  useEffect(() => {
    socket.emit("joinRoom", roomId, (response) => {
      if (response.success) {
        setPlayers(response.state.players);
        const currentPlayer = response.state.players.find(
          (p) => p.socketId === socket.id
        );
        setPseudo(currentPlayer ? currentPlayer.pseudo : "");
      } else {
        alert(response.message || "Impossible de rejoindre la room.");
        navigate("/multiplayer");
      }
    });

    socket.on("gameStarted", () => {
      navigate(`/game/${roomId}`);
    });

    socket.on("updateState", (newState) => {
      setPlayers(newState.players);
    });

    return () => {
      socket.off("updateState");
      socket.off("gameStarted");
    };
  }, [roomId, socket, navigate]);

  const handlePseudoChange = () => {
    const newPseudo = prompt(
      "Entrez un nouveau pseudo (max 12 caractères) :",
      pseudo
    );
    if (newPseudo) {
      socket.emit("changePseudo", newPseudo, (response) => {
        if (response.success) {
          setPseudo(response.newPseudo);
        } else {
          alert(response.message || "Impossible de changer le pseudo.");
        }
      });
    }
  };

  const handleLauchingGame = () => {
    socket.emit("launchGame", roomId, (response) => {
      if (response.success) {
        navigate(`/game/${roomId}`);
      } else {
        alert(response.message || "Impossible de lancer la partie.");
      }
    });
  };

  const handleCopyRoomId = () => {
    navigator.clipboard
      .writeText(roomId)
      .then(() => {
        showModal();
      })
      .catch((err) => {
        alert("Erreur lors de la copie du Room ID");
      });
  };

  return (
    <div className="container w-100 h-100 d-flex justify-content-center align-items-center flex-column">
      <Modal
        visible={isModalVisible}
        text="Code partie copié dans le presse-papier."
        onClose={hideModal}
      />
      <p className="display-1">DEKOU</p>
      <div className="py-5 w-50 border border-white border-5 rounded d-flex flex-column align-items-center justify-content-center gap-4">
        <div
          className="d-flex flex-row align-items-center justify-content-center gap-3"
          style={{ height: "6rem" }}
        >
          <p className="display-5 h-100 text-center d-flex align-items-center justify-content-center m-0">
            Joueurs {players.length}/2
          </p>
          <button onClick={handleCopyRoomId} className="border rounded">
            <img
              src={Copy}
              alt="Copier"
              style={{ width: "2.5rem", height: "2.5rem" }}
            />
          </button>
        </div>
        <ul className="list-unstyled">
          {players.map((player) => (
            <li key={player.socketId} className="display-6 py-2">
              {player.socketId === socket.id ? (
                <strong>
                  {player.pseudo} (Vous){" "}
                  <button
                    onClick={handlePseudoChange}
                    className="border rounded"
                  >
                    <img
                      src={Edit}
                      alt="Modifier"
                      style={{ width: "2rem", height: "2rem" }}
                    />
                  </button>
                </strong>
              ) : (
                player.pseudo
              )}
            </li>
          ))}
        </ul>
        {players.length === 2 && (
          <p
            className="display-5 text-center hovering cursorPointer"
            onClick={handleLauchingGame}
          >
            JOUER
          </p>
        )}
        <p
          className="display-5 text-center hovering cursorPointer"
          onClick={() => goTo("/multiplayer")}
        >
          RETOUR
        </p>
      </div>
    </div>
  );
}

export default RoomComponent;

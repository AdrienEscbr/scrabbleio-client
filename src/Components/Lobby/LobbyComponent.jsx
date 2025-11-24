import React from "react";
import { useNavigate } from "react-router-dom";

import ArrowRight from "../../Assets/SVG/arrow_right.svg";
import Group from "../../Assets/SVG/group.svg";

function LobbyComponent(props) {
  const navigate = useNavigate();

  const goTo = (path) => {
    navigate(path);
  };

  return (
    <div className="container w-100 h-100 d-flex justify-content-center align-items-center flex-column">
      <p className="display-1">DEKOU</p>
      {(() => {
        switch (props.mode) {
          case 1:
            return (
              <div className="py-5 w-50 border border-white border-5 rounded">
                <form
                  action=""
                  method="post"
                  className="d-flex flex-column align-items-center justify-content-center gap-4"
                >
                  <p className="display-5 text-center">Joueur 1 :</p>
                  <input
                    type="text"
                    className="w-50 inputPlayer"
                    placeholder="Nom joueur 1"
                    required
                  />
                  <p className="display-5 text-center">Joueur 2 :</p>
                  <input
                    type="text"
                    className="w-50 inputPlayer"
                    placeholder="Nom joueur 2"
                    required
                  />
                  <p
                    className="display-5 text-center hovering pt-3 cursorPointer"
                    onClick={() => goTo("/game")}
                  >
                    JOUER
                  </p>
                  <p
                    className="display-5 text-center hovering cursorPointer"
                    onClick={() => goTo("/")}
                  >
                    RETOUR
                  </p>
                </form>
              </div>
            );
          case 2:
            // Multiplayer
            const socket = props.socket;

            const ensureConnected = () =>
              new Promise((resolve) => {
                if (!socket) return resolve();
                if (socket.connected) return resolve();
                socket.once("connect", resolve);
                socket.connect();
              });

            const handleCreateRoom = async () => {
              console.log("Creation d'une room...");
              await ensureConnected();
              socket.emit("createRoom", (response) => {
                if (response.success) {
                  const roomId = response.roomId;
                  console.log(`Rejoint la room : ${roomId}`);
                  navigate(`/room/${roomId}`);
                } else {
                  alert("Echec de la creation de la room.");
                }
              });
            };

            const handleJoinRoom = async () => {
              const roomId = document.querySelector("input").value;
              console.log("Room ID : ", roomId);
              if (roomId === "") {
                alert("Veuillez entrer un code de room.");
                return;
              }
              await ensureConnected();
              socket.emit("joinRoom", roomId, (response) => {
                if (response.success) {
                  console.log(`Rejoint la room : ${roomId}`);
                  navigate(`/room/${roomId}`);
                } else {
                  alert("Impossible de rejoindre la room.");
                  goTo("/multiplayer");
                }
              });
            };

            return (
              <div className="py-5 w-50 border border-white border-5 rounded d-flex flex-column align-items-center justify-content-center gap-4">
                <div
                  className="input-group flex-nowrap w-75 mt-5 border border-black border-2 rounded"
                  onClick={handleCreateRoom}
                >
                  <span
                    className="input-group-text p-2 d-flex align-items-center justify-content-center"
                    style={{ width: "5rem", height: "6rem" }}
                  >
                    <img
                      src={Group}
                      alt="Icone"
                      style={{ width: "100%", height: "auto" }}
                    />
                  </span>
                  <div className="text-center flex-grow-1 display-6 d-flex align-items-center justify-content-center hoveringSmall cursorPointer">
                    Creer une partie
                  </div>
                </div>

                <div className="input-group flex-nowrap w-75 border border-black border-2 rounded">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Code partie"
                    aria-label="Code partie"
                    aria-describedby="button-addon2"
                    style={{ fontSize: "2.5rem" }}
                  />
                  <button
                    className="btn btn-outline-secondary p-2 d-flex align-items-center justify-content-center"
                    type="button"
                    id="button-addon2"
                    style={{ width: "5rem", height: "6rem" }}
                    onClick={handleJoinRoom}
                  >
                    <img
                      src={ArrowRight}
                      alt="Arrow Right"
                      style={{ width: "100%", height: "auto" }}
                    />
                  </button>
                </div>

                <p
                  className="display-5 text-center hovering pt-3 cursorPointer"
                  onClick={() => goTo("/")}
                >
                  RETOUR
                </p>
              </div>
            );
          default:
            return null;
        }
      })()}
    </div>
  );
}

export default LobbyComponent;

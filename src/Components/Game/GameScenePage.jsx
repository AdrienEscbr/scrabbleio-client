// GameScenePage.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { useParams } from "react-router-dom";
import * as BABYLON from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";
import GameSceneComponent from "./GameSceneComponent";
import Board from "../../Classes/Board";
import Camera from "../../Classes/Camera";
import Dice from "../../Classes/Dice";

import WhiteDiceSvg from "../../Assets/Images/dice_white.svg";
import RedDiceSvg from "../../Assets/Images/dice_red.svg";
import GrayDiceSvg from "../../Assets/Images/dice_gray.svg";
import CubeSvg from "../../Assets/Images/cube.svg";
import GrayCubeSvg from "../../Assets/Images/cube_gray.svg";
import Ball from "../../Classes/Ball";
import Cube from "../../Classes/Cube";

function GameScenePage({ socket }) {
  const { roomId } = useParams();
  const [gameState, setGameState] = useState(null);
  const [mySocketId, setMySocketId] = useState(null);
  // const [currentObject, setCurrentObject] = useState(null);
  const [objectThrown, setObjectThrown] = useState(true);
  const [objectWaiting, setObjectWaiting] = useState(false);
  const [cubeDropRequested, setCubeDropRequested] = useState(false);
  const sceneRef = useRef(null);
  const itemsInGame = useRef([]);
  const cameraInstanceRef = useRef(null);
  const boardRef = useRef(null);
  const gameStateRef = useRef(gameState);
  const mySocketIdRef = useRef(mySocketId);
  const myCurrentObjectRef = useRef(null);

  const test = useRef(null);
  let test_item = useRef(null);

  const navigate = useNavigate();
    
  let goTo = (path) => {
      navigate(path);
  } 


  useEffect(() => {
    setMySocketId(socket.id);
  }, [socket]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    mySocketIdRef.current = mySocketId;
  }, [mySocketId]);

  // useEffect(() => {
  //   myCurrentObjectRef.current = currentObject;
  // }, [currentObject]);

  // Rejoindre la room et écouter les mises à jour d'état
  useEffect(() => {
    socket.emit("joinRoom", roomId, (response) => {
      if (response.success) {
        setGameState(response.state);
        //console.log("Game phase : ", gameState);
      } else {
        alert(response.message);
      }
    });

    socket.on("updateState", (newState) => {
      setGameState(newState);
      test.current = newState;
      console.log("Game phase : ", newState);

      // setGameState of Board
      if (boardRef.current) {
        boardRef.current.setGameState(newState);
      }

      setCubeDropRequested(false); // Réinitialiser l'état de demande de cube
    });

    return () => {
      socket.off("updateState");
    };
  }, [roomId, socket]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const camera = scene.activeCamera;
    if (!camera) return;

    if (gameState?.currentTurn === mySocketId) {
      // Activer le contrôle de la caméra pour le joueur actif
      // camera.attachControl(scene.getEngine().getRenderingCanvas(), true);
      camera.attachControl(scene.getEngine().getRenderingCanvas(), true);
      console.log("Contrôle de la caméra activé pour le joueur actif");
    } else {
      // Désactiver le contrôle de la caméra pour le joueur en attente
      // camera.detachControl(scene.getEngine().getRenderingCanvas());
      camera.detachControl(scene.getEngine().getRenderingCanvas());
      console.log("Contrôle de la caméra désactivé pour le joueur en attente");
    }
  }, [gameState?.currentTurn, mySocketId]);

  useEffect(() => {
    socket.on("cameraUpdate", (data) => {
      const scene = sceneRef.current;
      if (scene) {
        const camera = scene.activeCamera;
        if (camera) {
          camera.position = BABYLON.Vector3.FromArray(data.position);
          camera.setTarget(BABYLON.Vector3.FromArray(data.target));
        }
      }
    });

    return () => {
      socket.off("cameraUpdate");
    };
  }, [socket]);


  useEffect(() => {
    socket.on("synchro", (diceData) => {
      if (!test_item.current) return;
      // diceData.position et diceData.rotationQuaternion sont des tableaux
      test_item.current.setMeshLocation(diceData.position);
      test_item.current.setMeshRotation(diceData.rotationQuaternion);
    });
    return () => {
      socket.off("synchro");
    };
  }, [socket]);

  useEffect(() => {
    socket.on("removeItemsFromMatrix", (itemsLocation) => {
      
    });
    return () => {
      socket.off("removeItemsFromMatrix");
    };
  }, [socket]);



  useEffect(() => {
    socket.on("gameOver", (data) => {
      const {gameState, winner} = data;
      console.log("Partie terminée");
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
  
  
  useEffect(() => {
    socket.on("redDiceInstructions", async (data) => {
      
      const scene = sceneRef.current;

      if (!scene) return;

      const {dices, cubes} = data;

      console.log("dices red instruction", dices)
      console.log("cubes red instructions", cubes)

      // Ajouter les cubes au board (pas la peine de synchoniser avec avec l'autre joueur) + la matrix est déjà à jour quand on reçoit l'ordre
      cubes.forEach(c =>{
        let slotPos = boardRef.current.getMeshLocation(c[0], c[1]);
        let newPos = new BABYLON.Vector3(slotPos.x, slotPos.y + 1, slotPos.z)

        const cube = new Cube(
          scene,
          null,
          boardRef.current,
          socket,
          roomId,
          false
        );

        cube.loadModel(newPos)
        cube.drop(c[0], c[1], true);
      })

      dices.forEach(dice =>{
        let removed_item_row_slor = [dice[0], dice[1]]
        console.log("removed_item_row_slor", removed_item_row_slor)
        console.log("before loop itemsInGame: ", itemsInGame.current)
        console.log("taille itemsInGame :", itemsInGame.current.length)
        itemsInGame.current.forEach((item) => {
          console.log("comparaison :"+item.finalRowSlot+" vs "+removed_item_row_slor)
          if (Array.isArray(item.finalRowSlot) && 
              Array.isArray(removed_item_row_slor) && 
              item.finalRowSlot.length === removed_item_row_slor.length && 
              item.finalRowSlot.every((val, index) => val === removed_item_row_slor[index])) {
            console.log("Match !")
            item.removeFromBoard();
            itemsInGame.current = itemsInGame.current.filter(
              (currentItem) => currentItem !== item
            );
            console.log("itemsInGame.current après remove :", itemsInGame.current)
            console.log("removed item : ", item);
          }
        });
      })
      
    });

    return () => {
      socket.off("redDiceInstructions"); // Nettoyer l'écouteur lors du démontage
    };
  }, [socket]);


  useEffect(() => {
    socket.on("createSpectatorObject", async (data) => {
      if (test_item.current) {
        test_item.current = null;
      }

      const scene = sceneRef.current;

      if (!scene) return;

      // console.log("1", test.current.currentTurn)
      // console.log("2", mySocketId)
      // console.log("3", socket.id)

      if (test.current.currentTurn === socket.id) return; // Ne pas créer d'objet pour le joueur s'il n'est pas spectateur

      const { item, color, newPos } = data;

      switch (item) {
        case "dice":
          const dice = new Dice(
            color,
            scene,
            null,
            boardRef.current,
            socket,
            roomId,
            false
          );
          // setCurrentObject(dice); // Mettez à jour l'état avec le dé actuel

          await dice.loadModel();
          dice.resetLocation();
          // dice.providePhysicConsistency();

          test_item.current = dice; // Stocker l'objet créé dans une référence pour une utilisation ultérieure
          break;

        case "cube":
          const cube = new Cube(
            scene,
            null,
            boardRef.current,
            socket,
            roomId,
            false
          );
          // setCurrentObject(cube); // Mettez à jour l'état avec le cube actuel
          console.log("créa cube click createSpectatorObject")

          await cube.loadModel();

          // if(newPos !== null){
          //   cube.location = newPos
          // }
          // console.log("verif newPos:", newPos )
          // console.log("verif cube location", cube.location)

          if (newPos !== null) {
            cube.setMeshLocation([newPos.x, newPos.y, newPos.z]);
            }
            console.log("verif newPos:", newPos);
            console.log("verif cube location", cube.location);

          cube.resetLocation();
          // cube.providePhysicConsistency();

          test_item.current = cube;
          break;

        case "ball":
          const ball = new Ball(
            scene,
            null,
            boardRef.current,
            socket,
            roomId,
            false
          );

          // setCurrentObject(ball); // Mettez à jour l'état avec la balle actuelle

          await ball.loadModel();
          ball.resetLocation();
          // ball.providePhysicConsistency();
          test_item.current = ball; // Stocker l'objet créé dans une référence pour une utilisation ultérieure

          break;

        default:
          console.error("Type d'objet inconnu :", item);
          break;
      }
    });

    return () => {
      socket.off("createSpectatorObject"); // Nettoyer l'écouteur lors du démontage
    };
  }, [socket]);

  useEffect(() => {
    socket.on("resetItem", (data) => {
      const {removedItem, row, col, item } = data;

      console.log("le test_item.current : ", test_item.current)
      console.log("myCurrentObjectRef.current", myCurrentObjectRef.current)
      // pour le joueur spectateur
      if (test_item.current && !(test_item.current instanceof Ball) && gameStateRef.current.currentTurn !== mySocketIdRef.current) {
        test_item.current.providePhysicConsistency();
        test_item.current.finalRowSlot = [row, col];
        itemsInGame.current.push(test_item.current);
      }

      // if(currentObject){
      //   itemsInGame.current.push(currentObject);
      // }

      console.log("--------------")
      console.log(gameStateRef.current.currentTurn +" et "+ mySocketIdRef.current)

      // Pour le joueur actif
      if(myCurrentObjectRef.current && !(myCurrentObjectRef.current instanceof Ball) && gameStateRef.current.currentTurn === mySocketIdRef.current){
        itemsInGame.current.push(myCurrentObjectRef.current);
      }

      console.log("item : ", item);
      console.log("location : ", row, col);
      console.log("removedItem : ", removedItem);

      console.log("itemsInGame : ", itemsInGame.current);
      
      test_item.current = null; // Réinitialiser l'objet créé pour le spectateur

      if(removedItem.length > 0){
        if(itemsInGame.current.length > 0){
          removedItem.forEach((removed_item) => {
            console.log("juste avant combinaison :", removed_item)
            let removed_item_row_slor = [removed_item[0], removed_item[1]];
            console.log("Combinaison :", removed_item_row_slor);
            itemsInGame.current.forEach((item) => {
              console.log("comparaison :"+item.finalRowSlot+" vs "+removed_item_row_slor)
              if (Array.isArray(item.finalRowSlot) && 
                  Array.isArray(removed_item_row_slor) && 
                  item.finalRowSlot.length === removed_item_row_slor.length && 
                  item.finalRowSlot.every((val, index) => val === removed_item_row_slor[index])) {
                console.log("Match !")
                item.removeFromBoard();
                itemsInGame.current = itemsInGame.current.filter(
                  (currentItem) => currentItem !== item
                );
                console.log("itemsInGame.current après remove :", itemsInGame.current)
                console.log("removed item : ", item);
              }
            });
          });
        }
      }

      myCurrentObjectRef.current = null;

    });

    return () => {
      socket.off("resetItem"); // Nettoyer l'écouteur lors du démontage
    };
  }, [socket]);

  useEffect(() => {
    socket.on("cancelItem", () => {
      if (test_item.current) {
        test_item.current.removeFromBoard(); // Dispose de l'objet précédent s'il existe // Dispose du parent de l'objet précédent s'il existe
        test_item.current = null;
        myCurrentObjectRef.current = null;
        console.log("La on le supprime normalement")
      }
    });

    return () => {
      socket.off("cancelItem"); // Nettoyer l'écouteur lors du démontage
    };
  }, [socket]);

  useEffect(() => {
    socket.on("resetButtonsState", () => {
      // myCurrentObjectRef.current = null;
      setObjectThrown(true); // Permettre de relancer
      setObjectWaiting(false); // Indiquer que l'objet n'est plus en attente
    });

    return () => {
      socket.off("resetButtonsState"); // Nettoyer l'écouteur lors du démontage
    };
  }, [socket]);

  async function enablePhysics(scene) {
    const havokInstance = await HavokPhysics();
    scene.collisionsEnabled = true;

    const hk = new BABYLON.HavokPlugin(true, havokInstance);
    scene.enablePhysics(new BABYLON.Vector3(0, -9.8, 0), hk);
  }

  const onSceneReady = async (scene) => {
    sceneRef.current = scene;

    const cameraInstance = new Camera(
      scene.getEngine().getRenderingCanvas(),
      scene
    );
    cameraInstanceRef.current = cameraInstance; // Stocker l'instance de la caméra

    new BABYLON.HemisphericLight("light", new BABYLON.Vector3(1, 1, 0), scene);

    await enablePhysics(scene).then(() => {
      console.log("Physics enabled");
    });

    const ground = BABYLON.MeshBuilder.CreateGround(
      "ground",
      { width: 100, height: 100 },
      scene
    );
    ground.position = new BABYLON.Vector3(0, -1, 0);
    const meshAggregate = new BABYLON.PhysicsAggregate(
      ground,
      BABYLON.PhysicsShapeType.MESH,
      { mass: 0, friction: 0.4, restitution: 1 }
    );
    meshAggregate.body.setMotionType(BABYLON.PhysicsMotionType.STATIC);

    const board = new Board(scene, socket, roomId, gameStateRef.current, myCurrentObjectRef);
    boardRef.current = board; // Stocker l'instance de la planche

    // Désactiver le contrôle de la caméra si ce n'est pas le tour du joueur
    if (gameStateRef.current.currentTurn !== mySocketIdRef.current) {
      // camera.detachControl(scene.getEngine().getRenderingCanvas());
      cameraInstance.disableCameraControl();
    }

    // Écouter les mouvements de la caméra
    cameraInstance.camera.onViewMatrixChangedObservable.add(() => {
      // console.log("Tour actuel :", gameStateRef.current.currentTurn);
      // console.log("Mon socket ID :", mySocketIdRef.current);

      if (gameStateRef.current.currentTurn === mySocketIdRef.current) {
        // console.log("Camera moved");
        socket.emit("cameraUpdate", {
          roomId,
          position: cameraInstance.camera.position.asArray(),
          target: cameraInstance.camera.getTarget().asArray(),
        });
      }
    });

    socket.emit("getState", { roomId }, (response) => {
      if (response.success) {
        setGameState(response.state);
        test.current = response.state;
        console.log("test : ", test.current);
        // console.log("Game phase : ", response.state);
      } else {
        alert(response.message);
      }
    });
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!myCurrentObjectRef.current) return;

      if (!myCurrentObjectRef.current.allowTrajectory) return;

      switch (event.key) {
        case "ArrowUp":
          myCurrentObjectRef.current.adjustPitch(-5); // Tangage vers le haut
          break;
        case "ArrowDown":
          myCurrentObjectRef.current.adjustPitch(5); // Tangage vers le bas
          break;
        case "ArrowLeft":
          myCurrentObjectRef.current.adjustYaw(-5); // Lacet vers la gauche
          break;
        case "ArrowRight":
          myCurrentObjectRef.current.adjustYaw(5); // Lacet vers la droite
          break;
        default:
          break;
      }

      // Mettre à jour la trajectoire après chaque ajustement
      myCurrentObjectRef.current.updateTrajectory();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [myCurrentObjectRef.current]);

  // Callback exécuté à chaque frame, par exemple pour animer des objets
  const onRender = (scene) => {
    // Ajoute ici ton code d'animation ou logique de rendu spécifique
  };

  const skipPhase = () =>{
    socket.emit("skipPhase", { roomId }, (response) => {
      if (!response.success) {
        alert(response.message);
      }
    });
  }

  const handleThrowDice = async (color) => {
    console.log("Lancer le dé de couleur :", color);

    const scene = sceneRef.current; // Utilisez la scène existante
    if (!scene) {
      console.error("La scène n'est pas disponible.");
      return;
    }

    const dice = new Dice(
      color,
      scene,
      cameraInstanceRef.current,
      boardRef.current,
      socket,
      roomId,
      true
    );
    // setCurrentObject(dice); // Mettez à jour l'état avec le dé actuel
    myCurrentObjectRef.current = dice
    setObjectThrown(false); // Réinitialiser l'état de lancé de dé
    setObjectWaiting(true); // Indiquer que l'objet est en attente d'être lancé

    await dice
      .loadModel()
      .then(() => {
        console.log("Modèle de dé chargé avec succès");

        socket.emit("throwDice", { roomId, color }, (response) => {
          if (!response.success) {
            alert(response.message);
          }
        });
      })
      .catch((error) => {
        console.error("Erreur lors du chargement du modèle de dé :", error);
      });
  };

  const handleThrowCube = async () => {
    console.log("Lancer le cube");
    const scene = sceneRef.current; // Utilisez la scène existante
    if (!scene) {
      console.error("La scène n'est pas disponible.");
      return;
    }
    // const cube = BABYLON.MeshBuilder.CreateBox("cube", { size: 1 }, scene);
    // cube.position = new BABYLON.Vector3(Math.random() * 5, 1, Math.random() * 5);
    const cube = new Cube(
      scene,
      cameraInstanceRef.current,
      boardRef.current,
      socket,
      roomId,
      true
    );
    console.log("créa cube click handleTrowCube")
    // setCurrentObject(cube); // Mettez à jour l'état avec le cube actuel
    myCurrentObjectRef.current = cube
    setObjectThrown(false); // Réinitialiser l'état de lancé du cube
    setObjectWaiting(true); // Indiquer que l'objet est en attente d'être lancé
    
    let newPos = cube.location
    
    
    await cube
      .loadModel()
      .then(() => {
        console.log("Modèle de cube chargé avec succès");
        

        socket.emit("throwCube", { roomId,  newPos}, (response) => {
          if (!response.success) {
            alert(response.message);
          }
        });
      })
      .catch((error) => {
        console.error("Erreur lors du chargement du modèle de dé :", error);
      });
  };

  const handleThrowBall = async () => {
    console.log("Lancer la balle");
    const scene = sceneRef.current; // Utilisez la scène existante
    if (!scene) {
      console.error("La scène n'est pas disponible.");
      return;
    }
    // const ball = BABYLON.MeshBuilder.CreateSphere("ball", { diameter: 1 }, scene);
    // ball.position = new BABYLON.Vector3(Math.random() * 5, 1, Math.random() * 5);

    const ball = new Ball(
      scene,
      cameraInstanceRef.current,
      boardRef.current,
      socket,
      roomId,
      true
    );

    // setCurrentObject(ball); // Mettez à jour l'état avec la balle actuelle
    myCurrentObjectRef.current = ball
    setObjectThrown(false); // Réinitialiser l'état de lancé de la balle
    setObjectWaiting(true); // Indiquer que l'objet est en attente d'être lancé

    await ball
      .loadModel()
      .then(() => {
        console.log("Modèle de balle chargé avec succès");

        socket.emit("throwBall", { roomId }, (response) => {
          if (!response.success) {
            alert(response.message);
          }
        });
      })
      .catch((error) => {
        console.error("Erreur lors du chargement du modèle de dé :", error);
      });
  };

  if (!gameState) return <div>Chargement...</div>;

  return (
    <div>
      <GameSceneComponent
        id="game-canvas"
        style={{ width: "100%", height: "800px" }}
        onSceneReady={onSceneReady}
        onRender={onRender}
      />
      <div className="d-flex flex-row justify-content-center align-items-center gap-4">
        <div className="game_infos ">
          <div>
            <h2>État du jeu</h2>
            <p>
              Tour en cours :{" "}
              {gameState.currentTurn === mySocketId
                ? "À vous de jouer !"
                : "En attente de l'autre joueur"}
            </p>
            <p>
              Étape actuelle :{" "}
              {gameState.currentStep === 0
                ? "0 - Lancer les dés"
                : gameState.currentStep === 1
                ? "1 - Lancer le cube"
                : gameState.currentStep === 2
                ? "2 - Placer un cube"
                : gameState.currentStep === 3
                ? "3 - Lancer la balle"
                : "Fin du tour"}
            </p>
            {gameState.players.map((player) => (
              <div key={player.socketId}>
                <strong>{player.pseudo}</strong> - Blancs : {player.whiteDices}{" "}
                x{" "}
                <img
                  style={{ width: "2.5rem", height: "2.5rem" }}
                  src={player.whiteDices > 0 ? WhiteDiceSvg : GrayDiceSvg}
                ></img>
                , Rouge(s) : {player.redDices} x{" "}
                <img
                  style={{ width: "2.5rem", height: "2.5rem" }}
                  src={player.redDices > 0 ? RedDiceSvg : GrayDiceSvg}
                ></img>
                , Cubes : {player.cubes} x{" "}
                <img
                  style={{ width: "2.5rem", height: "2.5rem" }}
                  src={player.cubes > 0 ? CubeSvg : GrayCubeSvg}
                ></img>
                Lancés : {player.throwTries}
              </div>
            ))}
            <p>
              Stack : <br></br>
              Dés blancs :{" "}
              {gameState.stack.white.length > 0
                ? gameState.stack.white.join(", ")
                : "aucun dé blanc"}{" "}
              <br></br>
              Dés rouges :{" "}
              {gameState.stack.red.length > 0
                ? gameState.stack.red.join(", ")
                : "aucun dé rouge"}
            </p>
          </div>
          {gameState?.currentTurn === mySocketId && (
            <div>
             
                      {gameState?.currentStep === 0 && (
                      <>
                        <button
                        disabled={objectWaiting || gameState.players.find(player => player.socketId === mySocketId)?.whiteDices <= 0}
                        onClick={() => handleThrowDice("white")}
                        >
                        Lancer Dé Blanc
                        </button>
                        <button
                        disabled={objectWaiting || gameState.players.find(player => player.socketId === mySocketId)?.whiteDices > 0}
                        onClick={() => handleThrowDice("red")}
                        >
                        Lancer Dé Rouge
                        </button>
                      </>
                      )}

                      {/* Bouton pour lancer un cube (currentStep === 1) */}
              {gameState?.currentStep === 1 && (
                <button
                  disabled={objectWaiting}
                  onClick={() => handleThrowCube()}
                >
                  Lancer Cube
                </button>
              )}

              {/* Indication de placer un cube (currentStep === 2) */}
              {gameState?.currentStep === 2 && (
                <p>Veuillez utiliser la grille pour placer un cube</p>
              )}

              {/* Bouton pour lancer une balle (currentStep === 3) */}
              {gameState?.currentStep === 3 && (
                <>
                  <button
                    disabled={objectWaiting}
                    onClick={() => handleThrowBall()}
                  >
                    Lancer Balle
                  </button>

                  <button
                  disabled={objectWaiting}
                  onClick={() => skipPhase()}
                  >
                  Passer à la phase suivante
                  </button>
                </>
              )}

              {/* Autres boutons */}
              <button onClick={() => cameraInstanceRef.current?.sideView()}>
                Side view
              </button>
              <button onClick={() => cameraInstanceRef.current?.topView()}>
                Top view
              </button>
              <button
                disabled={objectThrown}
                onClick={() => {
                  myCurrentObjectRef.current?.applyThrowImpulse(
                    setObjectThrown,
                    setObjectWaiting
                  );
                }}
              >
                Lancer l'objet
              </button>
            </div>
          )}
        </div>
        <div className="game_grid  h-100 d-flex flex-column justify-content-center align-items-center">
          <h2>Plateau de jeu :</h2>
          <div className="game_matrix d-flex flex-column" style={{ gap: "0" }}>
            {gameState?.gameMatrix
              ?.slice()
              .reverse()
              .map((row, rowIndex) => (
                <div
                  key={rowIndex}
                  className="d-flex flex-row"
                  style={{ gap: "0" }}
                >
                  {row.map((slot, slotIndex) => (
                    <div
                      key={`${rowIndex}-${slotIndex}`}
                      style={{
                        marginRight: slotIndex === 3 ? "5px" : "0",
                      }}
                      className={
                        slot === null
                          ? "slot hoverable_slot"
                          : "slot not_hoverable_slot"
                      }
                      onClick={() => {
                        if (
                          slot === null &&
                          cubeDropRequested === false &&
                          gameState.currentStep === 2 &&
                          gameState.currentTurn === mySocketId
                        ) {
                          setCubeDropRequested(true); // Indiquer que le cube a été demandé

                          // comme on a reverse la matrice, on doit inverser l'index du slot
                          const actualRowIndex = 4 - rowIndex;

                          console.log(
                            `Clicked on slot: ${actualRowIndex}-${slotIndex}`
                          );
                          console.log(
                            boardRef.current.getMeshLocation(
                              actualRowIndex,
                              slotIndex
                            )
                          );

                          socket.emit(
                            "checkSocle",
                            {
                              roomId: roomId,
                              row: actualRowIndex,
                              col: slotIndex,
                            },
                            (response) => {
                              if (response.success) {
                                console.log(
                                  `Socle cliqué : Index du socle = ${slotIndex}, Index de la Row = ${actualRowIndex}, Occupé = ${response.occupied}`
                                );

                                if (!response.occupied && !response.allowDice) {
                                  console.log(
                                    `Position du socle : ${boardRef.current.getMeshLocation(
                                      actualRowIndex,
                                      slotIndex
                                    )}`
                                  );
                                  let slotPos =
                                    boardRef.current.getMeshLocation(
                                      actualRowIndex,
                                      slotIndex
                                    );
                                  let cube = new Cube(
                                    sceneRef.current,
                                    null,
                                    null,
                                    socket,
                                    roomId,
                                    false
                                  );
                                  console.log("créa cube click grille")

                                  myCurrentObjectRef.current = cube;

                                  let newPos = new BABYLON.Vector3(slotPos.x, slotPos.y + 1, slotPos.z)

                                  cube.loadModel(newPos)
                                  .then(() => {
                                    console.log("Modèle de cube chargé avec succès");
                            
                                    socket.emit("throwCube", { roomId, newPos }, (response) => {
                                      if (!response.success) {
                                        alert(response.message);
                                      }
                                    });
                                  })
                                  .catch((error) => {
                                    console.error("Erreur lors du chargement du modèle de cube :", error);
                                  });

                                  cube.drop(actualRowIndex, slotIndex, false);

                                } else {
                                  setCubeDropRequested(false); // Réinitialiser l'état de demande de cube
                                }
                              }
                            }
                          );
                        }

                        // if (
                        //   slot === null &&
                        //   cubeDropRequested === false &&
                        //   gameState.currentStep === 3 &&
                        //   gameState.currentTurn === mySocketId
                        // ) {
                        //   setCubeDropRequested(true); // Indiquer que le cube a été demandé

                        //   // comme on a reverse la matrice, on doit inverser l'index du slot
                        //   const actualRowIndex = 4 - rowIndex;

                        //   console.log(
                        //     `Clicked on slot: ${actualRowIndex}-${slotIndex}`
                        //   );
                        //   console.log(
                        //     boardRef.current.getMeshLocation(
                        //       actualRowIndex,
                        //       slotIndex
                        //     )
                        //   );

                        //   socket.emit(
                        //     "checkSocle",
                        //     {
                        //       roomId: roomId,
                        //       row: actualRowIndex,
                        //       col: slotIndex,
                        //     },
                        //     (response) => {
                        //       if (response.success) {
                        //         console.log(
                        //           `Socle cliqué : Index du socle = ${slotIndex}, Index de la Row = ${actualRowIndex}, Occupé = ${response.occupied}`
                        //         );

                        //         if (!response.occupied && !response.allowDice) {
                        //           console.log(
                        //             `Position du socle : ${boardRef.current.getMeshLocation(
                        //               actualRowIndex,
                        //               slotIndex
                        //             )}`
                        //           );
                        //           let slotPos =
                        //             boardRef.current.getMeshLocation(
                        //               actualRowIndex,
                        //               slotIndex
                        //             );
                        //           let cube = new Ball(
                        //             sceneRef.current,
                        //             null,
                        //             null,
                        //             socket,
                        //             roomId,
                        //             false
                        //           );
                        //           console.log("créa ball click grille")

                        //           myCurrentObjectRef.current = cube;

                        //           let newPos = new BABYLON.Vector3(slotPos.x, slotPos.y + 1, slotPos.z)

                        //           cube.loadModel(newPos)
                        //           .then(() => {
                        //             console.log("Modèle de cube chargé avec succès");
                            
                        //             socket.emit("throwBall", { roomId, newPos }, (response) => {
                        //               if (!response.success) {
                        //                 alert(response.message);
                        //               }
                        //             });
                        //           })
                        //           .catch((error) => {
                        //             console.error("Erreur lors du chargement du modèle de cube :", error);
                        //           });

                        //           cube.drop(actualRowIndex, slotIndex);

                        //         } else {
                        //           setCubeDropRequested(false); // Réinitialiser l'état de demande de cube
                        //         }
                        //       }
                        //     }
                        //   );
                        // }
                      }}
                    >
                      {slot === null ? "" : slot[0] === 0 ? "cube" : slot[0]}
                    </div>
                  ))}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameScenePage;

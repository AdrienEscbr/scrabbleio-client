import { PhysicsAggregate, PhysicsMotionType, PhysicsShapeType, Vector3, HighlightLayer, ActionManager, ExecuteCodeAction, Color3 } from "@babylonjs/core";
// import Ball from "./Ball";
// import Cube from "./Cube";
// import Dice from "./Dice";
// import RowElement from "./RowElement";
import Support from "./Support";
import Cube from "./Cube";

class Row {
  constructor(scene, socket, roomId, gameState, myCurrentObjectRef) {
    this._scene = scene;
    this._support = new Support(scene);

    this._gameState = gameState; // Référence à l'état du jeu

    this._myCurrentObjectRef = myCurrentObjectRef

    // Initialisation des tableaux
    this._dicePart = new Array(4).fill(null);
    this._cubePart = new Array(4).fill(null);

    this.socles = []; // Initialisation du tableau socles
    this._meshes = []; // Initialisation du tableau meshes

    this._socket = socket;
    this._roomId = roomId;

    // Initialisation du tableau _row
    // this._row = [this._dicePart, this._cubePart];
  }

  // Getter
  // get row() {
  //   return this._row;
  // }

  get meshes() {
    return this._meshes;
  }

  get socles() {
    return this._socles;
  }

  setGameState(new_gameState) {
    this._gameState = new_gameState;
  }

  // Setter
  // set row(value) {
  //   this._row = value;
  // }

  set meshes(value) {
    this._meshes = value;
  }

  set socles(value) {
    this._socles = value;
  }

  
  // Méthode pour ajouter un Dice

  async setUp(rowIndex, offset) {
    const tab = [];
    const socles = [];

    // Créer un HighlightLayer pour les socles
    const highlighter = new HighlightLayer("socleHighlighter", this._scene);
    highlighter.blurVerticalSize = 1.5;
    highlighter.blurHorizontalSize = 1.5;
  
    for (let i = 0; i < 8; i++) {
      if (!this._scene || this._scene.isDisposed) {
        console.error("Scene is not available or has been disposed.");
        break;
      }
  
      const supportMesh = await this._support.loadModel();
      if (!supportMesh) continue;
  
      const mesh = supportMesh.meshes[0];
      mesh.name = i.toString();
      mesh.isPickable = true;
      tab.push(mesh);
  
      if (i < 4) {
        mesh.position = new Vector3(i * 2, 0, rowIndex * offset);
      } else {
        mesh.position = new Vector3((i + 0.2) * 2, 0, rowIndex * offset);
      }
  
      for (let childMesh of supportMesh.meshes) {
        childMesh.refreshBoundingInfo(true);
        if (childMesh.getTotalVertices() > 0) {
          const meshAggregate = new PhysicsAggregate(
            childMesh,
            PhysicsShapeType.MESH,
            { mass: 0, friction: 4, restitution: 0.1 }
          );
          meshAggregate.body.setMotionType(PhysicsMotionType.STATIC);
          if (childMesh.id === "Socle") {
            childMesh.isPickable = true;
            console.log("Socle trouvé");
            socles.push(childMesh);

            // Ajouter des actions pour le survol et le clic
            childMesh.actionManager = new ActionManager(this._scene);

            // Survol (hover)
            childMesh.actionManager.registerAction(
              new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
                const socleIndex = socles.indexOf(childMesh);
                this._socket.emit("checkSocle", { roomId: this._roomId, row: rowIndex, col: socleIndex }, (response) => {
                    if (response.success) {
                        const color = response.occupied ? Color3.Red() : Color3.Green();
                        highlighter.addMesh(childMesh, color);
                    }
                });
              })
            );

            // Fin du survol
            childMesh.actionManager.registerAction(
                new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
                    highlighter.removeMesh(childMesh);
                })
            );

            // Clic
            childMesh.actionManager.registerAction(
              new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {

                console.log("currentStep : ", this._gameState.currentStep);
                console.log("currentTurn : ", this._gameState.currentTurn);
                console.log("socketId : ", this._socket.id);

                if(this._gameState.currentStep === 2 && this._socket.id === this._gameState.currentTurn){
                  const socleIndex = socles.indexOf(childMesh);
                  this._socket.emit("checkSocle", { roomId: this._roomId, row: rowIndex, col: socleIndex }, (response) => {
                    if (response.success) {
                        console.log(`Socle cliqué : Index du socle = ${socleIndex}, Index de la Row = ${rowIndex}, Occupé = ${response.occupied}`);

                        if(!response.occupied && !response.allowDice) {
                          console.log(`Position du socle : ${supportMesh.meshes[0].position}`);
                          let slotPos = supportMesh.meshes[0].position;
                          let cube = new Cube(this._scene, null, null, this._socket, this._roomId, false);
                          console.log("créa cube click sur board")
                          
                          this._myCurrentObjectRef.current = cube;
                          let newPos = new Vector3(slotPos.x, slotPos.y+1, slotPos.z)
                          
                          cube.loadModel(newPos)
                          .then(() => {
                            console.log("Modèle de cube chargé avec succès");
                    
                            this._socket.emit("throwCube", { roomId: this._roomId, newPos }, (response) => {
                              if (!response.success) {
                                alert(response.message);
                              }
                            });
                          })
                          .catch((error) => {
                            console.error("Erreur lors du chargement du modèle de cube :", error);
                          });

                          cube.drop(rowIndex, socleIndex);
                        }
                    }
                  });
                }
              })
            );
          }
        }
      }
    }
    this.socles = socles;
    this._meshes = tab;
  }

  
  getMeshes() {
    return this._meshes;
  }

  getMesh(index) {
    if (index >= 0 && index < this._meshes.length) {
      return this._meshes[index];
    } else {
      throw new Error("Index out of bounds");
    }
  }
  

  addDice(index, dice) {
    if (index >= 0 && index < 4) {
      this._dicePart[index] = dice;
    } else {
      throw new Error("Index out of bounds");
    }
  }

  // Méthode pour ajouter un Cube
  addCube(index, cube) {
    if (index >= 0 && index < 4) {
      this._cubePart[index] = cube;
    } else {
      throw new Error("Index out of bounds");
    }
  }

  // Méthode pour ajouter une Ball
  addBall(index, ball) {
    if (index >= 0 && index < 4) {
      this._cubePart[index] = ball;
    } else {
      throw new Error("Index out of bounds");
    }
  }

  // Méthode pour mettre à null une case de dicePart
  removeDice(index) {
    if (index >= 0 && index < 4) {
      this._dicePart[index] = null;
    } else {
      throw new Error("Index out of bounds");
    }
  }

  // Méthode pour mettre à null une case de cubePart
  removeCube(index) {
    if (index >= 0 && index < 4) {
      this._cubePart[index] = null;
    } else {
      throw new Error("Index out of bounds");
    }
  }
}

export default Row;

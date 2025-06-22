import Row from "./Row";

class Board {
  constructor(scene, socket, roomId, gameState, myCurrentObjectRef) {
    this._scene = scene;
    this._rows = [];
    this._socket = socket;
    this._roomId = roomId;
    this._gameState = gameState;
    this._myCurrentObjectRef = myCurrentObjectRef;
    this.createBoard();    
  }

  async createBoard() {
    const offset = 2; // Ajuste cette valeur pour espacer correctement les rangées
    for (let i = 0; i < 5; i++) {
      const row = new Row(this._scene, this._socket, this._roomId, this._gameState, this._myCurrentObjectRef);
      await row.setUp(i, offset);
      this._rows.push(row);
    }
  }

  get rows() {
    return this._rows;
  }

  set rows(value) {
    this._rows = value;
  }

  setGameState(new_gameState) {
    this._gameState = new_gameState;
    this._rows.forEach(row => {
      row.setGameState(new_gameState);
    });
  }

  getMeshLocation(rowIndex, colIndex) {
    // Vérifier si l'index de la Row est valide
    if (rowIndex < 0 || rowIndex >= this._rows.length) {
        console.error("Index de la Row invalide.");
        return null;
    }

    const row = this._rows[rowIndex];

    // Vérifier si l'index du socle est valide
    if (colIndex < 0 || colIndex >= row.socles.length) {
        console.error("Index du socle invalide.");
        return null;
    }

    const socleMesh = row.getMesh(colIndex);

    // Retourner la position du mesh dans la scène
    return socleMesh.position.clone(); // Cloner la position pour éviter les modifications accidentelles
  }
}

export default Board;

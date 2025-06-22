import { Scene, SceneLoader } from "@babylonjs/core";
import '@babylonjs/loaders';
import '@babylonjs/core/Loading/loadingScreen';
import '@babylonjs/loaders/glTF';
import RowElement from "./RowElement";
import SUPPORT_URL from "../Assets/Models/support2.glb"

class Support extends RowElement {
  constructor(scene) {
    super(0);
    this._scene = scene;
  }

  // async loadModel() {
  //   const result = await SceneLoader.ImportMeshAsync("", "", SUPPORT_URL, this._scene);
  //   return result;
  // }

  async loadModel() {
    if (!this._scene || this._scene.isDisposed) {
      console.error("Scene is not available or has been disposed.");
      return null;
    }
  
    try {
      const result = await SceneLoader.ImportMeshAsync("", "", SUPPORT_URL, this._scene);
      return result;
    } catch (error) {
      console.error("Error loading model:", error);
      return null;
    }
  }
}

export default Support;

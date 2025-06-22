import { ArcRotateCamera, Vector3 } from "@babylonjs/core";

class Camera {
    constructor(canvas, scene, name = "Camera", alpha = -Math.PI / 2, beta = -Math.PI, radius = 20, target = new Vector3(7, 0, 3)) {
        this._canvas = canvas;
        this._scene = scene;

        this._camera = new ArcRotateCamera(
            name,
            alpha, 
            beta, 
            radius, 
            target, 
            this._scene
        );
        this._camera.attachControl(this._canvas, true);

        this.disableKeyboardControl();

        this._scene.activeCamera = this._camera;
    }

    get camera() {
        return this._camera;
    }

    disableKeyboardControl() {
        this._camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");
    }
    
    enableCameraControl() {
        this._camera.attachControl(this._canvas, true);
    }

    disableCameraControl() {
        this._camera.detachControl();
    }

    topView() {
        this._camera.beta = -Math.PI;
    }

    sideView() {
        this._camera.beta = Math.PI / 4; // Angle vertical, ajusté pour la vue en plongée
    }

    setCustomView(alpha, beta, radius) {
        this._camera.alpha = alpha;
        this._camera.beta = beta;
        this._camera.radius = radius;
    }

    setAlpha(alpha) {
        this._camera.alpha = alpha;
    }

    setBeta(beta) {
        this._camera.beta = beta;
    }

    setTarget(target) {
        this._camera.setTarget(target);
    }
    
    setPosition(position) {
        this._camera.position = position;
    }

    setThrowConfig(target){
        this._camera.lowerAlphaLimit = -Math.PI;
        this._camera.upperAlphaLimit = 0;
        this._camera.lowerBetaLimit = 0;
        this._camera.upperBetaLimit = Math.PI / 2;
        // this._camera.target = target;

        // Positionner la caméra pour qu'elle regarde dans la même direction que le dé
        const forward = new Vector3(0, 0, 1); // Direction de base (avant)
        const worldMatrix = target.getWorldMatrix();
        const direction = Vector3.TransformNormal(forward, worldMatrix).normalize(); // Calculer la direction du dé

        // Position actuelle du dé
        const dicePosition = target.getAbsolutePosition();

        // Placer la caméra légèrement derrière le dé, en fonction de sa direction
        const cameraPosition = dicePosition.subtract(direction.scale(10)); // Reculer de 10 unités

        // Mettre à jour la position et la cible de la caméra
        this._camera.setPosition(cameraPosition);
        this._camera.setTarget(dicePosition);

        // Régler beta pour une vue légèrement en plongée
        // this._camera.beta = -1.5;
    }
}

export default Camera;

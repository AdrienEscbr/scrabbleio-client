import * as BABYLON from '@babylonjs/core';

class Cube{

    constructor(scene, camera, board, socket, roomId, allowTrajectory) {
        this._value = 0;
        this._scene = scene;
        this._camera = camera;
        this._color = null;

        this._trajectory = null; // Stocker la trajectoire
        this._trajectorySpheres = [];
        this._cubeMesh = null; // Stocker le mesh du cube
        this._impulseForce = 14;
        this._cubeWeight = 1.1; // Poids du cube pour la physique

        this._asBeenThrown = false; // Indicateur si le cube a été lancé
        
        this._board = board; // Stocker la référence au tableau

        this._socket = socket; // Stocker la référence au socket

        this._roomId = roomId; // Stocker l'ID de la salle

        this.allowTrajectory = allowTrajectory; // Autoriser la trajectoire

        this.location = new BABYLON.Vector3(7.2, 2, -6);

        this.finalRowSlot = [];
    
    }

    resetLocation(){
        this._cubeMesh.parent.position = this.location; // Réinitialiser la position du dé
      }
    
   

    async loadModel(newLocation = this.location) {
        if (!this._scene || this._scene.isDisposed) {
            console.error("Scene is not available or has been disposed.");
            return null;
        }

        try {
            
            this._cubeMesh = BABYLON.MeshBuilder.CreateBox("cube", { size: 2 }, this._scene);

            const hitbox = BABYLON.MeshBuilder.CreateBox("cubeHitbox", { size: 2 }, this._scene);
            hitbox.visibility = 0.4;
            hitbox.isVisible = true;
            hitbox.position = newLocation.clone();

            this._cubeMesh.parent = hitbox;
            this._cubeMesh.isPickable = true;
            this._cubeMesh.doNotSyncBoundingInfo = true;

            hitbox.scaling = new BABYLON.Vector3(0.35, 0.35, 0.35);

            hitbox.scaling = new BABYLON.Vector3(0.35, 0.35, 0.35);

            hitbox.actionManager = new BABYLON.ActionManager(this._scene);


            const highligther = new BABYLON.HighlightLayer("highlighter", this._scene);
            highligther.blurVerticalSize = 1.5;
            highligther.blurHorizontalSize = 1.5;

            
            hitbox.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOverTrigger, (evt) => {
                highligther.addMesh(hitbox, BABYLON.Color3.Green());
            }));

            hitbox.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOutTrigger, (evt) => {
                highligther.removeMesh(hitbox, BABYLON.Color3.Green());
            }));
            

            // Appeler setThrowConfig sur l'instance de Camera
            if (this._camera && typeof this._camera.setThrowConfig === "function") {
                this._camera.setThrowConfig(hitbox);
            }

            // Créer la trajectoire après le chargement du modèle
            if (this.allowTrajectory) {
                this.createTrajectory(hitbox.position);
            }

            return true;
        } catch (error) {
            console.error("Error loading model:", error);
            return null;
        }
    }

    setMeshLocation(arr /* [x,y,z] */) {
        if (!this._cubeMesh) return;
        // position est un Vector3 : on lève ses composantes
        this._cubeMesh.parent.position.copyFromFloats(arr[0], arr[1], arr[2]);
      }
    
      setMeshRotation(arr /* [x,y,z,w] */) {
        if (!this._cubeMesh) return;
        this._cubeMesh.parent.rotationQuaternion = BABYLON.Quaternion.FromArray(arr);
      }

    setAsBeenThrown(value) {
        this._asBeenThrown = value;
    }
    asBeenThrown() {
        return this._asBeenThrown;
    }

    createTrajectory(startPosition) {
        if (!this._cubeMesh) return;
    
        const points = [];
        const gravity = -9.8; // Gravité (m/s²)
        const timeStep = 0.1; // Intervalle de temps pour la simulation (en secondes)
        const maxTime = 5; // Temps maximum pour la simulation (en secondes)
        const impulseStrength = this._impulseForce; // Puissance de l'impulsion
        const mass = this._cubeWeight; // Masse de l'objet (en kg)
    
        // Calculer la direction initiale en fonction de la rotation actuelle du cube
        const forward = new BABYLON.Vector3(0, 0, 1); // Direction de base (avant)
        const worldMatrix = this._cubeMesh.parent.getWorldMatrix();
        const direction = BABYLON.Vector3.TransformNormal(forward, worldMatrix).normalize(); // Utiliser TransformNormal pour inclure la rotation
        const velocity = direction.scale(impulseStrength / mass); // Vitesse initiale
    
        let currentPosition = startPosition.clone();
        let currentVelocity = velocity.clone();
        let time = 0;
    
        // Simulation de la trajectoire
        while (time < maxTime && currentPosition.y >= 0) {
            points.push(currentPosition.clone());
    
            // Mise à jour de la position et de la vitesse
            currentVelocity.y += gravity * timeStep; // Ajout de la gravité à la vitesse verticale
            currentPosition = currentPosition.add(currentVelocity.scale(timeStep)); // Mise à jour de la position
    
            time += timeStep;
        }
    
        // Supprimer l'ancienne trajectoire si elle existe
        if (this._trajectory) {
            this._trajectory.dispose();
        }
    
        // Supprimer les anciennes sphères si elles existent
        if (this._trajectorySpheres) {
            this._trajectorySpheres.forEach((sphere) => sphere.dispose());
        }
        // this._trajectorySpheres = []; // Réinitialiser la liste des sphères
    
        // Créer une nouvelle ligne pour représenter la trajectoire
        this._trajectory = BABYLON.MeshBuilder.CreateLines("trajectory", { points }, this._scene);
        this._trajectory.color = BABYLON.Color3.Green();
        this._trajectory.isVisible = false; // Rendre la trajectoire invisible par défaut
    
        // Créer des sphères aux nœuds de la trajectoire
        const maxSpheres = Math.floor((3/4) * points.length); // 2/3 du nombre de points
        const sphereSize = 0.5; // Taille initiale des sphères
    
        for (let i = 0; i < maxSpheres; i++) {
            const point = points[i];
            const size = sphereSize * (1 - i / maxSpheres); // Taille décroissante
    
            const sphere = BABYLON.MeshBuilder.CreateSphere(`trajectorySphere_${i}`, { diameter: size }, this._scene);
            sphere.position = point;
            sphere.material = new BABYLON.StandardMaterial(`sphereMaterial_${i}`, this._scene);
            sphere.material.diffuseColor = BABYLON.Color3.Green();
    
            // Ajouter la sphère à la liste pour pouvoir la supprimer plus tard
            this._trajectorySpheres.push(sphere);
        }
    }

    

    // adjustPitch(angle) {
    //     if (!this._cubeMesh) return;
    
    //     // Rotation autour de l'axe X (tangage)
    //     this._cubeMesh.parent.rotation.x += BABYLON.Tools.ToRadians(angle);
    // }
    
    // adjustYaw(angle) {
    //     if (!this._cubeMesh) return;
    
    //     // Rotation autour de l'axe Y (lacet)
    //     this._cubeMesh.parent.rotation.y += BABYLON.Tools.ToRadians(angle);
    // }

    adjustPitch(angleDegrees) {
        if (!this._cubeMesh || this._asBeenThrown) return;
        const hitbox = this._cubeMesh.parent;
        if (!hitbox.rotationQuaternion) {
          // Initialiser la quaternion si ce n’est pas déjà fait
          hitbox.rotationQuaternion = BABYLON.Quaternion.FromEulerVector(hitbox.rotation);
        }
      
        // Créer une quaternion qui représente la rotation autour de l'axe X
        const deltaQ = BABYLON.Quaternion.RotationAxis(
          BABYLON.Vector3.Right(),
          BABYLON.Tools.ToRadians(angleDegrees)
        );
      
        // On multiplie : nouvelle orientation = delta ⨉ orientation actuelle
        hitbox.rotationQuaternion = deltaQ.multiply(hitbox.rotationQuaternion);
      
        // Émettre la mise à jour
        const pos = hitbox.position.asArray();
        const rotQ = hitbox.rotationQuaternion.asArray();
        this._socket.emit("diceFlightUpdate", {
          roomId: this._roomId,
          position: pos,
          rotationQuaternion: rotQ,
        });
      }
      
      
      adjustYaw(angleDegrees) {
        if (!this._cubeMesh || this._asBeenThrown) return;
        const hitbox = this._cubeMesh.parent;
        if (!hitbox.rotationQuaternion) {
          hitbox.rotationQuaternion = BABYLON.Quaternion.FromEulerVector(hitbox.rotation);
        }
      
        const deltaQ = BABYLON.Quaternion.RotationAxis(
          BABYLON.Vector3.Up(),
          BABYLON.Tools.ToRadians(angleDegrees)
        );
        hitbox.rotationQuaternion = deltaQ.multiply(hitbox.rotationQuaternion);
      
        const pos = hitbox.position.asArray();
        const rotQ = hitbox.rotationQuaternion.asArray();
        this._socket.emit("diceFlightUpdate", {
          roomId: this._roomId,
          position: pos,
          rotationQuaternion: rotQ,
        });
      }

    updateTrajectory() {
        if (!this._trajectory || !this._camera) return;
    
        const startPosition = this._cubeMesh.parent.position;
        this.createTrajectory(startPosition); // Recalculer la trajectoire
    }

    removeFromBoard() {
        this._cubeMesh.parent.dispose(); // Supprimer le hitbox
        }

    providePhysicConsistency() {
        if (!this._cubeMesh) return;
        const hitbox = this._cubeMesh.parent;
        if (!hitbox) return;
        const hitboxAggregate = new BABYLON.PhysicsAggregate(hitbox, BABYLON.PhysicsShapeType.BOX, { mass: this._cubeWeight, friction: 4, restitution: 0 }, this._scene);
        hitboxAggregate.body.setMotionType(BABYLON.PhysicsMotionType.STATIC);
    }
   

    applyThrowImpulse(onCubeThrown, onCubeLanded) {

        if (this._asBeenThrown) {
            console.error("Cube has already been thrown.");
            return;
        }

        if (!this._cubeMesh) {
            console.error("Cube mesh is not loaded.");
            return;
        }

        this._socket.emit("removeThrowTries", { roomId: this._roomId }, (response) => {
            if (response.success) {
                console.log("Tentatives de lancé retirées sur le serveur.");
            }
        });

        // let currentPlayer = this._roomId.getCurrentPlayer();
        // currentPlayer.removeThrowTries(); // Retirer une tentative de lancé
    
        const hitbox = this._cubeMesh.parent;

        // Supprimer la trajectoire si elle existe
        if (this._trajectory) {
            this._trajectory.dispose();
            this._trajectory = null; // Réinitialiser la trajectoire
        }

        if (this._trajectorySpheres) {
            this._trajectorySpheres.forEach((sphere) => sphere.dispose());
            this._trajectorySpheres = []; // Réinitialiser la liste des sphères
        }
    
        // Calculer la direction de l'impulsion en fonction de la rotation actuelle du cube
        const forward = new BABYLON.Vector3(0, 0, 1); // Direction de base (avant)
        const worldMatrix = hitbox.getWorldMatrix();
        const direction = BABYLON.Vector3.TransformNormal(forward, worldMatrix).normalize(); // Utiliser TransformNormal pour inclure la rotation
    
        // Calculer l'impulsion
        const impulse = direction.scale(this._impulseForce); // Force constante
    
        // Créer un PhysicsAggregate pour appliquer la physique
        const hitboxAggregate = new BABYLON.PhysicsAggregate(hitbox, BABYLON.PhysicsShapeType.BOX, { mass: this._cubeWeight, friction: 4, restitution: 0 }, this._scene);
        hitboxAggregate.body.setMotionType(BABYLON.PhysicsMotionType.DYNAMIC);
        hitboxAggregate.body.disablePreStep = false;
    
        // Appliquer l'impulsion
        hitboxAggregate.body.applyImpulse(impulse, hitbox.getAbsolutePosition());

        const forwardSync = () => {
            if (this._cubeMesh && !this._cubeMesh.isDisposed()) {
              const pos = this._cubeMesh.parent.position.asArray();
              const rotQ = this._cubeMesh.parent.rotationQuaternion.asArray();
              this._socket.emit("diceFlightUpdate", {
                roomId: this._roomId,
                position: pos,
                rotationQuaternion: rotQ,
              });
            }
        };
        this._flightObserver = this._scene.onBeforeRenderObservable.add(forwardSync);

        this._asBeenThrown = true; // Indiquer que le cube a été lancé
        
        // Appeler le callback pour informer React
        if (onCubeThrown) {
            onCubeThrown(true);
        }
        

        // Vérifier régulièrement si le cube est immobile
        const interval = setInterval(() => {

            // Si le cube a été dispose, arrêter l'intervalle
            if (this._cubeMesh.isDisposed() || hitbox.isDisposed() || !hitboxAggregate || !hitboxAggregate.body) {
                clearInterval(interval); // Arrêter l'intervalle
                console.log("Le cube a été supprimé. Arrêt de la vérification.");
                return;
            }

            const linearVelocity = hitboxAggregate.body.getLinearVelocity();
            const isStopped = linearVelocity.length() < 0.01;

            if (isStopped) {
                clearInterval(interval); // Arrêter l'intervalle
                hitboxAggregate.body.setMotionType(BABYLON.PhysicsMotionType.STATIC); // Passer en mode STATIC
                
                if (this._flightObserver) {
                    console.log("Removing flight observer...");
                    this._scene.onBeforeRenderObservable.remove(this._flightObserver);
                    this._flightObserver = null;
                  }
                
                // Vérifier les socles
                let isValid = false;

                this._board.rows.forEach((row, rowIndex) => {
                    row.socles.forEach((socle, socleIndex) => {
                        if (hitbox.intersectsMesh(socle, false)) {
                            
                            console.log("Socle trouvé avec ID :", socleIndex);
                            if (!isNaN(socleIndex) && socleIndex >= 4 && socleIndex <= 7) {
                                console.log("cube valide");
                                isValid = true;
                                //let diceValue = parseInt(this.logVisibleFace()); // Afficher la face visible
                                // if (onDiceLanded) {
                                //     onDiceLanded(false);
                                // }
                                this.finalRowSlot = [rowIndex, socleIndex];
                                this._socket.emit("validateThrow", { roomId: this._roomId, item : "cube", color: this._color, row: rowIndex, col: socleIndex, value: this._value }, (response) => {
                                    if (response.success) {
                                        console.log("Matrice mise à jour sur le serveur.");
                                    }
                                });

                            } else {
                                console.log("cube invalide car il n'est pas dans la bonne section.");
                                this._cubeMesh.dispose(); // Supprimer le mesh du cube
                                hitbox.dispose(); // Supprimer le hitbox
                                return;
                            }
                        }
                    });
                });

                if (!isValid) {
                    console.log("cube invalide car il n'est arrivé sur aucun socle.");
                    this._cubeMesh.dispose(); // Supprimer le mesh du cube
                    hitbox.dispose(); // Supprimer le hitbox
                    // if (onDiceLanded) {
                    //     onDiceLanded(false);
                    // }
                    this._socket.emit("invalidateThrow", { roomId: this._roomId, item : "cube", color : this._color  }, (response) => {
                        if (response.success) {
                            console.log("Serveur notifié de l'échec du lancé.");
                        }
                    });
                }
                
                
            }
        }, 100); // Vérification toutes les 100ms

        // Vérifier si le cube entre en collision avec le sol dans la boucle de rendu
        const ground = this._scene.getMeshByName("ground"); // Assurez-vous que le sol est nommé "ground"
        const checkCollision = () => {
            if (this._cubeMesh.isDisposed() || hitbox.isDisposed()) {
                this._scene.onBeforeRenderObservable.remove(checkCollision); // Arrêter la vérification
                return;
            }

            // Vérifier si le cube entre en collision avec le sol
            if (ground && hitbox.intersectsMesh(ground, false)) {
                console.log("Le cube est entré en contact avec le sol. Suppression...");
                this._cubeMesh.dispose(); // Supprimer le mesh du cube
                hitbox.dispose(); // Supprimer le hitbox
                this._scene.onBeforeRenderObservable.remove(checkCollision); // Arrêter la vérification
                // if (onDiceLanded) {
                //     onDiceLanded(false);
                // }
                this._socket.emit("invalidateThrow", { roomId: this._roomId, item : "cube", color : this._color  }, (response) => {
                    if (response.success) {
                        console.log("Serveur notifié de l'échec du lancé.");
                    }
                });
            }
        };

        // Ajouter la vérification à la boucle de rendu
        this._scene.onBeforeRenderObservable.add(checkCollision);
    }

    


    drop(rowIndex, socleIndex, onlyDrop) {

        if (this._asBeenThrown) {
            console.error("Cube has already been thrown.");
            return;
        }

        if (!this._cubeMesh) {
            console.error("Cube mesh is not loaded.");
            return;
        }

        if(this.allowTrajectory){
            console.error("La méthode drop ne peut être utilisée que si la trajectoire est désactivée.");
            return
        }
    
        const hitbox = this._cubeMesh.parent;

        // Créer un PhysicsAggregate pour appliquer la physique
        const hitboxAggregate = new BABYLON.PhysicsAggregate(hitbox, BABYLON.PhysicsShapeType.BOX, { mass: this._cubeWeight, friction: 4, restitution: 0 }, this._scene);
        hitboxAggregate.body.setMotionType(BABYLON.PhysicsMotionType.DYNAMIC);
        hitboxAggregate.body.disablePreStep = false;
    

        this._asBeenThrown = true; // Indiquer que le cube a été lancé

        if(!onlyDrop){

            const forwardSync = () => {
                if (this._cubeMesh && !this._cubeMesh.isDisposed()) {
                const pos = this._cubeMesh.parent.position.asArray();
                const rotQ = this._cubeMesh.parent.rotationQuaternion.asArray();
                this._socket.emit("diceFlightUpdate", {
                    roomId: this._roomId,
                    position: pos,
                    rotationQuaternion: rotQ,
                });
                }
            };
            this._flightObserver = this._scene.onBeforeRenderObservable.add(forwardSync);
                    
            // Vérifier régulièrement si le cube est immobile
            const interval = setInterval(() => {

                // Si le cube a été dispose, arrêter l'intervalle
                if (this._cubeMesh.isDisposed() || hitbox.isDisposed() || !hitboxAggregate || !hitboxAggregate.body) {
                    clearInterval(interval); // Arrêter l'intervalle
                    console.log("Le cube a été supprimé. Arrêt de la vérification.");
                    return;
                }

                const linearVelocity = hitboxAggregate.body.getLinearVelocity();
                const isStopped = linearVelocity.length() < 0.01;

                if (isStopped) {
                    clearInterval(interval); // Arrêter l'intervalle
                    hitboxAggregate.body.setMotionType(BABYLON.PhysicsMotionType.STATIC); // Passer en mode STATIC
                    
                    if (this._flightObserver) {
                        console.log("Removing flight observer...");
                        this._scene.onBeforeRenderObservable.remove(this._flightObserver);
                        this._flightObserver = null;
                    }

                    this.finalRowSlot = [rowIndex, socleIndex];
                    console.log("*****  "+this.finalRowSlot)
                    console.log("*****  "+rowIndex)
                    console.log("*****  "+socleIndex)
                                    
                    this._socket.emit("cubeDrop", { roomId: this._roomId, color: this._color, row: rowIndex, col: socleIndex, value: this._value }, (response) => {
                        if (response.success) {
                            console.log("Matrice mise à jour sur le serveur.");
                        }
                    });

                }
            }, 100); // Vérification toutes les 100ms
        }
    }


}
export default Cube;

// GameSceneComponent.jsx
import React, { useEffect, useRef } from "react";
import { Engine, Scene } from "@babylonjs/core";
import "@babylonjs/core/Debug/debugLayer";
import {Inspector} from "@babylonjs/inspector";

const GameSceneComponent = ({
  antialias = true,
  engineOptions,
  adaptToDeviceRatio,
  sceneOptions,
  onRender,
  onSceneReady,
  ...rest
}) => {
  const reactCanvas = useRef(null);
  const engineRef = useRef(null);
  const sceneRef = useRef(null);

  
  useEffect(() => {
    const { current: canvas } = reactCanvas;
    if (!canvas) return;

    if (!engineRef.current) {
      // Créez l'engine et la scène une seule fois
      engineRef.current = new Engine(canvas, true);
      sceneRef.current = new Scene(engineRef.current);

      if (sceneRef.current.isReady()) {
        onSceneReady(sceneRef.current);
      } else {
        sceneRef.current.onReadyObservable.addOnce(() => onSceneReady(sceneRef.current));
      }

      // hide/show the Inspector
      window.addEventListener("keydown", (ev) => {
        if (ev.code == "KeyI") {
            if (sceneRef.current.debugLayer.isVisible()) {
                sceneRef.current.debugLayer.hide();
                console.log("Debug layer hidden");
            } else {
                sceneRef.current.debugLayer.show();
                console.log("Debug layer shown");
            }
        }
      });

      engineRef.current.runRenderLoop(() => {
        if (typeof onRender === "function") onRender(sceneRef.current);
        sceneRef.current.render();
      });

      const resize = () => {
        engineRef.current.resize();
      };
      window.addEventListener("resize", resize);

      return () => {
        window.removeEventListener("resize", resize);
      };
    }
  }, [onSceneReady, onRender]);

  return <canvas ref={reactCanvas} {...rest} />;
};

export default GameSceneComponent;


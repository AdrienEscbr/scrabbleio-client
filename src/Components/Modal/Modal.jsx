import React, { useEffect, useState } from "react";
import "../../Styles/ComponentStyles/Modal.css";

function Modal({ visible, text, onClose }) {
  const [isAnimating, setIsAnimating] = useState(false); // Pour suivre l'état de l'animation

  useEffect(() => {
    let timer;

    if (visible) {
      setIsAnimating(true); // Démarre l'animation d'entrée
      timer = setTimeout(() => {
        onClose(); // Cache le modal après 3 secondes
      }, 3000);
    } else if (isAnimating) {
      // Si on cache le modal, on démarre l'animation de sortie
      timer = setTimeout(() => {
        setIsAnimating(false); // Arrête complètement l'animation
      }, 500); // Durée de l'animation CSS
    }

    return () => clearTimeout(timer); // Nettoyage du timer
  }, [visible, onClose, isAnimating]);

  if (!visible && !isAnimating) return null; // Ne pas afficher si non visible et pas en animation

  return (
    <div className={`modal w-25 ${visible ? "fade-in" : "fade-out"}`}>
      <div className="content w-100">{text}</div>
    </div>
  );
}

export default Modal;

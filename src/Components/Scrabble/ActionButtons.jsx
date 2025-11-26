import React from 'react';

export default function ActionButtons({ isMyTurn, canValidate, onValidate, onPass, onExchange, onCancel }) {
  return (
    <div className="d-flex gap-2 mt-4 action-buttons">
      <button className="btn btn-success" disabled={!isMyTurn || !canValidate} onClick={onValidate}>
        Valider
      </button>
      <button className="btn btn-outline-secondary" disabled={!isMyTurn} onClick={onPass}>
        Passer
      </button>
      <button className="btn btn-outline-primary" disabled={!isMyTurn} onClick={onExchange}>
        Échanger
      </button>
      <button className="btn btn-outline-danger" onClick={onCancel}>
        Annuler
      </button>
    </div>
  );
}

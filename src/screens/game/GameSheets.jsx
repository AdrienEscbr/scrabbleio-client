import { useEffect, useState } from 'react';
import { ALPHABET, MIN_BAG_FOR_EXCHANGE } from '../../engine/index.js';
import { Button, Sheet } from '../../components/ui.jsx';
import Tile from '../../components/Tile.jsx';
import Rack from './Rack.jsx';

export function JokerPicker({ open, onPick, onClose }) {
  return (
    <Sheet open={open} onClose={onClose} title="Lettre du joker">
      <p className="sheet-lead">Le joker gardera cette lettre et vaut 0 point.</p>
      <div className="joker-grid">
        {[...ALPHABET].map((l) => (
          <button key={l} type="button" className="joker-grid__key" onClick={() => onPick(l)} aria-label={`Lettre ${l}`}>
            <Tile letter={l} joker />
          </button>
        ))}
      </div>
    </Sheet>
  );
}

export function ExchangeSheet({ open, onClose, rack, bagCount, onConfirm }) {
  const [chosen, setChosen] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setChosen(new Set()); setBusy(false); } }, [open]);
  const allowed = bagCount >= MIN_BAG_FOR_EXCHANGE;
  const toggle = (id) => setChosen((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Échanger des lettres"
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button
            variant="primary"
            disabled={!allowed || chosen.size === 0}
            loading={busy}
            onClick={async () => { setBusy(true); if (!(await onConfirm([...chosen]))) setBusy(false); }}
          >
            {chosen.size ? `Échanger ${chosen.size}` : 'Échanger'}
          </Button>
        </>
      )}
    >
      {allowed ? (
        <>
          <p className="sheet-lead">Touchez les lettres à remettre dans le sac. Votre tour sera terminé.</p>
          <div className="exchange-rack">
            <Rack tiles={rack} mode="exchange" chosen={chosen} onToggleChosen={toggle} />
          </div>
          <div className="exchange-quick">
            <Button size="sm" variant="ghost" onClick={() => setChosen(new Set(rack.map((t) => t.id)))}>Tout</Button>
            <Button size="sm" variant="ghost" onClick={() => setChosen(new Set())}>Aucune</Button>
          </div>
        </>
      ) : (
        <p className="sheet-lead">Il ne reste que {bagCount} lettre{bagCount > 1 ? 's' : ''} dans le sac : l’échange n’est possible qu’à partir de {MIN_BAG_FOR_EXCHANGE}.</p>
      )}
    </Sheet>
  );
}

export function ConfirmSheet({ open, onClose, title, body, confirmLabel, onConfirm, tone = 'primary' }) {
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setBusy(false); }, [open]);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant={tone} loading={busy} onClick={async () => { setBusy(true); if (!(await onConfirm())) setBusy(false); }} data-autofocus>
            {confirmLabel}
          </Button>
        </>
      )}
    >
      <p className="sheet-lead">{body}</p>
    </Sheet>
  );
}
